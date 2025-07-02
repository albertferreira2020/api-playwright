import express from 'express';
import { ScraperController } from '../controllers/scraperController.js';

const router = express.Router();

router.post('/executar', ScraperController.executeScraper);

export default router;
