import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Buscar todos os contatos da instância
    const chatsRes = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const chats = await chatsRes.json();
    console.log("Contatos encontrados:", Array.isArray(chats) ? chats.length : JSON.stringify(chats));

    if (!Array.isArray(chats)) {
      return Response.json({ error: "Resposta inesperada da API", raw: chats }, { status: 500 });
    }

    let created = 0;
    let updated = 0;
    let facebookLeadsEnriched = 0;

    for (const chat of chats) {
      // Extrair phone/id do chat
      let phone = chat.id || chat.remoteJid || "";
      const isGroup = phone.includes("@g.us");
      const isFacebookLead = phone.includes("@lid");

      // Normalizar phone
      phone = phone.replace("@g.us", "").replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/@[a-z.]+$/, "").replace(/\D/g, "");
      
      // Corrigir BR: 55+DDD(2)+número(8) = 12 dígitos
      if (!isGroup && phone.startsWith("55") && phone.length === 12) {
        phone = phone.slice(0, 4) + "9" + phone.slice(4);
      }

      if (!phone) continue;

      const name = chat.name || chat.pushName || (isGroup ? `Grupo ${phone}` : null) || phone;
      const photo = chat.profilePicUrl || null;

      // Para leads do Facebook (@lid), tentar encontrar o número real via linkedJids
      let realPhone = phone;
      if (isFacebookLead && chat.linkedJids && Array.isArray(chat.linkedJids)) {
        const realJid = chat.linkedJids.find(j => j.endsWith("@s.whatsapp.net"));
        if (realJid) {
          realPhone = normalizePhone(realJid);
        }
      }

      // Verificar se já existe
      const existing = await base44.asServiceRole.entities.Contact.filter({ phone: realPhone });

      if (existing && existing.length > 0) {
        // Atualizar contato existente
        const contact = existing[0];
        const updateData = {
          name: contact.name || name,
          is_group: isGroup || contact.is_group || false,
          profile_pic: photo || contact.profile_pic,
          is_facebook_lead: isFacebookLead || contact.is_facebook_lead || false,
        };
        
        // Se é lead do Facebook e não tem nome, usar "Lead #ID"
        if (isFacebookLead && !contact.name) {
          updateData.name = `Lead #${phone}`;
        }

        const needsUpdate = 
          (!contact.name && name) || 
          (isGroup && !contact.is_group) ||
          (photo && !contact.profile_pic) ||
          (isFacebookLead && !contact.is_facebook_lead);

        if (needsUpdate) {
          await base44.asServiceRole.entities.Contact.update(contact.id, updateData);
          updated++;
          if (isFacebookLead) facebookLeadsEnriched++;
        }
      } else {
        // Criar novo contato
        const contactData = {
          phone: realPhone,
          name: isFacebookLead ? `Lead #${phone}` : name,
          is_group: isGroup,
          status: "ativo",
          last_contact_date: new Date().toISOString(),
          profile_pic: photo,
          is_facebook_lead: isFacebookLead,
        };

        await base44.asServiceRole.entities.Contact.create(contactData);
        created++;
        if (isFacebookLead) facebookLeadsEnriched++;
      }
    }

    console.log(`Sync concluído: ${created} criados, ${updated} atualizados, ${facebookLeadsEnriched} leads do Facebook enriquecidos`);
    return Response.json({ 
      ok: true, 
      total: chats.length, 
      created, 
      updated,
      facebookLeadsEnriched
    });
  } catch (error) {
    console.error("Erro no syncEvolutionContacts:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

