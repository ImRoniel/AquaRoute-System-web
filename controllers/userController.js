const DEBUG = require('../config/debug');
const Users = require('../models/users');
const Admin = require('../models/admin');
const Log = require('../models/log');

// Helper for audit logs
const logAudit = async (adminName, action, details) => {
    try {
        const logModel = new Log();
        await logModel.add(adminName, action, details);
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

const userController = {
    getUsers: async (req, res) => {
        try {
            const adminModel = new Admin(req.db);
            
            // Fetch from both sources
            const [sqliteAdmins, firestoreUsers] = await Promise.all([
                adminModel.getAll(),
                Users.getAll(100)
            ]);

            // Merge and normalize
            // Firestore users are already normalized by the model
            const allUsers = [...sqliteAdmins, ...firestoreUsers];

            // Sort by created_at DESC
            allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            res.render('admin/users', {
                title: 'User Management - AquaRoute Admin',
                user: req.session.user,
                users: allUsers,
                currentPage: 'users'
            });
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error loading users', error);
            res.status(500).render('layouts/error', {
                title: 'Error',
                error: 'Failed to load users',
                user: req.session.user,
                currentPage: 'error'
            });
        }
    },

    addUser: async (req, res) => {
        try {
            const { username, password, name, role } = req.body;
            const adminModel = new Admin(req.db);

            // 1. Email Uniqueness Check across both sources
            const [existingAdmin, existingUser] = await Promise.all([
                adminModel.findByUsername(username),
                Users.findByEmail(username)
            ]);

            if (existingAdmin || existingUser) {
                return res.status(400).send('Email already exists in the system');
            }

            // 2. Branch creation based on role
            if (role === 'admin' || role === 'super_admin') {
                await adminModel.create({ username, password, name, role });
            } else {
                // Regular user: Firebase Auth + Firestore
                await Users.create({ username, password, name });
            }

            await logAudit(req.session.user.username, 'ADD_USER', `Added ${role}: ${username}`);
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error adding user', error);
            res.status(500).send('Error adding user: ' + error.message);
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params; // id is string UID for Firebase, numeric for SQLite
            const { name, role, password, username } = req.body;
            const adminModel = new Admin(req.db);

            // Determine source by checking if id is numeric (SQLite) or string (Firebase UID)
            const isSQLite = /^\d+$/.test(id);

            if (isSQLite) {
                await adminModel.update(id, { name, role, password });
            } else {
                // Firebase user: role is always 'user' (cannot be changed to admin via this path)
                await Users.update(id, { name, password, username });
            }

            await logAudit(req.session.user.username, 'UPDATE_USER', `Updated user ID: ${id}`);
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error updating user', error);
            res.status(500).send('Error updating user');
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            const adminModel = new Admin(req.db);

            if (id == req.session.user.id || id == req.session.user.uid) {
                return res.status(400).send('Cannot delete your own account');
            }

            const isSQLite = /^\d+$/.test(id);

            if (isSQLite) {
                await adminModel.delete(id);
            } else {
                await Users.delete(id);
            }

            await logAudit(req.session.user.username, 'DELETE_USER', `Deleted user ID: ${id}`);
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error deleting user', error);
            res.status(500).send('Error deleting user');
        }
    }
};

module.exports = userController;