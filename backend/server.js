const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buscarConhecimentoTecnico } = require("./services/acervoService");

module.exports = async (req, res) => {
  // Configuração de Cabeçalhos (Headers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { question, image, imageType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
       return res.status(500).json({ answer: "Chave API não configurada na Vercel." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Tenta buscar o acervo, mas com "disjuntor" de segurança
    let conhecimentoExtraido = "";
    try {
      // Se o acervoService demorar demais, o erro cairá aqui
      conhecimentoExtraido = await buscarConhecimentoTecnico();
    } catch (e) {
      console.error("Erro ao ler PDFs:", e.message);
      conhecimentoExtraido = "Aviso: Manuais técnicos indisponíveis no momento. Use conhecimento geral de manutenção.";
    }

    // 2. Monta o Prompt
    const promptPrincipal = `Você é o EletroExpert-AI, Especialista em Manutenção Elétrica.
    Responda com base no conteúdo abaixo:
    
    ${conhecimentoExtraido}

    PERGUNTA: ${question}
    
    IMPORTANTE: Sempre priorize a segurança (EPIs e NR-10).`;

    let payload = [promptPrincipal];

    if (image) {
      payload.push({
        inlineData: {
          data: image,
          mimeType: imageType || "image/jpeg"
        }
      });
    }

    // 3. Gera a resposta com timeout implícito da Vercel
    const result = await model.generateContent(payload);
    const responseText = result.response.text();
    
    res.status(200).json({ answer: responseText });

  } catch (error) {
    console.error("ERRO CRÍTICO:", error);
    res.status(500).json({ 
      answer: "Erro no processamento. Por favor, tente uma pergunta mais curta ou verifique sua conexão." 
    });
  }
};