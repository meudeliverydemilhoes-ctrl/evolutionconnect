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
  const data = await res.json();
  console.log("WhatsApp send result:", JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload));

    // Called from entity automation when order status changes to "enviado"
    const { event, data, old_data } = payload;

    let order = data;

    // If called directly with order data
    if (!order && payload.order_id) {
      order = await base44.asServiceRole.entities.Order.get(payload.order_id);
    }

    if (!order) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 400 });
    }

    // Don't send if already notified
    if (order.whatsapp_notified) {
      return Response.json({ status: "already_notified" });
    }

    const phone = order.contact_phone;
    if (!phone) {
      return Response.json({ error: "Telefone do cliente não encontrado" }, { status: 400 });
    }

    const clientName = order.contact_name || "Cliente";
    const orderNumber = order.order_number;
    const trackingCode = order.tracking_code || "";
    const trackingLink = order.tracking_link || "";
    const items = order.items || "";
    const total = order.total_amount ? `R$ ${Number(order.total_amount).toFixed(2)}` : "";

    let message = `🚚 *Seu pedido foi enviado!*\n\n`;
    message += `Olá, *${clientName}*! 😊\n\n`;
    message += `📦 *Pedido:* #${orderNumber}\n`;
    if (items) message += `🛍️ *Itens:* ${items}\n`;
    if (total) message += `💰 *Total:* ${total}\n`;
    if (trackingCode) message += `📬 *Código de rastreamento:* ${trackingCode}\n`;
    if (trackingLink) message += `🔗 *Rastreie seu pedido:* ${trackingLink}\n`;
    message += `\nEm caso de dúvidas, é só responder esta mensagem! ✨`;

    await sendWhatsAppMessage(phone, message);

    // Mark as notified
    await base44.asServiceRole.entities.Order.update(order.id, {
      whatsapp_notified: true,
    });

    return Response.json({ status: "ok", message: "Notificação enviada com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});