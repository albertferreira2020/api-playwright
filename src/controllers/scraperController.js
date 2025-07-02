import { ScraperService } from '../services/scraperService.js';

export class ScraperController {
    static async executeScraper(req, res) {
        const { url, actions } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log('NOVA REQUISIÇÃO RECEBIDA');
        console.log('='.repeat(60));
        console.log(`URL: ${url}`);
        console.log(`Número de ações: ${actions ? actions.length : 0}`);
        console.log('Timestamp:', new Date().toLocaleString('pt-BR'));

        if (!url || !Array.isArray(actions)) {
            console.log('Parâmetros inválidos!');
            return res
                .status(400)
                .json({ error: "Parâmetros inválidos. Envie { url, actions[] }" });
        }

        try {
            const result = await ScraperService.executeScraper({ url, actions });
            console.log('\nREQUISIÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('='.repeat(60));
            res.json(result);
        } catch (err) {
            console.log('\nERRO NA EXECUÇÃO!');
            console.log('Erro:', err.message);
            console.log('='.repeat(60));
            res
                .status(500)
                .json({
                    error: "Erro ao executar scraping",
                    details: err.message,
                    screenshots: err.screenshots || []
                });
        }
    }
}
