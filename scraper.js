import { chromium } from 'playwright';

const waitForSeconds = async (page, seconds) => {
    // Verificar se a página ainda está ativa antes de executar o wait
    if (page.isClosed()) {
        throw new Error('Página foi fechada durante a operação de espera');
    }
    await page.waitForTimeout(seconds * 1000);
};

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // yyyy-mm-dd
};

const ensureActivePage = async (context, currentPage) => {
    if (!currentPage.isClosed()) {
        return currentPage;
    }

    console.log('  Página atual foi fechada, procurando página ativa...');
    const availablePages = context.pages().filter(p => !p.isClosed());

    if (availablePages.length === 0) {
        throw new Error('Nenhuma página ativa disponível');
    }

    const newPage = availablePages[availablePages.length - 1];
    newPage.setDefaultTimeout(0);
    newPage.setDefaultNavigationTimeout(0);
    console.log('  Alternado para página ativa');
    return newPage;
};

export const executarScraper = async ({ url, actions }) => {
    console.log('Iniciando execução do scraper...');
    console.log(`URL inicial: ${url}`);
    console.log(`Total de ações: ${actions.length}`);

    const browser = await chromium.launch({
        headless: true,
        timeout: 0 // Remove timeout do browser
    });
    console.log('Navegador iniciado');

    const context = await browser.newContext({
        timeout: 0 // Remove timeout do context
    });
    const page = await context.newPage();

    // Remove timeout de navegação e ações
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    console.log('Nova página criada');

    let originalPage = page;
    let currentPage = page;

    try {
        console.log(`Navegando para: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' });
        console.log('Página carregada com sucesso');

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            console.log(`\nExecutando ação ${i + 1}/${actions.length}: ${action.type}`);

            try {
                // Verificar se a página ainda está ativa antes de cada ação
                if (currentPage.isClosed()) {
                    throw new Error(`Página atual foi fechada antes da ação ${i + 1} (${action.type})`);
                }

                // Verificar se o contexto ainda está ativo
                if (context.pages().length === 0) {
                    throw new Error(`Todas as páginas do contexto foram fechadas antes da ação ${i + 1} (${action.type})`);
                }

                // Para ações que podem causar navegação, aguardar um pouco para estabilizar
                if (['click', 'goto'].includes(action.type)) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                switch (action.type) {
                    case 'goto':
                        console.log(`  Navegando para: ${action.url}`);
                        await currentPage.goto(action.url, { waitUntil: 'networkidle' });
                        console.log('  Navegação concluída');

                        // Aguardar carregamento completo após navegação
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Verificar se a página ainda está ativa após navegação
                        if (currentPage.isClosed()) {
                            console.log('  Página foi fechada após navegação, tentando encontrar página ativa...');
                            const availablePages = context.pages().filter(p => !p.isClosed());
                            if (availablePages.length > 0) {
                                currentPage = availablePages[availablePages.length - 1];
                                currentPage.setDefaultTimeout(0);
                                currentPage.setDefaultNavigationTimeout(0);
                                console.log('  Alternado para página ativa');
                            } else {
                                throw new Error('Nenhuma página disponível após navegação');
                            }
                        }
                        break;

                    case 'click':
                        console.log(`  Clicando no elemento: ${action.xpath}`);
                        try {
                            await currentPage.click(`xpath=${action.xpath}`, { timeout: 10000 });
                            console.log('  Clique executado');

                            // Aguardar um pouco após o clique para possível carregamento
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Verificar se a página ainda está ativa após o clique
                            if (currentPage.isClosed()) {
                                console.log('  Página foi fechada após o clique, tentando encontrar página ativa...');
                                const availablePages = context.pages().filter(p => !p.isClosed());
                                if (availablePages.length > 0) {
                                    currentPage = availablePages[availablePages.length - 1]; // Última página ativa
                                    currentPage.setDefaultTimeout(0);
                                    currentPage.setDefaultNavigationTimeout(0);
                                    console.log('  Alternado para página ativa');
                                } else {
                                    throw new Error('Nenhuma página disponível após clique');
                                }
                            }
                        } catch (clickError) {
                            console.log(`  Tentando localizar elemento primeiro...`);
                            const element = await currentPage.locator(`xpath=${action.xpath}`).first();
                            if (await element.count() === 0) {
                                throw new Error(`Elemento não encontrado: ${action.xpath}`);
                            }
                            await element.click();
                            console.log('  Clique executado (segunda tentativa)');

                            // Mesma verificação pós-clique
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            if (currentPage.isClosed()) {
                                console.log('  Página foi fechada após o clique, tentando encontrar página ativa...');
                                const availablePages = context.pages().filter(p => !p.isClosed());
                                if (availablePages.length > 0) {
                                    currentPage = availablePages[availablePages.length - 1];
                                    currentPage.setDefaultTimeout(0);
                                    currentPage.setDefaultNavigationTimeout(0);
                                    console.log('  Alternado para página ativa');
                                } else {
                                    throw new Error('Nenhuma página disponível após clique');
                                }
                            }
                        }
                        break;

                    case 'type':
                        console.log(`  Digitando no campo: ${action.xpath}`);
                        console.log(`  Valor definido`);
                        try {
                            await currentPage.fill(`xpath=${action.xpath}`, action.value || '', { timeout: 10000 });
                            console.log('  Texto digitado');
                        } catch (typeError) {
                            console.log(`  Tentando localizar campo primeiro...`);
                            const element = await currentPage.locator(`xpath=${action.xpath}`).first();
                            if (await element.count() === 0) {
                                throw new Error(`Campo não encontrado: ${action.xpath}`);
                            }
                            await element.fill(action.value || '');
                            console.log('  Texto digitado (segunda tentativa)');
                        }
                        break;

                    case 'wait':
                        console.log(`  Aguardando ${action.seconds || 1} segundos...`);
                        // Verificação adicional antes do wait
                        if (currentPage.isClosed()) {
                            throw new Error('Página foi fechada antes da operação de espera');
                        }
                        await waitForSeconds(currentPage, action.seconds || 1);
                        // Verificação pós-wait
                        if (currentPage.isClosed()) {
                            console.log('  Aviso: Página foi fechada durante a espera');
                            // Tentar usar uma página disponível
                            const availablePages = context.pages().filter(p => !p.isClosed());
                            if (availablePages.length > 0) {
                                currentPage = availablePages[0];
                                currentPage.setDefaultTimeout(0);
                                currentPage.setDefaultNavigationTimeout(0);
                                console.log('  Alternado para página disponível');
                            } else {
                                throw new Error('Nenhuma página disponível após espera');
                            }
                        }
                        console.log('  Espera concluída');
                        break;

                    case 'switchToPopup': {
                        console.log('  Alternando para popup/nova aba...');
                        try {
                            const popupPromise = context.waitForEvent('page', { timeout: 60000 }); // 60 segundos timeout
                            const popup = await popupPromise;
                            // aguarda a nova aba carregar
                            await popup.waitForLoadState('domcontentloaded');
                            // Remove timeout da nova página também
                            popup.setDefaultTimeout(0);
                            popup.setDefaultNavigationTimeout(0);
                            currentPage = popup;
                            console.log('  Alternado para popup');
                        } catch (error) {
                            console.log('  Timeout aguardando popup, tentando última página...');
                            // Tenta pegar a última página criada
                            const pages = context.pages();
                            if (pages.length > 1) {
                                currentPage = pages[pages.length - 1];
                                currentPage.setDefaultTimeout(0);
                                currentPage.setDefaultNavigationTimeout(0);
                                console.log('  Alternado para última página disponível');
                            } else {
                                throw new Error('Nenhuma nova página/popup encontrada');
                            }
                        }
                        break;
                    }

                    case 'switchToMain':
                        console.log('  Voltando para aba principal...');
                        if (originalPage.isClosed()) {
                            throw new Error('Página principal foi fechada');
                        }
                        currentPage = originalPage;
                        console.log('  Voltou para aba principal');
                        break;

                    case 'loopUntil': {
                        console.log(`  Iniciando loop até condição: ${action.xpath}`);
                        const today = getTodayDate();
                        console.log(`  Data de hoje: ${today}`);
                        let attempts = 10;
                        let loopCount = 0;

                        while (attempts-- > 0) {
                            loopCount++;
                            console.log(`    Tentativa ${loopCount}/10`);

                            try {
                                // Verificar se o elemento existe
                                const element = await currentPage.locator(`xpath=${action.xpath}`).first();
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
                                            await currentPage.click(`xpath=${subAction.xpath}`, { timeout: 10000 });
                                        } else if (subAction.type === 'type') {
                                            console.log(`        Digitando: ${subAction.value}`);
                                            await currentPage.fill(`xpath=${subAction.xpath}`, subAction.value || '', { timeout: 10000 });
                                        } else if (subAction.type === 'wait') {
                                            console.log(`        Aguardando ${subAction.seconds} segundos`);
                                            // Garantir que temos uma página ativa antes do wait
                                            currentPage = await ensureActivePage(context, currentPage);
                                            await waitForSeconds(currentPage, subAction.seconds || 1);
                                        }
                                        console.log(`        Sub-ação ${j + 1} concluída`);
                                    } catch (subError) {
                                        console.log(`        Erro na sub-ação ${j + 1}: ${subError.message}`);
                                        throw subError;
                                    }
                                }

                                console.log('    Aguardando 3 segundos antes da próxima tentativa...');
                                currentPage = await ensureActivePage(context, currentPage);
                                await waitForSeconds(currentPage, 3);
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
                        break;
                    }

                    case 'screenshot':
                        console.log(`  Capturando screenshot: ${action.path || 'screenshot.png'}`);
                        await currentPage.screenshot({ path: action.path || 'screenshot.png' });
                        console.log('  Screenshot capturado');
                        break;

                    case 'extractText':
                        console.log(`  Extraindo texto do elemento: ${action.xpath}`);
                        action.result = await currentPage.textContent(`xpath=${action.xpath}`);
                        console.log(`  Texto extraído: ${action.result}`);
                        break;

                    default:
                        console.log(`  Tipo de ação não reconhecido: ${action.type}`);
                        break;
                }

            } catch (actionError) {
                console.error(`\nERRO na ação ${i + 1} (${action.type}):`);
                console.error(`XPath/Elemento: ${action.xpath || 'N/A'}`);
                console.error(`Detalhes: ${actionError.message}`);
                console.error(`Timestamp: ${new Date().toLocaleString('pt-BR')}`);

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

                throw new Error(`Falha na ação ${i + 1} (${action.type}): ${actionError.message}`);
            }
        }

        console.log('\nTodas as ações executadas com sucesso!');
        console.log('Capturando conteúdo final da página...');

        // Garantir que temos uma página ativa para capturar o conteúdo
        currentPage = await ensureActivePage(context, currentPage);
        const finalHtml = await currentPage.content();
        console.log('Conteúdo capturado');

        console.log('Fechando navegador...');
        await browser.close();
        console.log('Navegador fechado');

        return {
            success: true,
            message: 'Execução concluída com sucesso.',
            html: finalHtml
        };

    } catch (err) {
        console.error('\nErro durante a execução:');
        console.error('Detalhes do erro:', err.message);
        console.log('Fechando navegador devido ao erro...');

        try {
            if (browser) {
                await browser.close();
                console.log('Navegador fechado');
            }
        } catch (closeError) {
            console.log('Erro ao fechar navegador:', closeError.message);
        }

        throw err;
    }
};
