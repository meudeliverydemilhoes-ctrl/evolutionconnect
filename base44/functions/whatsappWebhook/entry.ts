import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sendWhatsAppMessage(phone, message, jidOverride) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL").replace(/\/$/, "");
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
      number: jidOverride || phone,
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
      return Response.json({ status: "ok", message: "WhatsApp Webhook ativo - Talisonrosadelivery" });
    }

    // Ler body bruto para debug
    const bodyText = await req.text();
    console.log("=== WEBHOOK RECEBIDO ===");
    console.log("METHOD:", req.method);
    console.log("RAW BODY (primeiros 2000 chars):", bodyText.substring(0, 2000));

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch(e) {
      console.log("ERRO ao parsear JSON:", e.message);
      return Response.json({ status: "error parsing body" });
    }

    console.log("EVENT:", body?.event);
    console.log("INSTANCE:", body?.instance);
    console.log("DATA KEYS:", Object.keys(body?.data || body || {}));

    // Extrair evento e data — suporte a byEvents=false e byEvents=true
    // byEvents=false: { event: "MESSAGES_UPSERT", instance: "...", data: { key: {...}, message: {...} } }
    // byEvents=true:  { MESSAGES_UPSERT: { key: {...}, message: {...} } }
    // legado:         { key: {...}, message: {...} }
    let event = body?.event;
    let data = body?.data;

    if (!event && !data) {
      // Tentar formato byEvents=true
      const evtKey = Object.keys(body || {}).find(k =>
        k.toUpperCase().includes("MESSAGES") || k.toUpperCase().includes("MESSAGE")
      );
      if (evtKey) {
        event = evtKey.toUpperCase();
        data = body[evtKey];
        console.log("Detectado formato byEvents=true, evento:", event);
      } else {
        // Formato legado: body inteiro é o data
        data = body;
        event = "MESSAGES_UPSERT";
        console.log("Formato legado detectado");
      }
    }

    if (!data && body?.key) {
      // Body direto tem key — é o data
      data = body;
      event = event || "MESSAGES_UPSERT";
    }

    console.log("EVENT NORMALIZADO:", event);
    console.log("DATA:", JSON.stringify(data)?.substring(0, 500));

    // Processar eventos de sync (contatos, grupos)
    const SYNC_EVENTS = ["CONTACTS_SET", "CONTACTS_UPSERT", "CHATS_SET", "CHATS_UPSERT", "GROUPS_UPSERT"];
    const eventUpper = (event || "").toUpperCase();

    if (SYNC_EVENTS.includes(eventUpper)) {
      if (eventUpper === "GROUPS_UPSERT") {
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
      if (eventUpper === "CONTACTS_UPSERT") {
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

    // Aceitar apenas eventos de mensagem
    const MSG_EVENTS = ["MESSAGES_UPSERT", "MESSAGES.UPSERT", "MESSAGE", "SEND.MESSAGE", "MESSAGES_UPDATE"];
    if (event && !MSG_EVENTS.includes(eventUpper)) {
      console.log("Evento ignorado (não é de mensagem):", event);
      return Response.json({ status: "ignored - event: " + event });
    }

    // Extrair key e message do data
    // data pode ser objeto único ou array
    const msgItem = Array.isArray(data) ? data[0] : data;
    const key = msgItem?.key || {};
    const message = msgItem?.message || {};
    const pushName = msgItem?.pushName || msgItem?.notifyName || "";

    console.log("KEY:", JSON.stringify(key));
    console.log("MESSAGE KEYS:", Object.keys(message));
    console.log("PUSH NAME:", pushName);

    // Ignorar mensagens enviadas por nós (fromMe = true)
    if (key?.fromMe === true) {
      console.log("Ignorado: mensagem própria (fromMe=true)");
      return Response.json({ status: "ignored - own message" });
    }

    const remoteJid = key?.remoteJid || "";
    console.log("REMOTE JID:", remoteJid);

    // Grupos: salvar mas sem acionar IA
    const isGroup = remoteJid.includes("@g.us");
    if (isGroup) {
      const groupPhone = remoteJid.replace("@g.us", "").replace(/@[a-z.]+$/, "");
      const groupPushName = pushName || groupPhone;
      const groupMessageText = message?.conversation
        || message?.extendedTextMessage?.text
        || message?.imageMessage?.caption
        || msgItem?.body || "";

      if (groupPhone && groupMessageText) {
        const groupMsgId = key?.id;
        if (groupMsgId) {
          const dup = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: groupMsgId });
          if (dup?.length > 0) return Response.json({ status: "duplicate - group" });
        }
        await base44.asServiceRole.entities.Message.create({
          contact_phone: groupPhone,
          text: groupMessageText,
          direction: "received",
          timestamp: new Date().toISOString(),
          whatsapp_message_id: groupMsgId || undefined,
        });
        const existingGrp = await base44.asServiceRole.entities.Contact.filter({ phone: groupPhone });
        if (existingGrp?.length > 0) {
          await base44.asServiceRole.entities.Contact.update(existingGrp[0].id, {
            last_message: groupMessageText, last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(), is_group: true,
          });
        } else {
          await base44.asServiceRole.entities.Contact.create({
            phone: groupPhone, name: groupPushName,
            last_message: groupMessageText, last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(), status: "ativo", tags: [], is_group: true,
          });
        }
      }
      return Response.json({ status: "ok - group saved" });
    }

    // Extrair phone do remoteJid
    // Suporte a @lid (contatos via anúncios do Facebook)
    let phoneRaw = (!remoteJid.includes("@lid") ? remoteJid : null)
      || key?.remoteJidAlt
      || msgItem?.participant
      || msgItem?.from
      || "";

    let isLidContact = false;
    if (!phoneRaw && remoteJid.includes("@lid")) {
      phoneRaw = remoteJid;
      isLidContact = true;
      console.log("@lid sem alternativa:", remoteJid);
    }

    if (!phoneRaw) {
      console.log("IGNORADO: sem phoneRaw. remoteJid:", remoteJid, "key:", JSON.stringify(key));
      return Response.json({ status: "ignored - no phone" });
    }

    let phone = phoneRaw
      .replace("@s.whatsapp.net", "")
      .replace("@c.us", "")
      .replace(/@lid.*$/, "")
      .replace(/\D/g, "");

    // Corrigir número BR sem o dígito 9
    if (phone.startsWith("55") && phone.length === 12) {
      phone = phone.slice(0, 4) + "9" + phone.slice(4);
    }

    console.log("PHONE NORMALIZADO:", phone);

    // Extrair texto da mensagem
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
      || msgItem?.body
      || body?.body
      || (isAudio ? "[áudio]" : "")
      || (isImage ? "[imagem]" : "")
      || (isVideo ? "[vídeo]" : "")
      || (isDocument ? "[documento]" : "")
      || (isSticker ? "[sticker]" : "")
      || "";

    console.log(`PHONE="${phone}" | TEXTO="${messageText}" | PUSH="${pushName}"`);

    if (!phone || !messageText) {
      console.log("IGNORADO: phone ou texto vazio. message keys:", Object.keys(message));
      return Response.json({ status: "ignored - no phone or text" });
    }

    // Deduplicação por whatsapp_message_id
    const waMsgId = key?.id;
    if (waMsgId) {
      const dup = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: waMsgId });
      if (dup?.length > 0) {
        console.log("DUPLICADA - já existe. waMsgId:", waMsgId);
        return Response.json({ status: "duplicate - already saved" });
      }
    }

    // === SALVAR MENSAGEM RECEBIDA ===
    const savedMsg = await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: messageText,
      direction: key?.fromMe ? "sent" : "received",
      timestamp: new Date().toISOString(),
      whatsapp_message_id: waMsgId || undefined,
    });
    console.log("MENSAGEM SALVA! ID:", savedMsg?.id, "phone:", phone, "texto:", messageText);

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
      console.log("NOVO CONTATO CRIADO:", contact.id);

      // Auto-tagging
      const allTags = await base44.asServiceRole.entities.Tag.list();
      const autoTags = allTags.filter(t =>
        t.auto_apply ||
        (t.trigger_keyword && messageText.toLowerCase().includes(t.trigger_keyword.toLowerCase()))
      );
      if (autoTags.length > 0) {
        const tagIds = autoTags.map(t => t.id);
        await base44.asServiceRole.entities.Contact.update(contact.id, { tags: tagIds });
        contact.tags = tagIds;
        const tagWithStage = autoTags.find(t => t.pipeline_stage);
        if (tagWithStage) {
          const existingPipe = await base44.asServiceRole.entities.PipelineContact.filter({ contact_phone: phone });
          if (!existingPipe || existingPipe.length === 0) {
            await base44.asServiceRole.entities.PipelineContact.create({
              contact_phone: phone, contact_name: pushName, stage: tagWithStage.pipeline_stage,
            });
          }
        }
      }
    }

    // Verificar chatbot ativo
    const chatbotConfigs = await base44.asServiceRole.entities.ChatbotConfig.list();
    const chatbotActive = chatbotConfigs?.[0]?.active === true;

    if (!chatbotActive) {
      console.log("Chatbot inativo, mensagem salva sem IA para", phone);
      return Response.json({ status: "ok - chatbot off", contact_id: contact.id });
    }

    // Buscar histórico e gerar resposta da IA
    const messageHistory = await base44.asServiceRole.entities.Message.filter(
      { contact_phone: phone }, "timestamp", 20
    );

    const aiResponse = await getAIResponse(base44.asServiceRole, messageText, contact.name || pushName, messageHistory);

    if (!aiResponse) {
      console.log("Iza optou por silêncio para", phone);
      return Response.json({ status: "ok - silencio", contact_id: contact.id });
    }

    await sendWhatsAppMessage(phone, aiResponse, isLidContact ? remoteJid : null);

    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: aiResponse,
      direction: "sent",
      timestamp: new Date().toISOString(),
    });

    console.log("Iza respondeu para", phone, ":", aiResponse);
    return Response.json({ status: "ok", contact_id: contact.id, message_saved: savedMsg?.id });

  } catch (error) {
    console.error("ERRO NO WEBHOOK:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});