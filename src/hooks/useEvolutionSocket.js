import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { base44 } from "@/api/base44Client";

const EVOLUTION_URL = "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_API_KEY = "049EE924-CB86-4E11-8F80-3F690969C460";
const INSTANCE = "meudelivery";

function normalizePhone(rawJid) {
  if (!rawJid) return null;
  let phone = rawJid
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace(/@lid.*$/, "")
    .replace(/\D/g, "");
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone || null;
}

function extractMessage(data) {
  const msgData = data?.data || data;
  const key = msgData?.key || data?.key;
  const message = msgData?.message || data?.message;
  const pushName = msgData?.pushName || data?.pushName || "";

  if (!key) return null;

  const fromMe = key.fromMe === true;
  const remoteJid = key.remoteJid || "";
  if (remoteJid.includes("@g.us")) return null;

  // Suporte ao @lid: tentar todas as alternativas de JID disponíveis
  const rawJid =
    key.remoteJidAlt ||
    msgData?.participant ||
    msgData?.from ||
    (!remoteJid.includes("@lid") ? remoteJid : null) ||
    "";

  if (!rawJid) {
    console.log("[Socket] @lid sem JID alternativo. key:", JSON.stringify(key), "msgData keys:", Object.keys(msgData || {}));
    return null;
  }

  const phone = normalizePhone(rawJid);
  if (!phone) return null;

  const text =
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    msgData?.body ||
    data?.body ||
    "";

  return { phone, pushName, text: text || null, timestamp: new Date().toISOString(), fromMe };
}

export function useEvolutionSocket({ onNewMessage, onConnectionChange }) {
  const onNewMessageRef = useRef(onNewMessage);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onNewMessageRef.current = onNewMessage;
  onConnectionChangeRef.current = onConnectionChange;

  const handleMessageData = useCallback(async (data) => {
    const msg = extractMessage(data);
    if (!msg || !msg.text) return;

    console.log("[Socket] Nova mensagem de", msg.phone, "(fromMe:", msg.fromMe, "):", msg.text);

    // Aguardar 2s para dar chance ao webhook processar primeiro
    await new Promise(r => setTimeout(r, 2000));

    // Chamar função backend para salvar + IA (com deduplicação interna)
    try {
      await base44.functions.invoke("processSocketMessage", {
        phone: msg.phone,
        pushName: msg.pushName,
        text: msg.text,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
      });
    } catch (err) {
      console.error("[Socket] Erro ao chamar processSocketMessage:", err);
    }

    // Notificar o Chat para rebuscar
    onNewMessageRef.current?.(msg);
  }, []);

  useEffect(() => {
    console.log("[Socket] Conectando à Evolution API...");

    const socket = io(EVOLUTION_URL, {
      transports: ["polling"],
      auth: { apikey: EVOLUTION_API_KEY },
      query: { apikey: EVOLUTION_API_KEY },
      extraHeaders: { apikey: EVOLUTION_API_KEY },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Conectado! ID:", socket.id);
      onConnectionChangeRef.current?.(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
      onConnectionChangeRef.current?.(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Erro de conexão:", err.message);
    });

    // Log de TODOS os eventos para debug
    const originalOnevent = socket.onevent;
    socket.onevent = function(packet) {
      console.log("[Socket] EVENTO RAW:", JSON.stringify(packet?.data?.[0]), "| data:", JSON.stringify(packet?.data?.[1])?.substring(0, 300));
      originalOnevent.call(this, packet);
    };

    // Formato com nome da instância como evento
    socket.on(INSTANCE, (data) => {
      const event = data?.event;
      console.log("[Socket] Evento da instância:", event);
      if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
        handleMessageData(data);
      }
    });

    socket.on("MESSAGES_UPSERT", handleMessageData);
    socket.on("messages.upsert", handleMessageData);

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, [handleMessageData]);
}