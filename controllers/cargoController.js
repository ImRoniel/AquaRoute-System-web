// C:\xampp\htdocs\AquaRoute-System-web\controllers\cargoController.js
const DEBUG = require('../config/debug');
const Cargo = require('../models/cargo');
const Ferry = require('../models/ferry');
const Log = require('../models/log');

// Helper for audit logs – uses Log model
const logAudit = async (adminName, action, details) => {
    try {
        const logModel = new Log();
        await logModel.add(adminName, action, details);
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

const cargoController = {
    // Get all cargo
    getAllCargo: async (req, res) => {
        const cargoModel = new Cargo();
        const ferryModel = new Ferry(req.db);
        
        try {
            const { cargo, lastVisible } = await cargoModel.getAll();
            const ferries = await ferryModel.getAllWithCurrentPositions();
            
            // Map ferry names to cargo for display
            const cargoWithFerryNames = cargo.map(item => {
                const ferry = ferries.find(f => f.id === item.ferryId);
                return {
                    ...item,
                    ferryName: ferry ? ferry.name : 'Unassigned'
                };
            });
            
            // Use optimized stats from model
            const stats = await cargoModel.getStats();
            
            res.render('admin/cargo', {
                title: 'Cargo Tracking - AquaRoute Admin',
                user: req.session.user,
                cargo: cargoWithFerryNames || [],
                ferries: ferries || [],
                stats: stats,
                currentPage: 'cargo' 
            });
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error loading cargo', error);
            res.status(500).render('layouts/error', {
                title: 'Error',
                error: 'Failed to load cargo',
                user: req.session.user
            });
        }
    },

    // Search cargo
    searchCargo: async (req, res) => {
        const cargoModel = new Cargo();
        const ferryModel = new Ferry(req.db);
        
        try {
            const { query } = req.query;
            
            if (!query) {
                return res.redirect('/admin/cargo');
            }
            
            const cargo = await cargoModel.search(query);
            const ferries = await ferryModel.getAllWithCurrentPositions();
            
            // Map ferry names to cargo for display
            const cargoWithFerryNames = cargo.map(item => {
                const ferry = ferries.find(f => f.id === item.ferryId);
                return {
                    ...item,
                    ferryName: ferry ? ferry.name : 'Unassigned'
                };
            });
            
            // For search results, we can calculate stats from the results since it's limited to 50 anyway
            const stats = {
                total: cargo.length,
                inTransit: cargo.filter(c => c.status === 'in_transit' || c.status === 'IN_TRANSIT').length,
                pending: cargo.filter(c => c.status === 'pending' || c.status === 'PENDING').length,
                delivered: cargo.filter(c => c.status === 'delivered' || c.status === 'DELIVERED').length
            };
            
            res.render('admin/cargo', {
                title: 'Search Results - AquaRoute Admin',
                user: req.session.user,
                cargo: cargoWithFerryNames || [],
                ferries: ferries || [],
                stats: stats,
                searchQuery: query,
                currentPage: 'cargo' 
            });
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error searching cargo', error);
            res.status(500).render('layouts/error', {
                title: 'Error',
                error: 'Failed to search cargo',
                user: req.session.user
            });
        }
    },

    // Get cargo by reference (for tracking)
    trackCargo: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const { reference } = req.params;
            const cargo = await cargoModel.getByReference(reference);
            
            if (!cargo) {
                return res.status(404).render('layouts/error', {
                    title: 'Not Found',
                    error: 'Cargo not found',
                    user: req.session.user
                });
            }

            // Fetch ferry details if assigned
            if (cargo.ferryId) {
                const ferryModel = new Ferry(req.db);
                const ferry = await ferryModel.getById(cargo.ferryId);
                if (ferry) {
                    cargo.ferryName = ferry.name;
                }
            }
            
            res.render('admin/track-cargo', {
                title: 'Track Cargo - AquaRoute Admin',
                user: req.session.user,
                cargo,
                currentPage: 'cargo'
            });
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error tracking cargo', error);
            res.status(500).render('layouts/error', {
                title: 'Error',
                error: 'Failed to track cargo',
                user: req.session.user
            });
        }
    },

    // Add new cargo
    addCargo: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const { description, weight, ferryId, status } = req.body;
            
            let sanitizedStatus = (status || 'PENDING').toString().toUpperCase();
            console.log("Sanitized cargo status to:", sanitizedStatus);
            
            const newCargo = await cargoModel.create({
                description,
                weight,
                ferryId: ferryId || null,
                status: sanitizedStatus,
                createdBy: req.session.user.username
            });
            
            // Log the action
            await logAudit(req.session.user.username, 'ADD_CARGO', 
                `Added cargo: ${newCargo.reference} - ${description}`);
            
            res.redirect('/admin/cargo');
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error adding cargo', error);
            res.status(500).send('Error adding cargo');
        }
    },

    // Update cargo
    updateCargo: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const { id } = req.params;
            const { description, weight, ferryId, status } = req.body;
            
            let sanitizedStatus = status ? status.toString().toUpperCase() : undefined;
            if (sanitizedStatus) console.log("Sanitized cargo status to:", sanitizedStatus);
            
            // Get existing cargo to keep reference for searchName
            const existingCargo = await cargoModel.getById(id);
            const reference = existingCargo ? existingCargo.reference : '';

            await cargoModel.update(id, {
                description,
                weight,
                ferryId: ferryId || null,
                status: sanitizedStatus,
                reference
            });
            
            // Log the action
            await logAudit(req.session.user.username, 'UPDATE_CARGO', 
                `Updated cargo ID: ${id}`);
            
            res.redirect('/admin/cargo');
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error updating cargo', error);
            res.status(500).send('Error updating cargo');
        }
    },

    // Delete cargo
    deleteCargo: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const { id } = req.params;
            
            await cargoModel.delete(id);
            
            // Log the action
            await logAudit(req.session.user.username, 'DELETE_CARGO', 
                `Deleted cargo ID: ${id}`);
            
            res.redirect('/admin/cargo');
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error deleting cargo', error);
            res.status(500).send('Error deleting cargo');
        }
    },

    // Update cargo status (API endpoint)
    updateStatus: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            let sanitizedStatus = status ? status.toString().toUpperCase() : 'PENDING';
            console.log("Sanitized cargo status to:", sanitizedStatus);
            
            await cargoModel.updateStatus(id, sanitizedStatus);
            
            // Log the action
            await logAudit(req.session.user.username, 'UPDATE_CARGO_STATUS', 
                `Updated status for cargo ${id} to ${status}`);
            
            res.json({ 
                success: true, 
                message: 'Status updated successfully' 
            });
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error updating status', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    },

    // Get cargo stats (API endpoint)
    getStats: async (req, res) => {
        const cargoModel = new Cargo();
        
        try {
            const stats = await cargoModel.getStats();
            
            res.json({ 
                success: true, 
                stats 
            });
        } catch (error) {
            DEBUG.error('CARGO CONTROLLER', 'Error getting stats', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
};

// getAllCargo, searchCargo, trackCargo, addCargo, updateCargo, deleteCargo, updateStatus, getStats


module.exports = cargoController;