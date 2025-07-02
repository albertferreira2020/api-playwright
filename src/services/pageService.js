import { CONFIG } from '../config/constants.js';
import { sleep } from '../utils/dateUtils.js';

export class PageService {
    static async waitForSeconds(page, seconds) {
        // Verificar se a página ainda está ativa antes de executar o wait
        if (page.isClosed()) {
            throw new Error('Página foi fechada durante a operação de espera');
        }
        await page.waitForTimeout(seconds * 1000);
    }

    static async ensureActivePage(context, currentPage) {
        if (!currentPage.isClosed()) {
            return currentPage;
        }

        console.log('  Página atual foi fechada, procurando página ativa...');
        const availablePages = context.pages().filter(p => !p.isClosed());

        if (availablePages.length === 0) {
            throw new Error('Nenhuma página ativa disponível');
        }

        const newPage = availablePages[availablePages.length - 1];
        this.configurePageTimeouts(newPage);
        console.log('  Alternado para página ativa');
        return newPage;
    }

    static configurePageTimeouts(page) {
        page.setDefaultTimeout(CONFIG.BROWSER_TIMEOUT);
        page.setDefaultNavigationTimeout(CONFIG.BROWSER_TIMEOUT);
    }

    static async handlePageNavigation(page, context) {
        // Aguardar carregamento completo após navegação
        await sleep(2);

        // Verificar se a página ainda está ativa após navegação
        if (page.isClosed()) {
            console.log('  Página foi fechada após navegação, tentando encontrar página ativa...');
            const availablePages = context.pages().filter(p => !p.isClosed());
            if (availablePages.length > 0) {
                const newPage = availablePages[availablePages.length - 1];
                this.configurePageTimeouts(newPage);
                console.log('  Alternado para página ativa');
                return newPage;
            } else {
                throw new Error('Nenhuma página disponível após navegação');
            }
        }
        return page;
    }

    static async handlePageClick(page, context) {
        // Aguardar um pouco após o clique para possível carregamento
        await sleep(1);

        // Verificar se a página ainda está ativa após o clique
        if (page.isClosed()) {
            console.log('  Página foi fechada após o clique, tentando encontrar página ativa...');
            const availablePages = context.pages().filter(p => !p.isClosed());
            if (availablePages.length > 0) {
                const newPage = availablePages[availablePages.length - 1];
                this.configurePageTimeouts(newPage);
                console.log('  Alternado para página ativa');
                return newPage;
            } else {
                throw new Error('Nenhuma página disponível após clique');
            }
        }
        return page;
    }
}
