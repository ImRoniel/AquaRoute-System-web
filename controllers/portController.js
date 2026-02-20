// C:\xampp\htdocs\AquaRoute-System-web\controllers\portController.js
const DEBUG = require('../config/debug');

const portController = {
    // Get all ports
    getAllPorts: async (req, res) => {
        DEBUG.log('PORTS', `Loading ports page for user: ${req.session.user.username}`);
        
        try {
            const ports = await req.models.port.getAll();
            res.render('admin/ports', {
                title: 'Port Management - AquaRoute Admin',
                user: req.session.user,
                ports
            });
        } catch (error) {
            DEBUG.error('PORTS', 'Error loading ports', error);
            res.status(500).send('Error loading ports');
        }
    },

    // Add port
    addPort: async (req, res) => {
        DEBUG.log('PORTS', 'Adding new port');
        
        try {
            const { name, lat, lng, type, status, source } = req.body;
            await req.models.port.add({ name, lat, lng, type, status, source });
            res.redirect('/admin/ports');
        } catch (error) {
            DEBUG.error('PORTS', 'Error adding port', error);
            res.status(500).send('Error adding port');
        }
    },

    // Update port
    updatePort: async (req, res) => {
        const portId = req.params.id;
        DEBUG.log('PORTS', `Updating port ${portId}`);
        
        try {
            const { name, lat, lng, type, status, source } = req.body;
            await req.models.port.update(portId, { name, lat, lng, type, status, source });
            res.redirect('/admin/ports');
        } catch (error) {
            DEBUG.error('PORTS', 'Error updating port', error);
            res.status(500).send('Error updating port');
        }
    },

    // Delete port
    deletePort: async (req, res) => {
        const portId = req.params.id;
        DEBUG.log('PORTS', `Deleting port ${portId}`);
        
        try {
            await req.models.port.delete(portId);
            res.redirect('/admin/ports');
        } catch (error) {
            DEBUG.error('PORTS', 'Error deleting port', error);
            res.status(500).send('Error deleting port');
        }
    }
};

module.exports = portController;