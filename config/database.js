// C:\xampp\htdocs\AquaRoute-System-web\config\database.js
const sqlite3 = require('sqlite3'); //for calling the sqlite3 module
const { open } = require('sqlite'); //for calling the sqlite module, which provides a promise-based API for SQLite operations
const path = require('path'); //tto use path features
const bcrypt = require('bcrypt');


//for initializing the database 
async function initializeDatabase() {
    const db = await open({
        filename: path.join(__dirname, '../database.sqlite'),
        driver: sqlite3.Database
    });

    // Create admin users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Check if default admin exists, if not create one
    const adminExists = await db.get('SELECT * FROM admin_users WHERE username = ?', ['admin']);
    
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run(
            'INSERT INTO admin_users (username, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin', hashedPassword, 'Admin User', 'super_admin']
        );
        console.log('✅ Default admin created: admin / admin123');
    }

    return db;
}

module.exports = { initializeDatabase };