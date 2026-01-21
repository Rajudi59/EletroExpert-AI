const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buscarConhecimentoTecnico } = require("./services/acervoService");

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const { question, image, imageType } = req.body;

    // 1. Busca automaticamente o conteúdo de todos os manuais no acervo
    const conhecimentoExtraido = await buscarConhecimentoTecnico();

    // 2. Monta o Prompt focado em Manutenção Industrial
    const promptPrincipal = `Você é o EletroExpert-AI, Especialista em Manutenção Elétrica Industrial.
    Use o CONHECIMENTO TÉCNICO abaixo extraído dos manuais do acervo para responder.
    
    DIRETRIZES:
    - Se for erro de inversor, consulte as tabelas de falhas no texto abaixo.
    - Se houver uma imagem, analise componentes, fiação ou códigos de display.
    - Foque em solução rápida: 'O que testar?', 'Qual parâmetro mudar?'.
    - Segurança: Sempre cite EPIs e NR-10, mas resolva o problema técnico.

    CONHECIMENTO TÉCNICO DO ACERVO:
    ${conhecimentoExtraido}

    PERGUNTA DO TÉCNICO: ${question}`;

    let payload = [promptPrincipal];

    // Se o técnico enviou uma foto (base64)
    if (image) {
      payload.push({
        inlineData: {
          data: image,
          mimeType: imageType || "image/jpeg"
        }
      });
    }

    const result = await model.generateContent(payload);
    const responseText = result.response.text();
    
    res.status(200).json({ 
      answer: responseText 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ answer: "Erro no servidor de manutenção. Verifique os logs." });
  }
};
