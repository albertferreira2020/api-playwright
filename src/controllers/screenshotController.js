import fs from 'fs';
import path from 'path';
import { CONFIG, SUPPORTED_IMAGE_FORMATS } from '../config/constants.js';
import { getScreenshotsList, deleteAllScreenshots, getScreenshotsStats } from '../utils/fileUtils.js';

export class ScreenshotController {
    static async listScreenshots(req, res) {
        try {
            const screenshots = getScreenshotsList();
            res.json({
                total: screenshots.length,
                screenshots
            });
        } catch (error) {
            res.status(500).json({
                error: "Erro ao listar screenshots",
                details: error.message
            });
        }
    }

    static async getScreenshot(req, res) {
        try {
            const { filename } = req.params;
            const filePath = path.join(CONFIG.SCREENSHOTS_DIR, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: "Screenshot não encontrado" });
            }

            // Verificar se é um arquivo de imagem válido
            if (!SUPPORTED_IMAGE_FORMATS.some(ext => filename.endsWith(ext))) {
                return res.status(400).json({
                    error: `Apenas arquivos ${SUPPORTED_IMAGE_FORMATS.join(', ')} são permitidos`
                });
            }

            res.sendFile(filePath);
        } catch (error) {
            res.status(500).json({
                error: "Erro ao servir screenshot",
                details: error.message
            });
        }
    }

    static async deleteScreenshots(req, res) {
        try {
            const result = deleteAllScreenshots();
            res.json({
                message: `${result.deleted} screenshots deletados`,
                deleted: result.deleted,
                total: result.total
            });
        } catch (error) {
            res.status(500).json({
                error: "Erro ao limpar screenshots",
                details: error.message
            });
        }
    }

    static async healthCheck(req, res) {
        try {
            const stats = getScreenshotsStats();
            res.json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                screenshots: stats
            });
        } catch (error) {
            res.status(500).json({
                status: "unhealthy",
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}
