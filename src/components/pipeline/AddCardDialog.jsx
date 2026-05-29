import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddCardDialog({ open, onOpenChange, stages, customFields, contacts, onSave, initialData }) {
  const [form, setForm] = useState({ contact_phone: "", contact_name: "", stage: "", deal_value: "" });
  const [customData, setCustomData] = useState({});

  const isEditing = !!initialData;

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          contact_phone: initialData.contact_phone || "",
          contact_name: initialData.contact_name || "",
          stage: initialData.stage || stages[0]?.id || "novo",
          deal_value: initialData.deal_value || "",
          notes: initialData.notes || "",
        });
        setCustomData(initialData.custom_data || {});
      } else {
        setForm({ contact_phone: "", contact_name: "", stage: stages[0]?.id || "novo", deal_value: "", notes: "" });
        setCustomData({});
      }
    }
  }, [open, initialData]);

  const handleOpen = (val) => {
    onOpenChange(val);
  };

  const handleSubmit = () => {
    if (!form.contact_phone) return;
    onSave({ ...form, deal_value: Number(form.deal_value) || 0, custom_data: customData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Card" : "Adicionar ao Pipeline"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div>
            <label className="text-sm font-medium">Contato *</label>
            <Select value={form.contact_phone} onValueChange={val => {
              const c = contacts.find(c => c.phone === val);
              setForm(f => ({ ...f, contact_phone: val, contact_name: c?.name || "" }));
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar contato..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map(c => <SelectItem key={c.id} value={c.phone}>{c.name || c.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Etapa</label>
            <Select value={form.stage} onValueChange={val => setForm(f => ({ ...f, stage: val }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar etapa..." />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Valor (R$)</label>
            <Input
              type="number"
              placeholder="0,00"
              value={form.deal_value}
              onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))}
            />
          </div>

          {customFields.length > 0 && (
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Informações adicionais</p>
              {customFields.map(field => (
                <div key={field.id}>
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.type === "number" ? (
                    <Input
                      type="number"
                      className="mt-1"
                      value={customData[field.id] || ""}
                      onChange={e => setCustomData(d => ({ ...d, [field.id]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      className="mt-1"
                      value={customData[field.id] || ""}
                      onChange={e => setCustomData(d => ({ ...d, [field.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pt-3 border-t">
          <Button
            className="w-full bg-[#00a884] hover:bg-[#02906f]"
            disabled={!form.contact_phone}
            onClick={handleSubmit}
          >
            {isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}