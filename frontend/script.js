const textarea = document.getElementById("pergunta");
const btnMic = document.getElementById("btn-mic");
const conteudoDiv = document.getElementById("conteudo");
const resultadoDiv = document.getElementById("resultado");

async function processarEntrada(){
    const texto = textarea.value.trim();
    if(!texto) return;

    resultadoDiv.style.display="block";
    conteudoDiv.innerHTML = `
        <div class="seguranca">
            ⚠ Uso obrigatório de EPI, EPC e aplicação de LOTO conforme NR-10.
        </div>
        <div class="solucao">
            🔍 Consultando acervo técnico e IA...
        </div>
    `;

    try{
        const response = await fetch("/chat",{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({ question:texto })
        });

        const data = await response.json();

        conteudoDiv.innerHTML = `
            <div class="seguranca">
                ⚠ Uso obrigatório de EPI, EPC e aplicação de LOTO conforme NR-10.
            </div>
            <div class="solucao">${data.answer.replace(/\n/g,"<br>")}</div>
            <div class="como-resolvido">
                🔧 <strong>Como foi resolvido:</strong><br>
                Procedimento baseado em normas técnicas, manuais e boas práticas.
            </div>
        `;
        document.getElementById("fonte").innerText="ORIGEM: IA + ACERVO TÉCNICO";
    }catch{
        conteudoDiv.innerHTML="<div class='solucao'>⚠ Erro ao comunicar com o servidor.</div>";
    }
}

/* VOZ */
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
if(Speech){
    const rec = new Speech();
    rec.lang = "pt-BR";
    btnMic.onmousedown = ()=>{ rec.start(); btnMic.classList.add("recording"); };
    btnMic.onmouseup   = ()=>{ rec.stop();  btnMic.classList.remove("recording"); };
    rec.onresult = e=>{
        textarea.value = e.results[0][0].transcript;
        setTimeout(processarEntrada,600);
    };
}
