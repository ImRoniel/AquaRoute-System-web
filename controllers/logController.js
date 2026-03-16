const DEBUG = require('../config/debug');
const Log = require('../models/log');

const logController = {
    getLogs: async (req, res) => {
        const logModel = new Log();
        try {
            const { start, end } = req.query;
            const startDate = start ? new Date(start) : null;
            const endDate = end ? new Date(end + 'T23:59:59') : null; // include whole end day
            
            // Limit to 100 logs for management page
            const logs = await logModel.getLogs(startDate, endDate, 100);
            
            res.render('admin/auditLogs', {
                title: 'Audit Logs - AquaRoute Admin',
                user: req.session.user,
                logs,
                currentPage: 'logs',
                page: 1, // Defaulting to page 1 as pagination logic is basic in view
                start: start || '',
                end: end || ''
            });
        } catch (error) {
            DEBUG.error('LOGS', 'Error loading logs', error);
            res.status(500).send('Error loading logs: ' + error.message);
        }
    },

    clearLogs: async (req, res) => {
        const logModel = new Log();
        try {
            await logModel.clearAll();
            res.json({ success: true, message: 'Logs cleared successfully' });
        } catch (error) {
            DEBUG.error('LOGS', 'Error clearing logs', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = logController;
