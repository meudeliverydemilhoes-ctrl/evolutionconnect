import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, Plus, RefreshCw, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const RESULT_STYLES = {
  agendado: "bg-blue-100 text-blue-700",
  realizado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

const RESULT_LABELS = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado", no_show: "No-show" };

const emptyForm = { title: "", contact_name: "", contact_phone: "", contact_email: "", date: "", duration_minutes: 60, notes: "", result: "agendado" };

export default function Reunioes() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [generatingAI, setGeneratingAI] = useState(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => base44.entities.Meeting.list("-date"),
  });

  const save = useMutation({
    mutationFn: async (data) => {
      // Se tem e-mail, salva no contato também
      if (data.contact_phone && data.contact_email) {
        try {
          const contacts = await base44.entities.Contact.filter({ phone: data.contact_phone });
          if (contacts?.length > 0) {
            await base44.entities.Contact.update(contacts[0].id, { email: data.contact_email });
          }
        } catch (e) {
          console.log('Erro ao atualizar e-mail do contato:', e.message);
        }
      }
      return editing ? base44.entities.Meeting.update(editing.id, data) : base44.entities.Meeting.create(data);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      // Se nova reunião agendada com telefone, criar evento e enviar link via WhatsApp
      if (!editing && variables.result === "agendado" && variables.contact_phone) {
        try {
          const res = await base44.functions.invoke("createCalendarEvent", variables);
          if (res.data?.meetLink) {
            toast.success(`✅ Link do Meet enviado via WhatsApp para ${variables.contact_phone}`);
          }
        } catch (e) {
          toast.error("Reunião salva, mas não foi possível criar o evento no Google Calendar.");
        }
      }
    },
  });

  const openEdit = async (m) => { 
    let email = m.contact_email || "";
    // Se não tem e-mail na reunião, tenta buscar do contato
    if (!email && m.contact_phone) {
      try {
        const contacts = await base44.entities.Contact.filter({ phone: m.contact_phone });
        if (contacts?.length > 0) {
          email = contacts[0].email || "";
        }
      } catch (e) {
        console.log('Erro ao buscar e-mail do contato:', e.message);
      }
    }
    setEditing(m); 
    setForm({ 
      title: m.title, 
      contact_name: m.contact_name || "", 
      contact_phone: m.contact_phone || "", 
      contact_email: email, 
      date: m.date?.slice(0, 16) || "", 
      duration_minutes: m.duration_minutes || 60, 
      notes: m.notes || "", 
      result: m.result || "agendado" 
    }); 
    setShowForm(true); 
  };

  const generateAnalysis = async (meeting) => {
    setGeneratingAI(meeting.id);
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analise essa reunião de vendas e gere insights em português:
Título: ${meeting.title}
Contato: ${meeting.contact_name || "N/A"}
Data: ${meeting.date}
Duração: ${meeting.duration_minutes} min
Resultado: ${RESULT_LABELS[meeting.result]}
Anotações: ${meeting.notes || "Nenhuma"}

Forneça: pontos principais, próximos passos sugeridos e probabilidade de fechamento (%).`,
    });
    await base44.entities.Meeting.update(meeting.id, { ai_analysis: analysis });
    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    setGeneratingAI(null);
    toast.success("Análise IA gerada!");
  };

  const today = meetings.filter(m => m.date?.startsWith(format(new Date(), "yyyy-MM-dd")));
  const upcoming = meetings.filter(m => m.result === "agendado" && m.date > new Date().toISOString());
  const past = meetings.filter(m => m.result !== "agendado" || m.date < new Date().toISOString());

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Reuniões</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["meetings"] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" className="bg-[#00a884] hover:bg-[#02906f]" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nova Reunião
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#111b21]">{today.length}</p>
          <p className="text-xs text-gray-500">Reuniões Hoje</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#111b21]">{upcoming.length}</p>
          <p className="text-xs text-gray-500">Agendadas</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#111b21]">{meetings.filter(m => m.result === "realizado").length}</p>
          <p className="text-xs text-gray-500">Realizadas</p>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma reunião registrada.</p>
          <Button className="mt-3 bg-[#00a884] hover:bg-[#02906f]" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Registrar primeira reunião
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#111b21]">{m.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESULT_STYLES[m.result]}`}>{RESULT_LABELS[m.result]}</span>
                  </div>
                  {m.contact_name && <p className="text-sm text-gray-600 mt-0.5">👤 {m.contact_name} {m.contact_phone && `— ${m.contact_phone}`}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {m.date && <span><Calendar className="w-3 h-3 inline mr-0.5" />{format(new Date(m.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
                    {m.duration_minutes && <span><Clock className="w-3 h-3 inline mr-0.5" />{m.duration_minutes} min</span>}
                  </div>
                  {m.notes && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{m.notes}</p>}
                  {m.ai_analysis && <div className="mt-2 text-xs bg-purple-50 border border-purple-200 rounded-lg p-2 text-gray-700 whitespace-pre-wrap">{m.ai_analysis}</div>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)}>Editar</Button>
                  <Button size="sm" variant="outline" className="text-purple-600 border-purple-200" onClick={() => generateAnalysis(m)} disabled={generatingAI === m.id}>
                    {generatingAI === m.id ? "..." : "🧠 IA"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Reunião" : "Nova Reunião"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Título *</label><Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-sm font-medium">Contato</label><Input className="mt-1" placeholder="Nome" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Telefone</label><Input className="mt-1" placeholder="55119..." value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium">E-mail</label><Input type="email" className="mt-1" placeholder="cliente@email.com" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-sm font-medium">Data/Hora *</label><Input type="datetime-local" className="mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Duração (min)</label><Input type="number" className="mt-1" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Resultado</label>
              <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
                {Object.entries(RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Anotações</label><textarea className="w-full mt-1 border rounded-md px-3 py-2 text-sm h-20 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full bg-[#00a884] hover:bg-[#02906f]" onClick={() => save.mutate({ ...form, date: form.date ? new Date(form.date).toISOString() : null })}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}