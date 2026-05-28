import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, MessageCircle, Users, TrendingUp } from "lucide-react";
import { subDays, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Scorecard() {
  const queryClient = useQueryClient();
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
        <h3 className="font-semibold mb-3 text-[#111b21]">🎯 Metas</h3>
        <div className="space-y-3">
          {[
            { label: "Taxa de Resposta", value: responseRate, goal: 80, unit: "%" },
            { label: "Msgs por Dia", value: todayMsgs.length, goal: 50, unit: "" },
            { label: "Contatos Ativos Hoje", value: uniqueContactsToday, goal: 20, unit: "" },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{m.label}</span>
                <span className="font-semibold">{m.value}{m.unit} / {m.goal}{m.unit}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className="h-2 bg-[#00a884] rounded-full transition-all" style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}