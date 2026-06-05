import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useState } from "react";
import { base44 } from "@/api/base44Client";

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
  const isGroup = remoteJid.includes("@g.us");

  // Suporte ao @lid: tentar todas as alternativas de JID disponíveis
  // Ordem de prioridade:
  // 1. remoteJidAlt (número real do WhatsApp)
  // 2. participant (para grupos)
  // 3. from (alternativa)
  // 4. Se for @lid, tentar extrair do remoteJid mesmo
  // 5. Se não for @lid, usar remoteJid direto
  let rawJid =
    key.remoteJidAlt ||
    msgData?.participant ||
    msgData?.from ||
    key.participant ||
    (!remoteJid.includes("@lid") ? remoteJid : null) ||
    remoteJid ||
    "";

  // Se ainda for @lid, tentar extrair número do linkedJids ou outras fontes
  if (rawJid.includes("@lid")) {
    // Tentar extrair do msgData que pode ter mais informações
    if (msgData?.linkedJids && Array.isArray(msgData.linkedJids)) {
      const realJid = msgData.linkedJids.find(j => j.endsWith("@s.whatsapp.net"));
      if (realJid) rawJid = realJid;
    }
    // Tentar extrair do chat que pode ter sido enriquecido
    if (msgData?.chat && msgData.chat.linkedJids && Array.isArray(msgData.chat.linkedJids)) {
      const realJid = msgData.chat.linkedJids.find(j => j.endsWith("@s.whatsapp.net"));
      if (realJid) rawJid = realJid;
    }
  }

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

  // Extrair foto/imagem da mensagem
  const imageUrl = message?.imageMessage?.url || msgData?.imageMessage?.url || null;

  // Extrair áudio da mensagem
  const audioUrl = message?.audioMessage?.url || message?.pttMessage?.url || msgData?.audioMessage?.url || msgData?.pttMessage?.url || null;

  return { 
    phone, 
    pushName, 
    text: text || null, 
    timestamp: new Date().toISOString(), 
    fromMe, 
    isGroup,
    imageUrl,
    audioUrl,
    isFacebookLead: remoteJid.includes("@lid"),
    message // Passar a mensagem completa também
  };
}

export function useEvolutionSocket({ onNewMessage, onConnectionChange }) {
  const onNewMessageRef = useRef(onNewMessage);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const [config, setConfig] = useState(null);
  onNewMessageRef.current = onNewMessage;
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    base44.functions.invoke("getEvolutionConfig", {}).then(res => {
      if (res?.data?.url && res?.data?.apiKey && res?.data?.instance) {
        setConfig(res.data);
      }
    }).catch(err => console.error("[Socket] Erro ao buscar config:", err));
  }, []);

  const handleMessageData = useCallback(async (data) => {
    const msg = extractMessage(data);
    if (!msg || !msg.text) return;

    // Extrair key.id para deduplicação
    const msgData = data?.data || data;
    const key = msgData?.key || data?.key;
    const waMsgId = key?.id || null;

    console.log("[Socket] Nova mensagem de", msg.phone, "(fromMe:", msg.fromMe, ") waMsgId:", waMsgId, ":", msg.text);

    // Chamar função backend para salvar + IA em background
    // Notificar o Chat ANTES (para UI imediata) e DEPOIS (para mostrar msg salva no DB)
    onNewMessageRef.current?.(msg);

    base44.functions.invoke("processSocketMessage", {
      phone: msg.phone,
      pushName: msg.pushName,
      text: msg.text,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      isGroup: msg.isGroup,
      imageUrl: msg.imageUrl,
      audioUrl: msg.audioUrl,
      isFacebookLead: msg.isFacebookLead,
      message: msg.message,
      waMsgId,
    })
      .then(() => onNewMessageRef.current?.(msg))
      .catch(err => {
        console.error("[Socket] Erro ao chamar processSocketMessage:", err);
        // Mesmo com erro, tenta atualizar UI
        onNewMessageRef.current?.(msg);
      });
  }, []);

  useEffect(() => {
    if (!config) return;

    const { url: EVOLUTION_URL, apiKey: EVOLUTION_API_KEY, instance: INSTANCE } = config;
    console.log("[Socket] Conectando à Evolution API:", EVOLUTION_URL, "instância:", INSTANCE);

    // Cache local para deduplicação no frontend (evita disparar a mesma mensagem múltiplas vezes)
    const processedIds = new Set();

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

    // Handler único com deduplicação local
    const handleWithDedup = (data) => {
      const msgData = data?.data || data;
      const key = msgData?.key || data?.key;
      const waMsgId = key?.id;

      // Se temos um ID, deduplica localmente antes de chamar o backend
      if (waMsgId) {
        if (processedIds.has(waMsgId)) {
          console.log("[Socket] Duplicata local ignorada:", waMsgId);
          return;
        }
        processedIds.add(waMsgId);
        // Limpar cache após 60s para não crescer indefinidamente
        setTimeout(() => processedIds.delete(waMsgId), 60000);
      }

      handleMessageData(data);
    };

    // Apenas um listener — o evento da instância já cobre tudo
    socket.on(INSTANCE, (data) => {
      const event = data?.event;
      if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
        handleWithDedup(data);
      }
    });

    return () => {
      console.log("[Socket] Desconectando...");
      socket.disconnect();
    };
  }, [handleMessageData, config]);
}