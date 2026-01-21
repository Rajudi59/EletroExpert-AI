const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function buscarConhecimentoTecnico() {
  // process.cwd() garante que a Vercel ache a pasta 'acervo' dentro de 'backend'
  const baseDir = path.join(process.cwd(), 'acervo');
  
  let textoAcumulado = "";
  // Lista das pastas que você tem no seu computador
  const pastas = ['Inversores', 'Motores', 'CLP_Logica', 'Diagramas', 'Normas_Regulamentadoras', 'Sensores'];

  console.log("Buscando manuais em:", baseDir);

  for (const pasta of pastas) {
    const caminhoPasta = path.join(baseDir, pasta);
    
    if (fs.existsSync(caminhoPasta)) {
      const arquivos = fs.readdirSync(caminhoPasta);
      
      for (const arquivo of arquivos) {
        if (arquivo.toLowerCase().endsWith('.pdf')) {
          const caminhoArquivo = path.join(caminhoPasta, arquivo);
          
          try {
            const dataBuffer = fs.readFileSync(caminhoArquivo);
            const data = await pdf(dataBuffer);
            
            // Identifica a fonte para a IA citar o manual correto
            textoAcumulado += `\n[FONTE TÉCNICA: ${arquivo}]\n${data.text}\n`;
          } catch (e) {
            console.error(`Erro ao ler o arquivo ${arquivo}:`, e.message);
          }
        }
      }
    }
  }

  // Retorno de segurança caso os manuais falhem
  return textoAcumulado || "Atenção: Manuais técnicos não carregados. Siga rigorosamente a NR-10 e manuais físicos.";
}

module.exports = { buscarConhecimentoTecnico };