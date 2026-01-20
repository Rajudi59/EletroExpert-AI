const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // Regras de segurança para o navegador aceitar a resposta
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Usa a chave que você colocou na Vercel
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const { question } = req.body;
    const prompt = `Você é o EletroExpert-AI, assistente técnico de segurança. Responda: ${question}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.status(200).json({ 
      answer: response.text(),
      arquivos: [] 
    });
  } catch (error) {
    res.status(500).json({ answer: "Erro na conexão com a IA. Verifique a chave na Vercel." });
  }
};
