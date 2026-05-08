import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SendMessageModal({ contact, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    const res = await base44.functions.invoke("sendWhatsAppMessage", {
      phone: contact.phone,
      message: message.trim(),
    });
    setSending(false);
    if (res.data?.status === "ok") {
      toast({ title: "Mensagem enviada!", description: `Para ${contact.name || contact.phone}` });
      onClose();
    } else {
      toast({ title: "Erro ao enviar", description: res.data?.error || "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Enviar mensagem para {contact.name || contact.phone}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">📱 {contact.phone}</p>
          <Textarea
            placeholder="Digite sua mensagem..."
            rows={4}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSend} disabled={!message.trim() || sending}>
              {sending ? "Enviando..." : "Enviar WhatsApp"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}