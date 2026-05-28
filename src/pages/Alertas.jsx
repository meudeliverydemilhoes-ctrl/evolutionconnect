import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Save, RefreshCw, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Alertas() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({ queryKey: ["alert-config"], queryFn: () => base44.entities.AlertConfig.list() });
  const config = configs[0];
  const [form, setForm] = useState({ follow_up_hours: 24, urgent_hours: 48 });

  useEffect(() => {
    if (config) setForm({ follow_up_hours: config.follow_up_hours || 24, urgent_hours: config.urgent_hours || 48 });
  }, [config]);

  const save = useMutation({
    mutationFn: async (data) => config ? base44.entities.AlertConfig.update(config.id, data) : base44.entities.AlertConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alert-config"] }); toast.success("Configuração salva!"); },
  });

  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });

  const now = Date.now();
  const withDiff = contacts.filter(c => c.last_contact_date).map(c => ({
    ...c, hours: (now - new Date(c.last_contact_date).getTime()) / 3600000,
  })).sort((a, b) => b.hours - a.hours);

  const urgent = withDiff.filter(c => c.hours >= form.urgent_hours);
  const followUp = withDiff.filter(c => c.hours >= form.follow_up_hours && c.hours < form.urgent_hours);
  const ok = withDiff.filter(c => c.hours < form.follow_up_hours);

  const ContactCard = ({ contact, type }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
      type === "urgent" ? "bg-red-50 border-red-200" : type === "followup" ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
    }`}>
      <div>
        <p className="font-medium">{contact.name || contact.phone}</p>
        <p className="text-xs text-gray-500">{contact.phone}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
        type === "urgent" ? "bg-red-100 text-red-700" : type === "followup" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
      }`}>
        {formatDistanceToNow(new Date(contact.last_contact_date), { locale: ptBR, addSuffix: true })}
      </span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Follow-up e Alertas</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{urgent.length}</p>
          <p className="text-sm text-red-500">🚨 Urgentes (+{form.urgent_hours}h)</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <Clock className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-600">{followUp.length}</p>
          <p className="text-sm text-orange-500">⏰ Follow-up (+{form.follow_up_hours}h)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{ok.length}</p>
          <p className="text-sm text-green-500">✅ Em dia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3">⚙️ Configuração de Alertas</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Alertar follow-up após (horas)</label>
              <Input type="number" className="mt-1" value={form.follow_up_hours} onChange={e => setForm(f => ({ ...f, follow_up_hours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Prioridade urgente após (horas)</label>
              <Input type="number" className="mt-1" value={form.urgent_hours} onChange={e => setForm(f => ({ ...f, urgent_hours: Number(e.target.value) }))} />
            </div>
            <Button className="w-full bg-[#00a884] hover:bg-[#02906f]" size="sm" onClick={() => save.mutate(form)}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-red-600">🚨 Alertas Urgentes</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {urgent.length === 0 ? <p className="text-sm text-gray-500">Nenhum alerta urgente ✅</p> : urgent.map(c => <ContactCard key={c.id} contact={c} type="urgent" />)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-3 text-orange-600">⏰ Follow-ups Pendentes</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {followUp.length === 0 ? <p className="text-sm text-gray-500">Nenhum follow-up pendente</p> : followUp.map(c => <ContactCard key={c.id} contact={c} type="followup" />)}
          </div>
        </div>
      </div>
    </div>
  );
}