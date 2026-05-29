import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, MessageCircle, Send, Trash2, Pencil, MoreVertical, X, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function Grupos() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");
  const [msgMenuId, setMsgMenuId] = useState(null);
  const menuRef = useRef(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMsgMenuId(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const deleteConversation = useMutation({
    mutationFn: async () => {
      const all = await base44.entities.Message.list("-created_date", 1000);
      const toDelete = all.filter(m => m.contact_phone === selectedGroup.phone);
      await Promise.all(toDelete.map(m => base44.entities.Message.delete(m.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", selectedGroup.phone] }),
  });

  const deleteMessage = useMutation({
    mutationFn: (id) => base44.entities.Message.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", selectedGroup.phone] }),
  });

  const editMessage = useMutation({
    mutationFn: ({ id, text }) => base44.entities.Message.update(id, { text }),
    onSuccess: () => { setEditingMsg(null); queryClient.invalidateQueries({ queryKey: ["messages", selectedGroup.phone] }); },
  });

  // Busca apenas grupos
  const { data: rawContacts = [], isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const allContacts = await base44.entities.Contact.list("-last_message_time", 1000);
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
      <div className={`${showChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r flex-col bg-white min-h-0`}>
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
                onClick={() => { setSelectedGroup(group); setShowChat(true); }}
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
      <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 min-w-0`}>
        {selectedGroup ? (
          <>
            {/* Header */}
            <div className="bg-[#f0f2f5] border-b p-4">
              <div className="flex items-center gap-3">
                <button className="md:hidden mr-1 text-[#54656f]" onClick={() => setShowChat(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(selectedGroup.name || selectedGroup.phone)?.[0]?.toUpperCase() || "G"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111b21]">{selectedGroup.name || selectedGroup.phone}</p>
                  <p className="text-xs text-[#667781]">{selectedGroup.phone}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["messages", selectedGroup.phone] })}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Apagar conversa"
                  onClick={() => { if (confirm("Apagar todas as mensagens desta conversa?")) deleteConversation.mutate(); }}
                >
                  <Trash2 className="w-4 h-4" />
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
                  <div key={msg.id || i} className={`flex ${msg.direction === "sent" ? "justify-end" : "justify-start"} group`}>
                    {/* Menu de ações */}
                    <div className={`flex items-end gap-1 ${msg.direction === "sent" ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow-sm ${
                          msg.direction === "sent"
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                            : "bg-white text-[#111b21] rounded-tl-none"
                        }`}
                      >
                        {editingMsg === msg.id ? (
                          <div className="flex gap-1 items-center">
                            <input
                              className="text-sm border rounded px-2 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") editMessage.mutate({ id: msg.id, text: editText }); if (e.key === "Escape") setEditingMsg(null); }}
                              autoFocus
                            />
                            <button onClick={() => editMessage.mutate({ id: msg.id, text: editText })} className="text-green-600"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingMsg(null)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                        <p className="text-[10px] text-[#667781] mt-1 text-right">
                          {new Date(msg.timestamp || msg.created_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {/* Botão de menu por mensagem */}
                      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={msgMenuId === msg.id ? menuRef : null}>
                        <button
                          className="p-1 rounded-full hover:bg-black/10"
                          onClick={() => setMsgMenuId(msgMenuId === msg.id ? null : msg.id)}
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        {msgMenuId === msg.id && (
                          <div className={`absolute z-10 bg-white rounded-lg shadow-lg border py-1 min-w-[120px] ${
                            msg.direction === "sent" ? "right-0" : "left-0"
                          } bottom-6`}>
                            <button
                              className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                              onClick={() => { setEditingMsg(msg.id); setEditText(msg.text); setMsgMenuId(null); }}
                            >
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                              className="w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 text-red-500 flex items-center gap-2"
                              onClick={() => { deleteMessage.mutate(msg.id); setMsgMenuId(null); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Apagar
                            </button>
                          </div>
                        )}
                      </div>
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