import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { appParams } from "@/lib/app-params";

export default function WhatsAppSetup() {
  const { toast } = useToast();

  // App ID correto vindo do SDK
  const appId = appParams.appId;
  const webhookUrl = `https://api.base44.com/api/apps/${appId}/functions/whatsappWebhook`;


  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Configuração do WhatsApp</h1>
      <p className="text-muted-foreground mb-6">Configure o webhook na sua Evolution API para integrar o WhatsApp ao app.</p>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">1</span>
              Configure o Webhook na Evolution API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">No painel da sua Evolution API, vá em <strong>Configurações → Webhook</strong> e configure:</p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">URL do Webhook:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm break-all flex-1">{webhookUrl}</code>
                <Button size="sm" variant="outline" onClick={copyUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p>✅ <strong>Eventos a ativar:</strong> <code>messages.upsert</code></p>
              <p>✅ <strong>Método:</strong> POST</p>
              <p>✅ <strong>Instância:</strong> meudelivery</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">2</span>
              Como funciona o fluxo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: "📩", title: "Mensagem recebida", desc: "Cliente envia mensagem no WhatsApp" },
                { icon: "👤", title: "Contato criado/atualizado", desc: "O sistema cria ou atualiza o contato automaticamente na aba Contatos" },
                { icon: "🤖", title: "Agente IA responde", desc: "O agente de IA analisa a mensagem e responde automaticamente" },
                { icon: "🚚", title: "Notificação de envio", desc: "Quando um pedido muda para 'enviado', o cliente recebe automaticamente o código de rastreamento" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">3</span>
              Status das Credenciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "EVOLUTION_API_URL", set: true },
                { label: "EVOLUTION_API_KEY", set: true },
                { label: "EVOLUTION_INSTANCE", set: true },
              ].map(({ label, set }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <code className="text-sm">{label}</code>
                  <Badge className={set ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {set ? <><CheckCircle className="w-3 h-3 mr-1 inline" /> Configurado</> : <><AlertCircle className="w-3 h-3 mr-1 inline" /> Pendente</>}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}