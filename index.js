import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { executarScraper } from "./scraper.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use((req, res, next) => {
    req.setTimeout(0); // Remove timeout de requisição
    res.setTimeout(0); // Remove timeout de resposta
    next();
});

app.use(express.json());

// Rota de status/saúde
app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Playwright Scraper API",
        timestamp: new Date().toISOString(),
        endpoints: {
            scraper: "POST /executar",
            screenshots: "GET /screenshots",
            debug_dashboard: "GET /debug",
            health: "GET /health"
        }
    });
});

// Rota de health check
app.get("/health", (req, res) => {
    try {
        const screenshotsDir = "/app/screenshots";
        const screenshotsExist = fs.existsSync(screenshotsDir);
        const screenshotCount = screenshotsExist ?
            fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png')).length : 0;

        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            screenshots: {
                directory_exists: screenshotsExist,
                count: screenshotCount
            }
        });
    } catch (error) {
        res.status(500).json({
            status: "unhealthy",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota para servir screenshots de debug
app.get("/screenshots", (req, res) => {
    try {
        const screenshotsDir = "/app/screenshots";

        if (!fs.existsSync(screenshotsDir)) {
            return res.json({
                error: "Diretório de screenshots não encontrado",
                screenshots: []
            });
        }

        const files = fs.readdirSync(screenshotsDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
            .map(file => {
                const filePath = path.join(screenshotsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    url: `/screenshots/${file}`,
                    size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                    created: stats.ctime.toLocaleString('pt-BR'),
                    modified: stats.mtime.toLocaleString('pt-BR')
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified)); // Mais recentes primeiro

        res.json({
            total: files.length,
            screenshots: files
        });
    } catch (error) {
        res.status(500).json({
            error: "Erro ao listar screenshots",
            details: error.message
        });
    }
});

// Rota para servir um screenshot específico
app.get("/screenshots/:filename", (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join("/app/screenshots", filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Screenshot não encontrado" });
        }

        // Verificar se é um arquivo de imagem válido
        if (!filename.endsWith('.png') && !filename.endsWith('.jpg') && !filename.endsWith('.jpeg')) {
            return res.status(400).json({ error: "Apenas arquivos PNG, JPG e JPEG são permitidos" });
        }

        res.sendFile(filePath);
    } catch (error) {
        res.status(500).json({
            error: "Erro ao servir screenshot",
            details: error.message
        });
    }
});

// Rota para limpar screenshots antigos
app.delete("/screenshots", (req, res) => {
    try {
        const screenshotsDir = "/app/screenshots";

        if (!fs.existsSync(screenshotsDir)) {
            return res.json({ message: "Diretório de screenshots não encontrado" });
        }

        const files = fs.readdirSync(screenshotsDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));

        let deletedCount = 0;
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(screenshotsDir, file));
                deletedCount++;
            } catch (deleteError) {
                console.log(`Erro ao deletar ${file}: ${deleteError.message}`);
            }
        }

        res.json({
            message: `${deletedCount} screenshots deletados`,
            deleted: deletedCount,
            total: files.length
        });
    } catch (error) {
        res.status(500).json({
            error: "Erro ao limpar screenshots",
            details: error.message
        });
    }
});

app.post("/executar", async (req, res) => {
    const { url, actions } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('NOVA REQUISIÇÃO RECEBIDA');
    console.log('='.repeat(60));
    console.log(`URL: ${url}`);
    console.log(`Número de ações: ${actions ? actions.length : 0}`);
    console.log('Timestamp:', new Date().toLocaleString('pt-BR'));

    if (!url || !Array.isArray(actions)) {
        console.log('Parâmetros inválidos!');
        return res
            .status(400)
            .json({ error: "Parâmetros inválidos. Envie { url, actions[] }" });
    }

    try {
        const result = await executarScraper({ url, actions });
        console.log('\nREQUISIÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('='.repeat(60));
        res.json(result);
    } catch (err) {
        console.log('\nERRO NA EXECUÇÃO!');
        console.log('Erro:', err.message);
        console.log('='.repeat(60));
        res
            .status(500)
            .json({ error: "Erro ao executar scraping", details: err.message });
    }
});

// Rota para dashboard de screenshots
app.get("/debug", (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Debug Screenshots - Playwright API</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                text-align: center;
            }
            .controls {
                margin-bottom: 20px;
                text-align: center;
            }
            .btn {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
                text-decoration: none;
                display: inline-block;
            }
            .btn:hover {
                background-color: #0056b3;
            }
            .btn.danger {
                background-color: #dc3545;
            }
            .btn.danger:hover {
                background-color: #c82333;
            }
            .loading {
                text-align: center;
                padding: 20px;
                color: #666;
            }
            .screenshot-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            .screenshot-card {
                background: white;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: transform 0.2s;
            }
            .screenshot-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            }
            .screenshot-card img {
                width: 100%;
                height: auto;
                border-radius: 5px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .screenshot-card img:hover {
                transform: scale(1.05);
            }
            .screenshot-info {
                margin-top: 10px;
                font-size: 12px;
                color: #666;
            }
            .screenshot-title {
                font-weight: bold;
                margin-bottom: 5px;
                color: #333;
                word-break: break-all;
            }
            .no-screenshots {
                text-align: center;
                padding: 40px;
                color: #666;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.9);
                cursor: pointer;
            }
            .modal img {
                display: block;
                margin: auto;
                max-width: 95%;
                max-height: 95%;
                margin-top: 2.5%;
            }
            .close {
                position: absolute;
                top: 15px;
                right: 35px;
                color: #f1f1f1;
                font-size: 40px;
                font-weight: bold;
                cursor: pointer;
            }
            .stats {
                background: white;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-around;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .stat-item {
                flex: 1;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔍 Debug Screenshots</h1>
            <p>Visualize os screenshots capturados durante a execução do scraper</p>
            <div style="margin-top: 10px;">
                <a href="/" class="btn" style="margin-right: 10px;">📊 Status API</a>
                <a href="/health" class="btn">💓 Health Check</a>
            </div>
        </div>

        <div class="stats" id="stats">
            <div class="stat-item">
                <div class="stat-value" id="totalScreenshots">-</div>
                <div class="stat-label">Screenshots</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="totalSize">-</div>
                <div class="stat-label">Tamanho Total</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="lastUpdate">-</div>
                <div class="stat-label">Última Atualização</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn" onclick="loadScreenshots()">🔄 Atualizar</button>
            <button class="btn danger" onclick="clearScreenshots()">🗑️ Limpar Todos</button>
        </div>

        <div id="content">
            <div class="loading">Carregando screenshots...</div>
        </div>

        <!-- Modal para visualização em tela cheia -->
        <div id="modal" class="modal" onclick="closeModal()">
            <span class="close">&times;</span>
            <img id="modalImg">
        </div>

        <script>
            async function loadScreenshots() {
                const content = document.getElementById('content');
                content.innerHTML = '<div class="loading">Carregando screenshots...</div>';
                
                try {
                    const response = await fetch('/screenshots');
                    const data = await response.json();
                    
                    updateStats(data);
                    
                    if (data.screenshots && data.screenshots.length > 0) {
                        content.innerHTML = \`
                            <div class="screenshot-grid">
                                \${data.screenshots.map(screenshot => \`
                                    <div class="screenshot-card">
                                        <div class="screenshot-title">\${screenshot.filename}</div>
                                        <img src="\${screenshot.url}" alt="\${screenshot.filename}" onclick="openModal('\${screenshot.url}')">
                                        <div class="screenshot-info">
                                            <div><strong>Tamanho:</strong> \${screenshot.size}</div>
                                            <div><strong>Criado:</strong> \${screenshot.created}</div>
                                            <div><strong>Modificado:</strong> \${screenshot.modified}</div>
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    } else {
                        content.innerHTML = \`
                            <div class="no-screenshots">
                                <h3>📷 Nenhum screenshot encontrado</h3>
                                <p>Execute o scraper para gerar screenshots de debug</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    content.innerHTML = \`
                        <div class="no-screenshots">
                            <h3>❌ Erro ao carregar screenshots</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }
            
            function updateStats(data) {
                document.getElementById('totalScreenshots').textContent = data.total || 0;
                
                const totalSizeMB = data.screenshots ? 
                    data.screenshots.reduce((sum, s) => sum + parseFloat(s.size), 0).toFixed(2) + ' MB' : 
                    '0 MB';
                document.getElementById('totalSize').textContent = totalSizeMB;
                
                const lastUpdate = data.screenshots && data.screenshots.length > 0 ? 
                    data.screenshots[0].modified : 
                    'Nunca';
                document.getElementById('lastUpdate').textContent = lastUpdate;
            }
            
            async function clearScreenshots() {
                if (!confirm('Tem certeza que deseja excluir todos os screenshots?')) {
                    return;
                }
                
                try {
                    const response = await fetch('/screenshots', { method: 'DELETE' });
                    const data = await response.json();
                    alert(data.message);
                    loadScreenshots();
                } catch (error) {
                    alert('Erro ao limpar screenshots: ' + error.message);
                }
            }
            
            function openModal(imageSrc) {
                const modal = document.getElementById('modal');
                const modalImg = document.getElementById('modalImg');
                modal.style.display = 'block';
                modalImg.src = imageSrc;
            }
            
            function closeModal() {
                document.getElementById('modal').style.display = 'none';
            }
            
            // Carregar screenshots ao abrir a página
            loadScreenshots();
            
            // Auto-refresh a cada 30 segundos
            setInterval(loadScreenshots, 30000);
        </script>
    </body>
    </html>
    `;

    res.send(html);
});

const server = app.listen(PORT, () => {
    console.log(`Servidor Playwright rodando na porta ${PORT}`);
});


server.timeout = 0;
