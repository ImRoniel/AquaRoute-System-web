const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const ferryController = require('../controllers/ferryController');  
const portController = require('../controllers/portController');

// Import middleware
const { isAuthenticated } = require('../midleware/auth');  // Note: folder is 'midleware' (misspelled)

// ==================== PUBLIC ROUTES ====================

// Home page
router.get('/', (req, res) => {
    res.render('landing/index', {
        title: 'AquaRoute - Maritime Operations Platform',
        user: req.session?.user || null
    });
});

// Auth routes
router.get('/login', authController.showLogin); 
router.post('/login', authController.processLogin);  
router.get('/logout', authController.logout);  

// ==================== PROTECTED ROUTES (HTML pages) ====================

// Dashboard
router.get('/admin/dashboard', isAuthenticated, ferryController.getDashboard);

// Ferries management
router.get('/admin/ferries', isAuthenticated, ferryController.getAllFerries);
router.post('/admin/ferries/add', isAuthenticated, ferryController.addFerry);
router.post('/admin/ferries/:id/update', isAuthenticated, ferryController.updateFerry);
router.post('/admin/ferries/:id/delete', isAuthenticated, ferryController.deleteFerry);

// Ports management (HTML pages)
router.get('/admin/ports', isAuthenticated, portController.getAllPorts);
router.post('/admin/ports/add', isAuthenticated, portController.addPort);
router.post('/admin/ports/:id/update', isAuthenticated, portController.updatePort);
router.post('/admin/ports/:id/delete', isAuthenticated, portController.deletePort);

// Logs
router.get('/admin/logs', isAuthenticated, ferryController.getLogs);

// ==================== API ROUTES (JSON responses) ====================

// Ports API
router.get('/api/ports/search', isAuthenticated, portController.searchPorts);
router.get('/api/ports/load-more', isAuthenticated, portController.loadMorePorts);
router.post('/api/ports/:id/toggle-status', isAuthenticated, portController.togglePortStatus);

// Ferries API (if needed)
// router.get('/api/ferries', isAuthenticated, ferryController.getAllFerriesApi);
// router.post('/api/ferries/:id/toggle-status', isAuthenticated, ferryController.toggleFerryStatus);

module.exports = router;