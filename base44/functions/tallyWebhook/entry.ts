import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Detecta se uma faixa de faturamento textual é >= 51 mil
function parseFaturamento(raw) {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;

  const s = String(raw).toLowerCase();

  // Faixas textuais comuns
  if (s.includes("acima de") || s.includes("mais de") || s.includes("acima")) {
    // Ex: "Acima de R$ 100 mil" → extrai o número
    const match = s.match(/(\d+[\d.,]*)\s*(mil|k)?/);
    if (match) {
      let n = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (match[2]) n *= 1000;
      return n;
    }
    return 999999; // genérico "acima de" sem número → alto
  }

  // "R$ 50 mil a R$ 100 mil" → pega o MENOR valor da faixa
  const rangeMatch = s.match(/(\d+[\d.,]*)\s*(mil|k)?\s*(a|até|ao)\s*(r\$\s*)?(\d+[\d.,]*)\s*(mil|k)?/);
  if (rangeMatch) {
    let n = parseFloat(rangeMatch[1].replace(/\./g, "").replace(",", "."));
    if (rangeMatch[2]) n *= 1000;
    return n; // usa o limite inferior da faixa
  }

  // "Até R$ 50 mil" / "menos de R$ 50 mil"
  if (s.includes("até") || s.includes("menos de") || s.includes("abaixo")) {
    const match = s.match(/(\d+[\d.,]*)\s*(mil|k)?/);
    if (match) {
      let n = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (match[2]) n *= 1000;
      return n - 1; // abaixo do limite
    }
    return 0;
  }

  // Número direto (com possível formato PT-BR)
  let clean = String(raw).replace(/[^\d,\.]/g, "");
  if (clean.includes(".") && clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(".") && !clean.includes(",")) {
    const parts = clean.split(".");
    if (parts[parts.length - 1].length === 3) clean = clean.replace(/\./g, "");
  } else if (clean.includes(",") && !clean.includes(".")) {
    clean = clean.replace(",", ".");
  }
  // Detecta "mil" / "k" no original
  if (s.includes(" mil") || s.endsWith("mil") || s.includes(" k")) {
    return (parseFloat(clean) || 0) * 1000;
  }
  return parseFloat(clean) || 0;
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return Response.json({ status: "ok", message: "Tally Webhook ativo" });
  }

  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch(e) {
    return Response.json({ error: "error reading body" }, { status: 400 });
  }

  console.log("=== TALLY WEBHOOK RECEBIDO ===");
  console.log("RAW BODY:", bodyText.substring(0, 3000));

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch(e) {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Suporte a { data: { fields: [...] } } ou { fields: [...] }
  const fields = body?.data?.fields || body?.fields || [];
  console.log("FIELDS COUNT:", fields.length);

  // Lookup exato por label (case-insensitive, acento-tolerante)
  const norm = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const getField = (labelContains) => {
    const kw = norm(labelContains);
    const field = fields.find(f => norm(f.label || f.key || "").includes(kw));
    // Tally pode retornar value como array (multiple choice) ou string
    const val = field?.value ?? field?.answer ?? null;
    if (Array.isArray(val)) return val.join(", ");
    return val;
  };

  // Campos exatos do formulário
  const nome        = getField("qual seu nome") || getField("nome") || "";
  const email       = getField("qual seu e-mail") || getField("e-mail") || getField("email") || "";
  const whatsappRaw = getField("qual seu whatsapp") || getField("whatsapp") || getField("celular") || getField("telefone") || "";
  const faturamentoRaw = getField("media do seu faturamento") || getField("faturamento") || getField("receita") || "";
  const tipoNegocio = getField("tipo de negocio") || getField("negocio de alimentacao") || getField("tipo de negocio") || "";
  const instagram   = getField("nome do seu instagram") || getField("instagram") || "";
  const cargo       = getField("seu cargo") || getField("cargo") || "";
  const desafio     = getField("maior desafio") || getField("desafio") || "";

  // Normalizar telefone — só dígitos + DDI BR
  let phone = String(whatsappRaw).replace(/\D/g, "");
  if (phone.startsWith("55") && phone.length === 12) phone = phone.slice(0, 4) + "9" + phone.slice(4);
  if (!phone.startsWith("55") && phone.length === 10) phone = "55" + phone.slice(0, 2) + "9" + phone.slice(2);
  if (!phone.startsWith("55") && phone.length === 11) phone = "55" + phone;

  // Parsear faturamento e definir etapa
  const valor = parseFaturamento(faturamentoRaw);
  const stage = valor >= 51000 ? "qualificado" : "novo";

  console.log("EXTRAÍDO — nome:", nome, "| phone:", phone, "| faturamento:", faturamentoRaw, "→", valor, "| stage:", stage);
  console.log("EXTRAS — email:", email, "| instagram:", instagram, "| cargo:", cargo, "| tipoNegocio:", tipoNegocio);

  if (!phone) {
    console.log("IGNORADO: telefone não encontrado");
    return Response.json({ status: "ignored - no phone found" });
  }

  // Montar observações com todos os campos extras
  const notas = [
    email       && `E-mail: ${email}`,
    tipoNegocio && `Tipo de negócio: ${tipoNegocio}`,
    instagram   && `Instagram: ${instagram}`,
    cargo       && `Cargo: ${cargo}`,
    faturamentoRaw && `Faturamento declarado: ${faturamentoRaw}`,
    desafio     && `Maior desafio: ${desafio}`,
  ].filter(Boolean).join("\n");

  // Criar ou atualizar Contact
  let contact;
  try {
    const existing = await sr.entities.Contact.filter({ phone });
    if (existing?.length > 0) {
      contact = existing[0];
      await sr.entities.Contact.update(contact.id, {
        name: nome || contact.name,
        email: email || contact.email,
        notes: notas || contact.notes,
        last_contact_date: new Date().toISOString(),
      });
      console.log("CONTATO ATUALIZADO:", contact.id);
    } else {
      contact = await sr.entities.Contact.create({
        phone,
        name: nome || phone,
        email: email || undefined,
        notes: notas || undefined,
        status: "ativo",
        tags: [],
        last_contact_date: new Date().toISOString(),
      });
      console.log("CONTATO CRIADO:", contact.id);
    }
  } catch(e) {
    console.log("ERRO contato:", e.message);
    return Response.json({ error: "contact error: " + e.message }, { status: 500 });
  }

  // Criar ou atualizar PipelineContact
  let pipelineEntry;
  try {
    const existingPipe = await sr.entities.PipelineContact.filter({ contact_phone: phone });
    if (existingPipe?.length > 0) {
      pipelineEntry = existingPipe[0];
      if (!pipelineEntry.moved_manually) {
        await sr.entities.PipelineContact.update(pipelineEntry.id, {
          stage,
          deal_value: valor || pipelineEntry.deal_value,
          contact_name: nome || pipelineEntry.contact_name,
          notes: notas || pipelineEntry.notes,
        });
        console.log("PIPELINE ATUALIZADO:", pipelineEntry.id, "→", stage);
      } else {
        console.log("PIPELINE mantido (movido manualmente)");
      }
    } else {
      pipelineEntry = await sr.entities.PipelineContact.create({
        contact_phone: phone,
        contact_name: nome || phone,
        stage,
        deal_value: valor || undefined,
        notes: notas || undefined,
      });
      console.log("PIPELINE CRIADO:", pipelineEntry.id, "| etapa:", stage);
    }
  } catch(e) {
    console.log("ERRO pipeline:", e.message);
    return Response.json({ error: "pipeline error: " + e.message }, { status: 500 });
  }

  return Response.json({
    status: "ok",
    contact_id: contact.id,
    pipeline_id: pipelineEntry.id,
    stage,
    nome,
    phone,
    email,
    faturamento_raw: faturamentoRaw,
    faturamento_parsed: valor,
  });
});