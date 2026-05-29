import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_URL = Deno.env.get("EVOLUTION_API_URL");
const API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

const headers = { "apikey": API_KEY, "Content-Type": "application/json" };

function normalizePhone(raw = "", isGroup = false) {
  if (!raw) return null;
  let phone = raw
    .replace("@g.us", "")
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace(/@[a-z.]+$/, "");

  if (isGroup) return phone; // grupos: manter o número do grupo sem limpeza extra

  phone = phone.replace(/\D/g, "");
  // Corrigir BR: 55 + DDD(2) + 8 dígitos = 12 → inserir o 9
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone || null;
}

async function fetchJson(path, body = null) {
  const opts = body
    ? { method: "POST", headers, body: JSON.stringify(body) }
    : { method: "GET", headers };
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const stats = { chats: 0, contacts_created: 0, contacts_updated: 0, messages_created: 0, errors: [] };

    // ─── 1. Buscar todos os chats ───────────────────────────────────────────────
    let chats = [];
    try {
      const raw = await fetchJson(`/chat/findChats/${INSTANCE}`);
      chats = Array.isArray(raw) ? raw : (raw?.chats || raw?.data || []);
    } catch (e) {
      stats.errors.push("findChats: " + e.message);
      return Response.json({ ok: false, stats }, { status: 500 });
    }

    stats.chats = chats.length;
    console.log(`[syncWhatsApp] ${chats.length} chats encontrados`);

    // ─── 2. Buscar contatos da API para enriquecer nomes ───────────────────────
    let contactsMap = {};
    try {
      const rawContacts = await fetchJson(`/contacts/findContacts/${INSTANCE}`, {});
      const arr = Array.isArray(rawContacts) ? rawContacts : (rawContacts?.contacts || rawContacts?.data || []);
      for (const c of arr) {
        const jid = c.id || c.remoteJid || "";
        contactsMap[jid] = c.pushName || c.name || c.verifiedName || null;
      }
    } catch (e) {
      console.warn("findContacts falhou (não crítico):", e.message);
    }

    // ─── 3. Para cada chat: upsert contato + importar mensagens ───────────────
    for (const chat of chats) {
      const rawJid = chat.id || chat.remoteJid || "";
      if (!rawJid) continue;

      const isGroup = rawJid.includes("@g.us");
      const phone = normalizePhone(rawJid, isGroup);
      if (!phone) continue;

      const pushName = contactsMap[rawJid] || chat.name || chat.pushName || null;
      const name = pushName || (isGroup ? `Grupo ${phone}` : phone);

      // Upsert contato
      try {
        const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
        if (existing?.length > 0) {
          const c = existing[0];
          const patch = {};
          if (!c.name && name) patch.name = name;
          if (isGroup && !c.is_group) patch.is_group = true;
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.Contact.update(c.id, patch);
            stats.contacts_updated++;
          }
        } else {
          await base44.asServiceRole.entities.Contact.create({
            phone,
            name,
            is_group: isGroup,
            status: "ativo",
            last_contact_date: new Date().toISOString(),
          });
          stats.contacts_created++;
        }
      } catch (e) {
        stats.errors.push(`contact ${phone}: ${e.message}`);
        continue;
      }

      // ─── 4. Buscar mensagens do chat ─────────────────────────────────────────
      try {
        const msgRes = await fetchJson(`/chat/findMessages/${INSTANCE}`, {
          where: { key: { remoteJid: rawJid } },
          limit: 100,
        });

        const msgs = Array.isArray(msgRes)
          ? msgRes
          : (msgRes?.messages?.records || msgRes?.messages || msgRes?.data || []);

        if (!msgs.length) continue;

        // Buscar mensagens já salvas para evitar duplicatas
        const saved = await base44.asServiceRole.entities.Message.filter(
          { contact_phone: phone },
          "-timestamp",
          200
        );
        const savedTexts = new Set(saved.map(m => `${m.direction}|${m.text}|${new Date(m.timestamp).getTime()}`));

        let lastDate = null;
        let lastText = null;

        for (const msg of msgs) {
          const fromMe = msg.key?.fromMe === true;
          const direction = fromMe ? "sent" : "received";

          // Extrair texto
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.documentMessage?.caption ||
            (msg.message?.audioMessage ? "[áudio]" : null) ||
            (msg.message?.stickerMessage ? "[sticker]" : null) ||
            (msg.message?.locationMessage ? "[localização]" : null) ||
            null;

          if (!text) continue;

          const ts = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000)
            : new Date();

          const key = `${direction}|${text}|${ts.getTime()}`;
          if (savedTexts.has(key)) continue;

          await base44.asServiceRole.entities.Message.create({
            contact_phone: phone,
            text,
            direction,
            timestamp: ts.toISOString(),
          });
          stats.messages_created++;
          savedTexts.add(key);

          if (!lastDate || ts > lastDate) {
            lastDate = ts;
            lastText = text;
          }
        }

        // Atualizar last_message/last_contact_date do contato
        if (lastDate) {
          const contactList = await base44.asServiceRole.entities.Contact.filter({ phone });
          if (contactList?.length > 0) {
            await base44.asServiceRole.entities.Contact.update(contactList[0].id, {
              last_message: lastText,
              last_contact_date: lastDate.toISOString(),
            });
          }
        }
      } catch (e) {
        stats.errors.push(`messages ${phone}: ${e.message}`);
      }
    }

    console.log("[syncWhatsApp] concluído:", stats);
    return Response.json({ ok: true, stats });
  } catch (error) {
    console.error("[syncWhatsApp] erro fatal:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});