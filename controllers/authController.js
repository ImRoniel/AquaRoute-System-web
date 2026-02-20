// C:\xampp\htdocs\AquaRoute-System-web\controllers\authController.js
const DEBUG = require('../config/debug');

const authController = {
    // Show login page
    showLogin: (req, res) => {
        if (req.session.user) {
            return res.redirect('/admin/dashboard');
        }
        res.render('auth/login', {
            title: 'Admin Login - AquaRoute',
            error: null
        });
    },

    // Process login
    processLogin: async (req, res) => {
        const { username, password } = req.body;
        
        try {
            // Your actual login logic from server.js
            if (!username || !password) {
                return res.render('auth/login', {
                    title: 'Admin Login - AquaRoute',
                    error: 'Username and password are required'
                });
            }

            const admin = await req.models.admin.findByUsername(username);
            
            if (!admin) {
                return res.render('auth/login', {
                    title: 'Admin Login - AquaRoute',
                    error: 'Invalid username or password'
                });
            }

            const isValid = await req.models.admin.validatePassword(admin, password);
            
            if (!isValid) {
                return res.render('auth/login', {
                    title: 'Admin Login - AquaRoute',
                    error: 'Invalid username or password'
                });
            }

            req.session.user = {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role || 'admin'
            };

            req.session.save(() => {
                res.redirect('/admin/dashboard');
            });

        } catch (error) {
            DEBUG.error('LOGIN', 'Login error', error);
            res.render('auth/login', {
                title: 'Admin Login - AquaRoute',
                error: 'Login failed'
            });
        }
    },

    // Logout
    logout: (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    }
};

module.exports = authController;