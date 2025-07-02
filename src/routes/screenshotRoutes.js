import express from 'express';
import { ScreenshotController } from '../controllers/screenshotController.js';
import { debugDashboardHTML } from '../views/debugDashboard.js';

const router = express.Router();

router.get('/screenshots', ScreenshotController.listScreenshots);
router.get('/screenshots/:filename', ScreenshotController.getScreenshot);
router.delete('/screenshots', ScreenshotController.deleteScreenshots);
router.get('/health', ScreenshotController.healthCheck);

router.get('/debug', (req, res) => {
    res.send(debugDashboardHTML);
});

export default router;
