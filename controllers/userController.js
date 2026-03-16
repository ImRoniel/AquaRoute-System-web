// C:\xampp\htdocs\AquaRoute-System-web\controllers\userController.js
const DEBUG = require('../config/debug');
const bcrypt = require('bcrypt');
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
            const users = await req.db.all(`
                SELECT id, username, name, role, created_at 
                FROM users 
                ORDER BY created_at DESC
            `);
            
            res.render('admin/users', {
                title: 'User Management - AquaRoute Admin',
                user: req.session.user,
                users: users || [],
                currentPage: 'users'  // ← ADD THIS
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
            
            const existing = await req.db.get('SELECT id FROM users WHERE username = ?', [username]);
            if (existing) {
                return res.status(400).send('Username already exists');
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await req.db.run(
                'INSERT INTO users (username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, name, role || 'admin', new Date().toISOString()]
            );
            
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
            
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await req.db.run(
                    'UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?',
                    [name, role, hashedPassword, id]
                );
            } else {
                await req.db.run(
                    'UPDATE users SET name = ?, role = ? WHERE id = ?',
                    [name, role, id]
                );
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
            
            if (parseInt(id) === req.session.user.id) {
                return res.status(400).send('Cannot delete your own account');
            }
            
            await req.db.run('DELETE FROM users WHERE id = ?', [id]);
            
            await logAudit(req.session.user.username, 'DELETE_USER', `Deleted user ID: ${id}`);
            
            res.redirect('/admin/users');
        } catch (error) {
            DEBUG.error('USER CONTROLLER', 'Error deleting user', error);
            res.status(500).send('Error deleting user');
        }
    }
};

module.exports = userController;