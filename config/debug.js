// C:\xampp\htdocs\AquaRoute-System-web\config\debug.js
const DEBUG = {
    log: (area, message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${area}] ${message}`);
        if (data) console.log(`📊 Data:`, data);
    },
    error: (area, error, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`❌ [${timestamp}] [${area}] ERROR:`, error);
        if (error.stack) console.error('Stack:', error.stack);
        if (data) console.error('Context:', data);
    },
    success: (area, message) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`✅ [${timestamp}] [${area}] ${message}`);
    },
    warn: (area, message) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`⚠️ [${timestamp}] [${area}] ${message}`);
    }
};

module.exports = DEBUG;