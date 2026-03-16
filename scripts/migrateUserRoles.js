// c:\xampp\htdocs\AquaRoute-System-web\scripts\migrateUserRoles.js
const { admin, db } = require('../config/firebase');

async function migrateUsers() {
    console.log('🚀 Starting User Role Migration...');
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.get();

    if (snapshot.empty) {
        console.log('ℹ️ No users found in Firestore.');
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const updates = {};

        // Force role to 'user' for Firestore records (admins go to SQLite)
        if (data.role !== 'user') {
            updates.role = 'user';
            updates.userType = 'user';
        }

        // Fix missing createdAt
        if (!data.createdAt) {
            updates.createdAt = data.lastLoginAt ? 
                admin.firestore.Timestamp.fromMillis(parseInt(data.lastLoginAt)) : 
                admin.firestore.FieldValue.serverTimestamp();
        }

        // Ensure UID is correct
        if (data.uid !== doc.id) {
            updates.uid = doc.id;
        }

        if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Migration complete. Updated ${count} users.`);
    } else {
        console.log('✅ No updates needed.');
    }
}

migrateUsers().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
