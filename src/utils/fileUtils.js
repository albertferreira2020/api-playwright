import fs from 'fs';
import path from 'path';
import { CONFIG, SUPPORTED_IMAGE_FORMATS } from '../config/constants.js';
import { formatFileSize, formatDateTime } from './dateUtils.js';

export const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`  📁 Criando diretório: ${dirPath}`);
    }
};

export const getScreenshotsList = () => {
    if (!fs.existsSync(CONFIG.SCREENSHOTS_DIR)) {
        return [];
    }

    return fs.readdirSync(CONFIG.SCREENSHOTS_DIR)
        .filter(file => SUPPORTED_IMAGE_FORMATS.some(ext => file.endsWith(ext)))
        .map(file => {
            const filePath = path.join(CONFIG.SCREENSHOTS_DIR, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                url: `/screenshots/${file}`,
                size: formatFileSize(stats.size),
                created: formatDateTime(stats.ctime),
                modified: formatDateTime(stats.mtime),
                modifiedTimestamp: stats.mtime.getTime()
            };
        })
        .sort((a, b) => b.modifiedTimestamp - a.modifiedTimestamp);
};

export const deleteAllScreenshots = () => {
    if (!fs.existsSync(CONFIG.SCREENSHOTS_DIR)) {
        return { deleted: 0, total: 0 };
    }

    const files = fs.readdirSync(CONFIG.SCREENSHOTS_DIR)
        .filter(file => SUPPORTED_IMAGE_FORMATS.some(ext => file.endsWith(ext)));

    let deletedCount = 0;
    for (const file of files) {
        try {
            fs.unlinkSync(path.join(CONFIG.SCREENSHOTS_DIR, file));
            deletedCount++;
        } catch (deleteError) {
            console.log(`Erro ao deletar ${file}: ${deleteError.message}`);
        }
    }

    return { deleted: deletedCount, total: files.length };
};

export const getScreenshotsStats = () => {
    const screenshots = getScreenshotsList();
    return {
        count: screenshots.length,
        directoryExists: fs.existsSync(CONFIG.SCREENSHOTS_DIR)
    };
};
