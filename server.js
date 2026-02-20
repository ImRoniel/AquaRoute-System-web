// C:\xampp\htdocs\AquaRoute-System-web\server.js
// ==================== REQUIRED MODULES ====================
const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== DEBUGGING UTILITY ====================
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

// ==================== DATABASE CONNECTION (Like PHP's db_connect.php) ====================
const { initializeDatabase } = require('./config/database');
let db = null; // Global database connection like PHP's $conn

// ==================== MODELS (Like PHP Models) ====================
const Admin = require('./models/Admin'); 
const Ferry = require('./models/ferry');
const Port = require('./models/port');

// Model instances (like PHP's model objects)
let adminModel = null;
let ferryModel = null;
let portModel = null;

// ==================== MIDDLEWARE ====================
DEBUG.log('SETUP', 'Configuring middleware...');

// Body parsing (like PHP's $_POST)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
DEBUG.success('SETUP', 'Body parser configured');

// Static files (like PHP's public folder)
app.use(express.static(path.join(__dirname, 'assets')));
DEBUG.success('SETUP', 'Static files configured');

// Session configuration (like PHP's $_SESSION)
app.use(session({
    secret: process.env.SESSION_SECRET || 'aquaroute-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));
DEBUG.success('SETUP', 'Session configured');

// View engine setup (EJS like PHP)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
DEBUG.success('SETUP', 'View engine configured');

// ==================== DATABASE INITIALIZATION (Like PHP's global $conn) ====================
async function initDatabase() {
    try {
        DEBUG.log('DATABASE', 'Initializing database connection...');
        db = await initializeDatabase();
        DEBUG.success('DATABASE', 'Database connected successfully');
        
        // Initialize models with database connection (like PHP's new Model($conn))
        DEBUG.log('MODELS', 'Initializing models...');
        adminModel = new Admin(db);
        ferryModel = new Ferry();
        portModel = new Port();
        DEBUG.success('MODELS', 'All models initialized');
        
        // Verify admin exists (like PHP's checking if record exists)
        const adminCheck = await db.get('SELECT * FROM admin_users WHERE username = ?', ['admin']);
        if (adminCheck) {
            DEBUG.success('DATABASE', 'Default admin found in database');
        } else {
            DEBUG.warn('DATABASE', 'Default admin not found, creating...');
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.run(
                'INSERT INTO admin_users (username, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'Admin User', 'super_admin']
            );
            DEBUG.success('DATABASE', 'Default admin created: admin / admin123');
        }
        
        return true;
    } catch (error) {
        DEBUG.error('DATABASE', 'Failed to initialize database', error);
        return false;
    }
}

// ==================== MIDDLEWARE TO ATTACH MODELS TO REQUEST (Like PHP's global variables) ====================
app.use(async (req, res, next) => {
    try {
        DEBUG.log('REQUEST', `${req.method} ${req.url}`);
        
        // Initialize database if not already done (like PHP's include db_connect.php)
        if (!db) {
            DEBUG.log('DATABASE', 'Database not initialized, initializing now...');
            const initialized = await initDatabase();
            if (!initialized) {
                throw new Error('Failed to initialize database');
            }
        }
        
        // Attach models to request (like PHP's global $model variables)
        req.models = {
            admin: adminModel,
            ferry: ferryModel,
            port: portModel
        };
        
        // Also attach individual models for backward compatibility
        req.adminModel = adminModel;
        req.ferryModel = ferryModel;
        req.portModel = portModel;
        
        // Make user available to all views (like PHP's $_SESSION['user'] in every page)
        res.locals.user = req.session?.user || null;
        res.locals.appName = 'AquaRoute';
        res.locals.currentYear = new Date().getFullYear();
        
        DEBUG.log('REQUEST', `User: ${req.session?.user ? req.session.user.username : 'Not logged in'}`);
        next();
        
    } catch (error) {
        DEBUG.error('MIDDLEWARE', 'Middleware error', error);
        res.status(500).render('error', {
            title: 'System Error',
            error: 'Failed to initialize application',
            user: null
        });
    }
});

// ==================== ROUTES (Like PHP's routing) ====================

// Home/Landing page (Like PHP's index.php)
app.get('/', (req, res) => {
    DEBUG.log('ROUTE', 'Accessing landing page');
    res.render('landing/index', { 
        title: 'AquaRoute - Maritime Operations Platform',
        user: req.session?.user || null
    });
});

// Login page (Like PHP's login.php)
app.get('/login', (req, res) => {
    DEBUG.log('ROUTE', 'Accessing login page');
    if (req.session.user) {
        DEBUG.log('LOGIN', 'User already logged in, redirecting to dashboard');
        return res.redirect('/admin/dashboard');
    }
    res.render('auth/login', { 
        title: 'Admin Login - AquaRoute', 
        error: null 
    });
});

// Login handler (Like PHP's login POST handler)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    DEBUG.log('LOGIN', `Login attempt from IP: ${clientIp}`, { username });
    
    try {
        // Validate input (like PHP's validation)
        if (!username || !password) {
            DEBUG.warn('LOGIN', 'Missing username or password');
            return res.render('auth/login', {
                title: 'Admin Login - AquaRoute',
                error: 'Username and password are required'
            });
        }
        
        // Check if models are available (like PHP's require_once check)
        if (!req.models || !req.models.admin) {
            DEBUG.error('LOGIN', 'Admin model not available');
            return res.render('auth/login', {
                title: 'Admin Login - AquaRoute',
                error: 'System error. Please try again.'
            });
        }
        
        // Find admin by username (like PHP's $admin = $adminModel->findByUsername($username))
        DEBUG.log('LOGIN', 'Querying database for username:', username);
        const admin = await req.models.admin.findByUsername(username);
        
        if (!admin) {
            DEBUG.warn('LOGIN', `Username not found: ${username}`);
            return res.render('auth/login', {
                title: 'Admin Login - AquaRoute',
                error: 'Invalid username or password'
            });
        }
        
        DEBUG.log('LOGIN', 'Admin found', { 
            id: admin.id, 
            username: admin.username,
            name: admin.name,
            role: admin.role 
        });
        
        // Validate password (like PHP's password_verify)
        DEBUG.log('LOGIN', 'Validating password...');
        const isValid = await req.models.admin.validatePassword(admin, password);
        
        if (!isValid) {
            DEBUG.warn('LOGIN', `Invalid password for user: ${username}`);
            return res.render('auth/login', {
                title: 'Admin Login - AquaRoute',
                error: 'Invalid username or password'
            });
        }
        
        // Set session (like PHP's $_SESSION['user'] = $admin)
        DEBUG.log('LOGIN', 'Password valid, setting session...');
        req.session.user = {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role || 'admin'
        };
        
        // Save session explicitly (like PHP's session_write_close)
        req.session.save((err) => {
            if (err) {
                DEBUG.error('LOGIN', 'Failed to save session', err);
                return res.render('auth/login', {
                    title: 'Admin Login - AquaRoute',
                    error: 'Session error. Please try again.'
                });
            }
            
            DEBUG.success('LOGIN', `User ${username} logged in successfully`);
            DEBUG.log('LOGIN', `Redirecting to dashboard...`);
            res.redirect('/admin/dashboard');
        });
        
    } catch (error) {
        DEBUG.error('LOGIN', 'Unexpected error during login', error);
        res.render('auth/login', {
            title: 'Admin Login - AquaRoute',
            error: 'An unexpected error occurred. Please try again.'
        });
    }
});

// Logout handler (Like PHP's logout.php)
app.get('/logout', (req, res) => {
    const username = req.session?.user?.username || 'Unknown';
    DEBUG.log('LOGOUT', `User ${username} logging out`);
    
    req.session.destroy((err) => {
        if (err) {
            DEBUG.error('LOGOUT', 'Error destroying session', err);
        }
        DEBUG.success('LOGOUT', 'Logout successful');
        res.redirect('/');
    });
});

// ==================== AUTHENTICATION MIDDLEWARE (Like PHP's auth check) ====================
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        DEBUG.log('AUTH', `Authenticated user: ${req.session.user.username}`);
        return next();
    }
    
    DEBUG.warn('AUTH', `Unauthorized access attempt to: ${req.url}`);
    res.redirect('/login');
};


// ==================== IMPORT WEB ROUTES ====================
const webRoutes = require('./routes/web');
app.use('/', webRoutes);  // This comes AFTER direct routes
// // ==================== ADMIN ROUTES (Like PHP's admin folder) ====================

// // Dashboard (Like PHP's admin/dashboard.php)
// app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
//     DEBUG.log('DASHBOARD', `Loading dashboard for user: ${req.session.user.username}`);
    
//     try {
//         // Check if models exist (like PHP's include check)
//         if (!req.models.ferry) {
//             throw new Error('Ferry model not available');
//         }
        
//         // Get data from models (like PHP's $ferryModel->getStats())
//         DEBUG.log('DASHBOARD', 'Fetching stats...');
//         const stats = await req.models.ferry.getStats();
        
//         DEBUG.log('DASHBOARD', 'Fetching ferries...');
//         const ferries = await req.models.ferry.getAllWithCurrentPositions();
        
//         DEBUG.log('DASHBOARD', 'Fetching logs...');
//         const logs = await req.models.ferry.getLogs(5);
        
//         DEBUG.success('DASHBOARD', 'Dashboard data loaded successfully', {
//             totalFerries: stats.total,
//             onTime: stats.onTime,
//             delayed: stats.delayed,
//             suspended: stats.suspended
//         });
        
//         res.render('admin/dashboard', {
//             title: 'Dashboard - AquaRoute Admin',
//             user: req.session.user,
//             stats,
//             ferries: ferries.slice(0, 5),
//             logs
//         });
        
//     } catch (error) {
//         DEBUG.error('DASHBOARD', 'Error loading dashboard', error);
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load dashboard. Please try again.',
//             user: req.session.user
//         });
//     }
// });

// // Ferries management (Like PHP's admin/ferries.php)
// app.get('/admin/ferries', isAuthenticated, async (req, res) => {
//     DEBUG.log('FERRIES', `Loading ferries page for user: ${req.session.user.username}`);
    
//     try {
//         const ferries = await req.models.ferry.getAllWithCurrentPositions();
//         DEBUG.success('FERRIES', `Loaded ${ferries.length} ferries`);
        
//         res.render('admin/ferries', {
//             title: 'Ferry Management - AquaRoute Admin',
//             user: req.session.user,
//             ferries
//         });
//     } catch (error) {
//         DEBUG.error('FERRIES', 'Error loading ferries', error);
//         res.status(500).send('Error loading ferries');
//     }
// });

// // Ports management (Like PHP's admin/ports.php)
// app.get('/admin/ports', isAuthenticated, async (req, res) => {
//     DEBUG.log('PORTS', `Loading ports page for user: ${req.session.user.username}`);
    
//     try {
//         const ports = await req.models.port.getAll();
//         DEBUG.success('PORTS', `Loaded ${ports.length} ports`);
        
//         res.render('admin/ports', {
//             title: 'Port Management - AquaRoute Admin',
//             user: req.session.user,
//             ports
//         });
//     } catch (error) {
//         DEBUG.error('PORTS', 'Error loading ports', error);
//         res.status(500).send('Error loading ports');
//     }
// });

// // Logs page (Like PHP's admin/logs.php)
// app.get('/admin/logs', isAuthenticated, async (req, res) => {
//     DEBUG.log('LOGS', `Loading logs page for user: ${req.session.user.username}`);
    
//     try {
//         const logs = await req.models.ferry.getLogs(50);
//         DEBUG.success('LOGS', `Loaded ${logs.length} logs`);
        
//         res.render('admin/logs', {
//             title: 'Audit Logs - AquaRoute Admin',
//             user: req.session.user,
//             logs
//         });
//     } catch (error) {
//         DEBUG.error('LOGS', 'Error loading logs', error);
//         res.status(500).send('Error loading logs');
//     }
// });

// ==================== API ROUTES (Like PHP's API endpoints) ====================

// Get all ferries (JSON)
app.get('/api/ferries', async (req, res) => {
    DEBUG.log('API', 'Fetching all ferries via API');
    
    try {
        const ferries = await req.models.ferry.getAllWithCurrentPositions();
        DEBUG.success('API', `Returned ${ferries.length} ferries via API`);
        res.json(ferries);
    } catch (error) {
        DEBUG.error('API', 'Error fetching ferries', error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle ferry status (Like PHP's AJAX handler)
app.post('/api/ferries/:id/toggle-status', isAuthenticated, async (req, res) => {
    const ferryId = req.params.id;
    const username = req.session.user.username;
    
    DEBUG.log('API', `User ${username} toggling status for ferry ${ferryId}`);
    
    try {
        const ferry = await req.models.ferry.getById(ferryId);
        if (!ferry) {
            DEBUG.warn('API', `Ferry not found: ${ferryId}`);
            return res.status(404).json({ error: 'Ferry not found' });
        }
        
        // Cycle through statuses
        let newStatus;
        if (ferry.status === 'on_time') newStatus = 'delayed';
        else if (ferry.status === 'delayed') newStatus = 'suspended';
        else newStatus = 'on_time';
        
        DEBUG.log('API', `Changing status from ${ferry.status} to ${newStatus}`);
        
        const updated = await req.models.ferry.updateStatus(ferryId, newStatus);
        await req.models.ferry.addLog('Status Update', `${updated.name} -> ${newStatus}`, username);
        
        DEBUG.success('API', `Ferry ${ferryId} status updated to ${newStatus}`);
        res.json({ success: true, ferry: updated, newStatus });
        
    } catch (error) {
        DEBUG.error('API', 'Error toggling ferry status', error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle port status
app.post('/api/ports/:id/toggle-status', isAuthenticated, async (req, res) => {
    const portId = req.params.id;
    const username = req.session.user.username;
    
    DEBUG.log('API', `User ${username} toggling status for port ${portId}`);
    
    try {
        const port = await req.models.port.getById(portId);
        if (!port) {
            DEBUG.warn('API', `Port not found: ${portId}`);
            return res.status(404).json({ error: 'Port not found' });
        }
        
        // Cycle through statuses
        let newStatus;
        if (port.status === 'open') newStatus = 'limited';
        else if (port.status === 'limited') newStatus = 'closed';
        else newStatus = 'open';
        
        DEBUG.log('API', `Changing port status from ${port.status} to ${newStatus}`);
        
        const updated = await req.models.port.updateStatus(portId, newStatus);
        
        DEBUG.success('API', `Port ${portId} status updated to ${newStatus}`);
        res.json({ success: true, port: updated, newStatus });
        
    } catch (error) {
        DEBUG.error('API', 'Error toggling port status', error);
        res.status(500).json({ error: error.message });
    }
});

// Get logs API
app.get('/api/logs', isAuthenticated, async (req, res) => {
    DEBUG.log('API', 'Fetching logs via API');
    
    try {
        const logs = await req.models.ferry.getLogs(50);
        res.json(logs);
    } catch (error) {
        DEBUG.error('API', 'Error fetching logs', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 404 HANDLER (Like PHP's 404 page) ====================
app.use((req, res) => {
    DEBUG.warn('404', `Page not found: ${req.url}`);
    res.status(404).render('landing/index', { 
        title: 'Page Not Found - AquaRoute',
        error: 'The page you are looking for does not exist.',
        user: req.session?.user || null
    });
});

// ==================== ERROR HANDLER (Like PHP's try-catch) ====================
app.use((err, req, res, next) => {
    DEBUG.error('SERVER', 'Unhandled error', err);
    res.status(500).render('error', {
        title: 'Server Error',
        error: 'Something went wrong. Please try again later.',
        user: req.session?.user || null
    });
});

// ==================== START SERVER (Like Apache starting) ====================
async function startServer() {
    try {
        // Initialize database before starting server
        DEBUG.log('SERVER', 'Initializing application...');
        const dbInitialized = await initDatabase();
        
        if (!dbInitialized) {
            throw new Error('Failed to initialize database');
        }
        
        app.listen(PORT, () => {
            DEBUG.success('SERVER', `🚀 AquaRoute System Started on port ${PORT}`);
            console.log(`
    ====================================
    🌐 Landing:    http://localhost:${PORT}
    🔐 Login:      http://localhost:${PORT}/login
    📊 Dashboard:  http://localhost:${PORT}/admin/dashboard
    ====================================
    `);
        });
        
    } catch (error) {
        DEBUG.error('SERVER', 'Failed to start server', error);
        process.exit(1);
    }
}

// Start the server
startServer();