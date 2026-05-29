import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// IDs exatos dos campos do formulário da LP imersao.talisonrosa.com.br
// f_nome, f_whats, f_email, f_insta, faturamento, tempo, decisor, intencao, investimento
function extractFields(body) {
  const d = body?.data || body;

  const nome = d?.f_nome || d?.nome || d?.nome_completo || d?.name || "";
  const whatsapp = (d?.f_whats || d?.whatsapp || d?.phone || d?.telefone || "").toString();
  const email = d?.f_email || d?.email || "";
  const instagram = d?.f_insta || d?.instagram || "";
  const faturamento = d?.faturamento || "";
  const urgencia_tempo = d?.tempo || d?.urgencia_tempo || "";
  const decisor = d?.decisor || "";
  const urgencia_resolver = d?.intencao || d?.urgencia_resolver || d?.urgencia || "";
  const investimento = d?.investimento || "";

  return { nome, whatsapp, email, instagram, faturamento, urgencia_tempo, decisor, urgencia_resolver, investimento };
}

function normalizePhone(raw) {
  let phone = raw.replace(/\D/g, "");
  if (phone.length <= 11) phone = "55" + phone;
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone;
}

const LP_CUSTOM_FIELDS = [
  { id: "faturamento", label: "Faturamento", type: "text" },
  { id: "urgencia_tempo", label: "Quando quer começar", type: "text" },
  { id: "decisor", label: "Quem decide", type: "text" },
  { id: "urgencia_resolver", label: "Urgência", type: "text" },
  { id: "investimento", label: "Investe R$10k?", type: "text" },
  { id: "instagram", label: "Instagram", type: "text" },
  { id: "email", label: "E-mail", type: "text" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === "GET") {
      return Response.json({ status: "ok", message: "LP Webhook ativo" });
    }

    const bodyText = await req.text();
    console.log("LP Webhook raw:", bodyText.slice(0, 500));

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      const params = new URLSearchParams(bodyText);
      body = Object.fromEntries(params.entries());
    }

    console.log("LP Webhook parsed:", JSON.stringify(body));

    const { nome, whatsapp, email, instagram, faturamento, urgencia_tempo, decisor, urgencia_resolver, investimento } = extractFields(body);

    if (!whatsapp) {
      console.log("LP Webhook: sem WhatsApp no payload");
      return Response.json({ status: "error", message: "WhatsApp obrigatório" }, { status: 400 });
    }

    const phone = normalizePhone(whatsapp);
    console.log("Phone:", phone, "| Nome:", nome, "| Faturamento:", faturamento);

    // Garantir custom_fields no PipelineConfig
    const configs = await base44.asServiceRole.entities.PipelineConfig.list();
    const config = configs[0];
    if (config) {
      const existingIds = (config.custom_fields || []).map(f => f.id);
      const missing = LP_CUSTOM_FIELDS.filter(f => !existingIds.includes(f.id));
      if (missing.length > 0) {
        await base44.asServiceRole.entities.PipelineConfig.update(config.id, {
          custom_fields: [...(config.custom_fields || []), ...missing],
        });
      }
    } else {
      await base44.asServiceRole.entities.PipelineConfig.create({ custom_fields: LP_CUSTOM_FIELDS });
    }

    // Criar ou atualizar Contact
    const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
    let contact;
    if (existing?.length > 0) {
      contact = existing[0];
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        name: contact.name || nome || phone,
        email: email || contact.email,
        last_contact_date: new Date().toISOString(),
        last_message_time: new Date().toISOString(),
        last_message: `LP: ${faturamento || "formulário"}`,
      });
    } else {
      contact = await base44.asServiceRole.entities.Contact.create({
        phone,
        name: nome || phone,
        email,
        status: "ativo",
        tags: [],
        last_contact_date: new Date().toISOString(),
        last_message_time: new Date().toISOString(),
        last_message: `LP: ${faturamento || "formulário"}`,
      });
      console.log("Contato criado:", contact.id);
    }

    // Criar ou atualizar PipelineContact com todas as respostas em custom_data
    const customData = { faturamento, urgencia_tempo, decisor, urgencia_resolver, investimento, instagram, email };

    const pipelineExisting = await base44.asServiceRole.entities.PipelineContact.filter({ contact_phone: phone });
    if (pipelineExisting?.length > 0) {
      await base44.asServiceRole.entities.PipelineContact.update(pipelineExisting[0].id, {
        contact_name: nome || pipelineExisting[0].contact_name,
        custom_data: customData,
      });
      console.log("PipelineContact atualizado:", pipelineExisting[0].id, customData);
    } else {
      const created = await base44.asServiceRole.entities.PipelineContact.create({
        contact_phone: phone,
        contact_name: nome || phone,
        stage: "novo",
        custom_data: customData,
      });
      console.log("PipelineContact criado:", created.id, customData);
    }

    return Response.json({ status: "ok", phone, nome });
  } catch (error) {
    console.error("Erro no lpWebhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});