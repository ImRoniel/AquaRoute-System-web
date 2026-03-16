const DEBUG = require('../config/debug');
const Ferry = require('../models/ferry');

// Helper for audit logs (since it was missing)
const logAudit = async (db, admin, action, details) => {
    try {
        await db.collection('logs').add({
            admin,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

const ferryController = {
    getDashboard: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        try {
            const stats = await ferryModel.getStats();
            const ferries = await ferryModel.getAllWithCurrentPositions();
            const logs = await ferryModel.getLogs(5);
            res.render('admin/dashboard', {
                title: 'Dashboard - AquaRoute Admin',
                user: req.session.user,
                stats,
                ferries: ferries.slice(0, 5),
                logs,
                currentPage: 'dashboard'
            });
        } catch (error) {
            DEBUG.error('DASHBOARD', 'Error loading dashboard', error);
            res.status(500).render('error', {
                title: 'Error',
                error: 'Failed to load dashboard',
                user: req.session.user,
                currentPage: 'error'
            });
        }
    },

    getAllFerries: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        try {
            const ferries = await ferryModel.getAllWithCurrentPositions();
            res.render('admin/ferries', {
                title: 'Ferry Management - AquaRoute Admin',
                user: req.session.user,
                ferries,
                currentPage: 'ferries',
                query: req.query // pass query params for error/success messages
            });
        } catch (error) {
            DEBUG.error('FERRIES', 'Error loading ferries', error);
            res.render('admin/ferries', {
                title: 'Ferry Management - AquaRoute Admin',
                user: req.session.user,
                ferries: [],
                currentPage: 'ferries',
                error: 'Failed to load ferries',
                query: {}
            });
        }
    },

    // ✅ REMOVED the duplicate addFerry that used ferryModel.add

    updateFerry: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        const ferryId = req.params.id;
        try {
            const { name, route, lat, lng, status, eta } = req.body;
            await ferryModel.update(ferryId, { name, route, lat, lng, status, eta });
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error updating ferry', error);
            res.status(500).send('Error updating ferry');
        }
    },

    deleteFerry: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        const ferryId = req.params.id;
        try {
            await ferryModel.delete(ferryId);
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error deleting ferry', error);
            res.status(500).send('Error deleting ferry');
        }
    },

    getLogs: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        try {
            const logs = await ferryModel.getLogs(50);
            res.render('admin/auditLogs', {
                title: 'Audit Logs - AquaRoute Admin',
                user: req.session.user,
                logs,
                currentPage: 'logs'
            });
        } catch (error) {
            DEBUG.error('LOGS', 'Error loading logs', error);
            res.status(500).send('Error loading logs');
        }
    },

    // Optional – if you still want a separate page (not needed with modal)
    showAddForm: async (req, res) => {
        res.render('admin/add-ferry', {
            title: 'Add New Ferry - AquaRoute Admin',
            user: req.session.user,
            currentPage: 'ferries',
            error: null,
            formData: {}
        });
    },

    addFerry: async (req, res) => {
        try {
            const { name, route, speed_knots, status, eta, pointA_lat, pointA_lng, pointB_lat, pointB_lng, source } = req.body;

            // Basic validation
            if (!name || !route || !pointA_lat || !pointA_lng || !pointB_lat || !pointB_lng) {
                return res.redirect('/admin/ferries?error=' + encodeURIComponent('Name, route, and coordinates are required.'));
            }

            const FerryModel = new (require('../models/ferry'))();

            const newFerry = await FerryModel.create({
                name,
                route,
                speed_knots: parseInt(speed_knots) || 20,
                status: status || 'on_time',
                eta: parseInt(eta) || 60,
                pointA: { lat: parseFloat(pointA_lat), lng: parseFloat(pointA_lng) },
                pointB: { lat: parseFloat(pointB_lat), lng: parseFloat(pointB_lng) },
                source: source || 'manual'
            });

            // Log the action
            await logAudit(req.db, req.session.user.username, 'ADD_FERRY', `Added ferry: ${name}`);

            res.redirect('/admin/ferries?success=Ferry added successfully');
        } catch (error) {
            console.error('Error adding ferry:', error);
            res.redirect('/admin/ferries?error=' + encodeURIComponent('Failed to add ferry: ' + error.message));
        }
    }
};

module.exports = ferryController;