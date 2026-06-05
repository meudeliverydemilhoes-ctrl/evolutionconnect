import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Função admin para limpar mensagens duplicadas do banco.
// Mantém apenas 1 por whatsapp_message_id (o mais antigo).
// Para mensagens sem whatsapp_message_id, agrupa por (contact_phone + text + timestamp ~30s) e mantém o mais antigo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Carregar mensagens em 2 páginas com pausa entre elas
    const limit = 300;
    let allMessages = [];

    const batch1 = await base44.asServiceRole.entities.Message.list('created_date', limit, 0);
    if (batch1?.length) allMessages = allMessages.concat(batch1);

    if (batch1?.length === limit) {
      await new Promise(r => setTimeout(r, 500));
      const batch2 = await base44.asServiceRole.entities.Message.list('created_date', limit, limit);
      if (batch2?.length) allMessages = allMessages.concat(batch2);

      if (batch2?.length === limit) {
        await new Promise(r => setTimeout(r, 500));
        const batch3 = await base44.asServiceRole.entities.Message.list('created_date', limit, limit * 2);
        if (batch3?.length) allMessages = allMessages.concat(batch3);
      }
    }

    console.log("Total mensagens carregadas:", allMessages.length);

    const toDelete = [];

    // 1. Deduplicar por whatsapp_message_id
    const byWaMsgId = {};
    for (const msg of allMessages) {
      if (!msg.whatsapp_message_id) continue;
      if (!byWaMsgId[msg.whatsapp_message_id]) {
        byWaMsgId[msg.whatsapp_message_id] = msg;
      } else {
        // Manter o mais antigo (menor created_date), deletar o mais novo
        const existing = byWaMsgId[msg.whatsapp_message_id];
        const existingDate = new Date(existing.created_date || 0).getTime();
        const msgDate = new Date(msg.created_date || 0).getTime();
        if (msgDate > existingDate) {
          toDelete.push(msg.id);
        } else {
          toDelete.push(existing.id);
          byWaMsgId[msg.whatsapp_message_id] = msg;
        }
      }
    }

    // 2. Para mensagens sem whatsapp_message_id, deduplicar por (phone + text + janela 30s)
    const withoutId = allMessages.filter(m => !m.whatsapp_message_id && !toDelete.includes(m.id));
    const groupedByPhone = {};
    for (const msg of withoutId) {
      const key = msg.contact_phone;
      if (!groupedByPhone[key]) groupedByPhone[key] = [];
      groupedByPhone[key].push(msg);
    }

    for (const phone of Object.keys(groupedByPhone)) {
      const msgs = groupedByPhone[phone].sort((a, b) =>
        new Date(a.timestamp || a.created_date || 0) - new Date(b.timestamp || b.created_date || 0)
      );

      const kept = [];
      for (const msg of msgs) {
        const msgTime = new Date(msg.timestamp || msg.created_date || 0).getTime();
        const isDuplicate = kept.some(k =>
          k.text === msg.text &&
          k.direction === msg.direction &&
          Math.abs(new Date(k.timestamp || k.created_date || 0).getTime() - msgTime) < 30000
        );
        if (isDuplicate) {
          toDelete.push(msg.id);
        } else {
          kept.push(msg);
        }
      }
    }

    console.log("Mensagens a deletar:", toDelete.length);

    // Deletar sequencialmente com pequena pausa para evitar rate limit
    let deleted = 0;
    const uniqueToDelete = [...new Set(toDelete)];
    for (const id of uniqueToDelete) {
      await base44.asServiceRole.entities.Message.delete(id);
      deleted++;
      // Pausa de 150ms a cada deleção para não bater no rate limit
      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({
      status: "ok",
      total_loaded: allMessages.length,
      duplicates_deleted: deleted,
    });
  } catch (error) {
    console.error("Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});