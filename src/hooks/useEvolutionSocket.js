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
    message?.documentMessage?.caption ||
    msgData?.body ||
    data?.body ||
    "";

  return { phone, pushName, text: text || null, timestamp: new Date().toISOString(), messageId: key.id };
}

// Salva mensagem recebida via socket diretamente no banco (fallback caso o webhook não processe)
async function saveMessageFromSocket(msg) {
  try {
    // Verificar se já existe mensagem com esse conteúdo recente (últimos 10s) para evitar duplicatas
    const recent = await base44.entities.Message.filter(
      { contact_phone: msg.phone, direction: "received" },
      "-timestamp",
      5
    );
    const alreadySaved = recent.some(m => m.text === msg.text && 
      Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 10000);
    
    if (alreadySaved) {
      console.log("[Socket] Mensagem já salva pelo webhook, ignorando duplicata");
      return false;
    }

    // Salvar mensagem
    await base44.entities.Message.create({
      contact_phone: msg.phone,
      text: msg.text,
      direction: "received",
      timestamp: msg.timestamp,
    });

    // Atualizar ou criar contato
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
        name: msg.pushName || msg.phone,
        last_message: msg.text,
        last_contact_date: msg.timestamp,
        status: "ativo",
      });
    }

    console.log("[Socket] Mensagem salva diretamente via socket:", msg.phone, msg.text);
    return true;
  } catch (err) {
    console.error("[Socket] Erro ao salvar mensagem:", err);
    return false;
  }
}

export function useEvolutionSocket({ onNewMessage, onConnectionChange }) {
  const onNewMessageRef = useRef(onNewMessage);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onNewMessageRef.current = onNewMessage;
  onConnectionChangeRef.current = onConnectionChange;

  const handleMessageData = useCallback(async (data) => {
    const msg = extractMessage(data);
    if (!msg || !msg.text) return;
    
    console.log("[Socket] Nova mensagem de", msg.phone, ":", msg.text);
    
    // Aguardar 1.5s para dar chance ao webhook salvar primeiro
    await new Promise(r => setTimeout(r, 1500));
    
    // Tentar salvar (só salva se o webhook não salvou ainda)
    await saveMessageFromSocket(msg);
    
    // Notificar o Chat para rebuscar
    onNewMessageRef.current?.(msg);
  }, []);

  useEffect(() => {
    console.log("[Socket] Conectando à Evolution API...");

    const socket = io(EVOLUTION_URL, {
      transports: ["websocket", "polling"],
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

    // Formato com nome da instância como evento
    socket.on(INSTANCE, (data) => {
      const event = data?.event;
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