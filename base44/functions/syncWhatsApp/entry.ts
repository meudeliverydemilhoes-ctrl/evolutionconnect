import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_URL = Deno.env.get("EVOLUTION_API_URL");
const API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

const h = { "apikey": API_KEY, "Content-Type": "application/json" };

function normalizePhone(raw = "", isGroup = false) {
  if (!raw) return null;
  let phone = raw
    .replace("@g.us", "")
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace(/@[a-z.]+$/, "");
  if (isGroup) return phone || null;
  phone = phone.replace(/\D/g, "");
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone || null;
}

async function fetchJson(path, body = null) {
  const opts = body !== null
    ? { method: "POST", headers: h, body: JSON.stringify(body) }
    : { method: "GET", headers: h };
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function upsertContact(base44, phone, name, isGroup, lastMessage, stats) {
  const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
  if (existing?.length > 0) {
    const patch = {};
    if (!existing[0].name && name) patch.name = name;
    if (isGroup && !existing[0].is_group) patch.is_group = true;
    if (lastMessage && !existing[0].last_message) patch.last_message = lastMessage;
    if (Object.keys(patch).length > 0) {
      await base44.asServiceRole.entities.Contact.update(existing[0].id, patch);
      stats.contacts_updated++;
    }
  } else {
    await base44.asServiceRole.entities.Contact.create({
      phone,
      name,
      is_group: isGroup,
      status: "ativo",
      last_message: lastMessage || null,
      last_contact_date: new Date().toISOString(),
    });
    stats.contacts_created++;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const stats = { chats: 0, groups: 0, contacts_created: 0, contacts_updated: 0, errors: [] };

    // ─── 1. findContacts — mapa jid → nome ──────────────────────────────────────
    let contactsMap = {};
    try {
      const rawContacts = await fetchJson(`/chat/findContacts/${INSTANCE}`, {});
      const arr = Array.isArray(rawContacts) ? rawContacts : (rawContacts?.contacts || rawContacts?.data || []);
      for (const c of arr) {
        const jid = c.id || c.remoteJid || "";
        if (jid) contactsMap[jid] = c.pushName || c.name || c.verifiedName || null;
      }
      console.log(`[syncWhatsApp] ${arr.length} contatos no mapa`);
    } catch (e) {
      console.warn("findContacts falhou (não crítico):", e.message);
    }

    // ─── 2. findChats — conversas individuais e grupos ──────────────────────────
    try {
      const raw = await fetchJson(`/chat/findChats/${INSTANCE}`, {});
      const chats = Array.isArray(raw) ? raw : (raw?.chats || raw?.data || []);
      stats.chats = chats.length;
      console.log(`[syncWhatsApp] ${chats.length} chats`);

      for (const chat of chats) {
        const rawJid = chat.id || chat.remoteJid || "";
        if (!rawJid) continue;
        const isGroup = rawJid.includes("@g.us");
        const phone = normalizePhone(rawJid, isGroup);
        if (!phone) continue;
        const name = contactsMap[rawJid] || chat.name || chat.pushName || (isGroup ? `Grupo ${phone}` : phone);
        const lastMessage = chat.lastMessage?.message?.conversation
          || chat.lastMessage?.message?.extendedTextMessage?.text
          || chat.lastMessage?.message?.imageMessage?.caption
          || null;
        try {
          await upsertContact(base44, phone, name, isGroup, lastMessage, stats);
        } catch (e) {
          stats.errors.push(`chat ${phone}: ${e.message}`);
        }
      }
    } catch (e) {
      stats.errors.push("findChats: " + e.message);
      console.warn("findChats falhou:", e.message);
    }

    // ─── 3. fetchAllGroups — garante grupos mesmo sem mensagens ─────────────────
    try {
      const res = await fetch(`${API_URL}/group/fetchAllGroups/${INSTANCE}?getParticipants=false`, { headers: h });
      const rawGroups = await res.json();
      const groupArr = Array.isArray(rawGroups) ? rawGroups : (rawGroups?.groups || []);
      stats.groups = groupArr.length;
      console.log(`[syncWhatsApp] ${groupArr.length} grupos de fetchAllGroups`);

      for (const grp of groupArr) {
        const rawJid = grp.id || "";
        if (!rawJid) continue;
        const phone = normalizePhone(rawJid, true);
        if (!phone) continue;
        const name = grp.subject || grp.name || `Grupo ${phone}`;
        try {
          await upsertContact(base44, phone, name, true, null, stats);
        } catch (e) {
          stats.errors.push(`group ${phone}: ${e.message}`);
        }
      }
    } catch (e) {
      stats.errors.push("fetchAllGroups: " + e.message);
      console.warn("fetchAllGroups falhou:", e.message);
    }

    console.log("[syncWhatsApp] concluído:", stats);
    return Response.json({ ok: true, stats });
  } catch (error) {
    console.error("[syncWhatsApp] erro fatal:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});