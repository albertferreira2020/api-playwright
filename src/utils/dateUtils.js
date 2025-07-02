export const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // yyyy-mm-dd
};

export const formatTimestamp = () => {
    return new Date().toISOString().replace(/[:.]/g, '-');
};

export const formatFileSize = (bytes) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const formatDateTime = (date) => {
    return date.toLocaleString('pt-BR');
};

export const sleep = (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};
