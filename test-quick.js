const { initializeDatabase } = require('./config/database');

async function quickTest() {
    console.log('1. Connecting to database...');
    const db = await initializeDatabase();
    console.log('2. Connected!');
    
    console.log('3. Testing query...');
    const result = await db.get('SELECT * FROM admin_users WHERE username = ?', ['admin']);
    console.log('4. Query result:', result ? 'Found admin' : 'No admin');
    
    process.exit(0);
}

quickTest().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});