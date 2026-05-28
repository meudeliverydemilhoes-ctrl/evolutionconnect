import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, MessageCircle, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function Grupos() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Busca apenas grupos
  const { data: rawContacts = [], isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const allContacts = await base44.entities.Contact.list("-last_contact_date", 500);
      return allContacts.filter(c => c.phone && c.is_group === true);
    },
    refetchInterval: 2000,
    staleTime: 0,
  });

  // Subscribe para atualizações em tempo real
  useEffect(() => {
    const unsubscribe = base44.entities.Contact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Busca mensagens do grupo selecionado
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedGroup?.phone],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const allMessages = await base44.entities.Message.list("-created_date", 200);
      const filtered = allMessages.filter(m => m.contact_phone === selectedGroup.phone);
      return filtered.reverse();
    },
    enabled: !!selectedGroup,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const sendMessage = async () => {
    if (!message.trim() || !selectedGroup || sending) return;
    const text = message.trim();
    const phone = selectedGroup.phone;
    setMessage("");
    setSending(true);
    try {
      await base44.functions.invoke("sendWhatsAppMessage", { 
        phone, 
        message: text 
      });
      queryClient.invalidateQueries({ queryKey: ["messages", phone] });
    } catch (e) {
      console.error("Erro ao enviar:", e);
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

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      {/* Lista de Grupos */}
      <div className="w-full md:w-80 border-r flex-col bg-white min-h-0 flex">
        <div className="p-4 border-b bg-[#075e54]">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-white" />
            <h1 className="font-bold text-lg text-white">Grupos WhatsApp</h1>
          </div>
          <div className="text-xs text-white/80">
            {rawContacts.length} grupo{rawContacts.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : rawContacts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum grupo ainda</p>
              <p className="text-xs mt-1">Envie uma mensagem em um grupo para aparecer aqui</p>
            </div>
          ) : (
            rawContacts.map((group) => (
              <button
                key={group.id}
                className={`w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors text-left ${
                  selectedGroup?.id === group.id ? "bg-[#f0f0f0]" : ""
                }`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(group.name || group.phone)?.[0]?.toUpperCase() || "G"}
                </div>
                <div className="flex-1 min-w-0 border-b pb-3">
                  <p className="font-medium text-sm truncate">{group.name || group.phone}</p>
                  <p className="text-xs text-[#667781] truncate">{group.last_message || "Sem mensagens"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat do Grupo */}
      <div className="hidden md:flex flex-1 flex-col min-h-0 min-w-0">
        {selectedGroup ? (
          <>
            {/* Header */}
            <div className="bg-[#f0f2f5] border-b p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(selectedGroup.name || selectedGroup.phone)?.[0]?.toUpperCase() || "G"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111b21]">{selectedGroup.name || selectedGroup.phone}</p>
                  <p className="text-xs text-[#667781]">{selectedGroup.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["messages", selectedGroup.phone] })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "#e5ddd5" }}>
              {messages.length === 0 ? (
                <div className="text-center text-sm text-gray-500 mt-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma mensagem</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.direction === "sent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow-sm ${
                        msg.direction === "sent"
                          ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                          : "bg-white text-[#111b21] rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className="text-[10px] text-[#667781] mt-1 text-right">
                        {new Date(msg.timestamp || msg.created_date).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-[#f0f2f5] border-t flex items-center gap-2">
              <textarea
                className="flex-1 bg-white rounded-full border-0 shadow-sm px-4 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                rows="1"
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
              <Users className="w-16 h-16 opacity-20 text-[#00a884]" />
            </div>
            <p className="text-xl font-light text-[#41525d]">Grupos WhatsApp</p>
            <p className="text-sm mt-2 text-[#667781]">Selecione um grupo para ver as mensagens</p>
          </div>
        )}
      </div>
    </div>
  );
}