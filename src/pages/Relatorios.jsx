import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart2, RefreshCw } from "lucide-react";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { base44 as b44 } from "@/api/base44Client";

const COLORS = ["#00a884", "#34b7f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Relatorios() {
  const queryClient = useQueryClient();
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: messages = [] } = useQuery({ queryKey: ["all-messages"], queryFn: () => base44.entities.Message.list("-timestamp", 500) });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: pipeline = [] } = useQuery({ queryKey: ["pipeline"], queryFn: () => base44.entities.PipelineContact.list() });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "dd/MM");
    const dayMsgs = messages.filter(m => m.timestamp?.startsWith(key));
    return {
      label,
      sent: dayMsgs.filter(m => m.direction === "sent").length,
      received: dayMsgs.filter(m => m.direction === "received").length,
      response_rate: dayMsgs.length > 0 ? Math.round((dayMsgs.filter(m => m.direction === "sent").length / dayMsgs.length) * 100) : 0,
    };
  });

  const stages = ["novo", "ativo", "qualificado", "negociando", "fechado", "perdido"];
  const stageLabels = { novo: "Novo", ativo: "Ativo", qualificado: "Qualificado", negociando: "Negociando", fechado: "Fechado", perdido: "Perdido" };
  const funnelData = stages.map(s => ({ name: stageLabels[s], value: pipeline.filter(p => p.stage === s).length }));

  const statusData = [
    { name: "Ativo", value: contacts.filter(c => c.status === "ativo").length },
    { name: "Inativo", value: contacts.filter(c => c.status === "inativo").length },
    { name: "Bloqueado", value: contacts.filter(c => c.status === "bloqueado").length },
  ].filter(d => d.value > 0);

  const totalSent = messages.filter(m => m.direction === "sent").length;
  const totalReceived = messages.filter(m => m.direction === "received").length;
  const avgResponseRate = messages.length > 0 ? Math.round((totalSent / messages.length) * 100) : 0;

  const generateAI = async () => {
    setLoadingAI(true);
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise esses dados de CRM WhatsApp e gere um relatório executivo em português:
- Total contatos: ${contacts.length}
- Total mensagens: ${messages.length} (${totalSent} enviadas, ${totalReceived} recebidas)
- Taxa de resposta: ${avgResponseRate}%
- Pipeline: ${pipeline.length} leads (${pipeline.filter(p => p.stage === "fechado").length} fechados, ${pipeline.filter(p => p.stage === "perdido").length} perdidos)
- Atividade 7 dias: ${JSON.stringify(last7Days)}

Forneça: análise dos pontos fortes, pontos de atenção, e 3 recomendações práticas.`,
    });
    setAiAnalysis(analysis);
    setLoadingAI(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Relatórios e Métricas</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabela Resumo */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-3 text-[#111b21]">📋 Tabela Completa de Métricas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">Métrica</th><th className="text-right py-2">Valor</th></tr></thead>
            <tbody>
              {[
                ["Total de Contatos", contacts.length],
                ["Contatos Ativos", contacts.filter(c => c.status === "ativo").length],
                ["Total de Mensagens", messages.length],
                ["Mensagens Enviadas", totalSent],
                ["Mensagens Recebidas", totalReceived],
                ["Taxa de Resposta", `${avgResponseRate}%`],
                ["Leads no Pipeline", pipeline.length],
                ["Negócios Fechados", pipeline.filter(p => p.stage === "fechado").length],
                ["Negócios Perdidos", pipeline.filter(p => p.stage === "perdido").length],
              ].map(([label, value]) => (
                <tr key={label} className="border-b last:border-0">
                  <td className="py-2 text-gray-700">{label}</td>
                  <td className="py-2 text-right font-semibold text-[#111b21]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Msgs enviadas vs recebidas */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">📊 Mensagens Enviadas vs Recebidas (7d)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="sent" name="Enviadas" fill="#00a884" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Recebidas" fill="#34b7f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxa de resposta */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">💬 Taxa de Resposta por Dia</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={last7Days}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="response_rate" name="Taxa" stroke="#00a884" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Funil */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">🎯 Funil de Leads</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#00a884" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status contatos */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">👥 Status dos Contatos</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IA Analysis */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#111b21]">🧠 Análise IA Completa</h3>
          <Button size="sm" className="bg-[#075e54] hover:bg-[#054f45]" onClick={generateAI} disabled={loadingAI}>
            {loadingAI ? "Analisando..." : "⚡ Gerar Análise"}
          </Button>
        </div>
        {aiAnalysis ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{aiAnalysis}</div>
        ) : (
          <p className="text-sm text-gray-500">Clique em "Gerar Análise" para a IA analisar suas conversas e métricas.</p>
        )}
      </div>
    </div>
  );
}