import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendWhatsApp(phone, message) {
  const url = `${Deno.env.get('EVOLUTION_API_URL')}/message/sendText/${Deno.env.get('EVOLUTION_INSTANCE')}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': Deno.env.get('EVOLUTION_API_KEY') },
    body: JSON.stringify({ number: phone, text: message }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Suporte a chamada direta (frontend) e automação de entidade
    const meeting = body.data || body;

    if (!meeting?.date) {
      return Response.json({ error: 'Data da reunião não informada' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const startTime = new Date(meeting.date);
    const durationMs = (meeting.duration_minutes || 60) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    const event = {
      summary: meeting.title || `Reunião com ${meeting.contact_name || 'Cliente'}`,
      description: [
        meeting.contact_name ? `Cliente: ${meeting.contact_name}` : '',
        meeting.contact_phone ? `WhatsApp: ${meeting.contact_phone}` : '',
        meeting.notes ? `Notas: ${meeting.notes}` : '',
      ].filter(Boolean).join('\n'),
      start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }],
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const created = await res.json();

    // Extrair link do Google Meet
    const meetLink = created.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      || created.hangoutLink
      || created.htmlLink;

    // Enviar link via WhatsApp se tiver telefone
    if (meeting.contact_phone && meetLink) {
      const dateStr = startTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
      const msg = `Olá${meeting.contact_name ? ` ${meeting.contact_name}` : ''}! 🗓️ Sua reunião está confirmada para ${dateStr}.\n\nAcesse pelo link: ${meetLink}\n\nQualquer dúvida, é só chamar!`;
      await sendWhatsApp(meeting.contact_phone, msg);
    }

    return Response.json({ success: true, eventId: created.id, htmlLink: created.htmlLink, meetLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});