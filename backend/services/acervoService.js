const fs = require('fs');
const path = require('path');
// Removemos o pdf-parse daqui por enquanto para testar a conexão limpa
// const pdf = require('pdf-parse'); 

async function buscarConhecimentoTecnico() {
  try {
    const acervoPath = path.join(__dirname, '..', 'acervo');
    
    // Na Vercel, ler muitos PDFs trava o servidor. 
    // Vamos apenas listar os manuais disponíveis para a IA saber o que você tem.
    let listaManuais = "O técnico possui os seguintes manuais no acervo: ";
    
    if (fs.existsSync(acervoPath)) {
      const pastas = fs.readdirSync(acervoPath);
      pastas.forEach(pasta => {
        const caminhoPasta = path.join(acervoPath, pasta);
        if (fs.lstatSync(caminhoPasta).isDirectory()) {
          const arquivos = fs.readdirSync(caminhoPasta);
          listaManuais += `\n- Na pasta ${pasta}: ${arquivos.join(', ')}`;
        }
      });
    }

    // Retornamos apenas a lista e uma instrução. 
    // Isso é leve e não trava o servidor.
    return listaManuais + "\nInstrução: Responda como especialista se baseando nesses manuais e na NR-10.";

  } catch (error) {
    console.error("Erro leve no acervo:", error);
    return "Base de manuais offline. Siga protocolos de segurança padrão.";
  }
}

module.exports = { buscarConhecimentoTecnico };