import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Search, MessageCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Chat() {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-last_contact_date"),
  });

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // When contact is selected, load last message as preview
  useEffect(() => {
    if (selectedContact) {
      setChatMessages([]);
    }
  }, [selectedContact]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedContact || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);

    // Add to local chat immediately
    setChatMessages(prev => [...prev, { from: "me", text, time: new Date() }]);

    try {
      await base44.functions.invoke("sendWhatsAppMessage", {
        phone: selectedContact.phone,
        message: text,
      });
      // Update contact's last message
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (e) {
      setChatMessages(prev => [...prev, { from: "error", text: "Erro ao enviar mensagem.", time: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusColor = {
    ativo: "bg-green-100 text-green-700",
    inativo: "bg-gray-100 text-gray-600",
    bloqueado: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Contacts */}
      <div className="w-80 border-r flex flex-col bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <h1 className="font-bold text-lg">WhatsApp</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar contato..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Nenhum contato</div>
          ) : (
            filtered.map(contact => (
              <div
                key={contact.id}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${selectedContact?.id === contact.id ? "bg-green-50 border-l-4 border-l-green-500" : ""}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg flex-shrink-0">
                  {(contact.name || contact.phone)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{contact.name || contact.phone}</p>
                    {contact.last_contact_date && (
                      <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">
                        {format(new Date(contact.last_contact_date), "HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{contact.last_message || contact.phone}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                {(selectedContact.name || selectedContact.phone)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{selectedContact.name || selectedContact.phone}</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{selectedContact.phone}</span>
                  <Badge className={`text-xs ${statusColor[selectedContact.status]}`}>{selectedContact.status}</Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
              {chatMessages.length === 0 && (
                <div className="text-center text-sm text-gray-500 mt-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma mensagem nesta sessão.</p>
                  <p className="text-xs mt-1">As mensagens recebidas aparecem na aba Contatos.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    msg.from === "me"
                      ? "bg-[#dcf8c6] text-gray-800 rounded-br-sm"
                      : msg.from === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-gray-800 rounded-bl-sm"
                  }`}>
                    <p>{msg.text}</p>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {format(msg.time, "HH:mm")}
                      {msg.from === "me" && " ✓✓"}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <Button
                size="icon"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={sendMessage}
                disabled={!message.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#f0f0f0]">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione um contato</p>
            <p className="text-sm mt-1">Escolha um contato na lista para iniciar uma conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}