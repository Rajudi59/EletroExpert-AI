const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

/* =========================
   CONFIGURAÇÃO IA (GEMINI)
========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =========================
   MIDDLEWARES & SEGURANÇA
========================= */
app.use(express.json());

// Desativa cache para garantir que novas fotos apareçam imediatamente
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Define o caminho do frontend (ajustado para a sua estrutura)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

/* =========================
   GERENCIAMENTO DE ACERVO
========================= */

// 1. Busca automática de diagramas (JPG/PNG)
function listarDiagramas() {
    try {
        const caminhoDiagramas = path.join(frontendPath, 'acervo', 'diagramas');
        if (!fs.existsSync(caminhoDiagramas)) return "Nenhum diagrama visual disponível no momento.";
        
        const arquivos = fs.readdirSync(caminhoDiagramas);
        const imagens = arquivos.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
        
        return imagens.length > 0 
            ? imagens.map(f => `- Diagrama disponível: ${f}`).join('\n')
            : "Pasta de diagramas vazia.";
    } catch (err) {
        return "Erro ao ler pasta de diagramas.";
    }
}

// 2. Leitura dos manuais técnicos (TXT)
function lerArquivosTecnicos() {
    try {
        const caminhoAcervo = path.join(frontendPath, 'acervo', 'inversores');
        if (!fs.existsSync(caminhoAcervo)) return "Aviso: Pasta de manuais não encontrada.";

        const arquivos = fs.readdirSync(caminhoAcervo);
        let conteudoTotal = "";

        arquivos.forEach(arquivo => {
            if (arquivo.endsWith('.txt')) {
                const texto = fs.readFileSync(path.join(caminhoAcervo, arquivo), 'utf-8');
                conteudoTotal += `\n[FONTE LOCAL - MANUAL: ${arquivo}]\n${texto}\n`;
            }
        });

        return conteudoTotal || "Acervo de manuais vazio.";
    } catch (err) {
        console.error("Erro ao ler acervo:", err);
        return "Erro ao acessar base de dados técnica local.";
    }
}

/* =========================
   ROTA PRINCIPAL (CHAT IA)
========================= */
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const acervoLocal = lerArquivosTecnicos();
        const listaDiagramas = listarDiagramas();

        const promptSistema = `
Você é o ElectroExpert-AI, especialista sênior em sistemas elétricos e inversores.

ESTRATÉGIA DE BUSCA (Siga esta ordem de prioridade):
1. PESQUISA LOCAL: Primeiro, use APENAS as informações abaixo para responder:
${acervoLocal}

2. PESQUISA EXTERNA: Se a resposta NÃO estiver nos dados acima, use seu conhecimento geral, mas inicie a resposta obrigatoriamente com: "🌐 [PESQUISA EXTERNA - PROCEDER COM CAUTELA]".

DIAGRAMAS VISUAIS DISPONÍVEIS:
${listaDiagramas}

REGRA DE EXIBIÇÃO DE IMAGEM:
Sempre que a resposta envolver a instalação ou conexão de um componente que possua um diagrama na lista acima, finalize a resposta incluindo o código: [MOSTRAR_DIAGRAMA: nome-do-arquivo.jpg].

SEGURANÇA (OBRIGATÓRIO):
- Sempre mencione o uso de EPIs e conformidade com a NR-10.
- Priorize a segurança do operador/tecnicista.
- Em caso de pesquisa externa, reforce que o usuário deve consultar o manual físico do fabricante.

Pergunta do usuário: ${question}
        `;

        const result = await model.generateContent(promptSistema);
        res.json({ answer: result.response.text() });

    } catch (error) {
        console.error("ERRO IA:", error);
        res.status(500).json({ answer: "⚠️ Erro ao conectar com o motor de inteligência." });
    }
});

/* =========================
   INICIALIZAÇÃO DO SERVIDOR
========================= */
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 ElectroExpert AI Online em http://localhost:${port}`);
    console.log(`📂 Pasta Frontend: ${frontendPath}`);
});