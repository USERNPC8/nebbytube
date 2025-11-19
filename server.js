const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Caminho absoluto da pasta PUBLIC
const publicPath = path.join(__dirname, 'public');

// Servir arquivos estáticos
app.use(express.static(publicPath));
app.use(cors());

// ==============================
// ROTA /api/resolve
// ==============================
app.get('/api/resolve', async (req, res) => {
    const { url, type } = req.query;

    if (!url || !type) {
        return res.status(400).json({ error: 'URL e TYPE são obrigatórios.' });
    }

    let apiUrl = '';

    if (type === 'threads') {
        apiUrl = `https://api.vreden.my.id/api/v1/download/threads?url=${encodeURIComponent(url)}`;
    } 
    else if (type === 'insta') {
        apiUrl = `https://api.vreden.my.id/api/v1/download/instagram?url=${encodeURIComponent(url)}`;
    } 
    else {
        return res.status(400).json({ error: 'Tipo inválido.' });
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        let mediaUrl = null;
        let thumbnail = null;

        if (type === 'threads') {
            const list = data.result?.media;
            if (list?.length) {
                mediaUrl = list[0].url;
                thumbnail = list[0].thumb;
            }
        }

        if (type === 'insta') {
            const root = data.result;
            const list = root?.dados || root?.data;
            if (list?.length) {
                mediaUrl = list[0].url;
                thumbnail = list[0].thumb;
            }
        }

        if (!mediaUrl)
            return res.status(404).json({ error: 'Mídia não encontrada.' });

        res.json({
            success: true,
            downloadUrl: mediaUrl,
            thumbnail: thumbnail || '',
            filename: `${type}_video_${Date.now()}.mp4`
        });

    } catch (err) {
        res.status(500).json({ error: 'Falha interna no servidor.' });
    }
});

// ==============================
// PROXY DOWNLOAD
// ==============================
app.get('/api/proxy-download', async (req, res) => {
    const { url, filename } = req.query;

    try {
        const response = await fetch(url);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        response.body.pipe(res);
    } catch {
        res.status(500).send('Erro ao baixar.');
    }
});

// ==============================
// INDEX.HTML
// ==============================
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, () =>
    console.log(`Servidor rodando em http://localhost:${port}`)
);
