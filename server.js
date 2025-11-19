const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());

// Caminho correto da pasta PUBLIC
const publicDir = path.join(__dirname, "public");

// Servir os arquivos estáticos
app.use(express.static(publicDir));

/*
 * ROTA /api/resolve
 */
app.get("/api/resolve", async (req, res) => {
    const { url, type } = req.query;

    if (!url || !type)
        return res.status(400).json({ success: false, error: "URL e tipo são obrigatórios." });

    let apiUrl;

    if (type === "insta") {
        apiUrl = `https://api.vreden.my.id/api/v1/download/instagram?url=${encodeURIComponent(url)}`;
    } else if (type === "threads") {
        apiUrl = `https://api.vreden.my.id/api/v1/download/threads?url=${encodeURIComponent(url)}`;
    } else {
        return res.status(400).json({ success: false, error: "Tipo inválido." });
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        let mediaUrl = null;
        let thumbnail = null;

        // Instagram
        if (type === "insta") {
            const list = data.result?.dados || data.result?.data;
            if (Array.isArray(list) && list.length > 0) {
                mediaUrl = list[0].url;
                thumbnail = list[0].thumb;
            }
        }

        // Threads
        if (type === "threads") {
            const list = data.result?.media;
            if (Array.isArray(list) && list.length > 0) {
                mediaUrl = list[0].url;
                thumbnail = list[0].thumb;
            }
        }

        if (!mediaUrl)
            return res.json({ success: false, error: "Não foi possível extrair o vídeo." });

        res.json({
            success: true,
            downloadUrl: mediaUrl,
            thumbnail: thumbnail || "",
            filename: `${type}_${Date.now()}.mp4`
        });

    } catch (err) {
        res.json({ success: false, error: "Erro no servidor ao processar." });
    }
});

/*
 * PROXY DOWNLOAD – baixa sem erro de CORS
 */
app.get("/api/proxy-download", async (req, res) => {
    const { url, filename } = req.query;

    if (!url)
        return res.status(400).send("URL obrigatória");

    try {
        const response = await fetch(url);

        res.setHeader("Content-Disposition", `attachment; filename="${filename || "video.mp4"}"`);
        res.setHeader("Content-Type", "video/mp4");

        response.body.pipe(res);

    } catch (error) {
        res.status(500).send("Erro no proxy de download.");
    }
});

/*
 * INDEX
 */
app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
    console.log("🔥 Servidor rodando em http://localhost:" + port);
});
