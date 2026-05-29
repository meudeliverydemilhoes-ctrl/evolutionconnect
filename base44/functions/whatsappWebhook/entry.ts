import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendWhatsAppMessage(phone, message) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });
  return res.json();
}

async function getAIResponse(base44ServiceRole, userMessage, contactName, messageHistory) {
  const historyText = messageHistory.map(m =>
    `${m.direction === "received" ? "Lead" : "Iza"}: ${m.text}`
  ).join("\n");

  const result = await base44ServiceRole.integrations.Core.InvokeLLM({
    prompt: `Você é a IZA, do time comercial do Talison Rosa, mentor da Mentoria Delivery Pro.

SOBRE O TALISON ROSA:
- 10 anos de mercado, saiu de uma quebra e construiu três empresas milionárias.
- Toca a Styve Pizza, três unidades de delivery no RS (Tramandaí, Capão da Canoa, Canoas).
- Já profissionalizou +100 deliverys.
- Instagram: @mentordedelivery

SUA META ÚNICA: levar o lead qualificado para uma reunião de 30 min com a Brenda. NÃO fechar venda. NÃO falar preço. Conversar, entender e agendar.

CHECAGEM OBRIGATÓRIA ANTES DE RESPONDER:
1. LEIA TODO O HISTÓRICO DA CONVERSA. NUNCA faça perguntas que já foram respondidas.
2. SE a última mensagem foi sua e o lead não respondeu nada novo, NÃO MANDE NADA. Retorne vazio.
3. SE o lead já é mentorado, responda apenas: "Boa! Já vi aqui que você é mentorado com a gente, pode ficar tranquilo que a equipe já vai te responder por aqui, tá?" e PARE.
4. SE perguntar "você é IA?" / "é robô?" / "é automático?": responda "Sou a Iza, do time do Talison." e retome o fluxo. NUNCA diga que é IA, bot, automatizado, virtual.

PRIMEIRO CONTATO (use SÓ se for a primeira mensagem da conversa, sem histórico):
"Fala empresário! Me chamo Iza, sou do time do Talison Rosa. Vi que você trabalha com delivery, qual seu nome?"
Se já existem mensagens no histórico, NÃO use essa frase. Continue do ponto que parou.

FLUXO DE QUALIFICAÇÃO (uma pergunta por vez, na ordem):
1. Nome - "qual seu nome?"
2. Cidade - "Legal [nome], você tá de qual cidade?"
3. Tempo de mercado - "Massa. Tem quanto tempo nessa de delivery?"
4. Modelo - "Você só trabalha com delivery, só com salão, ou os dois?"
5. Faturamento - "Quanto tá faturando por mês hoje, em média?"
6. Principal desafio - "Qual o maior travadinho hoje no seu negócio?"

NÃO pule etapas. NÃO faça duas perguntas juntas. Uma por vez.
Se o lead responder algo que cobre 2 etapas (ex: "sou João de SP"), pula pra etapa 3.

COMO VOCÊ FALA:
- Frases CURTAS de WhatsApp. Máximo 3 linhas por mensagem.
- Português coloquial: to, tá, putz, deu certo, beleza, bah.
- 1 emoji por mensagem no MÁXIMO (de preferência nenhum).
- UMA pergunta por mensagem.
- Sem listas, bullets, marcadores. Só prosa.
- PROIBIDO: "alavancar", "destravar", "potencializar", "amiga querida", "estou à disposição", "fico no aguardo".

DECISÃO PELO FATURAMENTO:
ACIMA DE R$80k/mês:
1. "Top! Faz sentido você trocar uma ideia com a Brenda mesmo. Que dia da semana fica melhor pra ti, início ou final?"
2. Lead respondeu dia: "E de manhã ou de tarde fica melhor pra você?"
3. Confirma: "Ótimo, vou deixar reservado e a Brenda te manda confirmação com o link aqui pelo WhatsApp."

ABAIXO DE R$80k/mês (mas com delivery rodando):
"Tem um material do Talison que ajuda muito nessa fase, quer que eu te envie?"

SEM NEGÓCIO AINDA:
"Entendi. E você já tem alguma ideia de quanto teria pra investir pra começar?"
- Acima de R$150 mil disponível: vai pra reunião com a Brenda.
- Abaixo de R$150 mil: "Legal. Nesse momento o melhor caminho é se preparar bem antes de investir. Quer que eu te mande um material que ajuda muito nessa fase?"

OBJEÇÕES:
"Quanto custa?" / "preço?": "A Brenda vê isso contigo certinho na call, depende muito do seu momento. Quer que eu marque?"
"Sem tempo": "Imagino, rotina de delivery não para. Justamente por isso essa conversa ajuda. Qual dia fica melhor?"
"Vou pensar": "Tranquilo. O que tá te fazendo pensar - preço, formato, alguma dúvida? Se for dúvida talvez a Brenda mate em 5 min na call."
"Já tenho consultoria": "Boa! Então você já sabe o quanto isso faz diferença. Vale trocar ideia pra ver o que dá pra melhorar ainda."
"Não acredito em consultoria": "Entendo, e você tem razão de desconfiar. O que proponho é simples: 30 min com a Brenda, sem compromisso. Você conhece ela, decide depois. Topa?"
Pediu falar com Brenda direto: "Combinado, vou pedir pra ela te chamar direto. Em alguns minutos ela te responde por aqui."
Fora de contexto: "Putz, não entendi bem. Me conta melhor, o que você queria saber?"

NUNCA:
- Repetir pergunta já respondida.
- Falar preço, valor, faixa, parcelamento, desconto.
- Prometer renda específica. Use "tem aluno que dobrou ticket" ou "Talison fez Y nas pizzarias dele".
- Inventar escassez, vagas, prazo, promoção.
- Insistir em objeção mais que 2 vezes.
- Despejar módulos da mentoria.
- Dizer que é IA, bot, automatizado, virtual.
- Mandar links sem o lead ter pedido.
- Mensagem com mais de 4 linhas.
- Listas, bullets, marcadores.

HISTÓRICO DA CONVERSA ATÉ AGORA:
${historyText || "(sem histórico ainda - primeira mensagem)"}

NOME DO LEAD (se já souber): ${contactName || "ainda não informado"}

NOVA MENSAGEM DO LEAD: "${userMessage}"

Responda como a Iza, seguindo todas as regras acima. Resposta curta, direta, natural. Se não há nada a responder (já respondeu recentemente e lead não enviou nada novo), retorne exatamente: [SILENCIO]`,
    model: "claude_sonnet_4_6",
  });

  if (!result || result.trim() === "[SILENCIO]") return null;
  return result.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === "GET") {
      return Response.json({ status: "ok", message: "WhatsApp Webhook ativo" });
    }

    const bodyText = await req.text();
    console.log("RAW BODY:", bodyText);
    
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch(e) {
      console.log("Erro ao parsear JSON:", e.message);
      return Response.json({ status: "error parsing body" });
    }
    
    console.log("PAYLOAD COMPLETO:", JSON.stringify(body));
    console.log("HEADERS:", JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Suporte a todos os formatos da Evolution API:
    // Formato 1 (webhookByEvents=false): { event: "MESSAGES_UPSERT", data: {...} }
    // Formato 2 (webhookByEvents=true):  { MESSAGES_UPSERT: {...} } ou { messages_upsert: {...} }
    // Formato 3 (legado):                { key: {...}, message: {...} }
    let event = body?.event;
    let data = body?.data;

    if (!data) {
      // Tentar formato webhookByEvents=true
      const evtData = body?.MESSAGES_UPSERT || body?.messages_upsert || body?.MESSAGE_UPSERT;
      if (evtData) {
        event = "MESSAGES_UPSERT";
        data = evtData;
      } else {
        // Formato legado: o body inteiro é o data
        data = body;
      }
    }

    const message = data?.message;
    const key = data?.key;

    // Ignorar mensagens enviadas por nós
    if (key?.fromMe === true) {
      console.log("Ignorado: mensagem própria");
      return Response.json({ status: "ignored - own message" });
    }

    // Ignorar eventos que não são de mensagem (deixar passar os novos eventos de sync)
    const SYNC_EVENTS = ["CONTACTS_SET", "CONTACTS_UPSERT", "CHATS_SET", "CHATS_UPSERT", "GROUPS_UPSERT"];
    if (event && SYNC_EVENTS.includes(event)) {
      // Processar upsert de grupos via webhook
      if (event === "GROUPS_UPSERT") {
        const groups = Array.isArray(data) ? data : [data];
        for (const grp of groups) {
          const rawJid = grp?.id || "";
          if (!rawJid.includes("@g.us")) continue;
          const phone = rawJid.replace("@g.us", "").replace(/@[a-z.]+$/, "");
          if (!phone) continue;
          const name = grp.subject || grp.name || `Grupo ${phone}`;
          const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
          if (existing?.length > 0) {
            if (!existing[0].is_group) await base44.asServiceRole.entities.Contact.update(existing[0].id, { is_group: true, name: existing[0].name || name });
          } else {
            await base44.asServiceRole.entities.Contact.create({ phone, name, is_group: true, status: "ativo", tags: [] });
          }
        }
      }
      // Processar upsert de contatos individuais
      if (event === "CONTACTS_UPSERT") {
        const ctList = Array.isArray(data) ? data : [data];
        for (const ct of ctList) {
          const rawJid = ct?.id || "";
          if (!rawJid || rawJid.includes("@g.us")) continue;
          let phone = rawJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/@[a-z.]+$/, "").replace(/\D/g, "");
          if (phone.startsWith("55") && phone.length === 12) phone = phone.slice(0, 4) + "9" + phone.slice(4);
          if (!phone) continue;
          const name = ct.pushName || ct.name || ct.verifiedName || null;
          const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
          if (!existing?.length && name) {
            await base44.asServiceRole.entities.Contact.create({ phone, name, status: "ativo", tags: [] });
          } else if (existing?.length && !existing[0].name && name) {
            await base44.asServiceRole.entities.Contact.update(existing[0].id, { name });
          }
        }
      }
      return Response.json({ status: "ok - sync event: " + event });
    }
    if (event && !["messages.upsert", "MESSAGES_UPSERT", "message", "messages.update"].includes(event)) {
      console.log("Evento ignorado:", event);
      return Response.json({ status: "ignored - event: " + event });
    }

    // Log completo do key para debug do @lid
    console.log("KEY COMPLETO:", JSON.stringify(key));
    console.log("DATA COMPLETO:", JSON.stringify(data));

    // Suporte ao novo formato @lid do WhatsApp
    // Tentar todas as possibilidades de telefone disponíveis no payload
    const remoteJid = key?.remoteJid || "";
    const phoneRaw = key?.remoteJidAlt 
      || data?.remoteJidAlt 
      || data?.participant
      || (remoteJid.includes("@lid") ? null : remoteJid)
      || data?.from 
      || data?.phoneNumber
      || "";

    // Grupos: salvar como contato/mensagem mas sem acionar IA
    const isGroup = remoteJid.includes("@g.us");
    if (isGroup) {
      // Normalizar phone do grupo removendo @g.us
      const groupPhone = remoteJid.replace("@g.us", "").replace(/@[a-z.]+$/, "");
      const groupPushName = data?.pushName || data?.notifyName || groupPhone;
      const groupMessageText = message?.conversation
        || message?.extendedTextMessage?.text
        || message?.imageMessage?.caption
        || data?.body || "";
      if (groupPhone && groupMessageText) {
        await base44.asServiceRole.entities.Message.create({
          contact_phone: groupPhone,
          text: groupMessageText,
          direction: "received",
          timestamp: new Date().toISOString(),
        });
        const existing = await base44.asServiceRole.entities.Contact.filter({ phone: groupPhone });
        if (existing?.length > 0) {
          await base44.asServiceRole.entities.Contact.update(existing[0].id, {
            last_message: groupMessageText,
            last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            is_group: true,
          });
        } else {
          await base44.asServiceRole.entities.Contact.create({
            phone: groupPhone,
            name: groupPushName,
            last_message: groupMessageText,
            last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            status: "ativo",
            tags: [],
            is_group: true,
          });
        }
      }
      return Response.json({ status: "ok - group saved" });
    }

    if (!phoneRaw) {
      console.log("ATENÇÃO @lid sem alternativa - data completo:", JSON.stringify(data), "key:", JSON.stringify(key));
      return Response.json({ status: "ignored - @lid sem alternativa" });
    }

    // phoneRaw pode ser ex: 555199667558@s.whatsapp.net (faltando dígito 9)
    // Corrigir número BR: 55 + DDD(2) + 9 + número(8) = 13 dígitos total
    let phone = phoneRaw.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
    // Se número BR (começa com 55) e tem 12 dígitos (sem o 9), inserir o 9
    if (phone.startsWith("55") && phone.length === 12) {
      phone = phone.slice(0, 4) + "9" + phone.slice(4);
    }
    const pushName = data?.pushName || data?.notifyName || "";
    // Detectar tipo de mídia
    const isAudio = !!(message?.audioMessage || message?.pttMessage);
    const isImage = !!message?.imageMessage;
    const isVideo = !!message?.videoMessage;
    const isDocument = !!message?.documentMessage;
    const isSticker = !!message?.stickerMessage;

    const messageText = message?.conversation
      || message?.extendedTextMessage?.text
      || message?.imageMessage?.caption
      || message?.videoMessage?.caption
      || message?.documentMessage?.caption
      || data?.body
      || body?.body
      || (isAudio ? "[áudio]" : "")
      || (isImage ? "[imagem]" : "")
      || (isVideo ? "[vídeo]" : "")
      || (isDocument ? "[documento]" : "")
      || (isSticker ? "[sticker]" : "")
      || "";

    console.log(`phone="${phone}" | texto="${messageText}" | pushName="${pushName}"`);

    if (!phone || !messageText) {
      console.log("Ignorado: sem telefone ou texto. remoteJid:", phoneRaw, "| messageKeys:", Object.keys(message || {}));
      return Response.json({ status: "ignored - no content" });
    }

    console.log(`Mensagem de ${phone} (${pushName}): ${messageText}`);

    // Salvar mensagem recebida no histórico
    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: messageText,
      direction: "received",
      timestamp: new Date().toISOString(),
    });

    // Encontrar ou criar contato
    const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
    let contact;

    if (contacts && contacts.length > 0) {
      contact = contacts[0];
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        last_message: messageText,
        last_message_time: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        name: contact.name || pushName,
      });
    } else {
      contact = await base44.asServiceRole.entities.Contact.create({
        phone,
        name: pushName,
        last_message: messageText,
        last_message_time: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        status: "ativo",
        tags: [],
      });
      console.log("Novo contato criado:", contact.id);

      // Auto-tagging: busca tags com auto_apply=true ou trigger_keyword
      const allTags = await base44.asServiceRole.entities.Tag.list();
      const autoTags = allTags.filter(t =>
        t.auto_apply ||
        (t.trigger_keyword && messageText.toLowerCase().includes(t.trigger_keyword.toLowerCase()))
      );

      if (autoTags.length > 0) {
        const tagIds = autoTags.map(t => t.id);
        await base44.asServiceRole.entities.Contact.update(contact.id, { tags: tagIds });
        contact.tags = tagIds;

        // Move para pipeline conforme a primeira tag com pipeline_stage
        const tagWithStage = autoTags.find(t => t.pipeline_stage);
        if (tagWithStage) {
          const existing = await base44.asServiceRole.entities.PipelineContact.filter({ contact_phone: phone });
          if (!existing || existing.length === 0) {
            await base44.asServiceRole.entities.PipelineContact.create({
              contact_phone: phone,
              contact_name: pushName,
              stage: tagWithStage.pipeline_stage,
            });
            console.log(`Contato ${phone} movido para pipeline: ${tagWithStage.pipeline_stage}`);
          }
        }
        console.log(`Auto-tags aplicadas a ${phone}:`, tagIds);
      }
    }

    // Buscar histórico recente de mensagens para contexto
    const messageHistory = await base44.asServiceRole.entities.Message.filter(
      { contact_phone: phone },
      "timestamp",
      20
    );

    // Gerar resposta de IA
    const aiResponse = await getAIResponse(base44.asServiceRole, messageText, contact.name || pushName, messageHistory);

    if (!aiResponse) {
      console.log(`Iza optou por silêncio para ${phone}`);
      return Response.json({ status: "ok - silencio", contact_id: contact.id });
    }

    // Enviar resposta
    await sendWhatsAppMessage(phone, aiResponse);

    // Salvar resposta da IA no histórico
    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: aiResponse,
      direction: "sent",
      timestamp: new Date().toISOString(),
    });

    console.log(`Iza respondeu para ${phone}: ${aiResponse}`);

    return Response.json({ status: "ok", contact_id: contact.id });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});