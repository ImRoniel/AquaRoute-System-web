// C:\xampp\htdocs\AquaRoute-System-web\routes\web.js
const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const ferryController = require('../controllers/ferryController');  
const portController = require('../controllers/portController');
const cargoController = require('../controllers/cargoController'); // Add this
const userController = require('../controllers/userController');
const logController = require('../controllers/logController');
const { refreshWeatherForPorts } = require('../services/weatherService');
const { refreshFerriesFromOverpass } = require('../services/ferryService');

// Import middleware
const { isAuthenticated } = require('../midleware/auth');  


// Add this right after your imports
console.log('=== CARGO CONTROLLER DEBUG ===');
console.log('getAllCargo:', typeof cargoController.getAllCargo);
console.log('searchCargo:', typeof cargoController.searchCargo);
console.log('trackCargo:', typeof cargoController.trackCargo);
console.log('addCargo:', typeof cargoController.addCargo);
console.log('updateCargo:', typeof cargoController.updateCargo);
console.log('deleteCargo:', typeof cargoController.deleteCargo);
console.log('updateStatus:', typeof cargoController.updateStatus);
console.log('getStats:', typeof cargoController.getStats);
console.log('==============================');
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
router.get('/admin/ferries/add', isAuthenticated, ferryController.showAddForm); // Add this route for the add ferry form
router.post('/admin/ferries/:id/update', isAuthenticated, ferryController.updateFerry);
router.post('/admin/ferries/:id/delete', isAuthenticated, ferryController.deleteFerry);

// Ports management (HTML pages)
router.get('/admin/ports', isAuthenticated, portController.getAllPorts);
router.post('/admin/ports/add', isAuthenticated, portController.addPort);
router.post('/admin/ports/:id/update', isAuthenticated, portController.updatePort);
router.post('/admin/ports/:id/delete', isAuthenticated, portController.deletePort);

// CARGO ROUTES - Add these
router.get('/admin/cargo', isAuthenticated, cargoController.getAllCargo);
router.get('/admin/cargo/search', isAuthenticated, cargoController.searchCargo);
router.get('/admin/cargo/track/:reference', isAuthenticated, cargoController.trackCargo);
router.post('/admin/cargo/add', isAuthenticated, cargoController.addCargo);
router.post('/admin/cargo/:id/update', isAuthenticated, cargoController.updateCargo);
router.post('/admin/cargo/:id/delete', isAuthenticated, cargoController.deleteCargo);

// Users management
router.get('/admin/users', isAuthenticated, userController.getUsers);
router.post('/admin/users/add', isAuthenticated, userController.addUser);
router.post('/admin/users/:id/update', isAuthenticated, userController.updateUser);
router.post('/admin/users/:id/delete', isAuthenticated, userController.deleteUser);

// Logs
router.get('/admin/logs', isAuthenticated, logController.getLogs);
router.post('/api/admin/logs/clear', isAuthenticated, logController.clearLogs);

// ==================== API ROUTES (JSON responses) ====================

// Ports API
router.get('/api/ports/search', isAuthenticated, portController.searchPorts);
router.get('/api/ports/load-more', isAuthenticated, portController.loadMorePorts);
router.post('/api/ports/:id/toggle-status', isAuthenticated, portController.togglePortStatus);

// Cargo API - Add these
router.post('/api/cargo/:id/status', isAuthenticated, cargoController.updateStatus);
router.get('/api/cargo/stats', isAuthenticated, cargoController.getStats);

// Weather API
router.post('/weather/refresh', async (req, res) => {
  const { portIds } = req.body;
  if (!Array.isArray(portIds)) {
    return res.status(400).json({ error: 'portIds must be an array' });
  }
  const result = await refreshWeatherForPorts(portIds);
  res.json(result);
});

// Ferry refresh API
router.post('/api/ferries/refresh', async (req, res) => {
  try {
    const result = await refreshFerriesFromOverpass();
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Ferry refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/test', (req, res) => {
    res.json({ message: 'Router is working' });
});



// i addeed this to test if the router is working without needing to go through the controllers
module.exports = router;