// C:\xampp\htdocs\AquaRoute-System-web\controllers\ferryController.js
const DEBUG = require('../config/debug');

const ferryController = {
    // Dashboard page
    getDashboard: async (req, res) => {
        DEBUG.log('DASHBOARD', `Loading dashboard for user: ${req.session.user.username}`);
        
        try {
            // Get data from models
            DEBUG.log('DASHBOARD', 'Fetching stats...');
            const stats = await req.models.ferry.getStats();
            
            DEBUG.log('DASHBOARD', 'Fetching ferries...');
            const ferries = await req.models.ferry.getAllWithCurrentPositions();
            
            DEBUG.log('DASHBOARD', 'Fetching logs...');
            const logs = await req.models.ferry.getLogs(5);
            
            res.render('admin/dashboard', {
                title: 'Dashboard - AquaRoute Admin',
                user: req.session.user,
                stats,
                ferries: ferries.slice(0, 5),
                logs
            });
        } catch (error) {
            DEBUG.error('DASHBOARD', 'Error loading dashboard', error);
            res.status(500).render('error', {
                title: 'Error',
                error: 'Failed to load dashboard',
                user: req.session.user
            });
        }
    },

    // Get all ferries
    getAllFerries: async (req, res) => {
        DEBUG.log('FERRIES', `Loading ferries page for user: ${req.session.user.username}`);
        
        try {
            const ferries = await req.models.ferry.getAllWithCurrentPositions();
            res.render('admin/ferries', {
                title: 'Ferry Management - AquaRoute Admin',
                user: req.session.user,
                ferries
            });
        } catch (error) {
            DEBUG.error('FERRIES', 'Error loading ferries', error);
            res.status(500).send('Error loading ferries');
        }
    },

    // Add ferry
    addFerry: async (req, res) => {
        DEBUG.log('FERRIES', 'Adding new ferry');
        
        try {
            const { name, route, lat, lng, status, eta } = req.body;
            await req.models.ferry.add({ name, route, lat, lng, status, eta });
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error adding ferry', error);
            res.status(500).send('Error adding ferry');
        }
    },

    // Update ferry
    updateFerry: async (req, res) => {
        const ferryId = req.params.id;
        DEBUG.log('FERRIES', `Updating ferry ${ferryId}`);
        
        try {
            const { name, route, lat, lng, status, eta } = req.body;
            await req.models.ferry.update(ferryId, { name, route, lat, lng, status, eta });
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error updating ferry', error);
            res.status(500).send('Error updating ferry');
        }
    },

    // Delete ferry
    deleteFerry: async (req, res) => {
        const ferryId = req.params.id;
        DEBUG.log('FERRIES', `Deleting ferry ${ferryId}`);
        
        try {
            await req.models.ferry.delete(ferryId);
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error deleting ferry', error);
            res.status(500).send('Error deleting ferry');
        }
    },

    // Get logs
    getLogs: async (req, res) => {
        DEBUG.log('LOGS', `Loading logs page for user: ${req.session.user.username}`);
        
        try {
            const logs = await req.models.ferry.getLogs(50);
            res.render('admin/logs', {
                title: 'Audit Logs - AquaRoute Admin',
                user: req.session.user,
                logs
            });
        } catch (error) {
            DEBUG.error('LOGS', 'Error loading logs', error);
            res.status(500).send('Error loading logs');
        }
    }
};

module.exports = ferryController;