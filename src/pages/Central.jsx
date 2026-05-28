import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, TrendingUp, Flame, Leaf, Trophy, RefreshCw } from "lucide-react";
import { subDays, format } from "date-fns";

export default function Central() {
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Olá! Posso analisar seus leads, pipeline e sugerir estratégias. Pergunte qualquer coisa!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: messages = [] } = useQuery({ queryKey: ["all-messages"], queryFn: () => base44.entities.Message.list("-timestamp", 500) });
  const { data: pipeline = [] } = useQuery({ queryKey: ["pipeline"], queryFn: () => base44.entities.PipelineContact.list() });

  const today = format(new Date(), "yyyy-MM-dd");
  const todayMsgs = messages.filter(m => m.timestamp?.startsWith(today));
  const hotLeads = contacts.filter(c => {
    if (!c.last_contact_date) return false;
    const hours = (Date.now() - new Date(c.last_contact_date).getTime()) / 3600000;
    return hours < 24;
  });
  const engaged = pipeline.filter(p => ["qualificado", "negociando"].includes(p.stage));
  const newLeads = pipeline.filter(p => p.stage === "novo");

  const sendChat = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    const context = `Dados do CRM:
- Contatos totais: ${contacts.length}
- Mensagens hoje: ${todayMsgs.length}
- Leads quentes (últimas 24h): ${hotLeads.length}
- Pipeline: ${pipeline.length} leads (${engaged.length} qualificados/negociando, ${pipeline.filter(p => p.stage === "fechado").length} fechados)
- Taxa de resposta: ${messages.length > 0 ? Math.round((messages.filter(m => m.direction === "sent").length / messages.length) * 100) : 0}%`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${context}\n\nPergunta do usuário: ${userMsg}\n\nResponda como um consultor estratégico de vendas em português, de forma concisa e prática.`,
    });

    setChatMessages(prev => [...prev, { role: "assistant", text: response }]);
    setLoading(false);
  };

  const quickPrompts = [
    { label: "🔥 Converter leads", prompt: "Quais leads devo priorizar para converter agora?" },
    { label: "⏰ Reativar", prompt: "Como posso reativar os contatos inativos?" },
    { label: "🎯 Plano do dia", prompt: "Crie um plano de ação prático para hoje." },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-[#00a884]" />
        <h1 className="text-xl font-bold text-[#111b21]">✨ Central Inteligente</h1>
      </div>

      {/* Cards rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Flame, label: "Leads Quentes", value: hotLeads.length, sub: "últimas 24h", color: "text-red-500", bg: "bg-red-50" },
          { icon: Leaf, label: "Novos Leads", value: newLeads.length, sub: "no pipeline", color: "text-green-600", bg: "bg-green-50" },
          { icon: Trophy, label: "Engajados", value: engaged.length, sub: "qualif. + negoc.", color: "text-yellow-600", bg: "bg-yellow-50" },
          { icon: TrendingUp, label: "Msgs Hoje", value: todayMsgs.length, sub: "mensagens", color: "text-blue-600", bg: "bg-blue-50" },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 shadow-sm`}>
            <Icon className={`w-5 h-5 ${color} mb-1`} />
            <p className="text-2xl font-bold text-[#111b21]">{value}</p>
            <p className="text-xs font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chat IA */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#075e54] text-white p-4 flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div>
            <p className="font-semibold">Chat IA Estratégico</p>
            <p className="text-xs text-white/70">Assistente de Estratégia</p>
          </div>
        </div>

        <div className="h-72 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow-sm ${m.role === "user" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2 rounded-lg text-sm shadow-sm text-gray-500">
                <span className="animate-pulse">🤔 Analisando...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-white">
          <div className="flex gap-2 mb-2 flex-wrap">
            {quickPrompts.map(q => (
              <button key={q.label} className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 transition-colors" onClick={() => { setInput(q.prompt); }}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              placeholder="Pergunte qualquer coisa..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
            />
            <Button size="icon" className="rounded-full bg-[#00a884] hover:bg-[#02906f] flex-shrink-0" onClick={sendChat} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Leads Quentes */}
      {hotLeads.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-[#111b21]">🔥 Leads Quentes — Agir Agora</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {hotLeads.slice(0, 6).map(c => (
              <div key={c.id} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-[#111b21]">{c.name || c.phone}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.last_message?.slice(0, 40)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}