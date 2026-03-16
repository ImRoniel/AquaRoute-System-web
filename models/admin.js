// C:\xampp\htdocs\AquaRoute-System-web\models\Admin.js
const bcrypt = require('bcrypt');

class Admin {
    constructor(db) {
        this.db = db;
    }

    async getAll() {
        try {
            return await this.db.all('SELECT id, username, name, role, created_at FROM admin_users ORDER BY created_at DESC');
        } catch (error) {
            console.error('❌ Error fetching all admins:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            return await this.db.get('SELECT id, username, name, role, created_at FROM admin_users WHERE id = ?', [id]);
        } catch (error) {
            console.error('❌ Error fetching admin by id:', error);
            throw error;
        }
    }

    async findByUsername(username) {
        try {
            return await this.db.get(
                'SELECT * FROM admin_users WHERE username = ?',
                [username]
            );
        } catch (error) {
            console.error('❌ Error finding admin:', error);
            throw error;
        }
    }

    async validatePassword(admin, password) {
        try {
            return await bcrypt.compare(password, admin.password);
        } catch (error) {
            console.error('❌ Error validating password:', error);
            throw error;
        }
    }

    async create(data) {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const result = await this.db.run(
                'INSERT INTO admin_users (username, password, name, role) VALUES (?, ?, ?, ?)',
                [data.username, hashedPassword, data.name, data.role || 'admin']
            );
            return { id: result.lastID, ...data };
        } catch (error) {
            console.error('❌ Error creating admin:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            let query = 'UPDATE admin_users SET name = ?, role = ?';
            const params = [data.name, data.role];

            if (data.password) {
                const hashedPassword = await bcrypt.hash(data.password, 10);
                query += ', password = ?';
                params.push(hashedPassword);
            }

            query += ' WHERE id = ?';
            params.push(id);

            await this.db.run(query, params);
            return true;
        } catch (error) {
            console.error('❌ Error updating admin:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await this.db.run('DELETE FROM admin_users WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('❌ Error deleting admin:', error);
            throw error;
        }
    }
}

module.exports = Admin;