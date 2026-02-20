const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // You need to install this: npm install bcrypt

const db = new sqlite3.Database('./database.sqlite');

async function createAdmin() {
    const username = 'admin';
    const password = 'admin123';
    const name = 'System Admin';
    const role = 'super_admin';
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Check if admin exists
    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, row) => {
        if (err) {
            console.error('Error:', err);
            return;
        }
        
        if (row) {
            console.log('Admin already exists:', row);
        } else {
            // Insert admin
            db.run(
                'INSERT INTO admins (username, password, name, role, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
                [username, hashedPassword, name, role],
                function(err) {
                    if (err) {
                        console.error('Error creating admin:', err);
                    } else {
                        console.log('Admin created successfully with ID:', this.lastID);
                        console.log('Username:', username);
                        console.log('Password:', password);
                    }
                }
            );
        }
    });
    
    // Close db after 1 second
    setTimeout(() => db.close(), 1000);
}

createAdmin();