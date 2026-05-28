import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: `${from_name || 'CRM WhatsApp'} <onboarding@resend.dev>`,
      to: 'meudeliverydemilhoes@gmail.com',
      subject: `[Para: ${to}] ${subject}`,
      html: `<p><strong>Destinatário original:</strong> ${to}</p>${body}`,
    });

    if (result.error) {
      console.error('Erro ao enviar e-mail com Resend:', result.error);
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    console.log('✅ E-mail enviado para você (para repassar a: ' + to + '):', result.data?.id);
    return Response.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});