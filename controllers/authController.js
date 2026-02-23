const DEBUG = require('../config/debug');
const Admin = require('../models/admin');

const authController = {

  showLogin: (req, res) => {
    if (req.session.user) {
      return res.redirect('/admin/dashboard');
    }

    res.render('auth/login', {
      title: 'Admin Login - AquaRoute',
      error: null
    });
  },

  processLogin: async (req, res) => {
    const { username, password } = req.body;

    try {
      if (!username || !password) {
        return res.render('auth/login', {
          title: 'Admin Login - AquaRoute',
          error: 'Username and password are required'
        });
      }

      // Instantiate model using req.db
      const adminModel = new Admin(req.db);

      const admin = await adminModel.findByUsername(username);

      if (!admin) {
        return res.render('auth/login', {
          title: 'Admin Login - AquaRoute',
          error: 'Invalid username or password'
        });
      }

      const isValid = await adminModel.validatePassword(admin, password);

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

  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
};

module.exports = authController;