import { PageService } from './pageService.js';
import { getTodayDate, sleep } from '../utils/dateUtils.js';
import { CONFIG } from '../config/constants.js';

export class ActionService {
    static async executeGoto(page, context, action) {
        console.log(`  Navegando para: ${action.url}`);
        await page.goto(action.url, { waitUntil: 'networkidle' });
        console.log('  Navegação concluída');
        return await PageService.handlePageNavigation(page, context);
    }

    static async executeClick(page, context, action) {
        console.log(`  Clicando no elemento: ${action.xpath}`);
        try {
            await page.click(`xpath=${action.xpath}`, { timeout: 10000 });
            console.log('  Clique executado');
            return await PageService.handlePageClick(page, context);
        } catch (clickError) {
            console.log(`  Tentando localizar elemento primeiro...`);
            const element = await page.locator(`xpath=${action.xpath}`).first();
            if (await element.count() === 0) {
                throw new Error(`Elemento não encontrado: ${action.xpath}`);
            }
            await element.click();
            console.log('  Clique executado (segunda tentativa)');
            return await PageService.handlePageClick(page, context);
        }
    }

    static async executeType(page, action) {
        console.log(`  Digitando no campo: ${action.xpath}`);
        console.log(`  Valor definido`);
        try {
            await page.fill(`xpath=${action.xpath}`, action.value || '', { timeout: 10000 });
            console.log('  Texto digitado');
        } catch (typeError) {
            console.log(`  Tentando localizar campo primeiro...`);
            const element = await page.locator(`xpath=${action.xpath}`).first();
            if (await element.count() === 0) {
                throw new Error(`Campo não encontrado: ${action.xpath}`);
            }
            await element.fill(action.value || '');
            console.log('  Texto digitado (segunda tentativa)');
        }
        return page;
    }

    static async executeWait(page, context, action) {
        console.log(`  Aguardando ${action.seconds || 1} segundos...`);

        if (page.isClosed()) {
            throw new Error('Página foi fechada antes da operação de espera');
        }

        await PageService.waitForSeconds(page, action.seconds || 1);

        if (page.isClosed()) {
            console.log('  Aviso: Página foi fechada durante a espera');
            const availablePages = context.pages().filter(p => !p.isClosed());
            if (availablePages.length > 0) {
                const newPage = availablePages[0];
                PageService.configurePageTimeouts(newPage);
                console.log('  Alternado para página disponível');
                return newPage;
            } else {
                throw new Error('Nenhuma página disponível após espera');
            }
        }

        console.log('  Espera concluída');
        return page;
    }

    static async executeSwitchToPopup(context, currentPage) {
        console.log('  Alternando para popup/nova aba...');
        try {
            const popupPromise = context.waitForEvent('page', { timeout: 60000 });
            const popup = await popupPromise;
            await popup.waitForLoadState('domcontentloaded');
            PageService.configurePageTimeouts(popup);
            console.log('  Alternado para popup');
            return popup;
        } catch (error) {
            console.log('  Timeout aguardando popup, tentando última página...');
            const pages = context.pages();
            if (pages.length > 1) {
                const newPage = pages[pages.length - 1];
                PageService.configurePageTimeouts(newPage);
                console.log('  Alternado para última página disponível');
                return newPage;
            } else {
                throw new Error('Nenhuma nova página/popup encontrada');
            }
        }
    }

    static async executeSwitchToMain(originalPage) {
        console.log('  Voltando para aba principal...');
        if (originalPage.isClosed()) {
            throw new Error('Página principal foi fechada');
        }
        console.log('  Voltou para aba principal');
        return originalPage;
    }

    static async executeLoopUntil(page, context, action) {
        console.log(`  Iniciando loop até condição: ${action.xpath}`);
        const today = getTodayDate();
        console.log(`  Data de hoje: ${today}`);
        let attempts = CONFIG.MAX_LOOP_ATTEMPTS;
        let loopCount = 0;

        while (attempts-- > 0) {
            loopCount++;
            console.log(`    Tentativa ${loopCount}/${CONFIG.MAX_LOOP_ATTEMPTS}`);

            try {
                const element = await page.locator(`xpath=${action.xpath}`).first();
                if (await element.count() === 0) {
                    throw new Error(`Elemento não encontrado: ${action.xpath}`);
                }

                const inputValue = await element.getAttribute('value');
                console.log(`    Valor atual do campo: ${inputValue}`);

                if (inputValue && inputValue >= today) {
                    console.log('    Condição atendida, saindo do loop');
                    break;
                }

                console.log(`    Executando ${action.actionsIfTrue.length} sub-ações...`);
                for (let j = 0; j < action.actionsIfTrue.length; j++) {
                    const subAction = action.actionsIfTrue[j];
                    console.log(`      Sub-ação ${j + 1}: ${subAction.type}`);

                    try {
                        if (subAction.type === 'click') {
                            console.log(`        Clicando: ${subAction.xpath}`);
                            await page.click(`xpath=${subAction.xpath}`, { timeout: 10000 });
                        } else if (subAction.type === 'type') {
                            console.log(`        Digitando: ${subAction.value}`);
                            await page.fill(`xpath=${subAction.xpath}`, subAction.value || '', { timeout: 10000 });
                        } else if (subAction.type === 'wait') {
                            console.log(`        Aguardando ${subAction.seconds} segundos`);
                            page = await PageService.ensureActivePage(context, page);
                            await PageService.waitForSeconds(page, subAction.seconds || 1);
                        }
                        console.log(`        Sub-ação ${j + 1} concluída`);
                    } catch (subError) {
                        console.log(`        Erro na sub-ação ${j + 1}: ${subError.message}`);
                        throw subError;
                    }
                }

                console.log('    Aguardando 3 segundos antes da próxima tentativa...');
                page = await PageService.ensureActivePage(context, page);
                await PageService.waitForSeconds(page, 3);
            } catch (loopError) {
                console.log(`    Erro na tentativa ${loopCount}: ${loopError.message}`);
                if (attempts === 0) {
                    throw new Error(`Loop falhou após ${loopCount} tentativas: ${loopError.message}`);
                }
            }
        }

        if (attempts <= 0) {
            console.log('    Limite de tentativas atingido');
        }
        console.log('  Loop concluído');
        return page;
    }

    static async executeScreenshot(page, action) {
        console.log(`  Capturando screenshot: ${action.path || 'screenshot.png'}`);
        await page.screenshot({ path: action.path || 'screenshot.png' });
        console.log('  Screenshot capturado');
        return page;
    }

    static async executeExtractText(page, action) {
        console.log(`  Extraindo texto do elemento: ${action.xpath}`);
        action.result = await page.textContent(`xpath=${action.xpath}`);
        console.log(`  Texto extraído: ${action.result}`);
        return page;
    }
}
