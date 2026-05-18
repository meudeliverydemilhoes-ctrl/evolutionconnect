import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { io } from 'npm:socket.io-client@4.8.1';

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
const APP_ID = Deno.env.get("BASE44_APP_ID");



// SSE clients registry (shared within same isolate)
const clients = new Set();

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of clients) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); }
    catch (_) { clients.delete(ctrl); }
  }
}

// Global socket — one per isolate
let socket = null;
let socketStatus = "disconnected";

function ensureSocket() {
  if (socket) return socket;

  console.log(`[proxy] Conectando ao Evolution: ${EVOLUTION_URL}`);

  socket = io(EVOLUTION_URL, {
    transports: ["websocket", "polling"],
    extraHeaders: { apikey: EVOLUTION_KEY },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 3000,
  });

  socket.on("connect", () => {
    socketStatus = "connected";
    console.log(`[proxy] Conectado. socketId=${socket.id}`);
    broadcast({ type: "proxy_status", status: "connected", socketId: socket.id, ts: Date.now() });
  });

  socket.on("disconnect", (reason) => {
    socketStatus = "disconnected";
    console.log(`[proxy] Desconectado: ${reason}`);
    broadcast({ type: "proxy_status", status: "disconnected", reason, ts: Date.now() });
  });

  socket.on("connect_error", (err) => {
    socketStatus = "error";
    console.error(`[proxy] connect_error: ${err.message}`);
    broadcast({ type: "proxy_status", status: "error", message: err.message, ts: Date.now() });
  });

  // Capturar TODOS os eventos e repassar para o frontend via SSE
  socket.onAny((event, ...args) => {
    const data = args.length === 1 ? args[0] : args;
    console.log(`[proxy] evento="${event}"`);
    broadcast({ type: "event", event, data, ts: Date.now() });

    // Detectar mensagens recebidas para: 1) notificar frontend, 2) processar via webhook
    if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
      const messages = Array.isArray(data) ? data : (data?.messages || [data]);
      for (const item of messages) {
        const key = item?.key || {};
        if (key.fromMe) continue;
        if (!key.remoteJid || key.remoteJid.includes("@g.us")) continue;

        let phone = (key.remoteJidAlt || (!key.remoteJid.includes("@lid") ? key.remoteJid : null) || "")
          .replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
        if (!phone) continue;
        if (phone.startsWith("55") && phone.length === 12) {
          phone = phone.slice(0, 4) + "9" + phone.slice(4);
        }

        const msg = item?.message || {};
        const text = msg.conversation || msg.extendedTextMessage?.text
          || msg.imageMessage?.caption || msg.videoMessage?.caption
          || msg.audioMessage?.caption || msg.documentMessage?.caption
          || (Object.keys(msg)[0] ? `[${Object.keys(msg)[0].replace("Message","").toUpperCase()}]` : "");

        // Notificar frontend
        broadcast({ type: "new_message", phone, text: text || "[mídia]", pushName: item.pushName || "", ts: Date.now() });

        // Encaminhar para whatsappWebhook para salvar no banco e gerar resposta IA
        const webhookUrl = `https://api.base44.com/api/apps/${APP_ID}/functions/whatsappWebhook`;
        fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "base44-app-id": APP_ID,
          },
          body: JSON.stringify({
            event: "messages.upsert",
            instance: Deno.env.get("EVOLUTION_INSTANCE") || "meudelivery",
            data: item,
          }),
        }).then(r => console.log(`[proxy] webhook forwarded: ${r.status}`))
          .catch(e => console.error("[proxy] webhook forward error:", e.message));
      }
    }
  });

  return socket;
}

// Iniciar socket imediatamente
ensureSocket();

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (req.method === "GET") {
    ensureSocket();

    const stream = new ReadableStream({
      start(ctrl) {
        clients.add(ctrl);

        // Enviar status atual imediatamente ao conectar
        const initial = `data: ${JSON.stringify({ type: "proxy_status", status: socketStatus, ts: Date.now() })}\n\n`;
        ctrl.enqueue(new TextEncoder().encode(initial));

        // Keepalive a cada 20s para manter conexão viva
        const timer = setInterval(() => {
          try { ctrl.enqueue(new TextEncoder().encode(`: keepalive\n\n`)); }
          catch (_) { clearInterval(timer); clients.delete(ctrl); }
        }, 20000);

        req.signal.addEventListener("abort", () => {
          clearInterval(timer);
          clients.delete(ctrl);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // POST: status do proxy
  return Response.json({ status: "ok", socketStatus, connectedClients: clients.size });
});