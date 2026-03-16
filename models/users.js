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
                    id: doc.id,
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
        try {
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
        } catch (error) {
            console.error('Error fetching user by id:', error);
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            const snapshot = await this.collection.where('email', '==', email).limit(1).get();
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            const data = doc.data();
            return { id: doc.id, ...data };
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Create a new user in Firebase Auth and Firestore
     */
    async create(userData) {
        let authUser;
        try {
            // 1. Create in Firebase Auth
            authUser = await admin.auth().createUser({
                email: userData.username,
                password: userData.password,
                displayName: userData.name,
            });

            // 2. Create in Firestore
            const firestoreData = {
                uid: authUser.uid,
                email: userData.username,
                displayName: userData.name,
                role: 'user', // For regular users only
                userType: 'user',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                preferences: { darkMode: false, language: 'en', notificationsEnabled: true }
            };

            await this.collection.doc(authUser.uid).set(firestoreData);
            return { id: authUser.uid, ...firestoreData };
        } catch (error) {
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

            const authUpdates = {};

            if (data.name) {
                updateData.displayName = data.name;
                updateData.name = data.name;
                authUpdates.displayName = data.name;
            }

            if (data.username) {
                updateData.email = data.username;
                updateData.username = data.username;
                authUpdates.email = data.username;
            }

            if (data.password) {
                authUpdates.password = data.password;
            }

            // Update Auth if needed
            if (Object.keys(authUpdates).length > 0) {
                await admin.auth().updateUser(uid, authUpdates);
            }

            // Update Firestore
            await this.collection.doc(uid).update(updateData);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async delete(uid) {
        try {
            await admin.auth().deleteUser(uid);
            await this.collection.doc(uid).delete();
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

module.exports = new Users();
