import path from 'path';

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    SCREENSHOTS_DIR: path.join(process.cwd(), 'screenshots'),
    BROWSER_TIMEOUT: 0,
    SCREENSHOT_QUALITY: 80,
    MAX_LOOP_ATTEMPTS: 10,
    AUTO_REFRESH_INTERVAL: 30000
};

export const SUPPORTED_IMAGE_FORMATS = ['.png', '.jpg', '.jpeg'];

export const SCREENSHOT_CONFIG = {
    fullPage: true,
    type: 'jpeg',
    quality: CONFIG.SCREENSHOT_QUALITY
};
