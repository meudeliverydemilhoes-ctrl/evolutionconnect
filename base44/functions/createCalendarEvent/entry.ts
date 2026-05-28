import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
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
    return Response.json({ success: true, eventId: created.id, htmlLink: created.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});