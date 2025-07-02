import { CONFIG } from '../config/constants.js';

export const debugDashboardHTML = `
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
        
        // Auto-refresh a cada ${CONFIG.AUTO_REFRESH_INTERVAL / 1000} segundos
        setInterval(loadScreenshots, ${CONFIG.AUTO_REFRESH_INTERVAL});
    </script>
</body>
</html>
`;
