import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";

const STAGE_COLORS = [
  { label: "Cinza", value: "bg-gray-100 border-gray-300" },
  { label: "Azul", value: "bg-blue-50 border-blue-300" },
  { label: "Amarelo", value: "bg-yellow-50 border-yellow-300" },
  { label: "Laranja", value: "bg-orange-50 border-orange-300" },
  { label: "Verde", value: "bg-green-50 border-green-300" },
  { label: "Vermelho", value: "bg-red-50 border-red-300" },
  { label: "Roxo", value: "bg-purple-50 border-purple-300" },
  { label: "Rosa", value: "bg-pink-50 border-pink-300" },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Seleção" },
];

export default function PipelineSettingsDialog({ open, onOpenChange, stages, customFields, onSave }) {
  const [editStages, setEditStages] = useState(stages);
  const [editFields, setEditFields] = useState(customFields);
  const [tab, setTab] = useState("stages");

  const handleOpen = (val) => {
    if (val) {
      setEditStages(stages);
      setEditFields(customFields);
    }
    onOpenChange(val);
  };

  const addStage = () => {
    const id = `stage_${Date.now()}`;
    setEditStages(prev => [...prev, { id, label: "Nova Etapa", color: "bg-gray-100 border-gray-300" }]);
  };

  const removeStage = (id) => setEditStages(prev => prev.filter(s => s.id !== id));

  const updateStage = (id, key, val) =>
    setEditStages(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));

  const addField = () => {
    const id = `field_${Date.now()}`;
    setEditFields(prev => [...prev, { id, label: "Nova Pergunta", type: "text", required: false }]);
  };

  const removeField = (id) => setEditFields(prev => prev.filter(f => f.id !== id));

  const updateField = (id, key, val) =>
    setEditFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));

  const handleSave = () => {
    onSave({ stages: editStages, custom_fields: editFields });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>⚙️ Configurar Pipeline</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b mb-3">
          {["stages", "fields"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#00a884] text-[#00a884]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "stages" ? "Etapas" : "Perguntas / Campos"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {tab === "stages" && (
            <>
              {editStages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-2 p-2 border rounded-lg bg-white">
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <Input
                    value={stage.label}
                    onChange={e => updateStage(stage.id, "label", e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <select
                    value={stage.color}
                    onChange={e => updateStage(stage.id, "color", e.target.value)}
                    className="text-xs border rounded-md px-2 py-1 h-8"
                  >
                    {STAGE_COLORS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeStage(stage.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addStage} className="w-full gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
              </Button>
            </>
          )}

          {tab === "fields" && (
            <>
              {editFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma pergunta adicionada ainda.</p>
              )}
              {editFields.map((field) => (
                <div key={field.id} className="p-3 border rounded-lg bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={e => updateField(field.id, "label", e.target.value)}
                      className="flex-1 h-8 text-sm"
                      placeholder="Pergunta..."
                    />
                    <button onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={field.type}
                      onChange={e => updateField(field.id, "type", e.target.value)}
                      className="text-xs border rounded-md px-2 py-1"
                    >
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={e => updateField(field.id, "required", e.target.checked)}
                        className="rounded"
                      />
                      Obrigatório
                    </label>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addField} className="w-full gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
              </Button>
            </>
          )}
        </div>

        <div className="pt-3 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1 bg-[#00a884] hover:bg-[#02906f]" onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}