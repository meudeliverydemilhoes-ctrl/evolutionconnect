import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { subDays, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DEFAULT_GOALS = [
  { id: 1, label: "Taxa de Resposta", value: null, goal: 80, unit: "%" },
  { id: 2, label: "Msgs por Dia", value: null, goal: 50, unit: "" },
  { id: 3, label: "Contatos Ativos Hoje", value: null, goal: 20, unit: "" },
];

export default function Scorecard() {
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ label: "", goal: "", unit: "" });
  const { data: messages = [] } = useQuery({ queryKey: ["all-messages"], queryFn: () => base44.entities.Message.list("-timestamp", 500) });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const weekStart = subDays(new Date(), 6);

  const todayMsgs = messages.filter(m => m.timestamp?.startsWith(todayKey));
  const weekMsgs = messages.filter(m => m.timestamp && new Date(m.timestamp) >= weekStart);

  const uniqueContactsToday = new Set(todayMsgs.map(m => m.contact_phone)).size;
  const responseRate = messages.length > 0
    ? Math.round((messages.filter(m => m.direction === "sent").length / messages.length) * 100)
    : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "dd/MM");
    const dayMsgs = messages.filter(m => m.timestamp?.startsWith(key));
    return { label, sent: dayMsgs.filter(m => m.direction === "sent").length, received: dayMsgs.filter(m => m.direction === "received").length };
  });

  const metrics = [
    { label: "Hoje", sent: todayMsgs.filter(m => m.direction === "sent").length, received: todayMsgs.filter(m => m.direction === "received").length, contacts: uniqueContactsToday },
    { label: "Semana", sent: weekMsgs.filter(m => m.direction === "sent").length, received: weekMsgs.filter(m => m.direction === "received").length, contacts: new Set(weekMsgs.map(m => m.contact_phone)).size },
    { label: "Total", sent: messages.filter(m => m.direction === "sent").length, received: messages.filter(m => m.direction === "received").length, contacts: contacts.length },
  ];

  const healthScore = Math.min(100, Math.round(
    (Math.min(responseRate, 60) / 60 * 40) +
    (Math.min(uniqueContactsToday, 20) / 20 * 30) +
    (Math.min(todayMsgs.length, 50) / 50 * 30)
  ));

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Scorecard de Desempenho</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Health Score */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-[#111b21]">💚 Health Score do Negócio</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={healthScore >= 70 ? "#00a884" : healthScore >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="3"
                strokeDasharray={`${healthScore} ${100 - healthScore}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-[#111b21]">{healthScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-[#111b21]">{healthScore >= 70 ? "🟢 Excelente" : healthScore >= 40 ? "🟡 Regular" : "🔴 Atenção"}</p>
            <p className="text-sm text-gray-500 mt-1">Baseado em taxa de resposta, contatos ativos hoje e volume de mensagens.</p>
          </div>
        </div>
      </div>

      {/* Métricas por Período */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-[#111b21]">📊 Métricas por Período</h3>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map(m => (
            <div key={m.label} className="text-center">
              <p className="text-xs text-gray-500 font-semibold mb-2">{m.label}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-gray-600">📤 Enviadas</span><strong>{m.sent}</strong></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">📥 Recebidas</span><strong>{m.received}</strong></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">👥 Contatos</span><strong>{m.contacts}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-[#111b21]">📈 Evolução Diária (7 dias)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7Days}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="sent" name="Enviadas" fill="#00a884" radius={[4, 4, 0, 0]} />
            <Bar dataKey="received" name="Recebidas" fill="#34b7f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metas */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#111b21]">🎯 Metas</h3>
          <button onClick={() => setShowAddForm(v => !v)} className="flex items-center gap-1 text-xs text-[#00a884] hover:text-[#02906f] font-medium">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        {showAddForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg flex gap-2 flex-wrap">
            <input className="border rounded px-2 py-1 text-sm flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-[#00a884]" placeholder="Nome da meta" value={newGoal.label} onChange={e => setNewGoal(g => ({ ...g, label: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-[#00a884]" placeholder="Meta" type="number" value={newGoal.goal} onChange={e => setNewGoal(g => ({ ...g, goal: e.target.value }))} />
            <input className="border rounded px-2 py-1 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-[#00a884]" placeholder="Unid." value={newGoal.unit} onChange={e => setNewGoal(g => ({ ...g, unit: e.target.value }))} />
            <button onClick={() => { if (!newGoal.label || !newGoal.goal) return; setGoals(gs => [...gs, { id: Date.now(), label: newGoal.label, value: null, goal: Number(newGoal.goal), unit: newGoal.unit }]); setNewGoal({ label: "", goal: "", unit: "" }); setShowAddForm(false); }} className="px-3 py-1 rounded bg-[#00a884] text-white text-sm">Criar</button>
          </div>
        )}
        <div className="space-y-3">
          {goals.map(g => {
            const liveValue = g.id === 1 ? responseRate : g.id === 2 ? todayMsgs.length : g.id === 3 ? uniqueContactsToday : (g.value ?? 0);
            const isEditing = editingId === g.id;
            return (
              <div key={g.id}>
                {isEditing ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input className="border rounded px-2 py-0.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-[#00a884]" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                    <input className="border rounded px-2 py-0.5 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-[#00a884]" type="number" value={editForm.goal} onChange={e => setEditForm(f => ({ ...f, goal: e.target.value }))} />
                    <input className="border rounded px-2 py-0.5 text-sm w-14 focus:outline-none focus:ring-1 focus:ring-[#00a884]" placeholder="%" value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
                    <button onClick={() => { setGoals(gs => gs.map(x => x.id === g.id ? { ...x, label: editForm.label, goal: Number(editForm.goal), unit: editForm.unit } : x)); setEditingId(null); }} className="text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-700 flex-1">{g.label}</span>
                    <span className="font-semibold">{liveValue}{g.unit} / {g.goal}{g.unit}</span>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => { setEditingId(g.id); setEditForm({ label: g.label, goal: g.goal, unit: g.unit }); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-[#00a884] rounded-full transition-all" style={{ width: `${Math.min(100, (liveValue / g.goal) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}