// C:\xampp\htdocs\AquaRoute-System-web\models\Admin.js
const bcrypt = require('bcrypt');

class Admin {
    constructor(db) {
        this.db = db;
    }

    async findByUsername(username) {
        try {
            console.log(`🔍 Looking for admin: ${username}`);
            const admin = await this.db.get(
                'SELECT * FROM admin_users WHERE username = ?',
                [username]
            );
            console.log(`📊 Found admin:`, admin);
            return admin;
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
}

module.exports = Admin;