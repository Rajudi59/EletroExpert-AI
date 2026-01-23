import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÃO DE SEGURANÇA: A chave vem da Railway
const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o especialista técnico sênior do ElectroExpert.
    
    DIRETRIZES OBRIGATÓRIAS:
    1. SEGURANÇA: Use [ALERTA] para normas NR10/NBR5410 e riscos jurídicos. Seja enfático sobre EPIs e desenergização. Priorize a segurança do operador acima de tudo.
    2. CONTEÚDO: Use [TECNICO] para a explicação técnica detalhada.
    3. VISÃO: Se receber uma foto, identifique Marca e Modelo na etiqueta.
    4. PESQUISA: Priorize o ACERVO LOCAL. Se não encontrar o modelo exato lá, use sua base externa (internet) e avise.
    5. RESPOSTA: Se a informação for do acervo, escreva "ORIGEM: ACERVO LOCAL". Se for externa, "ORIGEM: PESQUISA EXTERNA".`
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- LÓGICA DE BUSCA DE DIRETÓRIO ROBUSTA (Correção do Erro ENOENT) ---
const caminhosParaTestar = [
    path.join(process.cwd(), "frontend"),
    path.join(__dirname, "frontend"),
    path.join(__dirname, "..", "frontend"),
    process.cwd()
];

let caminhoFinal = "";
for (const pasta de caminhosParaTestar) {
    if (fs.existsSync(path.join(pasta, "index.html"))) {
        caminhoFinal = pasta;
        console.log(`✅ Pasta frontend localizada em: ${pasta}`);
        break;
    }
}

if (caminhoFinal) {
    app.use(express.static(caminhoFinal));
    app.get("/", (req, res) => {
        res.sendFile(path.join(caminhoFinal, "index.html"));
    });
} else {
    console.error("❌ ERRO CRÍTICO: index.html não foi encontrado em nenhum diretório!");
}

// --- MOTOR DE LEITURA DE MANUAIS ---
async function lerPdfRobusto(caminho) {
    try {
        const dataBuffer = new Uint8Array(fs.readFileSync(caminho));
        const loadingTask = pdfjs.getDocument({ data: dataBuffer, disableFontFace: true });
        const pdf = await loadingTask.promise;
        let textoCompleto = "";
        const numPaginas = Math.min(pdf.numPages, 100); 
        for (let i = 1; i <= numPaginas; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textoCompleto += content.items.map(item => item.str).join(" ") + "\n";
        }
        return textoCompleto;
    } catch (error) { return ""; }
}

function buscarArquivos(diretorio, lista = []) {
    if (!fs.existsSync(diretorio)) return lista;
    const itens = fs.readdirSync(diretorio);
    for (const item of itens) {
        const caminho = path.join(diretorio, item);
        if (fs.statSync(caminho).isDirectory()) buscarArquivos(caminho, lista);
        else if (item.toLowerCase().endsWith(".pdf")) lista.push(caminho);
    }
    return lista;
}

// --- ROTA DE COMUNICAÇÃO (API) ---
app.post("/api/ask", async (req, res) => {
    const { question, image } = req.body;
    try {
        const caminhoAcervo = path.join(process.cwd(), "acervo");
        const todosPDFs = buscarArquivos(caminhoAcervo);
        let contextoGeral = "";
        
        for (const caminho of todosPDFs) {
            const texto = await lerPdfRobusto(caminho);
            contextoGeral += `\n--- MANUAL: ${path.basename(caminho)} ---\n${texto}\n`;
        }

        const promptPart = { text: `ACERVO DISPONÍVEL:\n${contextoGeral.substring(0, 700000)}\nPERGUNTA: ${question}` };
        const contentParts = [promptPart];
        if (image) contentParts.push({ inlineData: { mimeType: "image/jpeg", data: image } });

        const result = await model.generateContent(contentParts);
        const text = result.response.text();

        let alerta = "Atenção técnica obrigatória (NR10/NBR5410).";
        let procedimento = text;

        if (text.includes("[ALERTA]") && text.includes("[TECNICO]")) {
            const partes = text.split("[TECNICO]");
            alerta = partes[0].replace("[ALERTA]", "").trim();
            procedimento = partes[1].trim();
        }

        res.json({
            answer: procedimento,
            alerta: alerta,
            fonte: procedimento.includes("ORIGEM: PESQUISA EXTERNA") ? "Base Global" : "Acervo Interno"
        });
    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ answer: "Erro técnico no processamento da consulta." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ElectroExpert Online na Porta ${PORT}!`);
});