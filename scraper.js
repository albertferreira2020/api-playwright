import { chromium } from 'playwright';

const waitForGoogleAccountSelection = async (page) => {
    console.log('    Aguardando página de seleção de conta do Google...');

    // Aguardar carregamento básico primeiro
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        console.log('    DOM básico carregado');
    } catch (error) {
        console.log('    Timeout no carregamento do DOM');
    }

    // Verificar qual tipo de página do Google estamos
    const url = page.url();
    console.log(`    URL atual: ${url}`);

    // Detectar se é página de login (inserir email) vs página de seleção de conta
    const isLoginPage = url.includes('signin/identifier') || url.includes('signin/v2/identifier');
    const isAccountSelectionPage = url.includes('selectaccount') || url.includes('oauth/selectaccount');

    if (isLoginPage) {
        console.log('    Detectada página de LOGIN (inserir email)');
        // Aguardar elementos de input de email
        const loginSelectors = [
            'input[type="email"]',
            'input[id="identifierId"]',
            '#identifierId',
            'input[name="identifier"]',
            '[data-initial-value]'
        ];

        for (const selector of loginSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 8000, state: 'visible' });
                console.log(`    Encontrado seletor de login: ${selector}`);
                break;
            } catch (error) {
                console.log(`    Seletor de login ${selector} não encontrado, tentando próximo...`);
            }
        }
    } else if (isAccountSelectionPage) {
        console.log('    Detectada página de SELEÇÃO DE CONTA');
        // Aguardar elementos de seleção de conta
        const selectionSelectors = [
            'div[data-email]',
            '[data-identifier]',
            'li[data-account-type]',
            '.LXRPh'
        ];

        for (const selector of selectionSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 8000, state: 'visible' });
                console.log(`    Encontrado seletor de seleção: ${selector}`);
                break;
            } catch (error) {
                console.log(`    Seletor de seleção ${selector} não encontrado, tentando próximo...`);
            }
        }
    } else {
        console.log('    Tipo de página não identificado, tentando seletores gerais...');
        // Aguardar múltiplos indicadores que a página carregou
        const selectors = [
            'div[data-email]',
            '[data-identifier]',
            '.w6VTHd', // Classe comum em páginas do Google
            '[role="button"]',
            '.VV3oRb', // Outro seletor comum
            '#headingText', // Título da página do Google
            'form', // Qualquer formulário
            '.LXRPh', // Container de contas
            'li[data-account-type]', // Items de conta
            '[jsname]', // Elementos com jsname (comum no Google)
            'input[type="email"]', // Campo de email
            '#identifierId' // ID específico do campo de email
        ];

        let selectorFound = false;
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 8000, state: 'visible' });
                console.log(`    Encontrado seletor: ${selector}`);
                selectorFound = true;
                break;
            } catch (error) {
                console.log(`    Seletor ${selector} não encontrado, tentando próximo...`);
            }
        }

        if (!selectorFound) {
            console.log('    Nenhum seletor específico encontrado, tentando aguardar rede...');
        }
    }

    // Aguardar rede estabilizar com timeout maior
    try {
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        console.log('    Rede estabilizada');
    } catch (error) {
        console.log('    Timeout aguardando rede estabilizar, continuando...');
    }

    // Aguardar um tempo adicional para JavaScript dinâmico
    await new Promise(resolve => setTimeout(resolve, 6000));
    console.log('    Aguarda adicional concluída');

    // Debug: Verificar estrutura da página
    try {
        const title = await page.title();
        console.log(`    Título da página: ${title}`);

        // Contar elementos comuns
        const divCount = await page.locator('div').count();
        const buttonCount = await page.locator('button').count();
        const inputCount = await page.locator('input').count();
        console.log(`    Elementos div: ${divCount}, buttons: ${buttonCount}, inputs: ${inputCount}`);

        // Verificar se há elementos com data-email (seleção de conta)
        const emailElements = await page.locator('div[data-email]').count();
        console.log(`    Elementos com data-email: ${emailElements}`);

        // Verificar se há campo de email (página de login)
        const emailInputs = await page.locator('input[type="email"], #identifierId').count();
        console.log(`    Campos de email: ${emailInputs}`);

    } catch (debugError) {
        console.log(`    Erro no debug: ${debugError.message}`);
    }
};

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
        timeout: 0, // Remove timeout do browser
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-web-security',
            '--disable-popup-blocking', // Permitir popups
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--disable-extensions-file-access-check',
            '--disable-ipc-flooding-protection'
        ]
    });
    console.log('Navegador iniciado');

    const context = await browser.newContext({
        timeout: 0, // Remove timeout do context
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'pt-BR',
        ignoreHTTPSErrors: true
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

                // Configurar listener para popups se a próxima ação for switchToPopup
                let popupListener = null;
                let pendingPopup = null;
                if (i < actions.length - 1 && actions[i + 1].type === 'switchToPopup') {
                    console.log('  Configurando listener para popup (próxima ação)...');
                    popupListener = (page) => {
                        console.log(`  Popup detectado antecipadamente: ${page.url()}`);
                        if (!pendingPopup) {
                            pendingPopup = page;
                        }
                    };
                    context.on('page', popupListener);
                }

                // Para ações após switchToPopup, aguardar mais tempo para o DOM carregar
                if (i > 0 && actions[i - 1].type === 'switchToPopup') {
                    console.log('  Aguardando DOM estabilizar após mudança de popup...');
                    await new Promise(resolve => setTimeout(resolve, 8000));

                    // Se a próxima ação é um clique, verificar se o elemento já está disponível
                    if (action.type === 'click') {
                        console.log('  Verificando se elemento estará disponível após popup...');
                        try {
                            await currentPage.waitForSelector(`xpath=${action.xpath}`, {
                                timeout: 15000,
                                state: 'visible'
                            });
                            console.log('  Elemento já detectado e visível');
                        } catch (elementError) {
                            console.log('  Elemento ainda não visível, continuando com tentativas...');
                        }
                    }
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

                    case 'click': {
                        console.log(`  Clicando no elemento: ${action.xpath}`);
                        let clickSuccess = false;
                        let attempts = 3;

                        while (attempts > 0 && !clickSuccess) {
                            try {
                                console.log(`  Tentativa ${4 - attempts}/3 de clique`);

                                // Aguardar um pouco antes de tentar localizar o elemento
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // Aguardar que o elemento esteja disponível na página
                                console.log(`  Aguardando elemento ficar disponível...`);

                                // Se estamos no Google, aguardar indicadores específicos
                                if (currentPage.url().includes('accounts.google.com')) {
                                    console.log('  Detectado Google Accounts, aguardando carregamento específico...');
                                    await waitForGoogleAccountSelection(currentPage);

                                    // NOVA LÓGICA: Verificar se devemos pular para estratégia de login
                                    const currentUrl = currentPage.url();
                                    const isLoginPage = currentUrl.includes('signin/identifier') || currentUrl.includes('signin/v2/identifier');

                                    if (isLoginPage && action.xpath.includes('data-email')) {
                                        console.log('  DETECTADO: Página de login + ação de seleção de conta');
                                        console.log('  APLICANDO ESTRATÉGIA DE LOGIN AUTOMATICAMENTE...');

                                        try {
                                            const emailInput = await currentPage.locator('input[type="email"], #identifierId').first();
                                            if (await emailInput.count() > 0) {
                                                console.log('  Preenchendo campo de email no login...');
                                                await emailInput.fill('albert.ferreira@itlean.com.br');

                                                // Aguardar um pouco
                                                await new Promise(resolve => setTimeout(resolve, 1000));

                                                // Procurar botão "Próximo" ou "Continuar"
                                                const nextButton = await currentPage.locator('button:has-text("Próximo"), button:has-text("Next"), button:has-text("Continuar"), button[id*="next"], button[id*="Next"], [jsname="LgbsSe"], button[type="submit"], #identifierNext, [data-primary="true"]').first();
                                                if (await nextButton.count() > 0) {
                                                    console.log('  Clicando no botão Próximo...');
                                                    await nextButton.click();
                                                    clickSuccess = true;

                                                    console.log('  Login executado com sucesso via estratégia automática!');

                                                    // Aguardar navegação
                                                    await new Promise(resolve => setTimeout(resolve, 3000));

                                                    // Verificar se chegamos na página de seleção de conta ou senha
                                                    const newUrl = currentPage.url();
                                                    console.log(`  Nova URL após inserir email: ${newUrl}`);

                                                    if (currentPage.isClosed()) {
                                                        console.log('  Página foi fechada após inserir email, procurando página ativa...');
                                                        const availablePages = context.pages().filter(p => !p.isClosed());
                                                        if (availablePages.length > 0) {
                                                            currentPage = availablePages[availablePages.length - 1];
                                                            currentPage.setDefaultTimeout(0);
                                                            currentPage.setDefaultNavigationTimeout(0);
                                                            console.log('  Alternado para página ativa');
                                                        }
                                                    }
                                                } else {
                                                    console.log('  Botão Próximo não encontrado');
                                                }
                                            } else {
                                                console.log('  Campo de email não encontrado');
                                            }
                                        } catch (autoLoginError) {
                                            console.log(`  Erro na estratégia automática de login: ${autoLoginError.message}`);
                                            console.log('  Continuando com método tradicional...');
                                        }
                                    }
                                }

                                // Se o login automático funcionou, pular para verificação pós-clique
                                if (clickSuccess) {
                                    console.log('  Pulando waitForSelector - login já executado');
                                } else {
                                    // Método tradicional - aguardar o elemento
                                    await currentPage.waitForSelector(`xpath=${action.xpath}`, {
                                        timeout: 30000,
                                        state: 'visible'
                                    });
                                }

                                // Aguardar um pouco mais para garantir que o elemento é clicável
                                if (!clickSuccess) {
                                    await new Promise(resolve => setTimeout(resolve, 1000));

                                    // Tentar clicar apenas se ainda não foi clicado
                                    await currentPage.click(`xpath=${action.xpath}`, { timeout: 10000 });
                                    console.log('  Clique executado com sucesso');
                                    clickSuccess = true;
                                }

                                // Aguardar um pouco após o clique para possível carregamento
                                await new Promise(resolve => setTimeout(resolve, 2000));

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
                                attempts--;
                                console.log(`  Erro no clique (tentativas restantes: ${attempts}): ${clickError.message}`);

                                if (attempts > 0) {
                                    console.log(`  Aguardando 3 segundos antes da próxima tentativa...`);
                                    await new Promise(resolve => setTimeout(resolve, 3000));

                                    // Tentar recarregar a página se necessário
                                    try {
                                        await currentPage.reload({ waitUntil: 'networkidle' });
                                        console.log(`  Página recarregada para nova tentativa`);
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                    } catch (reloadError) {
                                        console.log(`  Erro ao recarregar página: ${reloadError.message}`);
                                    }
                                } else {
                                    // Última tentativa com método alternativo
                                    console.log(`  Última tentativa com método alternativo...`);

                                    // Debug: listar todos os elementos div com data-email
                                    try {
                                        console.log('  Debug: Verificando estrutura da página...');

                                        // Verificar URL atual
                                        const currentUrl = currentPage.url();
                                        console.log(`  URL atual: ${currentUrl}`);

                                        // Verificar se estamos na página correta
                                        if (!currentUrl.includes('accounts.google.com')) {
                                            console.log('  AVISO: Não estamos na página do Google!');
                                        }

                                        // Detectar tipo de página do Google
                                        const isLoginPage = currentUrl.includes('signin/identifier') || currentUrl.includes('signin/v2/identifier');
                                        const isAccountSelectionPage = currentUrl.includes('selectaccount') || currentUrl.includes('oauth/selectaccount');

                                        if (isLoginPage) {
                                            console.log('  DETECTADO: Página de LOGIN do Google (inserir email)');
                                            console.log('  Isso significa que não há contas salvas ou precisamos inserir o email manualmente');

                                            // Verificar se há campo de email disponível
                                            const emailInputs = await currentPage.locator('input[type="email"], #identifierId').count();
                                            console.log(`  Campos de email encontrados: ${emailInputs}`);

                                            if (emailInputs > 0) {
                                                console.log('  ESTRATÉGIA: Inserir email no campo de input');
                                                // Esta é uma página de login, não de seleção de conta
                                                // Precisamos inserir o email no campo de input
                                                throw new Error('PÁGINA_LOGIN_DETECTADA: Não é página de seleção de conta. Precisamos inserir o email no campo de input.');
                                            }
                                        } else if (isAccountSelectionPage) {
                                            console.log('  DETECTADO: Página de SELEÇÃO DE CONTA do Google');
                                        } else {
                                            console.log('  DETECTADO: Página do Google de tipo desconhecido');
                                        }

                                        // Procurar elementos com data-email
                                        const emailElements = await currentPage.locator('div[data-email]').all();
                                        console.log(`  Encontrados ${emailElements.length} elementos com data-email`);

                                        for (let i = 0; i < emailElements.length; i++) {
                                            const email = await emailElements[i].getAttribute('data-email');
                                            console.log(`    Elemento ${i + 1}: data-email="${email}"`);
                                        }

                                        // Tentar encontrar por texto também
                                        const textElements = await currentPage.locator('text=albert.ferreira@itlean.com.br').all();
                                        console.log(`  Encontrados ${textElements.length} elementos com texto do email`);

                                        // Verificar se há elementos clicáveis relacionados ao email
                                        const clickableElements = await currentPage.locator('div, button, a, span').all();
                                        console.log(`  Total de elementos clicáveis: ${clickableElements.length}`);

                                        // Procurar por elementos que contenham o email
                                        let emailFound = false;
                                        for (let i = 0; i < Math.min(clickableElements.length, 50); i++) { // Limitar para não sobrecarregar
                                            try {
                                                const text = await clickableElements[i].textContent();
                                                if (text && text.includes('albert.ferreira@itlean.com.br')) {
                                                    console.log(`  Elemento com email encontrado: "${text}"`);
                                                    emailFound = true;
                                                }
                                            } catch (textError) {
                                                // Ignorar elementos que não têm texto
                                            }
                                        }

                                        if (!emailFound) {
                                            console.log('  Email não encontrado nos elementos da página');

                                            // Capturar screenshot para debug
                                            try {
                                                const debugPath = `/app/debug_google_page_${Date.now()}.png`;
                                                await currentPage.screenshot({ path: debugPath });
                                                console.log(`  Screenshot de debug salvo: ${debugPath}`);
                                            } catch (screenshotError) {
                                                console.log(`  Erro ao capturar screenshot: ${screenshotError.message}`);
                                            }
                                        }

                                    } catch (debugError) {
                                        console.log(`  Erro no debug: ${debugError.message}`);
                                    }

                                    try {
                                        // Tentar diferentes estratégias de seleção
                                        let element = null;

                                        // Verificar primeiro se estamos numa página de login
                                        const currentUrl = currentPage.url();
                                        const isLoginPage = currentUrl.includes('signin/identifier') || currentUrl.includes('signin/v2/identifier');

                                        if (isLoginPage) {
                                            console.log('  DETECTADO: Página de login - tentando inserir email no campo de input');

                                            // Esta é uma página de login, não de seleção
                                            // Vamos tentar inserir o email no campo de input
                                            try {
                                                const emailInput = await currentPage.locator('input[type="email"], #identifierId').first();
                                                if (await emailInput.count() > 0) {
                                                    console.log('  Preenchendo campo de email...');
                                                    await emailInput.fill('albert.ferreira@itlean.com.br');

                                                    // Aguardar um pouco
                                                    await new Promise(resolve => setTimeout(resolve, 1000));

                                                    // Procurar botão "Próximo" ou "Continuar"
                                                    const nextButton = await currentPage.locator('button:has-text("Próximo"), button:has-text("Next"), button:has-text("Continuar"), button[id*="next"], button[id*="Next"], [jsname="LgbsSe"], button[type="submit"], #identifierNext, [data-primary="true"]').first();
                                                    if (await nextButton.count() > 0) {
                                                        console.log('  Clicando no botão Próximo...');
                                                        await nextButton.click();
                                                        clickSuccess = true;

                                                        // Aguardar navegação
                                                        await new Promise(resolve => setTimeout(resolve, 3000));

                                                        // Verificar se chegamos na página de seleção de conta ou senha
                                                        const newUrl = currentPage.url();
                                                        console.log(`  Nova URL após inserir email: ${newUrl}`);

                                                        if (currentPage.isClosed()) {
                                                            console.log('  Página foi fechada após inserir email, procurando página ativa...');
                                                            const availablePages = context.pages().filter(p => !p.isClosed());
                                                            if (availablePages.length > 0) {
                                                                currentPage = availablePages[availablePages.length - 1];
                                                                currentPage.setDefaultTimeout(0);
                                                                currentPage.setDefaultNavigationTimeout(0);
                                                                console.log('  Alternado para página ativa');
                                                            }
                                                        }
                                                    } else {
                                                        console.log('  Botão Próximo não encontrado, tentando outras estratégias...');
                                                    }
                                                } else {
                                                    console.log('  Campo de email não encontrado');
                                                }
                                            } catch (loginError) {
                                                console.log(`  Erro ao tentar inserir email: ${loginError.message}`);
                                            }
                                        }

                                        // Se ainda não teve sucesso, tentar as estratégias originais
                                        if (!clickSuccess) {
                                            // Estratégia 1: XPath original
                                            try {
                                                element = await currentPage.locator(`xpath=${action.xpath}`).first();
                                                if (await element.count() > 0) {
                                                    console.log('  Elemento encontrado com XPath original');
                                                } else {
                                                    element = null;
                                                }
                                            } catch (xpathError) {
                                                console.log('  XPath original falhou');
                                                element = null;
                                            }

                                            // Estratégia 2: Seletor por data-email
                                            if (!element) {
                                                try {
                                                    element = await currentPage.locator('div[data-email="albert.ferreira@itlean.com.br"]').first();
                                                    if (await element.count() > 0) {
                                                        console.log('  Elemento encontrado com seletor data-email');
                                                    } else {
                                                        element = null;
                                                    }
                                                } catch (dataEmailError) {
                                                    console.log('  Seletor data-email falhou');
                                                    element = null;
                                                }
                                            }

                                            // Estratégia 3: Seletor por texto
                                            if (!element) {
                                                try {
                                                    element = await currentPage.locator('text=albert.ferreira@itlean.com.br').first();
                                                    if (await element.count() > 0) {
                                                        console.log('  Elemento encontrado com seletor de texto');
                                                    } else {
                                                        element = null;
                                                    }
                                                } catch (textSelectorError) {
                                                    console.log('  Seletor de texto falhou');
                                                    element = null;
                                                }
                                            }

                                            // Estratégia 4: Procurar qualquer div que contenha o email
                                            if (!element) {
                                                try {
                                                    const divs = await currentPage.locator('div').all();
                                                    for (const div of divs) {
                                                        try {
                                                            const text = await div.textContent();
                                                            if (text && text.includes('albert.ferreira@itlean.com.br')) {
                                                                element = div;
                                                                console.log('  Elemento encontrado por busca em divs');
                                                                break;
                                                            }
                                                        } catch (divError) {
                                                            // Continuar procurando
                                                        }
                                                    }
                                                } catch (divSearchError) {
                                                    console.log('  Busca em divs falhou');
                                                }
                                            }

                                            if (element && await element.count() > 0) {
                                                await element.click();
                                                console.log('  Clique executado (método alternativo)');
                                                clickSuccess = true;
                                            } else if (!clickSuccess) {
                                                throw new Error(`Elemento não encontrado com nenhuma estratégia: ${action.xpath}`);
                                            }
                                        }

                                        // Verificação pós-clique (apenas se houve clique)
                                        if (clickSuccess) {
                                            await new Promise(resolve => setTimeout(resolve, 2000));
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
                                    } catch (alternativeError) {
                                        throw new Error(`Elemento não encontrado: ${action.xpath}`);
                                    }
                                }
                            }
                        }

                        if (!clickSuccess) {
                            throw new Error(`Falha ao clicar no elemento após 3 tentativas: ${action.xpath}`);
                        }
                        break;
                    }

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

                        // Verificar se já temos um popup detectado da ação anterior
                        let detectedPopup = null;
                        if (i > 0) {
                            // Tentar encontrar popup detectado na ação anterior
                            const currentPages = context.pages();
                            const initialPageCount = currentPages.length;

                            // Procurar por páginas do Google criadas recentemente
                            for (const page of currentPages) {
                                const url = page.url();
                                if (url.includes('accounts.google.com') || url.includes('google.com')) {
                                    if (page !== currentPage) { // Não é a página atual
                                        console.log(`  Popup já detectado: ${url}`);
                                        detectedPopup = page;
                                        break;
                                    }
                                }
                            }
                        }

                        if (detectedPopup) {
                            console.log('  Usando popup já detectado!');
                            try {
                                await detectedPopup.waitForLoadState('domcontentloaded', { timeout: 15000 });
                                detectedPopup.setDefaultTimeout(0);
                                detectedPopup.setDefaultNavigationTimeout(0);
                                currentPage = detectedPopup;
                                console.log('  Alternado para popup detectado com sucesso');

                                // Aguardar carregamento adicional específico para Google
                                console.log('  Aguardando carregamento completo da página do Google...');
                                await new Promise(resolve => setTimeout(resolve, 5000));

                                // Verificar se a página está realmente carregada
                                try {
                                    await currentPage.waitForLoadState('networkidle', { timeout: 15000 });
                                    console.log('  Rede estabilizada no popup');
                                } catch (networkError) {
                                    console.log('  Timeout na rede, mas continuando...');
                                }

                                break;
                            } catch (error) {
                                console.log(`  Erro ao usar popup detectado: ${error.message}`);
                                // Continuar com método normal
                            }
                        }

                        // Configurar listener para capturar novas páginas antes de tentar detectá-las
                        let newPagePromise = null;
                        const pageCreatedHandler = (page) => {
                            console.log(`  Nova página criada com URL: ${page.url()}`);
                            if (!newPagePromise) {
                                newPagePromise = page;
                            }
                        };
                        context.on('page', pageCreatedHandler);

                        // Contar páginas antes da ação
                        const initialPageCount = context.pages().length;
                        console.log(`  Páginas iniciais: ${initialPageCount}`);

                        let popupFound = false;
                        let waitTime = 0;
                        const maxWaitTime = 60000; // Reduzir para 1 minuto
                        const checkInterval = 1000; // Verificar a cada 1 segundo

                        // Aguardar um tempo inicial para o popup aparecer
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        while (waitTime < maxWaitTime && !popupFound) {
                            console.log(`  Aguardando popup... (${waitTime / 1000}s/${maxWaitTime / 1000}s)`);

                            await new Promise(resolve => setTimeout(resolve, checkInterval));
                            waitTime += checkInterval;

                            // Verificar se novas páginas foram criadas via listener
                            if (newPagePromise) {
                                console.log('  Nova página detectada via listener!');
                                const newPage = newPagePromise;

                                try {
                                    // Aguardar a nova página começar a carregar
                                    await new Promise(resolve => setTimeout(resolve, 2000));

                                    // Verificar se a página tem conteúdo relevante
                                    const url = newPage.url();
                                    console.log(`  URL da nova página: ${url}`);

                                    if (url.includes('accounts.google.com') || url.includes('google.com') || url !== 'about:blank') {
                                        console.log('  Página válida detectada!');

                                        // Aguardar que a nova aba carregue
                                        try {
                                            await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
                                            console.log('  DOM carregado');
                                        } catch (loadError) {
                                            console.log('  Continuando sem aguardar DOM...');
                                        }

                                        // Configurar timeouts
                                        newPage.setDefaultTimeout(0);
                                        newPage.setDefaultNavigationTimeout(0);

                                        currentPage = newPage;
                                        console.log('  Alternado para popup com sucesso');
                                        popupFound = true;
                                    } else {
                                        console.log('  Página não é válida, continuando aguardando...');
                                        newPagePromise = null; // Reset para aguardar próxima página
                                    }
                                } catch (error) {
                                    console.log(`  Erro ao processar nova página: ${error.message}`);
                                    newPagePromise = null; // Reset em caso de erro
                                }
                            }

                            // Verificar se novas páginas foram criadas (método alternativo)
                            if (!popupFound) {
                                const currentPages = context.pages();
                                console.log(`  Páginas atuais: ${currentPages.length}`);

                                if (currentPages.length > initialPageCount) {
                                    console.log('  Nova página detectada via contagem!');

                                    // Pegar a página mais recente que não seja about:blank
                                    const validPages = currentPages.filter(p => p.url() !== 'about:blank');
                                    if (validPages.length > 0) {
                                        const newPage = validPages[validPages.length - 1];
                                        const url = newPage.url();
                                        console.log(`  Tentando página: ${url}`);

                                        if (url.includes('accounts.google.com') || url.includes('google.com')) {
                                            try {
                                                await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
                                                newPage.setDefaultTimeout(0);
                                                newPage.setDefaultNavigationTimeout(0);
                                                currentPage = newPage;
                                                console.log('  Alternado para popup (método alternativo)');
                                                popupFound = true;
                                            } catch (error) {
                                                console.log(`  Erro no método alternativo: ${error.message}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Remover listener
                        context.off('page', pageCreatedHandler);

                        if (!popupFound) {
                            console.log('  Timeout aguardando popup, tentando estratégias alternativas...');

                            // Estratégia 1: Verificar se o popup já existe na página atual
                            try {
                                console.log('  Verificando se popup está na mesma página...');
                                const currentUrl = currentPage.url();
                                console.log(`  URL atual: ${currentUrl}`);

                                if (currentUrl.includes('accounts.google.com') || currentUrl.includes('google.com')) {
                                    console.log('  Detectado que já estamos na página do Google - popup pode ter sido redirecionamento');
                                    popupFound = true;
                                } else {
                                    // Verificar se existe algum iframe com conteúdo do Google
                                    const frames = currentPage.frames();
                                    console.log(`  Verificando ${frames.length} frames...`);

                                    for (const frame of frames) {
                                        try {
                                            const frameUrl = frame.url();
                                            console.log(`  Frame URL: ${frameUrl}`);
                                            if (frameUrl.includes('accounts.google.com') || frameUrl.includes('google.com')) {
                                                console.log('  Encontrado frame do Google!');
                                                popupFound = true;
                                                break;
                                            }
                                        } catch (frameError) {
                                            console.log(`  Erro ao verificar frame: ${frameError.message}`);
                                        }
                                    }
                                }
                            } catch (strategyError) {
                                console.log(`  Erro na estratégia alternativa: ${strategyError.message}`);
                            }

                            // Estratégia 2: Se ainda não encontrou, tentar qualquer nova página
                            if (!popupFound) {
                                const pages = context.pages();
                                if (pages.length > initialPageCount) {
                                    // Tentar a última página criada
                                    currentPage = pages[pages.length - 1];
                                    currentPage.setDefaultTimeout(0);
                                    currentPage.setDefaultNavigationTimeout(0);
                                    console.log(`  Alternado para última página disponível: ${currentPage.url()}`);
                                    popupFound = true;
                                } else {
                                    // Estratégia 3: Assumir que o popup pode estar bloqueado e continuar na mesma página
                                    console.log('  Popup pode estar bloqueado, continuando na página atual...');
                                    console.log('  AVISO: Popup não detectado - pode ser necessário ajustar as próximas ações');
                                    popupFound = true; // Continuar execução
                                }
                            }
                        }

                        // Log final do estado
                        console.log(`  Página atual final: ${currentPage.url()}`);

                        // Aguardar um pouco para a página estabilizar
                        await new Promise(resolve => setTimeout(resolve, 3000));
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

                // Limpar listener se foi configurado
                if (popupListener) {
                    context.off('page', popupListener);
                    if (pendingPopup) {
                        console.log('  Popup foi detectado antecipadamente para próxima ação');
                    }
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

                        // Capturar screenshot para debug
                        try {
                            const screenshotPath = `/app/debug_error_${i + 1}_${Date.now()}.png`;
                            await currentPage.screenshot({ path: screenshotPath });
                            console.error(`Screenshot de debug salvo em: ${screenshotPath}`);
                        } catch (screenshotError) {
                            console.error('Erro ao capturar screenshot de debug:', screenshotError.message);
                        }
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
