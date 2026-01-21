import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. INSIRA SUA CHAVE API DENTRO DAS ASPAS ABAIXO
const API_KEY = "SUA_CHAVE_AQUI";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Função principal que consulta o acervo local e permite busca externa técnica
 */
export async function gerarResposta(pergunta, contextoLocal = "") {
    
    // Configuramos o modelo para ser um Especialista em Elétrica (NBR 5410 / NR10)
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `Você é o especialista técnico do sistema ElectroExpert.
        
        SUA MISSÃO:
        - Priorize as informações do 'Contexto Local' (seus manuais em PDF).
        - Caso a informação não esteja nos manuais, use sua base de dados da internet, mas RESTRITO a temas de: elétrica, manutenção industrial, normas técnicas brasileiras e manuais de fabricantes.
        - Se o usuário fugir do tema elétrica, diga que você é focado apenas em manutenção.
        - Use sempre a terminologia correta: Fase (Preto), Neutro (Azul), Retorno (Amarelo) e Terra (Verde).
        - SEGURANÇA: Sempre mencione a importância de usar EPIs e testar a ausência de tensão.`
    });

    // Estrutura o que será enviado para a IA analisar
    const prompt = `
    DADOS DO ACERVO LOCAL (PRIORIDADE):
    ${contextoLocal ? contextoLocal : "Nenhuma informação específica encontrada nos manuais locais."}

    DÚVIDA DO ELETRICISTA:
    ${pergunta}

    INSTRUÇÃO: Se a resposta não estiver nos dados do acervo, aja como um engenheiro eletricista e responda com base em normas técnicas externas.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro na comunicação com o Gemini:", error);
        return "Erro ao processar a consulta técnica. Verifique a conexão ou a chave da API.";
    }
}