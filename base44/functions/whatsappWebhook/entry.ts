import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sendWhatsAppMessage(phone, message, jidOverride) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL").replace(/\/$/, "");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
    body: JSON.stringify({ number: jidOverride || phone, text: message }),
  });
  return res.json();
}

async function getAIResponse(sr, userMessage, contactName, messageHistory) {
  const historyText = messageHistory.map(m =>
    `${m.direction === "received" ? "Lead" : "Iza"}: ${m.text}`
  ).join("\n");

  const result = await sr.integrations.Core.InvokeLLM({
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

Responda como a Iza, seguindo todas as regras acima. Resposta curta, direta, natural. Se não há nada a responder, retorne exatamente: [SILENCIO]`,
    model: "claude_sonnet_4_6",
  });

  if (!result || result.trim() === "[SILENCIO]") return null;
  return result.trim();
}

Deno.serve(async (req) => {
  // Sempre responder 200 para GET (health check da Evolution)
  if (req.method === "GET") {
    return Response.json({ status: "ok", message: "WhatsApp Webhook ativo" });
  }

  // Criar cliente SEMPRE com asServiceRole — sem auth de usuário (webhook público)
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch(e) {
    return Response.json({ status: "error reading body" });
  }

  console.log("=== WEBHOOK RECEBIDO ===");
  console.log("RAW BODY:", bodyText.substring(0, 1000));

  // Ignorar ping/keepalive
  if (bodyText === '{"ping":true}' || bodyText.includes('"ping":true')) {
    return Response.json({ status: "ok - ping" });
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch(e) {
    console.log("ERRO parse JSON:", e.message);
    return Response.json({ status: "error parsing body" });
  }

  // Normalizar evento e data
  let event = (body?.event || "").toUpperCase();
  let data = body?.data;

  // Formato byEvents=true: { MESSAGES_UPSERT: {...} }
  if (!event && !data) {
    const evtKey = Object.keys(body || {}).find(k =>
      k.toUpperCase().includes("MESSAGE")
    );
    if (evtKey) {
      event = evtKey.toUpperCase();
      data = body[evtKey];
    } else {
      data = body;
      event = "MESSAGES_UPSERT";
    }
  }

  if (!data && body?.key) {
    data = body;
    event = event || "MESSAGES_UPSERT";
  }

  console.log("EVENT:", event, "| DATA keys:", Object.keys(data || {}).join(","));

  // Eventos de sincronização — tratar e sair
  const SYNC_EVENTS = ["CONTACTS_SET", "CONTACTS_UPSERT", "CHATS_SET", "CHATS_UPSERT", "GROUPS_UPSERT"];
  if (SYNC_EVENTS.includes(event)) {
    try {
      if (event === "GROUPS_UPSERT") {
        const groups = Array.isArray(data) ? data : [data];
        for (const grp of groups) {
          const rawJid = grp?.id || "";
          if (!rawJid.includes("@g.us")) continue;
          const phone = rawJid.replace("@g.us", "").replace(/@[a-z.]+$/, "");
          if (!phone) continue;
          const name = grp.subject || grp.name || `Grupo ${phone}`;
          const existing = await sr.entities.Contact.filter({ phone });
          if (existing?.length > 0) {
            if (!existing[0].is_group) await sr.entities.Contact.update(existing[0].id, { is_group: true, name: existing[0].name || name });
          } else {
            await sr.entities.Contact.create({ phone, name, is_group: true, status: "ativo", tags: [] });
          }
        }
      }
      if (event === "CONTACTS_UPSERT") {
        const ctList = Array.isArray(data) ? data : [data];
        for (const ct of ctList) {
          const rawJid = ct?.id || "";
          if (!rawJid || rawJid.includes("@g.us")) continue;
          let phone = rawJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/@[a-z.]+$/, "").replace(/\D/g, "");
          if (phone.startsWith("55") && phone.length === 12) phone = phone.slice(0, 4) + "9" + phone.slice(4);
          if (!phone) continue;
          const name = ct.pushName || ct.name || ct.verifiedName || null;
          const existing = await sr.entities.Contact.filter({ phone });
          if (!existing?.length && name) {
            await sr.entities.Contact.create({ phone, name, status: "ativo", tags: [] });
          } else if (existing?.length && !existing[0].name && name) {
            await sr.entities.Contact.update(existing[0].id, { name });
          }
        }
      }
    } catch(e) {
      console.log("Erro sync event:", e.message);
    }
    return Response.json({ status: "ok - sync: " + event });
  }

  // Aceitar apenas eventos de mensagem
  const MSG_EVENTS = ["MESSAGES_UPSERT", "MESSAGES.UPSERT", "MESSAGE", "SEND.MESSAGE", "MESSAGES_UPDATE", "SEND_MESSAGE"];
  if (event && !MSG_EVENTS.includes(event)) {
    console.log("Evento ignorado:", event);
    return Response.json({ status: "ignored - event: " + event });
  }

  // Extrair item de mensagem (pode ser array)
  const msgItem = Array.isArray(data) ? data[0] : data;
  if (!msgItem) {
    return Response.json({ status: "ignored - no message item" });
  }

  const key = msgItem?.key || {};
  const message = msgItem?.message || {};
  const pushName = msgItem?.pushName || msgItem?.notifyName || "";

  console.log("KEY:", JSON.stringify(key));
  console.log("MESSAGE KEYS:", Object.keys(message));
  console.log("PUSH NAME:", pushName);

  // Ignorar próprias mensagens (fromMe)
  if (key?.fromMe === true) {
    console.log("Ignorado: fromMe=true");
    return Response.json({ status: "ignored - own message" });
  }

  const remoteJid = key?.remoteJid || "";
  console.log("REMOTE JID:", remoteJid);

  // === GRUPOS ===
  if (remoteJid.includes("@g.us")) {
    const groupPhone = remoteJid.replace("@g.us", "").replace(/@[a-z.]+$/, "");
    const groupText = message?.conversation || message?.extendedTextMessage?.text || msgItem?.body || "";
    if (groupPhone && groupText) {
      try {
        const groupMsgId = key?.id;
        if (groupMsgId) {
          const dup = await sr.entities.Message.filter({ whatsapp_message_id: groupMsgId });
          if (dup?.length > 0) return Response.json({ status: "duplicate - group" });
        }
        await sr.entities.Message.create({
          contact_phone: groupPhone, text: groupText, direction: "received",
          timestamp: new Date().toISOString(), whatsapp_message_id: groupMsgId || undefined,
        });
        const existingGrp = await sr.entities.Contact.filter({ phone: groupPhone });
        if (existingGrp?.length > 0) {
          await sr.entities.Contact.update(existingGrp[0].id, {
            last_message: groupText, last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(), is_group: true,
          });
        } else {
          await sr.entities.Contact.create({
            phone: groupPhone, name: pushName || groupPhone,
            last_message: groupText, last_message_time: new Date().toISOString(),
            last_contact_date: new Date().toISOString(), status: "ativo", tags: [], is_group: true,
          });
        }
      } catch(e) { console.log("Erro grupo:", e.message); }
    }
    return Response.json({ status: "ok - group" });
  }

  // === CONTATO INDIVIDUAL ===
  let isLidContact = remoteJid.includes("@lid");
  let phoneRaw = !isLidContact ? remoteJid : (msgItem?.participant || msgItem?.from || "");

  if (!phoneRaw) {
    console.log("IGNORADO: sem phone. remoteJid:", remoteJid);
    return Response.json({ status: "ignored - no phone" });
  }

  let phone = phoneRaw
    .replace("@s.whatsapp.net", "").replace("@c.us", "")
    .replace(/@lid.*$/, "").replace(/\D/g, "");

  // Corrigir BR: 55 + DDD(2) + número(8) = 12 dígitos → adicionar o 9
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }

  console.log("PHONE:", phone);

  // Extrair texto
  const isAudio = !!(message?.audioMessage || message?.pttMessage);
  const messageText = message?.conversation
    || message?.extendedTextMessage?.text
    || message?.imageMessage?.caption
    || message?.videoMessage?.caption
    || message?.documentMessage?.caption
    || msgItem?.body || body?.body
    || (isAudio ? "[áudio]" : "")
    || (message?.imageMessage ? "[imagem]" : "")
    || (message?.videoMessage ? "[vídeo]" : "")
    || (message?.documentMessage ? "[documento]" : "")
    || (message?.stickerMessage ? "[sticker]" : "")
    || "";

  console.log("TEXTO:", messageText, "| PHONE:", phone);

  if (!phone || !messageText) {
    console.log("IGNORADO: phone ou texto vazio");
    return Response.json({ status: "ignored - no phone or text" });
  }

  // === SALVAR MENSAGEM (núcleo — isolado em try/catch próprio) ===
  const waMsgId = key?.id;
  try {
    if (waMsgId) {
      const dup = await sr.entities.Message.filter({ whatsapp_message_id: waMsgId });
      if (dup?.length > 0) {
        console.log("DUPLICADA:", waMsgId);
        return Response.json({ status: "duplicate" });
      }
    }

    const savedMsg = await sr.entities.Message.create({
      contact_phone: phone,
      text: messageText,
      direction: "received",
      timestamp: new Date().toISOString(),
      whatsapp_message_id: waMsgId || undefined,
    });
    console.log("MENSAGEM SALVA! ID:", savedMsg?.id);

    // Atualizar/criar contato
    let contact;
    try {
      const contacts = await sr.entities.Contact.filter({ phone });
      if (contacts?.length > 0) {
        contact = contacts[0];
        await sr.entities.Contact.update(contact.id, {
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          last_contact_date: new Date().toISOString(),
          name: contact.name || pushName || phone,
        });
      } else {
        contact = await sr.entities.Contact.create({
          phone, name: pushName || phone,
          last_message: messageText,
          last_message_time: new Date().toISOString(),
          last_contact_date: new Date().toISOString(),
          status: "ativo", tags: [],
        });
        console.log("NOVO CONTATO:", contact.id);

        // Auto-tagging — em try separado para não quebrar o fluxo
        try {
          const allTags = await sr.entities.Tag.list();
          const autoTags = allTags.filter(t =>
            t.auto_apply || (t.trigger_keyword && messageText.toLowerCase().includes(t.trigger_keyword.toLowerCase()))
          );
          if (autoTags.length > 0) {
            const tagIds = autoTags.map(t => t.id);
            await sr.entities.Contact.update(contact.id, { tags: tagIds });
            const tagWithStage = autoTags.find(t => t.pipeline_stage);
            if (tagWithStage) {
              const existingPipe = await sr.entities.PipelineContact.filter({ contact_phone: phone });
              if (!existingPipe?.length) {
                await sr.entities.PipelineContact.create({ contact_phone: phone, contact_name: pushName, stage: tagWithStage.pipeline_stage });
              }
            }
          }
        } catch(e) { console.log("Erro auto-tag:", e.message); }
      }
    } catch(e) { console.log("Erro contato:", e.message); }

    // Chatbot — em try separado para não quebrar o fluxo
    try {
      const chatbotConfigs = await sr.entities.ChatbotConfig.list();
      const chatbotActive = chatbotConfigs?.[0]?.active === true;

      if (chatbotActive && contact) {
        const messageHistory = await sr.entities.Message.filter({ contact_phone: phone }, "timestamp", 20);
        const aiResponse = await getAIResponse(sr, messageText, contact?.name || pushName, messageHistory);
        if (aiResponse) {
          await sendWhatsAppMessage(phone, aiResponse, isLidContact ? remoteJid : null);
          await sr.entities.Message.create({
            contact_phone: phone, text: aiResponse, direction: "sent", timestamp: new Date().toISOString(),
          });
          console.log("Iza respondeu para", phone);
        } else {
          console.log("Iza silenciou para", phone);
        }
      } else {
        console.log("Chatbot inativo para", phone);
      }
    } catch(e) { console.log("Erro chatbot:", e.message); }

    return Response.json({ status: "ok", message_id: savedMsg?.id });

  } catch(e) {
    console.log("ERRO AO SALVAR MENSAGEM:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});