import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Search, MessageCircle, Phone, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvolutionSocket } from "@/hooks/useEvolutionSocket";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function Chat() {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const selectedContactRef = useRef(selectedContact);
  selectedContactRef.current = selectedContact;

  useEvolutionSocket({
    onNewMessage: (msg) => {
      queryClient.invalidateQueries({ queryKey: ["messages", msg.phone] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onConnectionChange: setSocketConnected,
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-last_contact_date"),
  });

  const { data: allMessages = [], refetch: refetchMessages, isError: msgError } = useQuery({
    queryKey: ["messages", selectedContact?.phone],
    queryFn: async () => {
      if (!selectedContact) return [];
      const msgs = await base44.entities.Message.filter(
        { contact_phone: selectedContact.phone },
        "created_date",
        200
      );
      console.log("[Chat] mensagens carregadas para", selectedContact.phone, ":", msgs?.length, msgs);
      return msgs || [];
    },
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  // Tempo real via subscriptions do Base44 (apenas para mensagens recebidas)
  useEffect(() => {
    const unsubMsg = base44.entities.Message.subscribe((event) => {
      const phone = event.data?.contact_phone;
      if (phone) {
        if (selectedContactRef.current?.phone === phone) {
          queryClient.invalidateQueries({ queryKey: ["messages", phone] });
        }
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      }
    });
    return unsubMsg;
  }, [queryClient]);

  useEffect(() => {
    const unsubContact = base44.entities.Contact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    });
    return unsubContact;
  }, [queryClient]);

  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [allMessages]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedContact || sending) return;
    const text = message.trim();
    const phone = selectedContact.phone;
    const queryKey = ["messages", phone];
    setMessage("");
    setSending(true);
    try {
      await base44.functions.invoke("sendWhatsAppMessage", { phone, message: text });
      // Forçar refetch imediato após salvar
      await queryClient.refetchQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (e) {
      console.error("Erro ao enviar:", e);
      queryClient.invalidateQueries({ queryKey });
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
      {/* Sidebar - Contatos */}
      <div className="w-80 border-r flex flex-col bg-white">
        <div className="p-4 border-b bg-[#075e54]">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-white" />
            <h1 className="font-bold text-lg text-white">WhatsApp</h1>
            <span className="ml-auto flex items-center gap-1 text-xs text-white/80">
              {socketConnected ? <Wifi className="w-3 h-3 text-green-300" /> : <WifiOff className="w-3 h-3 text-red-300" />}
              {socketConnected ? "Online" : (
                <Link to="/whatsapp-connect" className="text-red-300 hover:text-red-100 underline">Reconectar</Link>
              )}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 bg-white/90 border-0"
              placeholder="Buscar contato..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : contacts.filter(c =>
              c.name?.toLowerCase().includes(search.toLowerCase()) ||
              c.phone?.includes(search)
            ).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Nenhum contato</div>
          ) : (
            contacts
              .filter(c =>
                c.name?.toLowerCase().includes(search.toLowerCase()) ||
                c.phone?.includes(search)
              )
              .map(contact => (
                <div
                  key={contact.id}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${selectedContact?.id === contact.id ? "bg-[#f0f0f0]" : ""}`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="w-12 h-12 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-bold text-xl flex-shrink-0">
                    {(contact.name || contact.phone)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{contact.name || contact.phone}</p>
                      {contact.last_contact_date && (
                        <span className="text-xs text-[#667781] ml-1 flex-shrink-0">
                          {format(new Date(contact.last_contact_date), "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#667781] truncate">{contact.last_message || contact.phone}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-3 bg-[#f0f2f5] border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-bold text-lg">
                {(selectedContact.name || selectedContact.phone)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#111b21]">{selectedContact.name || selectedContact.phone}</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-[#667781]" />
                  <span className="text-xs text-[#667781]">{selectedContact.phone}</span>
                  <Badge className={`text-xs ${statusColor[selectedContact.status]}`}>{selectedContact.status}</Badge>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => refetchMessages()}>
                <RefreshCw className="w-4 h-4 text-[#54656f]" />
              </Button>
            </div>

            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-2"
              style={{ background: "#e5ddd5 url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b4b4b4' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
            >
              {allMessages.length === 0 && (
                <div className="text-center text-sm text-gray-500 mt-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma mensagem ainda.</p>
                  <p className="text-xs mt-1">Envie uma mensagem para começar.</p>
                </div>
              )}
              {allMessages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.direction === "sent" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow-sm relative ${
                    msg.direction === "sent"
                      ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                      : "bg-white text-[#111b21] rounded-tl-none"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[10px] text-[#667781] mt-1 text-right">
                      {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
                      {msg.direction === "sent" && <span className="ml-1 text-[#53bdeb]">✓✓</span>}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[#f0f2f5] border-t flex items-center gap-2">
              <Input
                className="flex-1 bg-white rounded-full border-0 shadow-sm px-4"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <Button
                size="icon"
                className="rounded-full bg-[#00a884] hover:bg-[#02906f] text-white w-10 h-10"
                onClick={sendMessage}
                disabled={!message.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#f0f2f5]">
            <div className="bg-white rounded-full p-6 mb-4 shadow-sm">
              <MessageCircle className="w-16 h-16 opacity-20 text-[#00a884]" />
            </div>
            <p className="text-xl font-light text-[#41525d]">WhatsApp Web</p>
            <p className="text-sm mt-2 text-[#667781]">Selecione um contato para ver as mensagens</p>
          </div>
        )}
      </div>
    </div>
  );
}