import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bot, Save, Play, Square } from "lucide-react";
import { toast } from "sonner";

export default function Chatbot() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({ queryKey: ["chatbot-config"], queryFn: () => base44.entities.ChatbotConfig.list() });
  const config = configs[0];

  const [form, setForm] = useState({ active: false, prompt: "", delay_seconds: 3, filter: "individual", model: "claude-sonnet-4-5" });

  useEffect(() => {
    if (config) setForm({ active: config.active || false, prompt: config.prompt || "", delay_seconds: config.delay_seconds || 3, filter: config.filter || "individual", model: config.model || "claude-sonnet-4-5" });
  }, [config]);

  const save = useMutation({
    mutationFn: async (data) => config ? base44.entities.ChatbotConfig.update(config.id, data) : base44.entities.ChatbotConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chatbot-config"] }); toast.success("Configuração salva!"); },
  });

  const { data: messages = [] } = useQuery({ queryKey: ["all-messages"], queryFn: () => base44.entities.Message.list("-timestamp", 50) });
  const botMessages = messages.filter(m => m.direction === "sent").slice(0, 10);

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[#00a884]" />
        <h1 className="text-xl font-bold text-[#111b21]">Chatbot IA (Auto-resposta)</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">{form.active ? "🟢 Ativo" : "🔴 Inativo"}</span>
          <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Config */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-[#111b21]">⚙️ Configuração do Bot</h3>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Personalidade / Prompt do Bot</label>
            <p className="text-xs text-gray-500 mb-1">Esse prompt define como o bot vai responder automaticamente.</p>
            <textarea
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              placeholder="Ex: Você é um assistente amigável de vendas. Responda de forma educada e profissional..."
              value={form.prompt}
              onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Tempo de espera antes de responder (segundos)</label>
            <Input type="number" className="mt-1" value={form.delay_seconds} onChange={e => setForm(f => ({ ...f, delay_seconds: Number(e.target.value) }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Responder apenas mensagens de</label>
            <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.filter} onChange={e => setForm(f => ({ ...f, filter: e.target.value }))}>
              <option value="all">Todos os contatos</option>
              <option value="individual">Apenas individuais (sem grupos)</option>
              <option value="groups">Apenas grupos</option>
              <option value="unread">Apenas não lidas</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Modelo IA</label>
            <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
              <option value="claude-sonnet-4-5">Claude Sonnet 4.5 (rápido)</option>
              <option value="claude-haiku-3-5">Claude Haiku 3.5 (mais rápido)</option>
            </select>
          </div>

          <Button className="w-full bg-[#00a884] hover:bg-[#02906f]" onClick={() => save.mutate(form)}>
            <Save className="w-4 h-4 mr-2" /> Salvar Configuração
          </Button>
        </div>

        {/* Status + Log */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[#111b21] mb-3">📊 Status do Bot</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${form.active ? "text-green-600" : "text-red-500"}`}>{form.active ? "✅ Ativo" : "⛔ Inativo"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Modelo:</span>
                <span className="font-medium">{form.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delay:</span>
                <span className="font-medium">{form.delay_seconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filtro:</span>
                <span className="font-medium">{form.filter}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[#111b21] mb-3">📋 Últimas Mensagens Enviadas</h3>
            {botMessages.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma mensagem enviada ainda.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {botMessages.map(m => (
                  <div key={m.id} className="text-xs bg-[#d9fdd3] rounded-lg p-2">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span>{m.contact_phone}</span>
                      <span>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    <p className="text-gray-800 line-clamp-2">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}