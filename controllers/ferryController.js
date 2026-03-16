const DEBUG = require('../config/debug');
const Ferry = require('../models/ferry');
const Log = require('../models/log');
const { db } = require('../config/firebase'); // ✅ Firestore instance

// Helper for audit logs – uses Log model
const logAudit = async (adminName, action, details) => {
    try {
        const logModel = new Log();
        await logModel.add(adminName, action, details);
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
                query: req.query
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

    updateFerry: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        const ferryId = req.params.id;
        try {
            const { name, route, lat, lng, status, eta } = req.body;
            await ferryModel.update(ferryId, { name, route, lat, lng, status, eta });
            
            await logAudit(req.session.user.username, 'UPDATE_FERRY', `Updated ferry ID: ${ferryId}`);
            
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
            
            await logAudit(req.session.user.username, 'DELETE_FERRY', `Deleted ferry ID: ${ferryId}`);
            
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error deleting ferry', error);
            res.status(500).send('Error deleting ferry');
        }
    },


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

            await logAudit(req.session.user.username, 'ADD_FERRY', `Added ferry: ${name}`);

            res.redirect('/admin/ferries?success=Ferry added successfully');
        } catch (error) {
            console.error('Error adding ferry:', error);
            res.redirect('/admin/ferries?error=' + encodeURIComponent('Failed to add ferry: ' + error.message));
        }
    }
};

module.exports = ferryController;