import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
  console.log("RAW BODY:", bodyText.substring(0, 2000));

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch(e) {
    console.log("ERRO parse JSON:", e.message);
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Suporte a diferentes formatos do Tally:
  // { data: { fields: [...] } } ou { fields: [...] }
  const fields = body?.data?.fields || body?.fields || [];
  console.log("FIELDS COUNT:", fields.length);
  console.log("FIELDS:", JSON.stringify(fields));

  // Extrai valor de campo por label (case-insensitive, acento-tolerante)
  const normalize = (str) => (str || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const findField = (keywords) => {
    const field = fields.find(f => {
      const label = normalize(f.label || f.key || "");
      return keywords.some(kw => label.includes(kw));
    });
    return field?.value ?? field?.answer ?? null;
  };

  // Extrair NOME
  const nome = findField(["nome", "name"]) || "";

  // Extrair TELEFONE — apenas dígitos
  let telefoneRaw = findField(["telefone", "whatsapp", "celular", "phone", "fone"]) || "";
  let phone = String(telefoneRaw).replace(/\D/g, "");
  // Corrigir BR: 55 + DDD(2) + 8 dígitos = 12 → adiciona 9
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  // Se não tem DDI e tem 10 dígitos, adiciona 55
  if (!phone.startsWith("55") && phone.length === 10) {
    phone = "55" + phone.slice(0, 2) + "9" + phone.slice(2);
  }
  // Se não tem DDI e tem 11 dígitos
  if (!phone.startsWith("55") && phone.length === 11) {
    phone = "55" + phone;
  }

  // Extrair VALOR — número
  let valorRaw = findField(["valor", "orcamento", "orcamento", "budget", "faturamento", "receita"]) || 0;
  let valor = 0;
  if (typeof valorRaw === "number") {
    valor = valorRaw;
  } else {
    // Suporte a formatos PT-BR: "R$ 51.000", "51.000,00", "51000", "51,000"
    let s = String(valorRaw).replace(/[^\d,\.]/g, "");
    // Se tem ponto E vírgula: ponto = milhar, vírgula = decimal → "51.000,50" → 51000.50
    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(".") && !s.includes(",")) {
      // Só ponto: pode ser milhar ("51.000") ou decimal ("51.5")
      // Se dígitos após ponto == 3, é milhar
      const parts = s.split(".");
      if (parts[parts.length - 1].length === 3) {
        s = s.replace(/\./g, ""); // remove milhar
      }
    } else if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".");
    }
    valor = parseFloat(s) || 0;
  }

  console.log("EXTRAÍDO — nome:", nome, "| phone:", phone, "| valor:", valor);

  if (!phone) {
    console.log("IGNORADO: telefone não encontrado");
    return Response.json({ status: "ignored - no phone found" });
  }

  // Definir etapa do pipeline
  const stage = valor >= 51000 ? "qualificado" : "novo";
  console.log("ETAPA PIPELINE:", stage, "(valor:", valor, ")");

  // Criar ou atualizar Contact
  let contact;
  try {
    const existing = await sr.entities.Contact.filter({ phone });
    if (existing?.length > 0) {
      contact = existing[0];
      await sr.entities.Contact.update(contact.id, {
        name: nome || contact.name,
        last_contact_date: new Date().toISOString(),
      });
      console.log("CONTATO ATUALIZADO:", contact.id);
    } else {
      contact = await sr.entities.Contact.create({
        phone,
        name: nome || phone,
        status: "ativo",
        tags: [],
        last_contact_date: new Date().toISOString(),
      });
      console.log("CONTATO CRIADO:", contact.id);
    }
  } catch(e) {
    console.log("ERRO ao criar/atualizar contato:", e.message);
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
        });
        console.log("PIPELINE ATUALIZADO:", pipelineEntry.id, "→", stage);
      } else {
        console.log("PIPELINE mantido (movido manualmente):", pipelineEntry.id);
      }
    } else {
      pipelineEntry = await sr.entities.PipelineContact.create({
        contact_phone: phone,
        contact_name: nome || phone,
        stage,
        deal_value: valor || undefined,
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
    valor,
  });
});