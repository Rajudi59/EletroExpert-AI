import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÃO DA API
const API_KEY = "SUA_CHAVE_AQUI"; 
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o especialista técnico sênior do ElectroExpert.
    
    DIRETRIZES OBRIGATÓRIAS:
    1. SEGURANÇA: Use [ALERTA] para normas NR10/NBR5410 e riscos jurídicos. Seja enfático sobre EPIs e desenergização.
    2. CONTEÚDO: Use [TECNICO] para a explicação.
    3. VISÃO: Se receber uma foto, identifique Marca e Modelo na etiqueta.
    4. PESQUISA: Priorize o ACERVO LOCAL. Se não encontrar o modelo exato lá, use sua base externa (internet) e avise.
    5. RESPOSTA: Se a informação for do acervo, escreva "ORIGEM: ACERVO LOCAL". Se for externa, "ORIGEM: PESQUISA EXTERNA".`
});

const app = express();
// Limite de 50mb para suportar fotos de alta resolução
app.use(cors(), express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

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

app.post("/api/ask", async (req, res) => {
    const { question, image } = req.body;
    try {
        const caminhoAcervo = path.join(__dirname, "acervo");
        const todosPDFs = buscarArquivos(caminhoAcervo);
        let contextoGeral = "";
        
        for (const caminho of todosPDFs) {
            const texto = await lerPdfRobusto(caminho);
            contextoGeral += `\n--- MANUAL: ${path.basename(caminho)} ---\n${texto}\n`;
        }

        const promptPart = { text: `ACERVO DISPONÍVEL:\n${contextoGeral.substring(0, 700000)}\n\nPERGUNTA: ${question}` };
        const contentParts = [promptPart];

        if (image) {
            contentParts.push({ inlineData: { mimeType: "image/jpeg", data: image } });
        }

        const result = await model.generateContent(contentParts);
        const text = result.response.text();

        let alerta = "Atenção técnica obrigatória (NR10/NBR5410).";
        let procedimento = text;

        if (text.includes("[ALERTA]") && text.includes("[TECNICO]")) {
            const partes = text.split("[TECNICO]");
            alerta = partes[0].replace("[ALERTA]", "").trim();
            procedimento = partes[1].trim();
        }

        const eExterno = procedimento.includes("ORIGEM: PESQUISA EXTERNA");

        res.json({
            resposta: `
                <div style="font-family: sans-serif;">
                    <div style="background: #fff5f5; border: 2px solid #d9534f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color:#d9534f; margin:0 0 10px 0;">⚠️ SEGURANÇA E RESPONSABILIDADE JURÍDICA</h3>
                        <div style="color: #b91c1c; font-weight: 500;">${alerta.replace(/\n/g, '<br>')}</div>
                    </div>

                    <div style="background: #f0f7ff; border-left: 5px solid #004a99; padding: 20px; border-radius: 8px;">
                        <div style="display: inline-block; padding: 4px 10px; background: ${eExterno ? '#fff3cd' : '#d4edda'}; color: ${eExterno ? '#856404' : '#155724'}; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 15px; border: 1px solid currentColor;">
                            ${eExterno ? "🌐 FONTE EXTERNA" : "📁 FONTE: ACERVO LOCAL"}
                        </div>
                        <h3 style="color:#004a99; margin:0 0 15px 0;">🔧 PROCEDIMENTO TÉCNICO</h3>
                        <div style="color: #1e3a8a; line-height: 1.6;">${procedimento.replace(/ORIGEM: (ACERVO LOCAL|PESQUISA EXTERNA)/g, "").replace(/\n/g, '<br>')}</div>
                    </div>
                </div>`,
            fonte: eExterno ? "Base Global + Visão" : "Acervo Interno"
        });
    } catch (error) {
        res.status(500).json({ resposta: "Erro ao processar consulta." });
    }
});

app.listen(3000, () => console.log("🚀 ElectroExpert Online na Porta 3000!"));