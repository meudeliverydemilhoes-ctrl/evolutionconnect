import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Search, MessageCircle, Phone, RefreshCw, Wifi, WifiOff, Tag, X, Plus, GitBranch, Check, Sparkles, Loader2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { useEvolutionSocket } from "@/hooks/useEvolutionSocket";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Chat() {
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncContacts = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncWhatsApp", {});
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      const s = res.data?.stats || {};
      import('sonner').then(({ toast }) => toast.success(`Sync concluído: ${s.contacts_created ?? 0} contatos, ${s.messages_created ?? 0} mensagens importadas`));
    } catch (e) {
      import('sonner').then(({ toast }) => toast.error("Erro ao sincronizar: " + e.message));
    } finally {
      setSyncing(false);
    }
  };
  const [profilePics, setProfilePics] = useState({});
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#00a884");
  const [creatingTag, setCreatingTag] = useState(false);
  const [showPipelinePopover, setShowPipelinePopover] = useState(false);
  const [pipelineAdded, setPipelineAdded] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    date: "",
    time: "",
    duration: 30,
    email: selectedContact?.email || "",
    notes: ""
  });

  const scheduleMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date || !meetingForm.time || !selectedContact?.phone) return;
    setSchedulingMeeting(true);
    try {
      if (meetingForm.email) {
        try {
          await base44.entities.Contact.update(selectedContact.id, { email: meetingForm.email });
        } catch (e) {
          console.log('Erro ao atualizar e-mail do contato:', e.message);
        }
      }
      
      const dateTime = new Date(`${meetingForm.date}T${meetingForm.time}`);
      const response = await base44.functions.invoke("createCalendarEvent", {
        title: meetingForm.title,
        date: dateTime.toISOString(),
        duration_minutes: meetingForm.duration,
        notes: meetingForm.notes,
        contact_name: selectedContact.name || selectedContact.phone,
        contact_phone: selectedContact.phone,
        contact_email: meetingForm.email
      });
      
      const messages = [];
      if (response.data?.meetLink) messages.push(`✅ Google Meet criado`);
      if (meetingForm.email) messages.push(`✅ E-mail enviado para ${meetingForm.email}`);
      if (selectedContact.phone) messages.push(`✅ WhatsApp enviado`);
      
      if (messages.length > 0) {
        import('sonner').then(({ toast }) => {
          toast.success(messages.join(' | '));
        });
      }
      
      setMeetingForm({ title: "", date: "", time: "", duration: 30, email: "", notes: "" });
      setShowScheduleModal(false);
      queryClient.invalidateQueries({ queryKey: ["messages", selectedContact.phone] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (error) {
      import('sonner').then(({ toast }) => {
        toast.error(`Erro ao agendar: ${error.message}`);
      });
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const analyzeConversation = async () => {
    if (!allMessages.length || analyzing) return;
    setAnalyzing(true);
    setShowAnalysis(true);
    setAnalysis(null);
    const history = allMessages.map((m, i) => {
      const prev = allMessages[i - 1];
      const diffMin = prev ? Math.round((new Date(m.timestamp || m.created_date) - new Date(prev.timestamp || prev.created_date)) / 60000) : 0;
      return `[${m.direction === "sent" ? "SDR" : "Cliente"} ${diffMin > 0 ? `+${diffMin}min` : ""}]: ${m.text}`;
    }).join("\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em vendas e SDR (Sales Development Representative). Analise a seguinte conversa de WhatsApp entre um SDR e um cliente potencial.\n\nConversa:\n${history}\n\nGere uma análise detalhada em português no seguinte formato JSON:\n{
  "nota_geral": (0-10),
  "pontos_criticos": [lista de pontos críticos observados],
  "pontos_positivos": [lista de pontos positivos],
  "oportunidades_melhoria": [o que o SDR poderia ter feito melhor],
  "tempo_resposta_medio": "tempo médio de resposta do SDR",
  "total_mensagens_sdr": numero,
  "total_mensagens_cliente": numero,
  "engajamento_cliente": "baixo/médio/alto",
  "etapa_funil": "etapa atual do cliente no funil",
  "proximo_passo_recomendado": "acao recomendada",
  "resumo_executivo": "resumo em 2 linhas"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          nota_geral: { type: "number" },
          pontos_criticos: { type: "array", items: { type: "string" } },
          pontos_positivos: { type: "array", items: { type: "string" } },
          oportunidades_melhoria: { type: "array", items: { type: "string" } },
          tempo_resposta_medio: { type: "string" },
          total_mensagens_sdr: { type: "number" },
          total_mensagens_cliente: { type: "number" },
          engajamento_cliente: { type: "string" },
          etapa_funil: { type: "string" },
          proximo_passo_recomendado: { type: "string" },
          resumo_executivo: { type: "string" },
        }
      }
    });
    setAnalysis(result);
    setAnalyzing(false);
  };

  const summarizeConversation = async () => {
    if (!allMessages.length || summarizing) return;
    setSummarizing(true);
    setShowSummary(true);
    setSummary("");
    const history = allMessages.map(m =>
      `${m.direction === "sent" ? "Atendente" : (selectedContact.name || selectedContact.phone)}: ${m.text}`
    ).join("\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Resuma a seguinte conversa de WhatsApp de forma clara e objetiva em português. Destaque: assunto principal, pontos importantes mencionados, solicitações ou problemas do cliente, e próximos passos (se houver).\n\nConversa:\n${history}`,
    });
    setSummary(result);
    setSummarizing(false);
  };

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

  const { data: pipelineConfig } = useQuery({
    queryKey: ["pipelineConfig"],
    queryFn: () => base44.entities.PipelineConfig.list(),
    select: (data) => data[0],
  });

  const pipelineStages = pipelineConfig?.stages?.length
    ? pipelineConfig.stages
    : [
        { id: "novo", label: "Novo", color: "#6b7280" },
        { id: "ativo", label: "Ativo", color: "#3b82f6" },
        { id: "qualificado", label: "Qualificado", color: "#8b5cf6" },
        { id: "negociando", label: "Negociando", color: "#f59e0b" },
        { id: "fechado", label: "Fechado", color: "#22c55e" },
      ];

  const addToPipeline = useMutation({
    mutationFn: async (stage) => {
      const existing = await base44.entities.PipelineContact.filter({ contact_phone: selectedContact.phone });
      if (existing?.length > 0) {
        await base44.entities.PipelineContact.update(existing[0].id, { stage });
      } else {
        await base44.entities.PipelineContact.create({
          contact_phone: selectedContact.phone,
          contact_name: selectedContact.name || selectedContact.phone,
          stage,
        });
      }
    },
    onSuccess: (_, stage) => {
      setPipelineAdded(prev => ({ ...prev, [selectedContact.phone]: stage }));
      setShowPipelinePopover(false);
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => base44.entities.Tag.list(),
  });

  const { data: rawContacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-last_message_time", 1000),
  });

  const contacts = Object.values(
    rawContacts.reduce((acc, c) => {
      const key = c.phone;
      if (!key) return acc;
      if (!acc[key]) { acc[key] = c; }
      return acc;
    }, {})
  ).sort((a, b) => {
    const ta = a.last_message_time || a.last_contact_date || a.created_date || "";
    const tb = b.last_message_time || b.last_contact_date || b.created_date || "";
    return tb.localeCompare(ta);
  });

  const extractAudio = (msg) => {
    if (!msg) return null;
    if (msg.audioMessage?.url) return msg.audioMessage.url;
    if (msg.pttMessage?.url) return msg.pttMessage.url;
    return null;
  };

  const { data: allMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedContact?.phone],
    queryFn: async () => {
      if (!selectedContact) return [];
      const msgs = await base44.entities.Message.filter(
        { contact_phone: selectedContact.phone },
        "-created_date",
        200
      );
      if (msgs) msgs.reverse();
      return msgs || [];
    },
    enabled: !!selectedContact,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const fetchProfilePic = async (contact) => {
    if (!contact?.phone) return;
    if (profilePics[contact.phone] !== undefined) return;
    if (contact.profile_pic) {
      setProfilePics(prev => ({ ...prev, [contact.phone]: contact.profile_pic }));
      return;
    }
    setProfilePics(prev => ({ ...prev, [contact.phone]: null }));
    try {
      const res = await base44.functions.invoke("getProfilePic", { phone: contact.phone });
      const url = res?.data?.profilePicUrl || null;
      if (url) setProfilePics(prev => ({ ...prev, [contact.phone]: url }));
    } catch {}
  };

  useEffect(() => {
    if (contacts.length > 0) {
      contacts.slice(0, 20).forEach(c => fetchProfilePic(c));
    }
  }, [contacts]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(timer);
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

  const TAG_COLORS = ["#00a884","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    await base44.entities.Tag.create({ name: newTagName.trim(), color: newTagColor });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    setNewTagName("");
    setCreatingTag(false);
  };

  const applyTag = async (contact, tagId) => {
    const currentTags = contact.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    await base44.entities.Contact.update(contact.id, { tags: newTags });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    if (selectedContact?.id === contact.id) {
      setSelectedContact(prev => ({ ...prev, tags: newTags }));
    }
  };

  const ContactAvatar = ({ contact, size = "md" }) => {
    const pic = profilePics[contact.phone];
    const initial = (contact.name || contact.phone)?.[0]?.toUpperCase();
    const sizeClass = size === "md" ? "w-12 h-12 text-xl" : "w-10 h-10 text-lg";
    return (
      <div className={`${sizeClass} rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-bold flex-shrink-0 overflow-hidden`}>
        {pic ? (
          <img src={pic} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : initial}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      <div className={`${showChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r flex-col bg-white min-h-0 min-w-0`}>
        <div className="p-4 border-b bg-[#075e54]">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-white" />
            <h1 className="font-bold text-lg text-white">WhatsApp</h1>
            <button
              onClick={syncContacts}
              disabled={syncing}
              className="ml-auto p-1 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Importar conversas existentes"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <span className="flex items-center gap-1 text-xs text-white/80">
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
                  onClick={() => { setSelectedContact(contact); setShowChat(true); fetchProfilePic(contact); }}
                >
                  <ContactAvatar contact={contact} size="md" />
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
                    {contact.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.tags.slice(0, 3).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span key={tagId} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: tag.color || '#00a884' }}>
                              {tag.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 min-w-0`}>
        {selectedContact ? (
          <>
            <div className="bg-[#f0f2f5] border-b">
              <div className="px-3 pt-3 pb-2 flex items-center gap-3">
                <button className="md:hidden mr-1 text-[#54656f]" onClick={() => setShowChat(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <ContactAvatar contact={selectedContact} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#111b21] truncate">{selectedContact.name || selectedContact.phone}</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-[#667781]" />
                    <span className="text-xs text-[#667781] truncate">{selectedContact.phone}</span>
                    <Badge className={`text-xs flex-shrink-0 ${statusColor[selectedContact.status]}`}>{selectedContact.status}</Badge>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => refetchMessages()}>
                  <RefreshCw className="w-4 h-4 text-[#54656f]" />
                </Button>
              </div>
              <div className="px-3 pb-2 flex items-center gap-2 border-t border-black/5 pt-2">
                {selectedContact.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {selectedContact.tags.slice(0, 3).map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span key={tagId} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: tag.color || '#00a884' }}>
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <Button size="sm" variant="ghost" className="gap-1 text-purple-600 text-xs h-7 px-2" onClick={analyzeConversation} disabled={analyzing || !allMessages.length}>
                    {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Análise SDR
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-[#00a884] text-xs h-7 px-2" onClick={() => {
                    setMeetingForm(prev => ({ ...prev, email: selectedContact?.email || "" }));
                    setShowScheduleModal(true);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Agendar
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-[#54656f] text-xs h-7 px-2" onClick={summarizeConversation} disabled={summarizing || !allMessages.length}>
                    {summarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Resumir
                  </Button>
                  <Popover open={showPipelinePopover} onOpenChange={setShowPipelinePopover}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost" className={`gap-1 text-xs h-7 px-2 ${pipelineAdded[selectedContact.phone] ? 'text-green-600' : 'text-[#54656f]'}`}>
                        {pipelineAdded[selectedContact.phone] ? <Check className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
                        Pipeline
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <p className="text-xs font-semibold text-gray-500 mb-2 px-1">ADICIONAR AO PIPELINE</p>
                      {pipelineStages.map(stage => (
                        <button
                          key={stage.id}
                          onClick={() => addToPipeline.mutate(stage.id)}
                          disabled={addToPipeline.isPending}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-left transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#6b7280' }} />
                          <span>{stage.label}</span>
                          {pipelineAdded[selectedContact.phone] === stage.id && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost" className="gap-1 text-[#54656f] text-xs h-7 px-2">
                        <Tag className="w-3.5 h-3.5" />
                        Etiquetas
                        {selectedContact.tags?.length > 0 && (
                          <span className="ml-0.5 bg-[#00a884] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">{selectedContact.tags.length}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <p className="text-xs font-semibold text-gray-500 mb-2">ETIQUETAS</p>
                      {tags.length === 0 ? (
                        <p className="text-xs text-gray-400 mb-2">Nenhuma etiqueta criada ainda.</p>
                      ) : (
                        <div className="flex flex-col gap-1 mb-2">
                          {tags.map(tag => {
                            const active = selectedContact.tags?.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => applyTag(selectedContact, tag.id)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors w-full text-left ${
                                  active ? 'bg-gray-100' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#00a884' }} />
                                <span className="flex-1 text-[#111b21]">{tag.name}</span>
                                {active && <X className="w-3 h-3 text-gray-400" />}
                                {!active && <Plus className="w-3 h-3 text-gray-300" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">NOVA ETIQUETA</p>
                        <div className="flex gap-1 mb-1.5">
                          {TAG_COLORS.map(c => (
                            <button key={c} onClick={() => setNewTagColor(c)}
                              className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform ${newTagColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input
                            className="flex-1 text-xs border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#00a884]"
                            placeholder="Nome da etiqueta..."
                            value={newTagName}
                            onChange={e => setNewTagName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                          />
                          <button
                            onClick={handleCreateTag}
                            disabled={!newTagName.trim() || creatingTag}
                            className="px-2 py-1 rounded-md text-white text-xs font-medium disabled:opacity-40"
                            style={{ backgroundColor: newTagColor }}
                          >
                            {creatingTag ? '...' : 'Criar'}
                          </button>
                        </div>
                      </div>
                      {selectedContact.tags?.length > 0 && (
                        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                          {selectedContact.tags.map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <span key={tagId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: tag.color || '#00a884' }}>
                                {tag.name}
                                <button onClick={() => applyTag(selectedContact, tagId)}><X className="w-2.5 h-2.5" /></button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

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
              {allMessages.map((msg, i) => {
                const audioUrl = extractAudio(msg.message);
                return (
                  <div key={msg.id || i} className={`flex ${msg.direction === "sent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow-sm relative ${
                      msg.direction === "sent"
                        ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                        : "bg-white text-[#111b21] rounded-tl-none"
                    }`}>
                      {audioUrl && (
                        <div className="mb-2">
                          <audio controls className="w-full max-w-xs rounded" style={{height: '32px'}}>
                            <source src={audioUrl} type="audio/ogg" />
                            Seu navegador não suporta áudio.
                          </audio>
                        </div>
                      )}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {!msg.text && !audioUrl && <p className="italic text-gray-500">[áudio]</p>}
                      <p className="text-[10px] text-[#667781] mt-1 text-right">
                        {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
                        {msg.direction === "sent" && <span className="ml-1 text-[#53bdeb]">✓✓</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Análise SDR
                    {analysis && (
                      <span className={`ml-auto text-sm font-bold px-2 py-0.5 rounded-full ${
                        analysis.nota_geral >= 8 ? 'bg-green-100 text-green-700' :
                        analysis.nota_geral >= 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{analysis.nota_geral}/10</span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                {analyzing ? (
                  <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Analisando conversa...
                  </div>
                ) : analysis && (
                  <div className="space-y-4 text-sm">
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-3 italic">{analysis.resumo_executivo}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-500 font-medium">Mensagens SDR</p>
                        <p className="text-xl font-bold text-blue-700">{analysis.total_mensagens_sdr}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-purple-500 font-medium">Mensagens Cliente</p>
                        <p className="text-xl font-bold text-purple-700">{analysis.total_mensagens_cliente}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-500 font-medium">Tempo Resposta</p>
                        <p className="text-sm font-bold text-green-700">{analysis.tempo_resposta_medio}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-orange-500 font-medium">Engajamento</p>
                        <p className="text-sm font-bold text-orange-700 capitalize">{analysis.engajamento_cliente}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">ETAPA NO FUNIL</p>
                      <p className="text-gray-700">{analysis.etapa_funil}</p>
                    </div>
                    {analysis.pontos_positivos?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-600 mb-1">✅ PONTOS POSITIVOS</p>
                        <ul className="space-y-1">{analysis.pontos_positivos.map((p, i) => <li key={i} className="text-gray-700 bg-green-50 rounded px-2 py-1">{p}</li>)}</ul>
                      </div>
                    )}
                    {analysis.pontos_criticos?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-1">⚠️ PONTOS CRÍTICOS</p>
                        <ul className="space-y-1">{analysis.pontos_criticos.map((p, i) => <li key={i} className="text-gray-700 bg-red-50 rounded px-2 py-1">{p}</li>)}</ul>
                      </div>
                    )}
                    {analysis.oportunidades_melhoria?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-blue-600 mb-1">💡 O QUE MELHORAR</p>
                        <ul className="space-y-1">{analysis.oportunidades_melhoria.map((p, i) => <li key={i} className="text-gray-700 bg-blue-50 rounded px-2 py-1">{p}</li>)}</ul>
                      </div>
                    )}
                    <div className="bg-[#00a884]/10 rounded-lg p-3 border border-[#00a884]/20">
                      <p className="text-xs font-semibold text-[#00a884] mb-1">🎯 PRÓXIMO PASSO</p>
                      <p className="text-gray-700">{analysis.proximo_passo_recomendado}</p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Agendar Reunião</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Assunto da Reunião *</label>
                    <Input
                      placeholder="Ex: Apresentação de produto"
                      value={meetingForm.title}
                      onChange={e => setMeetingForm({...meetingForm, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Data *</label>
                      <Input
                        type="date"
                        value={meetingForm.date}
                        onChange={e => setMeetingForm({...meetingForm, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Hora *</label>
                      <Input
                        type="time"
                        value={meetingForm.time}
                        onChange={e => setMeetingForm({...meetingForm, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Duração (minutos)</label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={meetingForm.duration}
                      onChange={e => setMeetingForm({...meetingForm, duration: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">E-mail do Cliente</label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={meetingForm.email}
                      onChange={e => setMeetingForm({...meetingForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Notas</label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                      rows="3"
                      placeholder="Observações sobre a reunião..."
                      value={meetingForm.notes}
                      onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})}
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                    ℹ️ A reunião será adicionada ao Google Calendar e o cliente será notificado via WhatsApp com o link de acesso.
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowScheduleModal(false)}
                      disabled={schedulingMeeting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-[#00a884] hover:bg-[#02906f] text-white gap-2"
                      onClick={scheduleMeeting}
                      disabled={schedulingMeeting || !meetingForm.title || !meetingForm.date || !meetingForm.time}
                    >
                      {schedulingMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Agendar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showSummary} onOpenChange={setShowSummary}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Resumo da Conversa
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {summarizing ? (
                    <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" /> Gerando resumo...
                    </div>
                  ) : summary}
                </div>
              </DialogContent>
            </Dialog>

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