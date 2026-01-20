const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verifica se a chave existe para evitar erro de segurança
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ answer: "Erro: Chave API não configurada no painel da Vercel." });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const { question } = req.body;
    const prompt = `Você é o EletroExpert-AI, um assistente técnico de segurança para eletricistas. Responda de forma clara e técnica: ${question}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ answer: text, arquivos: [] });
  } catch (error) {
    res.status(500).json({ answer: "Erro ao processar a pergunta na IA." });
  }
};
