// c:\xampp\htdocs\AquaRoute-System-web\models\users.js
const { db, admin } = require('../config/firebase');

class Users {
    constructor() {
        this.collection = db.collection('users');
    }

    /**
     * Get all users ordered by creation date
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getAll(limit = 100) {
        try {
            const snapshot = await this.collection
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            const users = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    id: doc.id, // UID from Auth is typically the document ID
                    username: data.email || data.username,
                    name: data.displayName || data.name,
                    role: data.role || data.userType || 'user',
                    created_at: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
                    ...data
                });
            });
            return users;
        } catch (error) {
            console.error('Error fetching users:', error);
            // If the query fails because of missing index on createdAt, 
            // fallback to unordered fetch for now so the UI doesn't break
            if (error.code === 9) { // FAILED_PRECONDITION (usually missing index)
                const snapshot = await this.collection.limit(limit).get();
                const users = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    users.push({
                        id: doc.id,
                        username: data.email || data.username,
                        name: data.displayName || data.name,
                        role: data.role || data.userType || 'user',
                        created_at: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
                        ...data
                    });
                });
                return users;
            }
            throw error;
        }
    }

    async getById(uid) {
        const doc = await this.collection.doc(uid).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return {
            id: doc.id,
            username: data.email || data.username,
            name: data.displayName || data.name,
            role: data.role || data.userType || 'user',
            created_at: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
            ...data
        };
    }

    /**
     * Create a new user in Firebase Auth and Firestore
     */
    async create(userData) {
        let authUser;
        try {
            // 1. Create in Firebase Auth
            authUser = await admin.auth().createUser({
                email: userData.username, // Using username as email for Auth
                password: userData.password,
                displayName: userData.name,
            });

            // 2. Create in Firestore
            const firestoreData = {
                uid: authUser.uid,
                email: userData.username,
                displayName: userData.name,
                role: userData.role || 'user',
                userType: userData.role || 'user', // backward compat
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                preferences: { darkMode: false, language: 'en', notificationsEnabled: true }
            };

            await this.collection.doc(authUser.uid).set(firestoreData);

            return { id: authUser.uid, ...firestoreData };
        } catch (error) {
            // Cleanup: if Firestore fails, we might want to delete the Auth user
            if (authUser) {
                await admin.auth().deleteUser(authUser.uid).catch(console.error);
            }
            throw error;
        }
    }

    async update(uid, data) {
        try {
            const updateData = {
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            if (data.name) {
                updateData.displayName = data.name;
                updateData.name = data.name;
                // Update Auth display name
                await admin.auth().updateUser(uid, { displayName: data.name });
            }

            if (data.role) {
                updateData.role = data.role;
                updateData.userType = data.role;
            }

            if (data.password) {
                await admin.auth().updateUser(uid, { password: data.password });
            }

            if (data.username) {
                updateData.email = data.username;
                updateData.username = data.username;
                await admin.auth().updateUser(uid, { email: data.username });
            }

            await this.collection.doc(uid).update(updateData);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async delete(uid) {
        try {
            // Delete from Auth
            await admin.auth().deleteUser(uid);
            // Delete from Firestore
            await this.collection.doc(uid).delete();
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

module.exports = new Users();