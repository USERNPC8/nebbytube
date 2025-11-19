document.addEventListener('DOMContentLoaded', () => {
    // Referências DOM
    const urlInput = document.getElementById("urlInput");
    const mainBtn = document.getElementById("mainBtn");
    const btnText = document.getElementById("btnText");
    const btnLoader = document.getElementById("btnLoader");
    const pasteBtn = document.getElementById("pasteBtn");
    
    const resultArea = document.getElementById("resultArea");
    const errorMsg = document.getElementById("errorMsg");
    const errorText = document.getElementById("errorText");
    
    const resThumb = document.getElementById("resThumb");
    const resTitle = document.getElementById("resTitle");
    const resPlatformBadge = document.getElementById("resPlatformBadge");
    const resFilename = document.getElementById("resFilename");
    const btnDownloadVideo = document.getElementById("btnDownloadVideo");
    const btnReset = document.getElementById("btnReset");
    
    const platformBtns = document.querySelectorAll('.platform-btn');

    let currentPlatform = 'insta';

    // --- Inicialização ---
    // Simular clique inicial para garantir o estado correto (estilos e placeholder)
    // Usamos setTimeout para garantir que todos os listeners estejam prontos
    setTimeout(() => {
        document.querySelector('[data-platform="insta"]').click(); 
    }, 0);
    
    // =================================================================
    // !!! A CORREÇÃO ESTÁ AQUI !!!
    // Conecta o botão de BAJAR à função principal de processamento
    mainBtn.addEventListener('click', processDownload);
    // =================================================================

    // --- Funções de UI Helper ---
    function setLoading(isLoading) {
        if (isLoading) {
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            mainBtn.disabled = true;
            urlInput.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            mainBtn.disabled = false;
            urlInput.disabled = false;
        }
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    // --- Lógica de Plataforma ---
    platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset visual de todos
            platformBtns.forEach(b => {
                b.classList.remove('text-white', 'bg-zinc-800', 'shadow-inner', 'border', 'border-white/20');
                b.classList.add('text-zinc-500', 'hover:text-zinc-300', 'hover:bg-zinc-800/50');
            });

            // Ativar atual
            btn.classList.remove('text-zinc-500', 'hover:text-zinc-300', 'hover:bg-zinc-800/50');
            btn.classList.add('text-white', 'bg-zinc-800', 'shadow-inner', 'border', 'border-white/20');

            currentPlatform = btn.getAttribute('data-platform');
            
            // Atualizar Placeholder
            urlInput.placeholder = currentPlatform === 'insta' ? "Cole o link do Instagram..." : "Cole o link do Threads...";
            resultArea.classList.add('hidden');
            hideError();
        });
    });

    function detectPlatform(text) {
        if (!text) return;
        if (text.includes('threads.net')) {
            document.querySelector('[data-platform="threads"]').click();
        } else if (text.includes('instagram.com')) {
            document.querySelector('[data-platform="insta"]').click();
        }
    }

    // --- Listeners de Input ---
    urlInput.addEventListener('input', (e) => detectPlatform(e.target.value));
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processDownload();
    });

    // --- Botão Colar ---
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            detectPlatform(text);
            processDownload(); // Tenta processar após colar
        } catch (err) {
            showError("Permissão negada para colar da área de transferência.");
        }
    });

    // --- Botão de Reset ---
    btnReset.addEventListener('click', () => {
        resultArea.classList.add('hidden');
        urlInput.value = '';
        urlInput.focus();
        hideError();
    });

    // --- Lógica Principal de Download ---
    async function processDownload() {
        const url = urlInput.value.trim();
        if (!url) { showError("URL Inválida ou Vazia."); return; }

        setLoading(true);
        hideError();
        resultArea.classList.add('hidden');

        try {
            // 1. Chama o backend para resolver o link de download
            const apiUrl = `/api/resolve?type=${currentPlatform}&url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Falha ao obter dados do vídeo. Verifique o link.');
            }

            // 2. Configura a interface
            resThumb.src = data.thumbnail;
            resPlatformBadge.textContent = currentPlatform.toUpperCase();
            resTitle.textContent = currentPlatform === 'insta' ? 'Instagram Reel/Video' : 'Threads Video';
            resFilename.textContent = data.filename;

            // 3. Define o botão de download para chamar a rota de Proxy no nosso backend
            const proxyDownloadUrl = `/api/proxy-download?url=${encodeURIComponent(data.downloadUrl)}&filename=${encodeURIComponent(data.filename)}`;
            btnDownloadVideo.href = proxyDownloadUrl;

            resultArea.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            showError(error.message || "Erro inesperado ao processar o link. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }
});
