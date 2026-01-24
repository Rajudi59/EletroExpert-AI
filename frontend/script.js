let imagemBase64 = null;

// Escuta quando o usuário escolhe uma foto
document.getElementById('foto-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('nome-arquivo').innerText = "✅ Foto carregada";
        const reader = new FileReader();
        reader.onload = function(event) {
            // Extrai apenas a parte dos dados da imagem (remove o cabeçalho data:image/...)
            imagemBase64 = event.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }
});

async function enviarPergunta() {
    const perguntaInput = document.getElementById("pergunta");
    const pergunta = perguntaInput.value;
    const respostaDiv = document.getElementById("resposta");

    if (!pergunta.trim() && !imagemBase64) {
        alert("Digite uma pergunta ou tire uma foto do equipamento.");
        return;
    }

    respostaDiv.innerHTML = "<strong>⚙️ Analisando imagem e manuais...</strong>";

    try {
        const response = await fetch("/chat", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                question: pergunta || "Analise esta imagem técnica e me dê o diagnóstico.",
                image: imagemBase64,
                imageType: "image/jpeg"
            })
        });

        const data = await response.json();

        // Limpa a imagem e o campo após o envio
        imagemBase64 = null;
        perguntaInput.value = "";
        document.getElementById('nome-arquivo').innerText = "";

        if (data.answer) {
            respostaDiv.innerHTML = `<strong>💡 Instrução Técnica:</strong><br>${data.answer.replace(/\n/g, '<br>')}`;
        }

    } catch (error) {
        respostaDiv.innerHTML = "<span style='color:red;'>⚠️ Erro ao processar diagnóstico.</span>";
        console.error(error);
    }
}
