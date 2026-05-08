import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package, Phone, CheckCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors = {
  pendente: "bg-yellow-100 text-yellow-700",
  processando: "bg-blue-100 text-blue-700",
  enviado: "bg-purple-100 text-purple-700",
  entregue: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

const emptyForm = {
  order_number: "", contact_phone: "", contact_name: "", status: "pendente",
  tracking_code: "", tracking_url: "", carrier: "", total_amount: "", notes: ""
};

export default function OrdersTab() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingOrder
        ? base44.entities.Order.update(editingOrder.id, data)
        : base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowDialog(false);
      setEditingOrder(null);
      setForm(emptyForm);
    },
  });

  const filtered = orders.filter(
    (o) =>
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
      tracking_code: order.tracking_code || "",
      tracking_url: order.tracking_url || "",
      carrier: order.carrier || "",
      total_amount: order.total_amount || "",
      notes: order.notes || "",
    });
    setShowDialog(true);
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pedido, cliente ou telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditingOrder(null); setForm(emptyForm); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(order)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Pedido #{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.contact_name || "Cliente"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {order.contact_phone}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge className={statusColors[order.status] || statusColors.pendente}>{order.status}</Badge>
                  {order.whatsapp_notified && (
                    <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                      <MessageCircle className="w-3 h-3" /> Notificado
                    </p>
                  )}
                  {order.total_amount && (
                    <p className="text-sm font-semibold">R$ {Number(order.total_amount).toFixed(2)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">Nenhum pedido encontrado</div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº do Pedido *</Label>
                <Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="PED-001" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do Cliente</Label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="João Silva" />
              </div>
              <div>
                <Label>Telefone (WhatsApp) *</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="5511999999999" />
              </div>
            </div>
            <div>
              <Label>Transportadora</Label>
              <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="Correios, Jadlog..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código de Rastreamento</Label>
                <Input value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} placeholder="BR123456789" />
              </div>
              <div>
                <Label>Link de Rastreamento</Label>
                <Input value={form.tracking_url} onChange={(e) => setForm({ ...form, tracking_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Valor Total (R$)</Label>
              <Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas do pedido..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, total_amount: form.total_amount ? Number(form.total_amount) : undefined })}
              disabled={!form.order_number || !form.contact_phone || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}