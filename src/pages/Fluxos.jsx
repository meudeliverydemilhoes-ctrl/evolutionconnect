import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, RefreshCw, Trash2, Clock } from "lucide-react";

const emptyForm = { name: "", active: false, trigger: "", steps: [{ delay_hours: 1, message: "" }] };

export default function Fluxos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const { data: flows = [], isLoading } = useQuery({ queryKey: ["flows"], queryFn: () => base44.entities.Flow.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? base44.entities.Flow.update(editing.id, data) : base44.entities.Flow.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flows"] }); setShowForm(false); setEditing(null); setForm(emptyForm); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Flow.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Flow.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });

  const openEdit = (f) => { setEditing(f); setForm({ name: f.name, active: f.active || false, trigger: f.trigger || "", steps: f.steps || [{ delay_hours: 1, message: "" }] }); setShowForm(true); };

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { delay_hours: 1, message: "" }] }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i, field, value) => setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">⚡ Fluxos de Automação</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["flows"] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" className="bg-[#00a884] hover:bg-[#02906f]" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo Fluxo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#111b21]">{flows.length}</p>
          <p className="text-xs text-gray-500">Total de Fluxos</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{flows.filter(f => f.active).length}</p>
          <p className="text-xs text-gray-500">Ativos</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#111b21]">{flows.reduce((sum, f) => sum + (f.steps?.length || 0), 0)}</p>
          <p className="text-xs text-gray-500">Etapas Total</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : flows.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-2">Nenhum fluxo criado ainda.</p>
          <p className="text-xs text-gray-400 mb-4">Crie funis de mensagens automáticas por etapas com delays programados.</p>
          <Button className="bg-[#00a884] hover:bg-[#02906f]" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Fluxo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(f => (
            <div key={f.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${f.active ? "bg-green-500" : "bg-gray-300"}`} />
                  <h3 className="font-semibold text-[#111b21]">{f.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={f.active || false} onCheckedChange={v => toggle.mutate({ id: f.id, active: v })} />
                  <Button size="sm" variant="outline" onClick={() => openEdit(f)}>Editar</Button>
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => remove.mutate(f.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {f.trigger && <p className="text-xs text-gray-500 mb-3">Gatilho: {f.trigger}</p>}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(f.steps || []).map((step, i) => (
                  <div key={i} className="flex items-center gap-1 flex-shrink-0">
                    {i > 0 && <div className="w-6 h-0.5 bg-gray-300" />}
                    <div className="bg-gray-50 border rounded-lg p-2 text-xs w-36">
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{step.delay_hours}h</span>
                      </div>
                      <p className="line-clamp-2 text-gray-700">{step.message || "Sem mensagem"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Fluxo" : "Novo Fluxo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Nome do Fluxo *</label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Gatilho (descrição)</label><Input className="mt-1" placeholder="Ex: Novo lead cadastrado" value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <span className="text-sm">{form.active ? "Ativo" : "Inativo"}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Etapas do Fluxo</label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 mr-1" /> Etapa</Button>
              </div>
              <div className="space-y-3">
                {form.steps.map((step, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Etapa {i + 1}</span>
                      {form.steps.length > 1 && <Button size="sm" variant="ghost" className="text-red-500 h-6 px-2" onClick={() => removeStep(i)}><Trash2 className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Delay (horas)</label>
                        <Input type="number" className="mt-0.5 h-8 text-sm" value={step.delay_hours} onChange={e => updateStep(i, "delay_hours", Number(e.target.value))} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500">Mensagem</label>
                        <textarea className="w-full mt-0.5 border rounded-md px-2 py-1 text-sm h-16 resize-none" value={step.message} onChange={e => updateStep(i, "message", e.target.value)} placeholder="Olá {nome}! ..." />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-[#00a884] hover:bg-[#02906f]" onClick={() => save.mutate(form)}>Salvar Fluxo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}