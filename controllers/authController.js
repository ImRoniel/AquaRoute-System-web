// C:\xampp\htdocs\AquaRoute-System-web\controllers\authController.js
const DEBUG = require('../config/debug');
const Admin = require('../models/admin');
const axios = require('axios');
const Users = require('../models/users');

// Firebase Web API Key for Auth REST API 
// (Found in app.js - used for server-side password verification for regular users)
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyBeWjRz4WZJiJMVWfw2HKznC-A8lyOsZ_Q";

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

      // 1. Try SQLite Admin Login First
      const adminModel = new Admin(req.db);
      const adminRecord = await adminModel.findByUsername(username);

      if (adminRecord) {
        const isValid = await adminModel.validatePassword(adminRecord, password);
        if (isValid) {
          req.session.user = {
            id: adminRecord.id,
            username: adminRecord.username,
            name: adminRecord.name,
            role: adminRecord.role || 'admin'
          };
          return req.session.save(() => {
            res.redirect('/admin/dashboard');
          });
        }
      }

      // 2. Try Firebase Auth Login (for regular users)
      try {
        const firebaseResponse = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
          {
            email: username,
            password: password,
            returnSecureToken: true
          }
        );

        if (firebaseResponse.data && firebaseResponse.data.localId) {
          const uid = firebaseResponse.data.localId;
          
          // Verify user exists in Firestore and get their details
          const firestoreUser = await Users.getById(uid);
          
          if (firestoreUser) {
            req.session.user = {
              id: uid,
              uid: uid,
              username: firestoreUser.username || firestoreUser.email,
              name: firestoreUser.name || firestoreUser.displayName,
              role: firestoreUser.role || 'user'
            };
            return req.session.save(() => {
              res.redirect('/admin/dashboard');
            });
          }
        }
      } catch (firebaseError) {
        // If Firebase auth fails or user not in Firestore, fall through to error
        DEBUG.error('FIREBASE AUTH', 'Firebase login attempt failed for ' + username);
      }

      // If we reach here, both methods failed
      return res.render('auth/login', {
        title: 'Admin Login - AquaRoute',
        error: 'Invalid username or password'
      });

    } catch (error) {
      DEBUG.error('LOGIN', 'Login error', error);
      res.render('auth/login', {
        title: 'Admin Login - AquaRoute',
        error: 'Login failed: ' + error.message
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