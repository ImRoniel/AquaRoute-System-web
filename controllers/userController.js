const DEBUG = require('../config/debug');
const Users = require('../models/users');
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

const userController = {
    getUsers: async (req, res) => {
        try {
            const usersList = await Users.getAll(100);
            
            res.render('admin/users', {
                title: 'User Management - AquaRoute Admin',
                user: req.session.user,
                users: usersList || [],
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
            
            // Check if user already exists in auth (optional, create will throw if email taken)
            
            await Users.create({
                username,
                password,
                name,
                role: role || 'user'
            });
            
            await logAudit(req.session.user.username, 'ADD_USER', `Added user: ${username}`);
            
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error adding user', error);
            res.status(500).send('Error adding user');
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, role, password } = req.body;
            
            await Users.update(id, { name, role, password });
            
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
            
            // Note: Firebase UID is a string, but the check still applies
            if (id === req.session.user.id || id === req.session.user.uid) {
                return res.status(400).send('Cannot delete your own account');
            }
            
            await Users.delete(id);
            
            await logAudit(req.session.user.username, 'DELETE_USER', `Deleted user ID: ${id}`);
            
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error deleting user', error);
            res.status(500).send('Error deleting user');
        }
    }
};

module.exports = userController;