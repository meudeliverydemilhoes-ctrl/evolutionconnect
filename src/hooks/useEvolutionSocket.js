import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { base44 } from "@/api/base44Client";

const EVOLUTION_URL = "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_KEY = "049EE924-CB86-4E11-8F80-3F690969C460";
const INSTANCE = "meudelivery";

function normalizePhone(raw) {
  if (!raw) return null;
  let phone = raw.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone;
}

export function useEvolutionSocket({ onNewMessage }) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected"); // connected | disconnected | error

  useEffect(() => {
    console.log("[Socket] Conectando à Evolution API...");

    const socket = io(EVOLUTION_URL, {
      transports: ["websocket", "polling"],
      extraHeaders: {
        apikey: EVOLUTION_KEY,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Conectado! ID:", socket.id);
      setStatus("connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Desconectado:", reason);
      setStatus("disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Erro de conexão:", err.message);
      setStatus("error");
    });

    // Escutar todos os eventos para debug
    socket.onAny((event, data) => {
      console.log("[Socket] EVENT:", event, data);
    });

    async function handleMessageData(data) {
      try {
        // Suporte a diferentes formatos da Evolution API
        const msgData = data?.data || data;
        const key = msgData?.key || data?.key;
        const message = msgData?.message || data?.message;
        const pushName = msgData?.pushName || data?.pushName || msgData?.notifyName || "";

        if (!key) return;
        if (key.fromMe === true) return;

        const phoneRaw = key.remoteJidAlt || (key.remoteJid?.includes("@lid") ? null : key.remoteJid) || "";
        if (!phoneRaw || phoneRaw.includes("@g.us")) return;

        const phone = normalizePhone(phoneRaw);
        if (!phone) return;

        const text =
          message?.conversation ||
          message?.extendedTextMessage?.text ||
          message?.imageMessage?.caption ||
          message?.videoMessage?.caption ||
          message?.audioMessage?.caption ||
          msgData?.body ||
          data?.body ||
          "";

        if (!text) return;

        const timestamp = msgData?.messageTimestamp
          ? new Date(msgData.messageTimestamp * 1000).toISOString()
          : new Date().toISOString();

        console.log(`[Socket] Nova mensagem de ${phone} (${pushName}): ${text}`);

        // Salvar mensagem
        await base44.entities.Message.create({
          contact_phone: phone,
          text,
          direction: "received",
          timestamp,
        });

        // Criar ou atualizar contato
        const contacts = await base44.entities.Contact.filter({ phone });
        if (contacts && contacts.length > 0) {
          await base44.entities.Contact.update(contacts[0].id, {
            last_message: text,
            last_contact_date: timestamp,
            name: contacts[0].name || pushName,
          });
        } else {
          await base44.entities.Contact.create({
            phone,
            name: pushName,
            last_message: text,
            last_contact_date: timestamp,
            status: "ativo",
          });
        }

        // Notificar o componente pai
        if (onNewMessage) onNewMessage({ phone, text, pushName, timestamp });

      } catch (err) {
        console.error("[Socket] Erro ao processar mensagem:", err);
      }
    }

    // Escutar eventos de mensagem
    socket.on("MESSAGES_UPSERT", handleMessageData);
    socket.on("messages.upsert", handleMessageData);

    // Alguns formatos da Evolution emitem por instância
    socket.on(`${INSTANCE}:MESSAGES_UPSERT`, handleMessageData);
    socket.on(`${INSTANCE}:messages.upsert`, handleMessageData);

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, []);

  return { status };
}