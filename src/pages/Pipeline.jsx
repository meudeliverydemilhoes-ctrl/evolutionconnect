import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Settings } from "lucide-react";
import PipelineSettingsDialog from "@/components/pipeline/PipelineSettingsDialog";
import PipelineCard from "@/components/pipeline/PipelineCard";
import AddCardDialog from "@/components/pipeline/AddCardDialog";

const DEFAULT_STAGES = [
  { id: "novo", label: "Novo", color: "bg-gray-100 border-gray-300" },
  { id: "ativo", label: "Ativo", color: "bg-blue-50 border-blue-300" },
  { id: "qualificado", label: "Qualificado", color: "bg-yellow-50 border-yellow-300" },
  { id: "negociando", label: "Negociando", color: "bg-orange-50 border-orange-300" },
  { id: "fechado", label: "Fechado ✅", color: "bg-green-50 border-green-300" },
  { id: "perdido", label: "Perdido ❌", color: "bg-red-50 border-red-300" },
];

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const { data: pipeline = [] } = useQuery({ queryKey: ["pipeline"], queryFn: () => base44.entities.PipelineContact.list() });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: configList = [] } = useQuery({ queryKey: ["pipelineConfig"], queryFn: () => base44.entities.PipelineConfig.list() });

  const config = configList[0];
  const stages = config?.stages?.length ? config.stages : DEFAULT_STAGES;
  const customFields = config?.custom_fields || [];

  const saveConfig = useMutation({
    mutationFn: (data) => config
      ? base44.entities.PipelineConfig.update(config.id, data)
      : base44.entities.PipelineConfig.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipelineConfig"] }),
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }) => base44.entities.PipelineContact.update(id, { stage, moved_manually: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PipelineContact.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const createEntry = useMutation({
    mutationFn: (data) => base44.entities.PipelineContact.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    updateStage.mutate({ id: draggableId, stage: destination.droppableId });
  };

  const totalValue = pipeline.reduce((s, p) => s + (p.deal_value || 0), 0);

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5]">
      <div className="p-4 bg-white border-b flex items-center gap-3 flex-wrap">
        <h1 className="font-bold text-lg text-[#111b21]">🔥 Pipeline de Vendas</h1>
        <div className="flex gap-4 text-sm text-gray-600 ml-2">
          <span>👥 {pipeline.length} contatos</span>
          <span>💰 R$ {totalValue.toLocaleString("pt-BR")}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["pipeline"] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-1" /> Configurar
          </Button>
          <Button size="sm" className="bg-[#00a884] hover:bg-[#02906f]" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full min-w-max">
            {stages.map(stage => {
              const cards = pipeline.filter(p => p.stage === stage.id);
              return (
                <div key={stage.id} className={`w-60 flex flex-col rounded-xl border-2 ${stage.color} flex-shrink-0`}>
                  <div className="p-3 font-semibold text-sm flex items-center justify-between">
                    <span>{stage.label}</span>
                    <span className="bg-white text-gray-600 rounded-full px-2 py-0.5 text-xs">{cards.length}</span>
                  </div>
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 min-h-20 rounded-b-xl transition-colors ${snapshot.isDraggingOver ? "bg-white/60" : ""}`}
                      >
                        {cards.map((card, idx) => (
                          <Draggable key={card.id} draggableId={card.id} index={idx}>
                            {(p) => <PipelineCard p={p} card={card} customFields={customFields} onEdit={() => setEditingCard(card)} />}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {cards.length === 0 && (
                          <div className="text-center text-xs text-gray-400 py-4">Soltar aqui</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <PipelineSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        stages={stages}
        customFields={customFields}
        onSave={(data) => saveConfig.mutate(data)}
      />

      <AddCardDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        stages={stages}
        customFields={customFields}
        contacts={contacts}
        onSave={(data) => createEntry.mutate(data)}
      />
      <AddCardDialog
        key={editingCard?.id || "edit"}
        open={!!editingCard}
        onOpenChange={(v) => !v && setEditingCard(null)}
        stages={stages}
        customFields={customFields}
        contacts={contacts}
        initialData={editingCard}
        onSave={(data) => { updateEntry.mutate({ id: editingCard.id, data }); setEditingCard(null); }}
      />
    </div>
  );
}