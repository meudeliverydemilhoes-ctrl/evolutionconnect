import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Package, Truck, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-700",
  confirmado: "bg-blue-100 text-blue-700",
  preparando: "bg-orange-100 text-orange-700",
  enviado: "bg-purple-100 text-purple-700",
  entregue: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  pendente: Package,
  confirmado: CheckCircle,
  preparando: Package,
  enviado: Truck,
  entregue: CheckCircle,
  cancelado: Package,
};

const emptyForm = {
  order_number: "", contact_phone: "", contact_name: "", status: "pendente",
  items: "", total_amount: "", tracking_link: "", tracking_code: "", notes: "",
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingOrder
      ? base44.entities.Order.update(editingOrder.id, { ...data, total_amount: data.total_amount ? Number(data.total_amount) : undefined })
      : base44.entities.Order.create({ ...data, total_amount: data.total_amount ? Number(data.total_amount) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowForm(false);
      setEditingOrder(null);
      setForm(emptyForm);
    },
  });

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.contact_phone?.includes(search)
  );

  const openEdit = (order) => {
    setEditingOrder(order);
    setForm({
      order_number: order.order_number || "",
      contact_phone: order.contact_phone || "",
      contact_name: order.contact_name || "",
      status: order.status || "pendente",
      items: order.items || "",
      total_amount: order.total_amount?.toString() || "",
      tracking_link: order.tracking_link || "",
      tracking_code: order.tracking_code || "",
      notes: order.notes || "",
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Button onClick={() => { setEditingOrder(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pedido
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar pedido, cliente ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(order => {
            const StatusIcon = STATUS_ICONS[order.status] || Package;
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(order)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <StatusIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium">Pedido #{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.contact_name} • {order.contact_phone}</p>
                      {order.items && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{order.items}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.total_amount && (
                      <span className="font-semibold text-sm">R$ {Number(order.total_amount).toFixed(2)}</span>
                    )}
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    {order.whatsapp_notified && (
                      <span title="Notificado pelo WhatsApp">✅</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado.</div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº do Pedido *</Label><Input value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pendente","confirmado","preparando","enviado","entregue","cancelado"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Telefone do Cliente (WhatsApp) *</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="5511999999999" /></div>
            <div><Label>Nome do Cliente</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div><Label>Itens do Pedido</Label><Textarea value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} rows={2} /></div>
            <div><Label>Valor Total (R$)</Label><Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} /></div>
            <div><Label>Código de Rastreamento</Label><Input value={form.tracking_code} onChange={e => setForm({ ...form, tracking_code: e.target.value })} /></div>
            <div><Label>Link de Rastreamento</Label><Input value={form.tracking_link} onChange={e => setForm({ ...form, tracking_link: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={!form.order_number || !form.contact_phone || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}