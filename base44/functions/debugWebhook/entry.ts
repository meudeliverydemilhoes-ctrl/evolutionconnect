import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === "GET") {
      return Response.json({ status: "ok", message: "Debug Webhook ativo" });
    }

    const bodyText = await req.text();

    let body = {};
    try {
      body = JSON.parse(bodyText);
    } catch (_) {
      body = { raw: bodyText };
    }

    // Extrair campos de forma permissiva, sem filtrar nada
    const event = body?.event || body?.type || "";
    const instance = body?.instance || body?.instanceName || "";

    const data = body?.data || body;
    const key = data?.key || {};
    const message = data?.message || {};

    const remoteJid = key?.remoteJid || data?.remoteJid || data?.from || "";
    const fromMe = key?.fromMe ?? data?.fromMe ?? null;

    const messageText =
      message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      message?.videoMessage?.caption ||
      message?.audioMessage?.caption ||
      message?.documentMessage?.caption ||
      data?.body ||
      body?.body ||
      "";

    await base44.asServiceRole.entities.WebhookLog.create({
      event,
      instance,
      remoteJid,
      fromMe: fromMe === true || fromMe === "true",
      messageText,
      rawBody: bodyText.slice(0, 10000), // limitar a 10k chars
      createdAt: new Date().toISOString(),
    });

    console.log(`[debugWebhook] event="${event}" instance="${instance}" jid="${remoteJid}" fromMe=${fromMe}`);

    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[debugWebhook] Erro:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});