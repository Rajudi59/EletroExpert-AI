async function enviarPergunta() {
    const pergunta = document.getElementById("pergunta").value;
    const respostaDiv = document.getElementById("resposta");

    if (!pergunta.trim()) {
        alert("Digite uma pergunta antes de enviar!");
        return;
    }

    respostaDiv.innerText = "Consultando IA e Acervo Técnico...";

    try {
        // CORREÇÃO: Agora o sistema busca no endereço correto da internet
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: pergunta })
        });

        const data = await response.json();

        if (data.arquivos && data.arquivos.length > 0) {
            const html = data.arquivos.map(a => `
                <div style="margin-bottom:15px; border-left: 3px solid #007bff; padding-left: 10px;">
                    <strong>Documento: ${a.nome}</strong>
                    <ul>
                        ${a.trechos.map(t => `<li>${t}</li>`).join("")}
                    </ul>
                    <a href="/acervo/${a.nome}" target="_blank" style="color: blue; text-decoration: underline;">Abrir manual completo</a>
                </div>
            `).join("");

            respostaDiv.innerHTML = `<strong>Resposta:</strong><br>${data.answer}<hr>${html}`;
        } else {
            respostaDiv.innerText = data.answer;
        }

    } catch (error) {
        respostaDiv.innerText = "Erro ao conectar com o servidor. Verifique sua conexão.";
        console.error(error);
    }
}
