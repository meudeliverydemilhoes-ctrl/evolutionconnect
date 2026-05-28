import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone } = await req.json();
    if (!phone) return Response.json({ error: 'phone required' }, { status: 400 });

    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    const resp = await fetch(
      `${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone })
      }
    );

    if (!resp.ok) return Response.json({ profilePicUrl: null });

    const data = await resp.json();
    const profilePicUrl = data.profilePictureUrl || data.picture || null;

    // Salva na entidade Contact
    if (profilePicUrl) {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
      if (contacts && contacts.length > 0) {
        await base44.asServiceRole.entities.Contact.update(contacts[0].id, { profile_pic: profilePicUrl });
      }
    }

    return Response.json({ profilePicUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});