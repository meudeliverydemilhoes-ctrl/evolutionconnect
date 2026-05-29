import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appId = Deno.env.get("BASE44_APP_ID");
    const webhookUrl = `https://api.base44.com/api/apps/${appId}/functions/whatsappWebhook`;

    // Configurar webhook via API da Evolution (apenas eventos válidos)
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
          events: ["MESSAGES_UPSERT", "CONTACTS_SET", "CONTACTS_UPSERT", "CHATS_SET", "CHATS_UPSERT", "GROUPS_UPSERT"]
        }
      }),
    });

    const data = await res.json();
    console.log("Resposta SET:", JSON.stringify(data));

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

    // Tentar enviar uma mensagem de teste para verificar se a instância responde
    const testSendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: "5511999999999",
        text: "[TESTE] Webhook configurado com sucesso!"
      }),
    });
    const testSendData = await testSendRes.json();
    console.log("Teste envio:", JSON.stringify(testSendData));

    // Buscar info da instância (número conectado)
    const infoRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { "apikey": EVOLUTION_API_KEY }
    });
    const infoData = await infoRes.json();
    console.log("Instâncias:", JSON.stringify(infoData));

    return Response.json({ set: data, current: checkData, instance_status: statusData, test_send: testSendData, instances: infoData });
  } catch (error) {
    console.error("Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});