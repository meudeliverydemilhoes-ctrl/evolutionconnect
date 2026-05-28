import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { subDays, format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, MessageCircle, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const COLORS = ["#00a884", "#128c7e", "#25d366", "#dcf8c6", "#075e54", "#34b7f1"];

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: messages = [] } = useQuery({ queryKey: ["all-messages"], queryFn: () => base44.entities.Message.list("-timestamp", 500) });
  const { data: pipeline = [] } = useQuery({ queryKey: ["pipeline"], queryFn: () => base44.entities.PipelineContact.list() });

  // Mensagens por dia (7 dias)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "EEE", { locale: ptBR });
    const dayMsgs = messages.filter(m => m.timestamp?.startsWith(key));
    return { label, sent: dayMsgs.filter(m => m.direction === "sent").length, received: dayMsgs.filter(m => m.direction === "received").length };
  });

  // Hoje
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayMsgs = messages.filter(m => m.timestamp?.startsWith(todayKey));

  // Funil pipeline
  const stages = ["novo", "ativo", "qualificado", "negociando", "fechado", "perdido"];
  const stageLabels = { novo: "Novo", ativo: "Ativo", qualificado: "Qualificado", negociando: "Negociando", fechado: "Fechado", perdido: "Perdido" };
  const funnelData = stages.map(s => ({ name: stageLabels[s], value: pipeline.filter(p => p.stage === s).length })).filter(d => d.value > 0);

  // Valor total pipeline
  const pipelineValue = pipeline.filter(p => !["fechado", "perdido"].includes(p.stage)).reduce((sum, p) => sum + (p.deal_value || 0), 0);

  // Follow-ups pendentes (sem mensagem há +24h)
  const followUpPending = contacts.filter(c => {
    if (!c.last_contact_date) return false;
    const diff = (Date.now() - new Date(c.last_contact_date).getTime()) / 3600000;
    return diff > 24;
  });

  // Top contatos ativos
  const contactMsgCount = contacts.map(c => ({
    name: c.name || c.phone,
    count: messages.filter(m => m.contact_phone === c.phone).length,
  })).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111b21]">📊 Dashboard Inteligente</h1>
        <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total Contatos", value: contacts.length, color: "text-[#00a884]" },
          { icon: MessageCircle, label: "Msgs Hoje", value: todayMsgs.length, color: "text-blue-500" },
          { icon: TrendingUp, label: "Pipeline (R$)", value: `R$ ${pipelineValue.toLocaleString("pt-BR")}`, color: "text-green-600" },
          { icon: Clock, label: "Follow-ups", value: followUpPending.length, color: "text-orange-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[#111b21]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Atividade por Dia */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">📊 Atividade por Dia (7 dias)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sent" name="Enviadas" fill="#00a884" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Recebidas" fill="#34b7f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funil Pipeline */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">🎯 Funil de Vendas</h3>
          {funnelData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Nenhum contato no pipeline</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={funnelData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Follow-ups */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">⏰ Follow-ups Pendentes</h3>
          {followUpPending.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum follow-up pendente ✅</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {followUpPending.slice(0, 10).map(c => {
                const hours = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 3600000);
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name || c.phone}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${hours > 48 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                      {hours}h atrás
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Contatos */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">⭐ Top Contatos Ativos</h3>
          <div className="space-y-2">
            {contactMsgCount.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-[#00a884] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-gray-500">{c.count} msgs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}