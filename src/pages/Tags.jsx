import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tag, Plus, Trash2, Zap, GitBranch } from "lucide-react";

const PIPELINE_STAGES = [
  { value: "novo", label: "Novo" },
  { value: "ativo", label: "Ativo" },
  { value: "qualificado", label: "Qualificado" },
  { value: "negociando", label: "Negociando" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const COLORS = ["#00a884","#53bdeb","#ffb300","#f15c6d","#a78bfa","#f97316","#06cf9c","#e91e63","#3f51b5","#8696a0"];

export default function Tags() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", color: "#00a884", pipeline_stage: "", auto_apply: false, trigger_keyword: "", flow_id: "" });
  const [editId, setEditId] = useState(null);

  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: () => base44.entities.Tag.list() });
  const { data: flows = [] } = useQuery({ queryKey: ["flows"], queryFn: () => base44.entities.Flow.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Tag.update(editId, data)
      : base44.entities.Tag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setForm({ name: "", color: "#00a884", pipeline_stage: "", auto_apply: false, trigger_keyword: "", flow_id: "" });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tag.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  const handleEdit = (tag) => {
    setEditId(tag.id);
    setForm({
      name: tag.name,
      color: tag.color || "#00a884",
      pipeline_stage: tag.pipeline_stage || "",
      auto_apply: tag.auto_apply || false,
      trigger_keyword: tag.trigger_keyword || "",
      flow_id: tag.flow_id || ""
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    saveMutation.mutate(form);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-[#00a884]" />
        <h1 className="text-2xl font-bold">Etiquetas e Automacoes</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Crie etiquetas para classificar contatos. Configure para qual etapa do pipeline o contato vai quando a etiqueta for aplicada e qual fluxo iniciar automaticamente.
      </p>

      {/* Formulario */}
      <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
        <h2 className="font-semibold text-base">{editId ? "Editar Etiqueta" : "Nova Etiqueta"}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase font-medium">Nome</label>
            <Input placeholder="Ex: Lead Quente, Cliente VIP..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase font-medium">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase font-medium">Mover para o Pipeline</label>
            <Select value={form.pipeline_stage} onValueChange={v => setForm(f => ({ ...f, pipeline_stage: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhuma etapa</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase font-medium">Iniciar Fluxo Automatico</label>
            <Select value={form.flow_id} onValueChange={v => setForm(f => ({ ...f, flow_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um fluxo..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum fluxo</SelectItem>
                {flows.map(fl => <SelectItem key={fl.id} value={fl.id}>{fl.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase font-medium">Palavra-chave na mensagem</label>
            <Input placeholder="Ex: preco, cardapio, delivery..." value={form.trigger_keyword} onChange={e => setForm(f => ({ ...f, trigger_keyword: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={form.auto_apply} onCheckedChange={v => setForm(f => ({ ...f, auto_apply: v }))} />
            <div>
              <p className="text-sm font-medium">Aplicar em novos contatos</p>
              <p className="text-xs text-muted-foreground">Aplica ao primeiro contato de um numero novo</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#00a884] hover:bg-[#02906f]">
            <Plus className="w-4 h-4 mr-1" /> {editId ? "Salvar" : "Criar Etiqueta"}
          </Button>
          {editId && (
            <Button variant="outline" onClick={() => {
              setEditId(null);
              setForm({ name: "", color: "#00a884", pipeline_stage: "", auto_apply: false, trigger_keyword: "", flow_id: "" });
            }}>Cancelar</Button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        <h2 className="font-semibold text-base">{tags.length} etiqueta{tags.length !== 1 ? "s" : ""}</h2>
        {tags.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-white">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma etiqueta criada ainda</p>
          </div>
        )}
        {tags.map(tag => (
          <div key={tag.id} className="bg-white border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: tag.color || "#00a884" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{tag.name}</span>
                {tag.auto_apply && <Badge className="bg-green-100 text-green-700 text-xs border-0">Auto-novo</Badge>}
                {tag.trigger_keyword && (
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />"{tag.trigger_keyword}"
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {tag.pipeline_stage && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Pipeline: <strong>{PIPELINE_STAGES.find(s => s.value === tag.pipeline_stage)?.label}</strong>
                  </span>
                )}
                {tag.flow_id && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Fluxo: <strong>{flows.find(f => f.id === tag.flow_id)?.name || "..."}</strong>
                  </span>
                )}
                {!tag.pipeline_stage && !tag.flow_id && <span>Apenas classificacao manual</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(tag)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(tag.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}