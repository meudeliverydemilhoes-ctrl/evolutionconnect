import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContactsTab from "@/components/whatsapp/ContactsTab";
import OrdersTab from "@/components/whatsapp/OrdersTab";
import SetupTab from "@/components/whatsapp/SetupTab";
import { MessageCircle } from "lucide-react";

export default function WhatsAppDashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-green-100 rounded-xl">
            <MessageCircle className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Dashboard</h1>
            <p className="text-muted-foreground text-sm">Gerencie contatos, pedidos e configure a integração</p>
          </div>
        </div>

        <Tabs defaultValue="contacts">
          <TabsList className="mb-6">
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="setup">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <ContactsTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="setup">
            <SetupTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}