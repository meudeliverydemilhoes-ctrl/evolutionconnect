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

// Extrai phone normalizado de um remoteJid
function normalizePhone(rawJid) {
  if (!rawJid) return null;
  let phone = rawJid
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace(/@lid.*$/, "")
    .replace(/@[a-z.]+$/, "")
    .replace(/\D/g, "");
  // Corrigir BR: 55+DDD(2)+número(8) = 12 dígitos → adicionar o 9
  if (phone.startsWith("55") && phone.length === 12) {
    phone = phone.slice(0, 4) + "9" + phone.slice(4);
  }
  return phone || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method === "GET") {
      return Response.json({ status: "ok", message: "WhatsApp Webhook ativo" });
    }

    // Ler body bruto para debug
    const bodyText = await req.text();
    console.log("=== WEBHOOK RECEBIDO ===");
    console.log("METHOD:", req.method);
    console.log("RAW BODY (primeiros 2000 chars):", bodyText.substring(0, 2000));

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.log("ERRO ao parsear JSON:", e.message);
      return Response.json({ status: "error parsing body" });
    }

    console.log("EVENTO:", body?.event);
    console.log("INSTÂNCIA NO PAYLOAD:", body?.instance);

    // --- NORMALIZAR PAYLOAD ---
    // byEvents=false → { event: "MESSAGES_UPSERT", instance: "...", data: { key: {}, message: {}, ... } }
    // byEvents=true  → { "MESSAGES_UPSERT": { key: {}, message: {}, ... } }
    // legado         → { key: {}, message: {}, ... }
    let event = body?.event;
    let data = body?.data;

    if (!data) {
      // Tentar formato byEvents=true (chave em maiúsculo)
      const evtKey = Object.keys(body || {}).find(k =>
        ["MESSAGES_UPSERT", "SEND_MESSAGE", "messages.upsert", "send.message"].includes(k)
      );
      if (evtKey) {
        event = evtKey;
        data = body[evtKey];
      } else {
        // Formato legado: o próprio body é o data
        data = body;
      }
    }

    console.log("EVENT normalizado:", event);
    console.log("DATA keys:", Object.keys(data || {}));

    // --- EVENTOS DE SINCRONIZAÇÃO (não são mensagens) ---
    const SYNC_EVENTS = ["CONTACTS_SET", "CONTACTS_UPSERT", "CHATS_SET", "CHATS_UPSERT", "GROUPS_UPSERT",
                         "CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_DELETE", "MESSAGES_UPDATE",
                         "PRESENCE_UPDATE", "CALL"];
    if (event && SYNC_EVENTS.includes(event)) {
      console.log("Evento de sync, ignorado para mensagens:", event);

      if (event === "CONTACTS_UPSERT") {
        const ctList = Array.isArray(data) ? data : [data];
        for (const ct of ctList) {
          const rawJid = ct?.id || "";
          if (!rawJid || rawJid.includes("@g.us")) continue;
          const phone = normalizePhone(rawJid);
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

      if (event === "GROUPS_UPSERT") {
        const groups = Array.isArray(data) ? data : [data];
        for (const grp of groups) {
          const rawJid = grp?.id || "";
          if (!rawJid.includes("@g.us")) continue;
          const phone = rawJid.replace("@g.us", "").replace(/\D/g, "");
          if (!phone) continue;
          const name = grp.subject || grp.name || `Grupo ${phone}`;
          const existing = await base44.asServiceRole.entities.Contact.filter({ phone });
          if (existing?.length > 0) {
            await base44.asServiceRole.entities.Contact.update(existing[0].id, { is_group: true, name: existing[0].name || name });
          } else {
            await base44.asServiceRole.entities.Contact.create({ phone, name, is_group: true, status: "ativo", tags: [] });
          }
        }
      }

      return Response.json({ status: "ok - sync event: " + event });
    }

    // --- FILTRAR APENAS EVENTOS DE MENSAGEM ---
    const MESSAGE_EVENTS = [
      "messages.upsert", "MESSAGES_UPSERT",
      "send.message", "SEND_MESSAGE",
      "message", null, undefined
    ];
    if (event && !MESSAGE_EVENTS.includes(event)) {
      console.log("Evento não é de mensagem, ignorado:", event);
      return Response.json({ status: "ignored - event: " + event });
    }

    // --- EXTRAIR key e message ---
    // A Evolution API pode mandar data como array ou objeto
    const dataArr = Array.isArray(data) ? data : [data];

    let processedCount = 0;

    for (const item of dataArr) {
      const key = item?.key || data?.key;
      const message = item?.message || data?.message;
      const pushName = item?.pushName || item?.notifyName || data?.pushName || "";

      console.log("Processando item - key:", JSON.stringify(key));
      console.log("Processando item - message keys:", Object.keys(message || {}));

      if (!key) {
        console.log("Item sem key, pulando");
        continue;
      }

      const remoteJid = key.remoteJid || "";
      const fromMe = key.fromMe === true;
      const waMsgId = key.id;

      console.log(`remoteJid="${remoteJid}" | fromMe=${fromMe} | waMsgId="${waMsgId}"`);

      // Grupos: salvar mas sem acionar IA
      const isGroup = remoteJid.includes("@g.us");

      // Extrair phone
      let phone;
      if (isGroup) {
        phone = remoteJid.replace("@g.us", "").replace(/\D/g, "");
      } else {
        // Para @lid, tentar variantes
        const jidAlt = key.remoteJidAlt || item?.remoteJidAlt || item?.participant;
        phone = normalizePhone(jidAlt || (!remoteJid.includes("@lid") ? remoteJid : null) || remoteJid);
      }

      if (!phone) {
        console.log("Phone não encontrado, pulando item");
        continue;
      }

      // Extrair texto
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
        || item?.body
        || body?.body
        || (isAudio ? "[áudio]" : "")
        || (isImage ? "[imagem]" : "")
        || (isVideo ? "[vídeo]" : "")
        || (isDocument ? "[documento]" : "")
        || (isSticker ? "[sticker]" : "")
        || "";

      console.log(`phone="${phone}" | fromMe=${fromMe} | texto="${messageText}" | pushName="${pushName}"`);

      if (!messageText) {
        console.log("Sem texto extraído, pulando. message keys:", Object.keys(message || {}));
        continue;
      }

      const direction = fromMe ? "sent" : "received";

      // Deduplicação por waMsgId
      if (waMsgId) {
        const existing = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: waMsgId });
        if (existing?.length > 0) {
          console.log("Duplicata por waMsgId ignorada:", waMsgId);
          continue;
        }
      }

      // Salvar mensagem
      const saved = await base44.asServiceRole.entities.Message.create({
        contact_phone: phone,
        text: messageText,
        direction,
        timestamp: new Date().toISOString(),
        whatsapp_message_id: waMsgId || undefined,
      });
      console.log("✅ Message criada! id:", saved?.id, "phone:", phone, "direction:", direction, "texto:", messageText);
      processedCount++;

      // Upsert contato
      const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
      let contact;
      const contactUpdate = {
        last_message: messageText,
        last_message_time: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        is_group: isGroup || undefined,
      };

      if (contacts?.length > 0) {
        contact = contacts[0];
        if (!contact.name && pushName) contactUpdate.name = pushName;
        await base44.asServiceRole.entities.Contact.update(contact.id, contactUpdate);
      } else {
        contact = await base44.asServiceRole.entities.Contact.create({
          phone,
          name: pushName || phone,
          ...contactUpdate,
          status: "ativo",
          tags: [],
        });
        console.log("Novo contato criado:", contact.id);

        // Auto-tagging apenas para novos contatos recebidos
        if (!fromMe && !isGroup) {
          const allTags = await base44.asServiceRole.entities.Tag.list();
          const autoTags = allTags.filter(t =>
            t.auto_apply ||
            (t.trigger_keyword && messageText.toLowerCase().includes(t.trigger_keyword.toLowerCase()))
          );
          if (autoTags.length > 0) {
            const tagIds = autoTags.map(t => t.id);
            await base44.asServiceRole.entities.Contact.update(contact.id, { tags: tagIds });
            const tagWithStage = autoTags.find(t => t.pipeline_stage);
            if (tagWithStage) {
              const existingPipeline = await base44.asServiceRole.entities.PipelineContact.filter({ contact_phone: phone });
              if (!existingPipeline?.length) {
                await base44.asServiceRole.entities.PipelineContact.create({
                  contact_phone: phone,
                  contact_name: pushName,
                  stage: tagWithStage.pipeline_stage,
                });
              }
            }
          }
        }
      }

      // Resposta da IA apenas para mensagens recebidas (não grupos, não próprias)
      if (!fromMe && !isGroup) {
        const chatbotConfigs = await base44.asServiceRole.entities.ChatbotConfig.list();
        const chatbotActive = chatbotConfigs?.[0]?.active === true;

        if (chatbotActive) {
          const messageHistory = await base44.asServiceRole.entities.Message.filter(
            { contact_phone: phone },
            "timestamp",
            20
          );
          const aiResponse = await getAIResponse(base44.asServiceRole, messageText, contact.name || pushName, messageHistory);
          if (aiResponse) {
            await sendWhatsAppMessage(phone, aiResponse);
            await base44.asServiceRole.entities.Message.create({
              contact_phone: phone,
              text: aiResponse,
              direction: "sent",
              timestamp: new Date().toISOString(),
            });
            console.log(`Iza respondeu para ${phone}: ${aiResponse}`);
          } else {
            console.log(`Iza optou por silêncio para ${phone}`);
          }
        } else {
          console.log("Chatbot inativo, sem resposta IA para", phone);
        }
      }
    }

    console.log(`=== FIM: ${processedCount} mensagem(ns) processada(s) ===`);
    return Response.json({ status: "ok", processed: processedCount });

  } catch (error) {
    console.error("ERRO no webhook:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});