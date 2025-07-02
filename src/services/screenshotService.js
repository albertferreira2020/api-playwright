import path from 'path';
import fs from 'fs';
import { CONFIG, SCREENSHOT_CONFIG } from '../config/constants.js';
import { formatTimestamp } from '../utils/dateUtils.js';
import { ensureDirectoryExists } from '../utils/fileUtils.js';

export class ScreenshotService {
    static async captureDebugScreenshot(page, stepName, attempt = null) {
        try {
            if (page.isClosed()) {
                console.log(`  ⚠️ Página fechada, pulando screenshot: ${stepName}`);
                return null;
            }

            const timestamp = formatTimestamp();
            const attemptSuffix = attempt ? `_tentativa_${attempt}` : '';
            const filename = `debug_${stepName}${attemptSuffix}_${timestamp}.jpg`;
            const screenshotPath = path.join(CONFIG.SCREENSHOTS_DIR, filename);

            console.log(`  📸 Iniciando captura de screenshot: ${filename}`);

            // Garantir que o diretório existe
            ensureDirectoryExists(CONFIG.SCREENSHOTS_DIR);

            // Capturar informações da página para debug
            try {
                const url = page.url();
                const title = await page.title();
                console.log(`  📄 Página: ${title} - ${url}`);
            } catch (pageInfoError) {
                console.log(`  ⚠️ Erro ao obter info da página: ${pageInfoError.message}`);
            }

            await page.screenshot({
                path: screenshotPath,
                ...SCREENSHOT_CONFIG
            });

            // Verificar se o arquivo foi criado
            if (fs.existsSync(screenshotPath)) {
                const stats = fs.statSync(screenshotPath);
                console.log(`  ✅ Screenshot salvo: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
            } else {
                console.log(`  ❌ Arquivo de screenshot não foi criado: ${filename}`);
            }

            return filename;
        } catch (error) {
            console.log(`  ❌ Erro ao capturar screenshot '${stepName}': ${error.message}`);
            console.log(`  Stack trace: ${error.stack}`);
            return null;
        }
    }
}
