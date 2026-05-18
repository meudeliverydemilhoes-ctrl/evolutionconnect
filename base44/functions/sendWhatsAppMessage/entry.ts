import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, message } = await req.json();

    if (!phone || !message) {
      return Response.json({ error: "phone e message são obrigatórios" }, { status: 400 });
    }

    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    const data = await res.json();
    const timestamp = new Date().toISOString();

    // Salvar mensagem enviada no histórico (independente do resultado da Evolution)
    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: message,
      direction: "sent",
      timestamp,
    });

    // Atualizar last_message do contato
    const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
    if (contacts && contacts.length > 0) {
      await base44.asServiceRole.entities.Contact.update(contacts[0].id, {
        last_message: message,
        last_contact_date: timestamp,
      });
    }

    return Response.json({ status: "ok", result: data });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});