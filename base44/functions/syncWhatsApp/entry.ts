import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_URL = Deno.env.get("EVOLUTION_API_URL");
const API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

const h = { "apikey": API_KEY, "Content-Type": "application/json" };

function normalizePhone(raw = "", isGroup = false) {
  if (!raw) return null;
  let phone = raw
    .replace(/@g\.us$/, "")
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/@c\.us$/, "")
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const stats = { contacts_created: 0, contacts_updated: 0, errors: [] };

    // ─── 1. Carregar todos os Contact existentes de uma vez ──────────────────────
    const allExisting = await base44.asServiceRole.entities.Contact.list("-created_date", 2000);
    const existingMap = new Map(); // phone → contact record
    for (const c of allExisting) {
      if (c.phone) existingMap.set(c.phone, c);
    }
    console.log(`[sync] ${existingMap.size} contatos existentes carregados`);

    // Coletar registros a criar/atualizar
    const toCreate = [];
    const toUpdate = []; // { id, patch }

    function mergeContact(phone, name, isGroup, lastMessage) {
      if (!phone) return;
      const existing = existingMap.get(phone);
      if (existing) {
        const patch = {};
        if (!existing.name && name) patch.name = name;
        if (isGroup && !existing.is_group) patch.is_group = true;
        if (lastMessage && !existing.last_message) patch.last_message = lastMessage;
        if (Object.keys(patch).length > 0) {
          // Evitar agendar o mesmo id duas vezes
          const idx = toUpdate.findIndex(u => u.id === existing.id);
          if (idx >= 0) Object.assign(toUpdate[idx].patch, patch);
          else toUpdate.push({ id: existing.id, patch });
        }
      } else if (!existingMap.has(phone)) {
        // Marcar como "já visto" para não duplicar dentro da função
        existingMap.set(phone, { phone, _pending: true });
        toCreate.push({
          phone,
          name: name || phone,
          is_group: isGroup,
          status: "ativo",
          last_message: lastMessage || null,
          last_contact_date: new Date().toISOString(),
        });
      }
    }

    // ─── 2. findChats — base dos JIDs com conversa ──────────────────────────────
    const chatNameMap = new Map(); // jid → name from chats
    try {
      const raw = await fetchJson(`/chat/findChats/${INSTANCE}`, {});
      const chats = Array.isArray(raw) ? raw : (raw?.chats || raw?.data || []);
      console.log(`[sync] ${chats.length} chats`);

      for (const chat of chats) {
        const rawJid = chat.id || chat.remoteJid || "";
        if (!rawJid) continue;
        const isGroup = rawJid.includes("@g.us");
        const phone = normalizePhone(rawJid, isGroup);
        if (!phone) continue;
        const name = chat.name || chat.pushName || null;
        const lastMessage = chat.lastMessage?.message?.conversation
          || chat.lastMessage?.message?.extendedTextMessage?.text
          || chat.lastMessage?.message?.imageMessage?.caption
          || null;
        chatNameMap.set(rawJid, { phone, name, isGroup, lastMessage });
      }
    } catch (e) {
      stats.errors.push("findChats: " + e.message);
      console.warn("findChats falhou:", e.message);
    }

    // ─── 3. findContacts — enriquecer nomes apenas dos JIDs conhecidos ──────────
    try {
      const rawContacts = await fetchJson(`/chat/findContacts/${INSTANCE}`, {});
      const arr = Array.isArray(rawContacts) ? rawContacts : (rawContacts?.contacts || rawContacts?.data || []);
      for (const c of arr) {
        const jid = c.id || c.remoteJid || "";
        if (chatNameMap.has(jid)) {
          const entry = chatNameMap.get(jid);
          if (!entry.name) entry.name = c.pushName || c.name || c.verifiedName || null;
        }
      }
      console.log(`[sync] ${arr.length} contatos no mapa de nomes`);
    } catch (e) {
      console.warn("findContacts falhou (não crítico):", e.message);
    }

    // Processar todos os chats
    for (const [, entry] of chatNameMap) {
      mergeContact(entry.phone, entry.name, entry.isGroup, entry.lastMessage);
    }

    // ─── 4. fetchAllGroups — garantir grupos sem histórico ───────────────────────
    try {
      const res = await fetch(`${API_URL}/group/fetchAllGroups/${INSTANCE}?getParticipants=false`, { headers: h });
      const rawGroups = await res.json();
      const groupArr = Array.isArray(rawGroups) ? rawGroups : (rawGroups?.groups || []);
      console.log(`[sync] ${groupArr.length} grupos de fetchAllGroups`);

      for (const grp of groupArr) {
        const rawJid = grp.id || "";
        if (!rawJid) continue;
        const phone = normalizePhone(rawJid, true);
        if (!phone) continue;
        mergeContact(phone, grp.subject || grp.name || null, true, null);
      }
    } catch (e) {
      stats.errors.push("fetchAllGroups: " + e.message);
      console.warn("fetchAllGroups falhou:", e.message);
    }

    // ─── 5. Persistir: bulkCreate + updates paralelos ────────────────────────────
    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.Contact.bulkCreate(toCreate);
        stats.contacts_created = toCreate.length;
        console.log(`[sync] ${toCreate.length} contatos criados em lote`);
      } catch (e) {
        stats.errors.push("bulkCreate: " + e.message);
        console.warn("bulkCreate falhou, tentando individual:", e.message);
        for (const c of toCreate) {
          try {
            await base44.asServiceRole.entities.Contact.create(c);
            stats.contacts_created++;
          } catch (e2) {
            stats.errors.push(`create ${c.phone}: ${e2.message}`);
          }
        }
      }
    }

    // Updates em paralelo (lotes de 10 para não sobrecarregar)
    const BATCH = 10;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const slice = toUpdate.slice(i, i + BATCH);
      await Promise.all(slice.map(({ id, patch }) =>
        base44.asServiceRole.entities.Contact.update(id, patch).catch(e => {
          stats.errors.push(`update ${id}: ${e.message}`);
        })
      ));
    }
    stats.contacts_updated = toUpdate.length;

    console.log("[syncWhatsApp] concluído:", stats);
    return Response.json({ ok: true, stats });
  } catch (error) {
    console.error("[syncWhatsApp] erro fatal:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});