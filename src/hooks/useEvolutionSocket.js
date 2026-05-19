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
    .replace(/@lid$/, "")
    .replace(/\D/g, "");
  // Inserir 9 em números BR de 12 dígitos
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone || null;
}

function extractMessage(data) {
  // Suporta formato Evolution v1 e v2
  const msgData = data?.data || data;
  const key = msgData?.key || data?.key;
  const message = msgData?.message || data?.message;
  const pushName = msgData?.pushName || data?.pushName || "";

  if (!key) return null;
  if (key.fromMe === true) return null;

  const rawJid = key.remoteJidAlt || (key.remoteJid?.includes("@lid") ? null : key.remoteJid) || "";
  if (!rawJid || rawJid.includes("@g.us")) return null;

  const phone = normalizePhone(rawJid);
  if (!phone) return null;

  const text =
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.audioMessage?.caption ||
    message?.documentMessage?.caption ||
    msgData?.body ||
    data?.body ||
    "";

  if (!text) return null;

  return {
    phone,
    pushName,
    text,
    timestamp: new Date().toISOString(),
    messageId: key.id,
  };
}

export function useEvolutionSocket({ onNewMessage, onConnectionChange }) {
  const socketRef = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onNewMessageRef.current = onNewMessage;
  onConnectionChangeRef.current = onConnectionChange;

  const handleMessageData = useCallback(async (data) => {
    const msg = extractMessage(data);
    if (!msg) return;

    console.log("[Socket] Nova mensagem de", msg.phone, ":", msg.text);

    try {
      // Salvar mensagem
      await base44.entities.Message.create({
        contact_phone: msg.phone,
        text: msg.text,
        direction: "received",
        timestamp: msg.timestamp,
      });

      // Criar ou atualizar contato
      const contacts = await base44.entities.Contact.filter({ phone: msg.phone });
      if (contacts && contacts.length > 0) {
        await base44.entities.Contact.update(contacts[0].id, {
          last_message: msg.text,
          last_contact_date: msg.timestamp,
          name: contacts[0].name || msg.pushName,
        });
      } else {
        await base44.entities.Contact.create({
          phone: msg.phone,
          name: msg.pushName,
          last_message: msg.text,
          last_contact_date: msg.timestamp,
          status: "ativo",
        });
      }

      // Notificar o Chat para atualizar
      onNewMessageRef.current?.(msg);
    } catch (err) {
      console.error("[Socket] Erro ao salvar mensagem:", err);
    }
  }, []);

  useEffect(() => {
    console.log("[Socket] Conectando à Evolution API...");

    const socket = io(EVOLUTION_URL, {
      transports: ["websocket", "polling"],
      extraHeaders: {
        apikey: EVOLUTION_API_KEY,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Conectado! ID:", socket.id);
      onConnectionChangeRef.current?.(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
      onConnectionChangeRef.current?.(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Erro de conexão:", err.message);
    });

    // Escutar todos os eventos
    socket.onAny((event, data) => {
      console.log("[Socket] Evento recebido:", event, data);
    });

    // Eventos de mensagem
    socket.on("MESSAGES_UPSERT", (data) => {
      console.log("[Socket] MESSAGES_UPSERT:", data);
      handleMessageData(data);
    });

    socket.on("messages.upsert", (data) => {
      console.log("[Socket] messages.upsert:", data);
      handleMessageData(data);
    });

    // Filtrar pela instância correta
    socket.on(INSTANCE, (data) => {
      console.log("[Socket] Evento da instância:", data);
      if (data?.event === "messages.upsert" || data?.event === "MESSAGES_UPSERT") {
        handleMessageData(data);
      }
    });

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, [handleMessageData]);

  return socketRef;
}