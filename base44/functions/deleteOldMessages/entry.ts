import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Início do dia de hoje (Brasília = UTC-3)
    const now = new Date();
    const todayBrasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    todayBrasilia.setHours(0, 0, 0, 0);
    // Converter de volta para UTC
    const offsetMs = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getTime();
    const todayUTC = new Date(todayBrasilia.getTime() + offsetMs);

    console.log(`Deletando mensagens anteriores a: ${todayUTC.toISOString()}`);

    let deleted = 0;
    let page = 0;
    const pageSize = 50;

    while (true) {
      const messages = await base44.asServiceRole.entities.Message.list('-created_date', pageSize, page * pageSize);
      if (!messages || messages.length === 0) break;

      const toDelete = messages.filter(m => {
        const msgDate = new Date(m.timestamp || m.created_date);
        return msgDate < todayUTC;
      });

      for (const msg of toDelete) {
        await base44.asServiceRole.entities.Message.delete(msg.id);
        deleted++;
        // Pequena pausa para evitar rate limit
        if (deleted % 10 === 0) await sleep(500);
      }

      // Se não há mais para deletar nesta página e chegamos ao fim, para
      if (messages.length < pageSize) break;
      page++;
      await sleep(300);
    }

    console.log(`Deletadas ${deleted} mensagens anteriores a hoje.`);
    return Response.json({ status: 'ok', deleted });
  } catch (error) {
    console.error('Erro ao deletar mensagens:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});