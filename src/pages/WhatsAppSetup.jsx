import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { appParams } from "@/lib/app-params";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";

export default function WhatsAppSetup() {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      await base44.functions.invoke("setupWebhook", {});
      toast({ title: "Webhook configurado!", description: "O webhook foi registrado com sucesso na Evolution API." });
    } catch (error) {
      toast({ title: "Erro", description: error.message || "Falha ao configurar webhook", variant: "destructive" });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleDeleteAllData = async () => {
    setDeleting(true);
    const [contacts, messages, pipelineContacts] = await Promise.all([
      base44.entities.Contact.list(),
      base44.entities.Message.list(),
      base44.entities.PipelineContact.list(),
    ]);
    await Promise.all([
      ...contacts.map(c => base44.entities.Contact.delete(c.id)),
      ...messages.map(m => base44.entities.Message.delete(m.id)),
      ...pipelineContacts.map(p => base44.entities.PipelineContact.delete(p.id)),
    ]);
    setDeleting(false);
    setShowDeleteDialog(false);
    toast({ title: "Dados apagados", description: "Todos os contatos, mensagens e pipeline foram removidos." });
  };

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
            <Button onClick={handleTestWebhook} disabled={testingWebhook} className="w-full gap-2">
              {testingWebhook && <Loader2 className="w-4 h-4 animate-spin" />}
              {testingWebhook ? "Configurando..." : "Testar e Configurar Webhook"}
            </Button>
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
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Apaga permanentemente todos os contatos, mensagens e entradas do pipeline. Esta ação não pode ser desfeita.</p>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Apagar todos os dados
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar permanentemente todos os contatos, mensagens e entradas do pipeline. Não há como desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAllData}
              disabled={deleting}
            >
              {deleting ? "Apagando..." : "Sim, apagar tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}