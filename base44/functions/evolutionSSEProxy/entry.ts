import { io } from 'npm:socket.io-client@4.8.1';

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");

function normalizePhone(raw) {
  if (!raw) return null;
  let phone = raw.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone;
}

Deno.serve(async (req) => {
  // Health check
  if (req.method === "GET" && new URL(req.url).searchParams.get("ping") === "1") {
    return Response.json({ status: "ok" });
  }

  console.log(`[SSE Proxy] Nova conexão SSE`);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  function send(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(payload)).catch(() => {});
  }

  // Conectar socket.io na Evolution — forçar polling para evitar websocket error
  console.log(`[SSE Proxy] Conectando socket.io em ${EVOLUTION_URL}`);

  const socket = io(EVOLUTION_URL, {
    transports: ["polling"],
    extraHeaders: { apikey: EVOLUTION_KEY },
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[SSE Proxy] Socket conectado! ID:", socket.id);
    send("proxy_status", { status: "connected", socketId: socket.id, time: new Date().toISOString() });
  });

  socket.on("disconnect", (reason) => {
    console.log("[SSE Proxy] Socket desconectado:", reason);
    send("proxy_status", { status: "disconnected", reason, time: new Date().toISOString() });
  });

  socket.on("connect_error", (err) => {
    console.error("[SSE Proxy] Erro de conexão:", err.message);
    send("proxy_status", { status: "error", message: err.message, time: new Date().toISOString() });
  });

  // Apenas notificar o frontend — salvamento é feito pelo whatsappWebhook (HTTP)
  function notifyFrontend(data) {
    try {
      const msgData = data?.data || data;
      const key = msgData?.key || data?.key;
      const message = msgData?.message || data?.message;
      const pushName = msgData?.pushName || data?.pushName || msgData?.notifyName || "";

      if (!key || key.fromMe === true) return;

      const phoneRaw = key?.remoteJidAlt || (key?.remoteJid?.includes("@lid") ? null : key?.remoteJid) || "";
      if (!phoneRaw || phoneRaw.includes("@g.us")) return;

      const phone = normalizePhone(phoneRaw);
      if (!phone) return;

      const text =
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        message?.videoMessage?.caption ||
        message?.audioMessage?.caption ||
        msgData?.body || data?.body || "";

      if (!text) return;

      const timestamp = msgData?.messageTimestamp
        ? new Date(msgData.messageTimestamp * 1000).toISOString()
        : new Date().toISOString();

      console.log(`[SSE Proxy] Notificando frontend: ${phone}: ${text}`);
      send("new_message", { phone, text, pushName, timestamp });

    } catch (err) {
      console.error("[SSE Proxy] Erro ao notificar:", err);
    }
  }

  // Escutar eventos de mensagem
  socket.on("MESSAGES_UPSERT", (data) => {
    send("raw_event", { event: "MESSAGES_UPSERT", data, time: new Date().toISOString() });
    notifyFrontend(data);
  });

  // onAny para debug
  socket.onAny((event, ...args) => {
    if (!["MESSAGES_UPSERT", "messages.upsert"].includes(event)) {
      send("raw_event", { event, data: args[0], time: new Date().toISOString() });
    }
  });

  // Cleanup ao fechar conexão SSE
  req.signal.addEventListener("abort", () => {
    console.log("[SSE Proxy] Cliente SSE desconectou, encerrando socket.");
    socket.disconnect();
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});