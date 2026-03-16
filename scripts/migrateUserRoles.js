// c:\xampp\htdocs\AquaRoute-System-web\scripts\migrateUserRoles.js
const { db, admin } = require('../config/firebase');

async function migrateUsers() {
    console.log('🚀 Starting user migration...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        console.log('📅 No users found to migrate.');
        return;
    }

    let updatedCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        const updates = {};
        let needsUpdate = false;

        // Ensure role exists
        if (!data.role) {
            updates.role = data.userType || 'user';
            needsUpdate = true;
        }

        // Ensure createdAt exists
        if (!data.createdAt) {
            // Use lastLoginAt if available, otherwise now
            if (data.lastLoginAt) {
                updates.createdAt = admin.firestore.Timestamp.fromMillis(data.lastLoginAt);
            } else {
                updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
            }
            needsUpdate = true;
        }

        // Ensure uid corresponds to doc ID
        if (!data.uid || data.uid !== doc.id) {
            updates.uid = doc.id;
            needsUpdate = true;
        }

        if (needsUpdate) {
            batch.update(doc.ref, updates);
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Migration complete. Updated ${updatedCount} users.`);
    } else {
        console.log('✨ No updates needed. All users are consistent.');
    }
}

migrateUsers().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
