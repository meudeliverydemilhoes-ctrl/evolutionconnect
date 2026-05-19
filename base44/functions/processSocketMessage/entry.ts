import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE");

async function sendWhatsAppMessage(phone, message) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
    body: JSON.stringify({ number: phone, text: message }),
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

    // Esta função é chamada pelo frontend (socket), não precisa de auth de usuário
    // mas valida que é uma chamada interna pelo token do app
    const body = await req.json();
    console.log("processSocketMessage payload:", JSON.stringify(body));

    const { phone, pushName, text, timestamp, fromMe } = body;

    if (!phone || !text) {
      return Response.json({ status: "ignored - missing phone or text" });
    }

    const direction = fromMe ? "sent" : "received";
    const msgTime = timestamp ? new Date(timestamp) : new Date();

    // Verificar duplicata
    const recent = await base44.asServiceRole.entities.Message.filter(
      { contact_phone: phone, direction },
      "-timestamp",
      5
    );
    const alreadySaved = recent.some(m =>
      m.text === text &&
      Math.abs(new Date(m.timestamp) - msgTime) < 15000
    );

    if (alreadySaved) {
      console.log("Duplicata detectada, já processado. phone:", phone);
      return Response.json({ status: "duplicate - already processed" });
    }

    // Salvar mensagem
    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text,
      direction,
      timestamp: msgTime.toISOString(),
    });

    // Se for mensagem enviada (fromMe), só salvar — sem IA
    if (fromMe) {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
      if (contacts && contacts.length > 0) {
        await base44.asServiceRole.entities.Contact.update(contacts[0].id, {
          last_message: text,
          last_contact_date: msgTime.toISOString(),
        });
      }
      console.log("Mensagem enviada salva para", phone);
      return Response.json({ status: "ok - sent message saved" });
    }

    // Encontrar ou criar contato
    const contacts = await base44.asServiceRole.entities.Contact.filter({ phone });
    let contact;
    if (contacts && contacts.length > 0) {
      contact = contacts[0];
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        last_message: text,
        last_contact_date: msgTime.toISOString(),
        name: contact.name || pushName,
      });
    } else {
      contact = await base44.asServiceRole.entities.Contact.create({
        phone,
        name: pushName || phone,
        last_message: text,
        last_contact_date: msgTime.toISOString(),
        status: "ativo",
      });
    }

    // Buscar histórico para IA
    const messageHistory = await base44.asServiceRole.entities.Message.filter(
      { contact_phone: phone },
      "timestamp",
      20
    );

    // Gerar e enviar resposta da IA
    const aiResponse = await getAIResponse(base44.asServiceRole, text, contact.name || pushName, messageHistory);

    if (!aiResponse) {
      console.log("Iza optou por silêncio para", phone);
      return Response.json({ status: "ok - silencio", contact_id: contact.id });
    }

    await sendWhatsAppMessage(phone, aiResponse);

    await base44.asServiceRole.entities.Message.create({
      contact_phone: phone,
      text: aiResponse,
      direction: "sent",
      timestamp: new Date().toISOString(),
    });

    console.log("Iza respondeu para", phone, ":", aiResponse);
    return Response.json({ status: "ok", contact_id: contact.id });
  } catch (error) {
    console.error("Erro no processSocketMessage:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});