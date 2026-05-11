import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const webhookUrl = `https://api.base44.com/api/apps/69fdf1d6c6b9e252de270971/functions/whatsappWebhook`;

    // Configurar webhook via API da Evolution
    const res = await fetch(`${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: [
            "MESSAGES_UPSERT",
            "messages.upsert"
          ]
        }
      }),
    });

    const data = await res.json();
    console.log("Resposta da Evolution:", JSON.stringify(data));

    // Verificar o webhook configurado
    const checkRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${EVOLUTION_INSTANCE}`, {
      headers: { "apikey": EVOLUTION_API_KEY }
    });
    const checkData = await checkRes.json();
    console.log("Webhook atual:", JSON.stringify(checkData));

    // Verificar status da instância
    const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, {
      headers: { "apikey": EVOLUTION_API_KEY }
    });
    const statusData = await statusRes.json();
    console.log("Status instância:", JSON.stringify(statusData));

    return Response.json({ set: data, current: checkData, instance_status: statusData });
  } catch (error) {
    console.error("Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});