import express from "express";
import dotenv from "dotenv";
import path from "path";

import { CONFIG } from "./src/config/constants.js";
import { timeoutMiddleware, corsMiddleware, loggerMiddleware } from "./src/middleware/index.js";
import scraperRoutes from "./src/routes/scraperRoutes.js";
import screenshotRoutes from "./src/routes/screenshotRoutes.js";

dotenv.config();

const app = express();

// Middleware global
app.use(timeoutMiddleware);
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(express.json());

// Servir arquivos estáticos da pasta screenshots
app.use('/screenshots', express.static(CONFIG.SCREENSHOTS_DIR));

// Rota de status/saúde
app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Playwright Scraper API",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        endpoints: {
            scraper: "POST /executar",
            screenshots: "GET /screenshots",
            debug_dashboard: "GET /debug",
            health: "GET /health"
        },
        architecture: {
            organized: true,
            structure: "MVC + Services",
            features: ["Screenshot Debug", "Error Handling", "Modular Design"]
        }
    });
});

// Rotas
app.use('/', scraperRoutes);
app.use('/', screenshotRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

const server = app.listen(CONFIG.PORT, () => {
    console.log(`🚀 Servidor Playwright rodando na porta ${CONFIG.PORT}`);
    console.log(`📊 Status API: http://localhost:${CONFIG.PORT}/`);
    console.log(`🔍 Debug Dashboard: http://localhost:${CONFIG.PORT}/debug`);
    console.log(`💓 Health Check: http://localhost:${CONFIG.PORT}/health`);
    console.log(`📁 Screenshots: ${CONFIG.SCREENSHOTS_DIR}`);
});

server.timeout = 0;

export default app;
