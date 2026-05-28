import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendWhatsApp(phone, message) {
  const url = `${Deno.env.get('EVOLUTION_API_URL')}/message/sendText/${Deno.env.get('EVOLUTION_INSTANCE')}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': Deno.env.get('EVOLUTION_API_KEY') },
      body: JSON.stringify({ number: phone, text: message }),
    });
  } catch (e) {
    console.log('Erro ao enviar WhatsApp:', e.message);
  }
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

    // Pega email do usuário autenticado para enviar confirmação
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.log('Erro ao obter user:', e.message);
      user = null;
    }
    const userEmail = user?.email;

    // Formatar data e hora
    const dateStr = startTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' });
    const endDateStr = endTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', timeStyle: 'short' });

    // Enviar por e-mail (para o usuário + cliente se tiver email)
    const emailBody = `
      <h2>Reunião Agendada ✓</h2>
      <p><strong>Assunto:</strong> ${meeting.title || `Reunião com ${meeting.contact_name || 'Cliente'}`}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Duração:</strong> ${meeting.duration_minutes || 60} minutos</p>
      ${meeting.contact_name ? `<p><strong>Cliente:</strong> ${meeting.contact_name}</p>` : ''}
      ${meeting.contact_phone ? `<p><strong>WhatsApp:</strong> ${meeting.contact_phone}</p>` : ''}
      ${meetLink ? `<p><strong>Link Google Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''}
      ${meeting.notes ? `<p><strong>Notas:</strong> ${meeting.notes}</p>` : ''}
    `;

    // Enviar para o usuário
    if (userEmail) {
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `Reunião agendada: ${meeting.title || meeting.contact_name || 'Novo agendamento'}`,
        body: emailBody,
      });
    }

    // Enviar para o cliente se tiver e-mail
    if (meeting.contact_email) {
      const clientEmailBody = `
        <h2>Confirmação de Reunião</h2>
        <p>Olá${meeting.contact_name ? ` ${meeting.contact_name}` : ''}!</p>
        <p>Sua reunião está confirmada com os seguintes detalhes:</p>
        <p><strong>Assunto:</strong> ${meeting.title || 'Reunião'}</p>
        <p><strong>Data:</strong> ${dateStr}</p>
        <p><strong>Duração:</strong> ${meeting.duration_minutes || 60} minutos</p>
        ${meetLink ? `<p><strong>Link Google Meet:</strong> <a href="${meetLink}" style="color: #00a884; text-decoration: none; font-weight: bold;">${meetLink}</a></p>` : ''}
        <p>Qualquer dúvida, entre em contato!</p>
      `;
      try {
        await base44.integrations.Core.SendEmail({
          to: meeting.contact_email,
          subject: `Confirmação de Reunião: ${meeting.title || 'Novo Agendamento'}`,
          body: clientEmailBody,
        });
        console.log('E-mail enviado para cliente:', meeting.contact_email);
      } catch (e) {
        console.log('Erro ao enviar e-mail para cliente:', e.message);
      }
    }

    // Enviar link via WhatsApp se tiver telefone
    if (meeting.contact_phone && meetLink) {
      const msg = `Olá${meeting.contact_name ? ` ${meeting.contact_name}` : ''}! 🗓️\n\n📅 Sua reunião está confirmada!\n\n⏰ Data: ${dateStr}\n📞 Duração: ${meeting.duration_minutes || 60} minutos\n\n🎥 Link Google Meet:\n${meetLink}\n\nQualquer dúvida, é só chamar! 😊`;
      await sendWhatsApp(meeting.contact_phone, msg);
    }

    return Response.json({ success: true, eventId: created.id, htmlLink: created.htmlLink, meetLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});