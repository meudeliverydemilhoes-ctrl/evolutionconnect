import { useState } from "react";
import { Phone, Pencil, ChevronDown, ChevronUp } from "lucide-react";

export default function PipelineCard({ p, card, customFields, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  const faturamento = card.custom_data?.faturamento;
  const hasExtra = card.notes || card.deal_value > 0 ||
    (card.custom_data && customFields.filter(f => f.id !== "faturamento" && card.custom_data[f.id]).length > 0);

  return (
    <div
      ref={p.innerRef}
      {...p.draggableProps}
      {...p.dragHandleProps}
      className="bg-white rounded-lg shadow-sm select-none cursor-grab active:cursor-grabbing overflow-hidden"
    >
      {/* Header always visible */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-sm text-[#111b21] leading-tight flex-1 truncate">
            {card.contact_name || card.contact_phone}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Pencil className="w-3 h-3" />
            </button>
            {hasExtra && (
              <button
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#00a884]"
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">{card.contact_phone}</span>
        </div>

        {faturamento && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-full px-2 py-0.5">
            <span className="text-[11px] font-medium">{faturamento}</span>
          </div>
        )}
      </div>

      {/* Expandable details */}
      {expanded && hasExtra && (
        <div className="border-t px-3 py-2 bg-gray-50 space-y-1">
          {card.deal_value > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">Valor:</span>
              <span className="text-xs text-green-600 font-semibold">R$ {card.deal_value.toLocaleString("pt-BR")}</span>
            </div>
          )}
          {customFields
            .filter(f => f.id !== "faturamento" && card.custom_data?.[f.id])
            .map(f => (
              <div key={f.id}>
                <span className="text-[10px] text-gray-400">{f.label}: </span>
                <span className="text-[11px] text-gray-600">{card.custom_data[f.id]}</span>
              </div>
            ))}
          {card.notes && (
            <div>
              <span className="text-[10px] text-gray-400">Obs: </span>
              <span className="text-[11px] text-gray-600">{card.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}