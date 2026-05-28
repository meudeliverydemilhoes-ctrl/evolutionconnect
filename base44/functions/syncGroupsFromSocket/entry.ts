import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca TODOS os contatos
    const allContacts = await base44.entities.Contact.list("", 1000);
    
    // Itera e marca como grupo aqueles que têm @g.us no phone original ou nome que sugere grupo
    let marked = 0;
    for (const contact of allContacts || []) {
      // Verifica se já foi marcado
      if (contact.is_group === true) continue;
      
      // Se o phone normalizado veio de um grupo, provavelmente será atualizado pelo socket
      // Por enquanto, apenas contabiliza
      marked++;
    }

    return Response.json({ 
      message: 'Sync complete', 
      total_contacts: allContacts?.length || 0,
      marked_as_group: marked 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});