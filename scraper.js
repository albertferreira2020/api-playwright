import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

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
                await page.waitForSelector(selector, { timeout: 10000, state: 'visible' }); // Aumentado para 10 segundos
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
                await page.waitForSelector(selector, { timeout: 10000, state: 'visible' }); // Aumentado para 10 segundos
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
                await page.waitForSelector(selector, { timeout: 10000, state: 'visible' }); // Aumentado para 10 segundos
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
        await page.waitForLoadState('networkidle', { timeout: 30000 }); // Aumentado para 30 segundos
        console.log('    Rede estabilizada');
    } catch (error) {
        console.log('    Timeout aguardando rede estabilizar, continuando...');
    }

    // Aguardar um tempo adicional para JavaScript dinâmico
    await new Promise(resolve => setTimeout(resolve, 8000)); // Aumentado para 8 segundos
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

const captureDebugScreenshot = async (page, stepName, attempt = null) => {
    try {
        if (page.isClosed()) {
            console.log(`  ⚠️ Página fechada, pulando screenshot: ${stepName}`);
            return null;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const attemptSuffix = attempt ? `_tentativa_${attempt}` : '';
        const filename = `debug_${stepName}${attemptSuffix}_${timestamp}.jpg`;
        const screenshotPath = `/app/screenshots/${filename}`;

        console.log(`  📸 Iniciando captura de screenshot: ${filename}`);

        // Garantir que o diretório existe
        const screenshotDir = path.dirname(screenshotPath);
        if (!fs.existsSync(screenshotDir)) {
            console.log(`  📁 Criando diretório: ${screenshotDir}`);
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

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
            fullPage: true,
            type: 'jpeg',
            quality: 80
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
            '--disable-ipc-flooding-protection',
            // Parâmetros para contornar bloqueios por IP e detecção
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor,VizServiceDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-networking',
            '--disable-background-media-downloading',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-sync',
            '--disable-translate',
            '--disable-field-trial-config',
            '--disable-checking-optimization-guide-machine-learning-hints',
            '--disable-optimization-guide-model-downloading',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--use-mock-keychain',
            '--disable-accelerated-2d-canvas',
            '--disable-accelerated-jpeg-decoding',
            '--disable-accelerated-mjpeg-decode',
            '--disable-accelerated-video-decode',
            '--disable-accelerated-video-encode',
            '--disable-app-list-dismiss-on-blur',
            '--disable-audio-output',
            '--disable-breakpad',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--disable-gl-extensions',
            '--disable-histogram-customizer',
            '--disable-in-process-stack-traces',
            '--disable-logging',
            '--disable-partial-raster',
            '--disable-threaded-animation',
            '--disable-threaded-scrolling',
            '--disable-checker-imaging',
            '--disable-new-content-rendering-timeout',
            '--disable-hosted-app-shim-creation',
            '--disable-add-to-shelf',
            '--disable-datasaver-prompt',
            '--disable-desktop-notifications',
            '--disable-device-discovery-notifications',
            '--disable-dinosaur-easter-egg',
            '--disable-extensions',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-password-generation',
            '--disable-permissions-api',
            '--disable-plugins',
            '--disable-print-preview',
            '--disable-speech-api',
            '--hide-scrollbars',
            '--mute-audio',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--lang=pt-BR',
            '--accept-lang=pt-BR,pt;q=0.9,en;q=0.8',
            // Configurações específicas para evitar detecção de bot
            '--disable-automation',
            '--disable-features=VizDisplayCompositor',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-save-password-bubble',
            '--disable-translate',
            '--disable-web-security',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--ignore-certificate-errors-spki-list',
            '--ignore-ssl-errors-spki-list'
        ]
    });
    console.log('Navegador iniciado');

    const context = await browser.newContext({
        timeout: 0, // Remove timeout do context
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'pt-BR',
        ignoreHTTPSErrors: true,
        // Configuração de geolocalização para Belo Horizonte, MG
        geolocation: {
            latitude: -19.9167,
            longitude: -43.9345
        },
        permissions: ['geolocation'],
        // Headers adicionais para mascarar automação
        extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-GPC': '1'
        },
        // Configurações adicionais para mascarar automação
        javaScriptEnabled: true,
        acceptDownloads: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        forcedColors: 'none',
        strictSelectors: false
    });
    const page = await context.newPage();

    // Remove timeout de navegação e ações
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    // Mascarar indicadores de automação
    await page.addInitScript(() => {
        // Remove a propriedade webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Sobrescrever o Chrome runtime
        // eslint-disable-next-line no-undef
        window.chrome = {
            runtime: {},
        };

        // Mascarar outras propriedades de detecção
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['pt-BR', 'pt', 'en'],
        });

        // Mascarar dimensões de tela
        // eslint-disable-next-line no-undef
        Object.defineProperty(screen, 'width', {
            get: () => 1920,
        });
        // eslint-disable-next-line no-undef
        Object.defineProperty(screen, 'height', {
            get: () => 1080,
        });

        // Remover indicadores de headless
        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 0,
        });

        // Adicionar timezone brasileiro
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            value: function () {
                return {
                    ...this.constructor.prototype.resolvedOptions.call(this),
                    timeZone: 'America/Sao_Paulo'
                };
            }
        });

        // Simular conexão de internet real
        Object.defineProperty(navigator, 'connection', {
            get: () => ({
                effectiveType: '4g',
                downlink: 10,
                rtt: 50,
                saveData: false
            }),
        });

        // Configurar fuso horário
        try {
            Object.defineProperty(Date.prototype, 'getTimezoneOffset', {
                value: () => 180 // UTC-3 (Brasília)
            });
        } catch (e) {
            // Ignorar erros de configuração de timezone
            console.log('Erro ao configurar timezone:', e);
        }
    });

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
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // NOVA VERIFICAÇÃO: Aguardar estabilização da página antes de executar ação
                try {
                    const currentUrl = currentPage.url();
                    console.log(`  URL atual antes da ação: ${currentUrl}`);

                    // Se estamos numa página do Google, aguardar carregamento extra
                    if (currentUrl.includes('accounts.google.com')) {
                        console.log('  Detectado Google - aguardando estabilização extra...');
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        // Verificar se a página mudou durante a espera
                        const newUrl = currentPage.url();
                        if (newUrl !== currentUrl) {
                            console.log(`  URL mudou durante espera: ${currentUrl} -> ${newUrl}`);
                            // Aguardar mais um pouco para a nova página estabilizar
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }
                    }
                } catch (urlError) {
                    console.log(`  Erro ao verificar URL: ${urlError.message}`);
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
                    await new Promise(resolve => setTimeout(resolve, 12000)); // Aumentado para 12 segundos

                    // Aguardar especificamente por páginas do Google
                    const currentUrl = currentPage.url();
                    if (currentUrl.includes('accounts.google.com')) {
                        console.log('  Detectado popup do Google - aguardando carregamento específico...');
                        await waitForGoogleAccountSelection(currentPage);
                    }

                    // Se a próxima ação é um clique, verificar se o elemento já está disponível
                    if (action.type === 'click') {
                        console.log('  Verificando se elemento estará disponível após popup...');
                        try {
                            await currentPage.waitForSelector(`xpath=${action.xpath}`, {
                                timeout: 20000, // Aumentado para 20 segundos
                                state: 'visible'
                            });
                            console.log('  Elemento já detectado e visível');
                        } catch (elementError) {
                            console.log('  Elemento ainda não visível, continuando com tentativas...');

                            // Screenshot para debug quando elemento não é encontrado
                            await captureDebugScreenshot(currentPage, `elemento_nao_encontrado_apos_popup_acao_${i + 1}`);
                        }
                    }
                }

                switch (action.type) {
                    case 'goto':
                        console.log(`  Navegando para: ${action.url}`);

                        // Screenshot antes da navegação
                        await captureDebugScreenshot(currentPage, `pre_goto_acao_${i + 1}`);

                        await currentPage.goto(action.url, { waitUntil: 'networkidle' });
                        console.log('  Navegação concluída');

                        // Screenshot após a navegação
                        await captureDebugScreenshot(currentPage, `pos_goto_acao_${i + 1}`);

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

                        // Screenshot antes de qualquer tentativa de clique
                        await captureDebugScreenshot(currentPage, `pre_click_acao_${i + 1}`);

                        // NOVA VERIFICAÇÃO: Se estamos numa página do Google, aguardar possíveis redirecionamentos
                        const initialUrl = currentPage.url();
                        if (initialUrl.includes('accounts.google.com')) {
                            console.log('  Detectado Google - verificando estabilidade da página...');

                            // Aguardar possíveis redirecionamentos automáticos
                            let urlStable = false;
                            let attempts = 0;
                            const maxAttempts = 10;

                            while (!urlStable && attempts < maxAttempts) {
                                const currentUrl = currentPage.url();
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                const newUrl = currentPage.url();

                                if (currentUrl === newUrl) {
                                    urlStable = true;
                                    console.log(`  URL estabilizada: ${newUrl}`);
                                } else {
                                    console.log(`  URL mudou: ${currentUrl} -> ${newUrl}`);
                                    attempts++;
                                }
                            }

                            if (!urlStable) {
                                console.log('  URL não estabilizou, continuando mesmo assim...');
                            }

                            // Screenshot após verificação de estabilidade
                            await captureDebugScreenshot(currentPage, `pos_stability_check_acao_${i + 1}`);
                        }

                        let clickSuccess = false;
                        let attempts = 3;

                        while (attempts > 0 && !clickSuccess) {
                            try {
                                console.log(`  Tentativa ${4 - attempts}/3 de clique`);

                                // Screenshot da tentativa atual
                                await captureDebugScreenshot(currentPage, `click_acao_${i + 1}`, 4 - attempts);

                                // Aguardar um pouco antes de tentar localizar o elemento
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // Aguardar que o elemento esteja disponível na página
                                console.log(`  Aguardando elemento ficar disponível...`);

                                // Se estamos no Google, aguardar indicadores específicos
                                if (currentPage.url().includes('accounts.google.com')) {
                                    console.log('  Detectado Google Accounts, aguardando carregamento específico...');
                                    await waitForGoogleAccountSelection(currentPage);

                                    // Screenshot após aguardar o Google
                                    await captureDebugScreenshot(currentPage, `pos_google_wait_acao_${i + 1}`, 4 - attempts);

                                    // NOVA LÓGICA: Verificar se devemos pular para estratégia de login
                                    const currentUrl = currentPage.url();
                                    const isLoginPage = currentUrl.includes('signin/identifier') || currentUrl.includes('signin/v2/identifier');

                                    if (isLoginPage && action.xpath.includes('data-email')) {
                                        console.log('  DETECTADO: Página de login + ação de seleção de conta');
                                        console.log('  APLICANDO ESTRATÉGIA DE LOGIN AUTOMATICAMENTE...');

                                        // Screenshot antes do login automático
                                        await captureDebugScreenshot(currentPage, `pre_auto_login_acao_${i + 1}`, 4 - attempts);

                                        try {
                                            const emailInput = await currentPage.locator('input[type="email"], #identifierId').first();
                                            if (await emailInput.count() > 0) {
                                                console.log('  Preenchendo campo de email no login...');
                                                await emailInput.fill('albert.ferreira@itlean.com.br');

                                                // Screenshot após preencher email
                                                await captureDebugScreenshot(currentPage, `pos_fill_email_acao_${i + 1}`, 4 - attempts);

                                                // Aguardar um pouco
                                                await new Promise(resolve => setTimeout(resolve, 1000));

                                                // Procurar botão "Próximo" ou "Continuar"
                                                const nextButton = await currentPage.locator('button:has-text("Próximo"), button:has-text("Next"), button:has-text("Continuar"), button[id*="next"], button[id*="Next"], [jsname="LgbsSe"], button[type="submit"], #identifierNext, [data-primary="true"]').first();
                                                if (await nextButton.count() > 0) {
                                                    console.log('  Clicando no botão Próximo...');

                                                    // Screenshot antes de clicar no botão
                                                    await captureDebugScreenshot(currentPage, `pre_click_next_acao_${i + 1}`, 4 - attempts);

                                                    await nextButton.click();
                                                    clickSuccess = true;

                                                    console.log('  Login executado com sucesso via estratégia automática!');

                                                    // Screenshot após clicar no botão
                                                    await captureDebugScreenshot(currentPage, `pos_click_next_acao_${i + 1}`, 4 - attempts);

                                                    // Aguardar navegação
                                                    await new Promise(resolve => setTimeout(resolve, 5000));

                                                    // Screenshot após aguardar navegação
                                                    await captureDebugScreenshot(currentPage, `pos_navigation_acao_${i + 1}`, 4 - attempts);

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

                                                            // Screenshot da nova página ativa
                                                            await captureDebugScreenshot(currentPage, `nova_pagina_ativa_acao_${i + 1}`, 4 - attempts);
                                                        }
                                                    }

                                                    // IMPORTANTE: Sair do loop de tentativas já que o login foi bem-sucedido
                                                    attempts = 0; // Força a saída do while loop
                                                } else {
                                                    console.log('  Botão Próximo não encontrado');
                                                    // Screenshot quando botão não é encontrado
                                                    await captureDebugScreenshot(currentPage, `botao_nao_encontrado_acao_${i + 1}`, 4 - attempts);
                                                }
                                            } else {
                                                console.log('  Campo de email não encontrado');
                                                // Screenshot quando campo de email não é encontrado
                                                await captureDebugScreenshot(currentPage, `campo_email_nao_encontrado_acao_${i + 1}`, 4 - attempts);
                                            }
                                        } catch (autoLoginError) {
                                            console.log(`  Erro na estratégia automática de login: ${autoLoginError.message}`);
                                            console.log('  Continuando com método tradicional...');
                                            // Screenshot do erro no login automático
                                            await captureDebugScreenshot(currentPage, `erro_auto_login_acao_${i + 1}`, 4 - attempts);
                                        }
                                    }
                                }

                                // Se o login automático funcionou, pular para verificação pós-clique
                                if (clickSuccess) {
                                    console.log('  Pulando waitForSelector - login já executado');
                                } else {
                                    // Método tradicional - aguardar o elemento
                                    // Screenshot antes de aguardar seletor
                                    await captureDebugScreenshot(currentPage, `pre_wait_selector_acao_${i + 1}`, 4 - attempts);

                                    await currentPage.waitForSelector(`xpath=${action.xpath}`, {
                                        timeout: 45000, // Aumentado para 45 segundos
                                        state: 'visible'
                                    });

                                    // Screenshot após encontrar elemento
                                    await captureDebugScreenshot(currentPage, `pos_wait_selector_acao_${i + 1}`, 4 - attempts);
                                }

                                // Aguardar um pouco mais para garantir que o elemento é clicável
                                if (!clickSuccess) {
                                    await new Promise(resolve => setTimeout(resolve, 1000));

                                    // Screenshot antes do clique tradicional
                                    await captureDebugScreenshot(currentPage, `pre_traditional_click_acao_${i + 1}`, 4 - attempts);

                                    // Tentar clicar apenas se ainda não foi clicado
                                    await currentPage.click(`xpath=${action.xpath}`, { timeout: 10000 });
                                    console.log('  Clique executado com sucesso');
                                    clickSuccess = true;

                                    // Screenshot após clique tradicional
                                    await captureDebugScreenshot(currentPage, `pos_traditional_click_acao_${i + 1}`, 4 - attempts);
                                }

                                // Aguardar um pouco após o clique para possível carregamento
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // Screenshot final da tentativa
                                await captureDebugScreenshot(currentPage, `final_click_attempt_acao_${i + 1}`, 4 - attempts);

                                // Verificar se a página ainda está ativa após o clique
                                if (currentPage.isClosed()) {
                                    console.log('  Página foi fechada após o clique, tentando encontrar página ativa...');
                                    const availablePages = context.pages().filter(p => !p.isClosed());
                                    if (availablePages.length > 0) {
                                        currentPage = availablePages[availablePages.length - 1]; // Última página ativa
                                        currentPage.setDefaultTimeout(0);
                                        currentPage.setDefaultNavigationTimeout(0);
                                        console.log('  Alternado para página ativa');

                                        // Screenshot da página ativa após clique
                                        await captureDebugScreenshot(currentPage, `pagina_ativa_pos_click_acao_${i + 1}`, 4 - attempts);
                                    } else {
                                        throw new Error('Nenhuma página disponível após clique');
                                    }
                                }

                            } catch (clickError) {
                                attempts--;
                                console.log(`  Erro no clique (tentativas restantes: ${attempts}): ${clickError.message}`);

                                // Screenshot do erro
                                await captureDebugScreenshot(currentPage, `erro_click_acao_${i + 1}`, 4 - attempts);

                                if (attempts > 0) {
                                    console.log(`  Aguardando 3 segundos antes da próxima tentativa...`);
                                    await new Promise(resolve => setTimeout(resolve, 3000));

                                    // Tentar recarregar a página se necessário
                                    try {
                                        await currentPage.reload({ waitUntil: 'networkidle' });
                                        console.log(`  Página recarregada para nova tentativa`);
                                        await new Promise(resolve => setTimeout(resolve, 2000));

                                        // Screenshot após reload
                                        await captureDebugScreenshot(currentPage, `pos_reload_acao_${i + 1}`, 4 - attempts);
                                    } catch (reloadError) {
                                        console.log(`  Erro ao recarregar página: ${reloadError.message}`);
                                    }
                                } else {
                                    // Última tentativa com método alternativo
                                    console.log(`  Última tentativa com método alternativo...`);

                                    // Screenshot antes da última tentativa
                                    await captureDebugScreenshot(currentPage, `pre_last_attempt_acao_${i + 1}`);

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
                                            console.log('  Email não encontrado nos elementos da página');                                        // Capturar screenshot para debug
                                            try {
                                                await captureDebugScreenshot(currentPage, `debug_estrutura_pagina_acao_${i + 1}`);
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

                        // Screenshot antes de digitar
                        await captureDebugScreenshot(currentPage, `pre_type_acao_${i + 1}`);

                        try {
                            await currentPage.fill(`xpath=${action.xpath}`, action.value || '', { timeout: 10000 });
                            console.log('  Texto digitado');
                        } catch (typeError) {
                            console.log(`  Tentando localizar campo primeiro...`);
                            const element = await currentPage.locator(`xpath=${action.xpath}`).first();
                            if (await element.count() === 0) {
                                // Screenshot quando elemento não é encontrado
                                await captureDebugScreenshot(currentPage, `elemento_nao_encontrado_type_acao_${i + 1}`);
                                throw new Error(`Campo não encontrado: ${action.xpath}`);
                            }
                            await element.fill(action.value || '');
                            console.log('  Texto digitado (segunda tentativa)');
                        }

                        // Screenshot após digitar
                        await captureDebugScreenshot(currentPage, `pos_type_acao_${i + 1}`);
                        break;

                    case 'wait':
                        console.log(`  Aguardando ${action.seconds || 1} segundos...`);

                        // Screenshot antes da espera
                        await captureDebugScreenshot(currentPage, `pre_wait_acao_${i + 1}`);

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

                        // Screenshot após a espera
                        await captureDebugScreenshot(currentPage, `pos_wait_acao_${i + 1}`);
                        break;

                    case 'switchToPopup': {
                        console.log('  Alternando para popup/nova aba...');

                        // Screenshot antes de tentar trocar para popup
                        await captureDebugScreenshot(currentPage, `pre_switch_popup_acao_${i + 1}`);

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

                                // Screenshot do popup detectado
                                await captureDebugScreenshot(currentPage, `popup_detectado_acao_${i + 1}`);

                                // Aguardar carregamento adicional específico para Google
                                console.log('  Aguardando carregamento completo da página do Google...');
                                await new Promise(resolve => setTimeout(resolve, 5000));

                                // Screenshot após aguardar carregamento
                                await captureDebugScreenshot(currentPage, `popup_carregado_acao_${i + 1}`);

                                // Verificar se a página está realmente carregada
                                try {
                                    await currentPage.waitForLoadState('networkidle', { timeout: 15000 });
                                    console.log('  Rede estabilizada no popup');
                                } catch (networkError) {
                                    console.log('  Timeout na rede, mas continuando...');
                                }

                                // Screenshot final do popup
                                await captureDebugScreenshot(currentPage, `popup_final_acao_${i + 1}`);

                                break;
                            } catch (error) {
                                console.log(`  Erro ao usar popup detectado: ${error.message}`);
                                // Screenshot do erro
                                await captureDebugScreenshot(currentPage, `erro_popup_detectado_acao_${i + 1}`);
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

                        // Aguardar mais tempo para a página estabilizar, especialmente páginas do Google
                        const finalUrl = currentPage.url();
                        if (finalUrl.includes('accounts.google.com')) {
                            console.log('  Detectado Google - aguardando estabilização adicional...');
                            await new Promise(resolve => setTimeout(resolve, 8000)); // 8 segundos para Google

                            // Aguardar especificamente por elementos do Google
                            try {
                                await waitForGoogleAccountSelection(currentPage);
                            } catch (googleWaitError) {
                                console.log(`  Erro ao aguardar Google: ${googleWaitError.message}`);
                            }
                        } else {
                            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos para outras páginas
                        }

                        // Screenshot final após estabilização
                        await captureDebugScreenshot(currentPage, `popup_estabilizado_acao_${i + 1}`);
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

                // Screenshot do erro
                try {
                    await captureDebugScreenshot(currentPage, `erro_acao_${i + 1}_${action.type}`);
                } catch (screenshotError) {
                    console.log(`  Erro ao capturar screenshot do erro: ${screenshotError.message}`);
                }

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

        // Screenshot final de sucesso
        await captureDebugScreenshot(currentPage, 'final_sucesso');

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
