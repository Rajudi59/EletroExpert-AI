const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  // Configurações de CORS para permitir que o seu frontend se conecte
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Mudamos para o modelo 1.5-flash: mais rápido e preciso para manuais técnicos
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const { question } = req.body;

    // Novo Prompt: Foco total em Manutenção Industrial e Resolução de Problemas
    const prompt = `Você é o EletroExpert-AI, um Especialista em Manutenção Elétrica Industrial e Acervo Técnico.
    Sua missão é ajudar técnicos e eletricistas a diagnosticar falhas, interpretar diagramas e configurar equipamentos (Inversores, CLPs, Motores).
    
    Diretrizes de Resposta:
    1. FOCO EM MANUTENÇÃO: Priorize diagnósticos de defeitos, testes de continuidade, medições de grandezas e parametrização.
    2. LINGUAGEM TÉCNICA: Use termos como 'contatora', 'bornes', 'barramento', 'fechamento de motor', 'harmônicas'.
    3. SEGURANÇA BASE: Sempre mencione o uso de EPIs e o respeito à NR-10 como pré-requisito, mas foque na SOLUÇÃO DO PROBLEMA técnico.
    4. ACERVO: Se o usuário perguntar de manuais (como o CFW500), aja como se conhecesse os parâmetros técnicos de fábrica.
    
    Pergunta do Técnico: ${question}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    res.status(200).json({ 
      answer: responseText,
      arquivos: [] // Espaço reservado para links de manuais futuros
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ answer: "Erro técnico no motor da IA. Verifique se a chave GEMINI_API_KEY está configurada na Vercel." });
  }
};
