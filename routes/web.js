//C:\xampp\htdocs\AquaRoute-System-web\routes\web.js
const express = require('express');
const router = express.Router();

// Import controllers - MAKE SURE THESE PATHS ARE CORRECT
const authController = require('../controllers/authController');
const ferryController = require('../controllers/ferryController');  // Fix spelling: ferryContoller.js → ferryController.js
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
router.get('/login', authController.showLogin);  // Make sure this function exists
router.post('/login', authController.processLogin);  // Make sure this function exists
router.get('/logout', authController.logout);  // Make sure this function exists

// ==================== PROTECTED ROUTES ====================

// Dashboard
router.get('/admin/dashboard', isAuthenticated, ferryController.getDashboard);

// Ferries management
router.get('/admin/ferries', isAuthenticated, ferryController.getAllFerries);
router.post('/admin/ferries/add', isAuthenticated, ferryController.addFerry);
router.post('/admin/ferries/:id/update', isAuthenticated, ferryController.updateFerry);
router.post('/admin/ferries/:id/delete', isAuthenticated, ferryController.deleteFerry);

// Ports management
router.get('/admin/ports', isAuthenticated, portController.getAllPorts);
router.post('/admin/ports/add', isAuthenticated, portController.addPort);
router.post('/admin/ports/:id/update', isAuthenticated, portController.updatePort);
router.post('/admin/ports/:id/delete', isAuthenticated, portController.deletePort);

// Logs
router.get('/admin/logs', isAuthenticated, ferryController.getLogs);

module.exports = router;