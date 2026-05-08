import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

async function sendWhatsAppMessage(phone, message) {
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
  return res.json();
}

async function getAIResponse(base44ServiceRole, userMessage, contactName) {
  const result = await base44ServiceRole.integrations.Core.InvokeLLM({
    prompt: `Você é um assistente de suporte ao cliente prestativo e amigável de uma loja de delivery chamada "meudelivery". O cliente se chama "${contactName || "cliente"}".

Responda a seguinte mensagem do cliente de forma clara, educada e concisa em português brasileiro:

Mensagem do cliente: "${userMessage}"

Seja prestativo, amigável e use emojis com moderação. Se não souber a resposta exata, diga que vai verificar e que alguém entrará em contato em breve.`,
  });
  return result || "Olá! Recebi sua mensagem e em breve um de nossos atendentes entrará em contato. 😊";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === "GET") {
      return Response.json({ status: "ok", message: "WhatsApp Webhook ativo" });
    }

    const body = await req.json();
    console.log("Webhook recebido:", JSON.stringify(body));

    // Evolution API webhook format
    const event = body?.event;
    const data = body?.data;

    // Only process incoming messages
    if (event !== "messages.upsert" || !data) {
      return Response.json({ status: "ignored" });
    }

    const message = data?.message;
    const key = data?.key;

    // Ignore messages sent by us
    if (key?.fromMe) {
      return Response.json({ status: "ignored - own message" });
    }

    const phoneRaw = key?.remoteJid || "";
    const phone = phoneRaw.replace("@s.whatsapp.net", "").replace("@c.us", "");
    const pushName = data?.pushName || "";
    const messageText = message?.conversation || message?.extendedTextMessage?.text || "";

    if (!phone || !messageText) {
      return Response.json({ status: "ignored - no content" });
    }

    console.log(`Mensagem de ${phone} (${pushName}): ${messageText}`);

    // Find or create contact
    const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
    let contact;

    if (contacts && contacts.length > 0) {
      contact = contacts[0];
      // Update last message and date
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        last_message: messageText,
        last_contact_date: new Date().toISOString(),
        name: contact.name || pushName,
      });
    } else {
      // Create new contact
      contact = await base44.asServiceRole.entities.Contact.create({
        phone,
        name: pushName,
        last_message: messageText,
        last_contact_date: new Date().toISOString(),
        status: "ativo",
      });
      console.log("Novo contato criado:", contact.id);
    }

    // Get AI response
    const aiResponse = await getAIResponse(base44.asServiceRole, messageText, contact.name || pushName);

    // Send reply via WhatsApp
    await sendWhatsAppMessage(phone, aiResponse);
    console.log(`Resposta enviada para ${phone}: ${aiResponse}`);

    return Response.json({ status: "ok", contact_id: contact.id });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});