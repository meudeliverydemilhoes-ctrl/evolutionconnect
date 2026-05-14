import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { io } from 'npm:socket.io-client@4.8.1';

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") || "meudelivery";

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

  const base44 = createClientFromRequest(req);

  // Auth check — tenta obter usuário, mas permite continuar se não autenticado (SSE público para o app)
  let userEmail = "anon";
  try {
    const user = await base44.auth.me();
    if (user) userEmail = user.email;
  } catch (_) { /* app público */ }

  console.log(`[SSE Proxy] Nova conexão SSE de ${userEmail}`);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  function send(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(payload)).catch(() => {});
  }

  // Conectar socket.io na Evolution
  console.log(`[SSE Proxy] Conectando socket.io em ${EVOLUTION_URL}`);

  const socket = io(EVOLUTION_URL, {
    transports: ["websocket", "polling"],
    extraHeaders: { apikey: EVOLUTION_KEY },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
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

  // Processar mensagem recebida
  async function processMessage(data) {
    try {
      const msgData = data?.data || data;
      const key = msgData?.key || data?.key;
      const message = msgData?.message || data?.message;
      const pushName = msgData?.pushName || data?.pushName || msgData?.notifyName || "";

      if (!key) return;
      if (key.fromMe === true) return;

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

      console.log(`[SSE Proxy] Mensagem de ${phone}: ${text}`);

      // Salvar mensagem
      await base44.asServiceRole.entities.Message.create({
        contact_phone: phone,
        text,
        direction: "received",
        timestamp,
      });

      // Criar/atualizar contato
      const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
      if (contacts && contacts.length > 0) {
        await base44.asServiceRole.entities.Contact.update(contacts[0].id, {
          last_message: text,
          last_contact_date: timestamp,
          name: contacts[0].name || pushName,
        });
      } else {
        await base44.asServiceRole.entities.Contact.create({
          phone,
          name: pushName,
          last_message: text,
          last_contact_date: timestamp,
          status: "ativo",
        });
      }

      // Enviar evento ao frontend
      send("new_message", { phone, text, pushName, timestamp });
      console.log(`[SSE Proxy] Evento new_message enviado ao frontend para ${phone}`);

    } catch (err) {
      console.error("[SSE Proxy] Erro ao processar mensagem:", err);
    }
  }

  // Escutar eventos de mensagem
  socket.on("MESSAGES_UPSERT", (data) => {
    send("raw_event", { event: "MESSAGES_UPSERT", data, time: new Date().toISOString() });
    processMessage(data);
  });

  socket.on("messages.upsert", (data) => {
    send("raw_event", { event: "messages.upsert", data, time: new Date().toISOString() });
    processMessage(data);
  });

  socket.on(`${INSTANCE}:MESSAGES_UPSERT`, (data) => {
    send("raw_event", { event: `${INSTANCE}:MESSAGES_UPSERT`, data, time: new Date().toISOString() });
    processMessage(data);
  });

  // onAny para debug — envia todos os outros eventos
  socket.onAny((event, ...args) => {
    if (!["MESSAGES_UPSERT", "messages.upsert", `${INSTANCE}:MESSAGES_UPSERT`].includes(event)) {
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