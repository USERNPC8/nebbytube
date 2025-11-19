const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Rota para buscar metadados de mídia (URL de download e Thumbnail)
 */
app.get('/api/resolve', async (req, res) => {
    const { url, type } = req.query;

    if (!url || !type) {
        return res.status(400).json({ error: 'Parâmetros URL e TYPE são obrigatórios.' });
    }

    let apiUrl = '';
    
    // Seleciona a API correta baseada no tipo
    if (type === 'threads') {
        apiUrl = `https://api.vreden.my.id/api/v1/download/threads?url=${encodeURIComponent(url)}`;
    } else if (type === 'insta') {
        apiUrl = `https://api.vreden.my.id/api/v1/download/instagram?url=${encodeURIComponent(url)}`;
    } else {
        return res.status(400).json({ error: 'Tipo de plataforma inválido. Use "threads" ou "insta".' });
    }

    try {
        console.log(`[INFO] Buscando metadados: ${type} - ${url}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Erro na API Vreden: status ${response.status}`);
        }

        const data = await response.json();
        
        // Variáveis de retorno
        let mediaUrl = null;
        let thumbnail = null;

        // --- Lógica de Extração ---
        if (type === 'threads') {
            const mediaList = data.result?.media || data.resultado?.media;
            if (mediaList && mediaList.length > 0) {
                mediaUrl = mediaList[0].url;
                thumbnail = mediaList[0].thumb || mediaList[0].thumbnail;
            }
        } else if (type === 'insta') {
            const rootData = data.result || data.resultado;
            
            // Tenta extrair de diferentes estruturas (dados/data)
            const mediaList = rootData?.dados || rootData?.data;
            
            if (Array.isArray(mediaList) && mediaList.length > 0) {
                mediaUrl = mediaList[0].url;
                thumbnail = mediaList[0].thumb;
            }
        }

        if (!mediaUrl) {
            console.error('JSON Recebido:', JSON.stringify(data, null, 2));
            return res.status(404).json({ error: 'Mídia não encontrada na resposta da API.' });
        }
        // Retorna os dados limpos para o frontend
        res.json({
            success: true,
            downloadUrl: mediaUrl,
            thumbnail: thumbnail || 'https://via.placeholder.com/300?text=No+Image',
            filename: `${type}_video_${Date.now()}.mp4`
        });

    } catch (error) {
        console.error('[ERRO] Ao resolver link:', error.message);
        res.status(500).json({ error: 'Falha ao processar o link no servidor.' });
    }
});

/**
 * Rota de Proxy para Download (Stream do arquivo de vídeo real)
 */
app.get('/api/proxy-download', async (req, res) => {
    const { url, filename } = req.query;

    if (!url) return res.status(400).send('URL é obrigatória');

    try {
        console.log(`[INFO] Iniciando proxy de download: ${filename}`);
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Erro ao baixar arquivo original: status ${response.status}`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Faz o pipe do stream para o cliente
        response.body.pipe(res);

    } catch (error) {
        console.error('[ERRO] Proxy download:', error.message);
        if (!res.headersSent) {
             res.status(500).send('Erro ao realizar o download do arquivo.');
        }
    }
});

// Rota padrão para servir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
