import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Plus, Search, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SendMessageModal from "@/components/whatsapp/SendMessageModal";

export default function Contacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingContact, setEditingContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [messagingContact, setMessagingContact] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", status: "ativo", notes: "" });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-last_contact_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingContact
      ? base44.entities.Contact.update(editingContact.id, data)
      : base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setEditingContact(null);
      setForm({ name: "", phone: "", email: "", status: "ativo", notes: "" });
    },
  });

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const openEdit = (contact) => {
    setEditingContact(contact);
    setForm({ name: contact.name || "", phone: contact.phone || "", email: contact.email || "", status: contact.status || "ativo", notes: contact.notes || "" });
    setShowForm(true);
  };

  const statusColor = { ativo: "bg-green-100 text-green-700", inativo: "bg-gray-100 text-gray-600", bloqueado: "bg-red-100 text-red-700" };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contatos WhatsApp</h1>
        <Button onClick={() => { setEditingContact(null); setForm({ name: "", phone: "", email: "", status: "ativo", notes: "" }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Contato
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(contact => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(contact)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                    {(contact.name || contact.phone)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{contact.name || contact.phone}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{contact.phone}</span>
                    </div>
                    {contact.last_message && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">💬 {contact.last_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {contact.last_contact_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(contact.last_contact_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                  <Badge className={statusColor[contact.status]}>{contact.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setMessagingContact(contact)}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum contato encontrado.</div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Telefone (WhatsApp) *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="5511999999999" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={!form.phone || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {messagingContact && (
        <SendMessageModal contact={messagingContact} onClose={() => setMessagingContact(null)} />
      )}
    </div>
  );
}