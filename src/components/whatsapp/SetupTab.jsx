import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function SetupTab() {
  const { toast } = useToast();

  const webhookPath = "/functions/whatsappWebhook";

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookPath);
    toast({ title: "Copiado!", description: "URL do webhook copiada." });
  };

  const steps = [
    {
      title: "1. Configure a Evolution API",
      description: "Acesse o painel da sua Evolution API e navegue até a configuração de webhooks da sua instância.",
      done: true,
    },
    {
      title: "2. Configure o Webhook",
      description: "Na Evolution API, configure o webhook para apontar para a URL da função abaixo. Habilite o evento 'messages.upsert'.",
      done: true,
    },
    {
      title: "3. Credenciais configuradas",
      description: "EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE estão configurados.",
      done: true,
    },
    {
      title: "4. Automação de Pedidos",
      description: "Automação criada: quando status de pedido mudar para 'enviado', o cliente receberá uma mensagem WhatsApp automática.",
      done: true,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL do Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Configure este endpoint na sua Evolution API como webhook para receber mensagens. Ative o evento <strong>messages.upsert</strong>.
          </p>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
            <code className="text-sm flex-1 break-all">{webhookPath}</code>
            <Button variant="ghost" size="icon" onClick={copyWebhook}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A URL completa pode ser encontrada em: Dashboard → Code → Functions → whatsappWebhook
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.done ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>📩 <strong>Mensagens recebidas:</strong> Quando um cliente envia mensagem no WhatsApp, o webhook cria/atualiza o contato automaticamente e o agente de IA responde.</p>
          <p>📦 <strong>Notificação de envio:</strong> Ao mudar o status de um pedido para <Badge className="text-xs bg-purple-100 text-purple-700">enviado</Badge>, o cliente recebe automaticamente uma mensagem com os dados de rastreamento.</p>
          <p>👤 <strong>Contatos automáticos:</strong> Cada número que envia mensagem é automaticamente cadastrado ou atualizado na aba Contatos.</p>
        </CardContent>
      </Card>
    </div>
  );
}