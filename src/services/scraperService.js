import { chromium } from 'playwright';
import { CONFIG } from '../config/constants.js';
import { PageService } from './pageService.js';
import { ActionService } from './actionService.js';
import { ScreenshotService } from './screenshotService.js';
import { sleep } from '../utils/dateUtils.js';

export class ScraperService {
    static async executeScraper({ url, actions }) {
        console.log('Iniciando execução do scraper...');
        console.log(`URL inicial: ${url}`);
        console.log(`Total de ações: ${actions.length}`);

        const browser = await chromium.launch({
            headless: true,
            timeout: CONFIG.BROWSER_TIMEOUT
        });
        console.log('Navegador iniciado');

        const context = await browser.newContext({
            timeout: CONFIG.BROWSER_TIMEOUT
        });
        const page = await context.newPage();

        PageService.configurePageTimeouts(page);
        console.log('Nova página criada');

        let originalPage = page;
        let currentPage = page;
        const screenshotResults = [];

        try {
            console.log(`Navegando para: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle' });
            console.log('Página carregada com sucesso');

            // Capturar screenshot inicial
            const initialScreenshot = await ScreenshotService.captureDebugScreenshot(currentPage, 'inicial');
            if (initialScreenshot) {
                screenshotResults.push({
                    step: 'inicial',
                    filename: initialScreenshot,
                    timestamp: new Date().toISOString()
                });
            }

            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                console.log(`\nExecutando ação ${i + 1}/${actions.length}: ${action.type}`);

                try {
                    // Verificações de estado da página
                    await this.validatePageState(currentPage, context, i + 1, action);

                    // Para ações que podem causar navegação, aguardar um pouco para estabilizar
                    if (['click', 'goto'].includes(action.type)) {
                        await sleep(0.5);
                    }

                    // Executar a ação específica
                    currentPage = await this.executeAction(currentPage, context, originalPage, action);

                    // Capturar screenshot após cada ação
                    await this.captureActionScreenshot(currentPage, i + 1, action, screenshotResults);

                } catch (actionError) {
                    await this.handleActionError(currentPage, i + 1, action, actionError, screenshotResults);
                    throw new Error(`Falha na ação ${i + 1} (${action.type}): ${actionError.message}`);
                }
            }

            console.log('\nTodas as ações executadas com sucesso!');
            return await this.finalizeScraper(browser, currentPage, context, screenshotResults);

        } catch (err) {
            return await this.handleScraperError(browser, currentPage, err, screenshotResults);
        }
    }

    static async validatePageState(currentPage, context, actionNumber, action) {
        if (currentPage.isClosed()) {
            throw new Error(`Página atual foi fechada antes da ação ${actionNumber} (${action.type})`);
        }

        if (context.pages().length === 0) {
            throw new Error(`Todas as páginas do contexto foram fechadas antes da ação ${actionNumber} (${action.type})`);
        }
    }

    static async executeAction(currentPage, context, originalPage, action) {
        switch (action.type) {
            case 'goto':
                return await ActionService.executeGoto(currentPage, context, action);

            case 'click':
                return await ActionService.executeClick(currentPage, context, action);

            case 'type':
                return await ActionService.executeType(currentPage, action);

            case 'wait':
                return await ActionService.executeWait(currentPage, context, action);

            case 'switchToPopup':
                return await ActionService.executeSwitchToPopup(context, currentPage);

            case 'switchToMain':
                return await ActionService.executeSwitchToMain(originalPage);

            case 'loopUntil':
                return await ActionService.executeLoopUntil(currentPage, context, action);

            case 'screenshot':
                return await ActionService.executeScreenshot(currentPage, action);

            case 'extractText':
                return await ActionService.executeExtractText(currentPage, action);

            default:
                console.log(`  Tipo de ação não reconhecido: ${action.type}`);
                return currentPage;
        }
    }

    static async captureActionScreenshot(currentPage, actionNumber, action, screenshotResults) {
        console.log(`\n📸 Capturando screenshot após ação ${actionNumber}...`);
        const stepName = `acao_${actionNumber}_${action.type}`;
        const screenshot = await ScreenshotService.captureDebugScreenshot(currentPage, stepName);

        if (screenshot) {
            screenshotResults.push({
                step: `ação ${actionNumber}`,
                action: action.type,
                filename: screenshot,
                timestamp: new Date().toISOString(),
                xpath: action.xpath || null,
                value: action.value || null
            });
        }
    }

    static async handleActionError(currentPage, actionNumber, action, actionError, screenshotResults) {
        console.error(`\nERRO na ação ${actionNumber} (${action.type}):`);
        console.error(`XPath/Elemento: ${action.xpath || 'N/A'}`);
        console.error(`Detalhes: ${actionError.message}`);
        console.error(`Timestamp: ${new Date().toLocaleString('pt-BR')}`);

        // Capturar screenshot do erro
        console.log(`\n📸 Capturando screenshot do erro...`);
        const errorStepName = `erro_acao_${actionNumber}_${action.type}`;
        const errorScreenshot = await ScreenshotService.captureDebugScreenshot(currentPage, errorStepName);

        if (errorScreenshot) {
            screenshotResults.push({
                step: `erro na ação ${actionNumber}`,
                action: action.type,
                filename: errorScreenshot,
                timestamp: new Date().toISOString(),
                xpath: action.xpath || null,
                error: actionError.message
            });
        }

        // Capturar informações adicionais do estado da página
        try {
            if (!currentPage.isClosed()) {
                const url = currentPage.url();
                console.error(`URL atual: ${url}`);
                const title = await currentPage.title();
                console.error(`Título da página: ${title}`);
            } else {
                console.error('Página atual está fechada');
            }
        } catch (debugError) {
            console.error('Erro ao capturar informações de debug:', debugError.message);
        }
    }

    static async finalizeScraper(browser, currentPage, context, screenshotResults) {
        console.log('Capturando conteúdo final da página...');

        // Garantir que temos uma página ativa para capturar o conteúdo
        currentPage = await PageService.ensureActivePage(context, currentPage);

        // Capturar screenshot final
        const finalScreenshot = await ScreenshotService.captureDebugScreenshot(currentPage, 'final');
        if (finalScreenshot) {
            screenshotResults.push({
                step: 'final',
                filename: finalScreenshot,
                timestamp: new Date().toISOString()
            });
        }

        const finalHtml = await currentPage.content();
        console.log('Conteúdo capturado');

        console.log('Fechando navegador...');
        await browser.close();
        console.log('Navegador fechado');

        // Log dos screenshots capturados
        console.log(`\n📸 RESUMO DOS SCREENSHOTS CAPTURADOS:`);
        console.log(`Total de screenshots: ${screenshotResults.length}`);
        screenshotResults.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.step} - ${result.filename}`);
        });

        return {
            success: true,
            message: 'Execução concluída com sucesso.',
            html: finalHtml,
            screenshots: screenshotResults
        };
    }

    static async handleScraperError(browser, currentPage, err, screenshotResults) {
        console.error('\nErro durante a execução:');
        console.error('Detalhes do erro:', err.message);

        // Capturar screenshot do erro final
        try {
            if (currentPage && !currentPage.isClosed()) {
                console.log(`\n📸 Capturando screenshot do erro final...`);
                const finalErrorScreenshot = await ScreenshotService.captureDebugScreenshot(currentPage, 'erro_final');
                if (finalErrorScreenshot) {
                    screenshotResults.push({
                        step: 'erro final',
                        filename: finalErrorScreenshot,
                        timestamp: new Date().toISOString(),
                        error: err.message
                    });
                }
            }
        } catch (screenshotError) {
            console.log(`Erro ao capturar screenshot final: ${screenshotError.message}`);
        }

        console.log('Fechando navegador devido ao erro...');

        try {
            if (browser) {
                await browser.close();
                console.log('Navegador fechado');
            }
        } catch (closeError) {
            console.log('Erro ao fechar navegador:', closeError.message);
        }

        // Incluir screenshots mesmo em caso de erro
        const error = new Error(err.message);
        error.screenshots = screenshotResults;
        throw error;
    }
}
