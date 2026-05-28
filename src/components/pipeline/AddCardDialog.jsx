import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AddCardDialog({ open, onOpenChange, stages, customFields, contacts, onSave }) {
  const [form, setForm] = useState({ contact_phone: "", contact_name: "", stage: "", deal_value: "" });
  const [customData, setCustomData] = useState({});

  const handleOpen = (val) => {
    if (val) {
      setForm({ contact_phone: "", contact_name: "", stage: stages[0]?.id || "novo", deal_value: "" });
      setCustomData({});
    }
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
          <DialogTitle>Adicionar ao Pipeline</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div>
            <label className="text-sm font-medium">Contato *</label>
            <select
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={form.contact_phone}
              onChange={e => {
                const c = contacts.find(c => c.phone === e.target.value);
                setForm(f => ({ ...f, contact_phone: e.target.value, contact_name: c?.name || "" }));
              }}
            >
              <option value="">Selecionar contato...</option>
              {contacts.map(c => <option key={c.id} value={c.phone}>{c.name || c.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Etapa</label>
            <select
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={form.stage}
              onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
            >
              {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
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
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}