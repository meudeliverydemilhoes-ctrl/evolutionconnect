import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mapeamento de possíveis nomes de campo para campos normalizados
function extractFields(body) {
  // Suporte a payload flat ou aninhado em data/fields/answers
  const d = body?.data || body?.fields || body?.form_data || body;

  const nome = d?.nome || d?.nome_completo || d?.name || d?.full_name || d?.["1"] || "";
  const whatsapp = (d?.whatsapp || d?.phone || d?.telefone || d?.celular || d?.["2"] || "").toString().replace(/\D/g, "");
  const email = d?.email || d?.["3"] || "";
  const instagram = d?.instagram || d?.["4"] || "";
  const faturamento = d?.faturamento || d?.["5"] || "";
  const urgencia_tempo = d?.urgencia_tempo || d?.quando || d?.["6"] || "";
  const decisor = d?.decisor || d?.quem_decide || d?.["7"] || "";
  const urgencia_resolver = d?.urgencia_resolver || d?.urgencia || d?.["8"] || "";
  const investimento = d?.investimento || d?.["9"] || "";

  return { nome, whatsapp, email, instagram, faturamento, urgencia_tempo, decisor, urgencia_resolver, investimento };
}

function normalizePhone(raw) {
  let phone = raw.replace(/\D/g, "");
  // Adicionar DDI Brasil se não tiver
  if (phone.length <= 11) phone = "55" + phone;
  // Corrigir 12 dígitos BR (faltando o 9)
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone;
}

// Custom fields padrão para o Pipeline exibir os dados do formulário
const LP_CUSTOM_FIELDS = [
  { id: "faturamento", label: "Faturamento", type: "text" },
  { id: "urgencia_tempo", label: "Quando quer começar", type: "text" },
  { id: "decisor", label: "Quem decide", type: "text" },
  { id: "urgencia_resolver", label: "Urgência", type: "text" },
  { id: "investimento", label: "Disposto a investir R$10k", type: "text" },
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
    console.log("LP Webhook raw body:", bodyText);

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      // Tentar form-urlencoded
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
    console.log("Phone normalizado:", phone, "| Nome:", nome);

    // 1. Garantir que PipelineConfig tem os custom_fields da LP
    const configs = await base44.asServiceRole.entities.PipelineConfig.list();
    const config = configs[0];
    if (config) {
      const existingIds = (config.custom_fields || []).map(f => f.id);
      const missing = LP_CUSTOM_FIELDS.filter(f => !existingIds.includes(f.id));
      if (missing.length > 0) {
        const merged = [...(config.custom_fields || []), ...missing];
        await base44.asServiceRole.entities.PipelineConfig.update(config.id, { custom_fields: merged });
        console.log("PipelineConfig atualizado com campos LP:", missing.map(f => f.id));
      }
    } else {
      await base44.asServiceRole.entities.PipelineConfig.create({ custom_fields: LP_CUSTOM_FIELDS });
      console.log("PipelineConfig criado com campos LP");
    }

    // 2. Criar ou atualizar Contact
    const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
    let contact;
    if (existing?.length > 0) {
      contact = existing[0];
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        name: contact.name || nome || phone,
        email: email || contact.email,
        last_contact_date: new Date().toISOString(),
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
        last_message: `Formulário LP: ${faturamento || ""}`,
      });
      console.log("Contato criado:", contact.id);
    }

    // 3. Criar ou atualizar PipelineContact com custom_data
    const customData = {
      faturamento,
      urgencia_tempo,
      decisor,
      urgencia_resolver,
      investimento,
      instagram,
      email,
    };

    const pipelineExisting = await base44.asServiceRole.entities.PipelineContact.filter({ contact_phone: phone });
    if (pipelineExisting?.length > 0) {
      await base44.asServiceRole.entities.PipelineContact.update(pipelineExisting[0].id, {
        contact_name: nome || pipelineExisting[0].contact_name,
        custom_data: customData,
      });
      console.log("PipelineContact atualizado:", pipelineExisting[0].id);
    } else {
      await base44.asServiceRole.entities.PipelineContact.create({
        contact_phone: phone,
        contact_name: nome || phone,
        stage: "novo",
        custom_data: customData,
      });
      console.log("PipelineContact criado para", phone);
    }

    return Response.json({ status: "ok", phone, nome });
  } catch (error) {
    console.error("Erro no lpWebhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});