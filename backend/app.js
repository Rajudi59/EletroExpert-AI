import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o especialista técnico sênior do ElectroExpert. 
    1. SEGURANÇA: Use [ALERTA] para normas NR10/NBR5410. Priorize a segurança do operador.
    2. CONTEÚDO: Use [TECNICO] para detalhes.
    3. VISÃO: Identifique Marca/Modelo em fotos.
    4. ORIGEM: Cite se é ACERVO LOCAL ou PESQUISA EXTERNA.`
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- 1. CIRCUITO DE API (O MOTOR QUE VOCÊ ME MANDOU) ---
app.post("/api/ask", async (req, res) => {
    const { question, image } = req.body;
    try {
        const caminhoAcervo = path.join(process.cwd(), "acervo");
        const todosPDFs = buscarArquivos(caminhoAcervo);
        let contexto = "";
        for (const caminho of todosPDFs) {
            contexto += `\n--- MANUAL: ${path.basename(caminho)} ---\n${await lerPdfRobusto(caminho)}\n`;
        }
        const contentParts = [{ text: `ACERVO:\n${contexto.substring(0, 700000)}\nPERGUNTA: ${question}` }];
        if (image) contentParts.push({ inlineData: { mimeType: "image/jpeg", data: image } });

        const result = await model.generateContent(contentParts);
        res.json({ answer: result.response.text(), alerta: "Consulte a NR10." });
    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ answer: "Erro técnico na IA." });
    }
});

// --- 2. LOCALIZAÇÃO DO FRONTEND (O AJUSTE DE DIRETÓRIO) ---
const opcoesDeCaminho = [
    path.join(process.cwd(), "frontend"),           // Se rodar da raiz
    path.join(__dirname, "..", "frontend"),         // Se rodar de dentro de /backend
    "/app/frontend"                                 // Padrão de container Railway
];

let caminhoFinal = "";
for (const caminho of opcoesDeCaminho) {
    if (fs.existsSync(path.join(caminho, "index.html"))) {
        caminhoFinal = caminho;
        break;
    }
}

// --- 3. ENTREGA DA INTERFACE ---
if (caminhoFinal) {
    app.use(express.static(caminhoFinal));
    app.get("*", (req, res) => {
        res.sendFile(path.join(caminhoFinal, "index.html"));
    });
} else {
    app.get("/", (req, res) => {
        const arquivosNaRaiz = fs.readdirSync(process.cwd());
        res.status(404).send(`
            <h2>ElectroExpert - Diagnóstico</h2>
            <p>Não achei a pasta 'frontend'.</p>
            <p><strong>Arquivos na raiz:</strong> ${arquivosNaRaiz.join(" | ")}</p>
        `);
    });
}

// --- FUNÇÕES DE SUPORTE (PDF) ---
async function lerPdfRobusto(caminho) {
    try {
        const dataBuffer = new Uint8Array(fs.readFileSync(caminho));
        const loadingTask = pdfjs.getDocument({ data: dataBuffer, disableFontFace: true });
        const pdf = await loadingTask.promise;
        let texto = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            texto += content.items.map(item => item.str).join(" ") + "\n";
        }
        return texto;
    } catch (e) { return ""; }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 ElectroExpert Online na Porta ${PORT}`));