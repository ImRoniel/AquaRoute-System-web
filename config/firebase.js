// C:\xampp\htdocs\AquaRoute-System-web\config\firebase.js
const admin = require('firebase-admin');

// Check if Firebase is already initialized 
if (!admin.apps.length) {
    try {
        // Try to use environment variables first
        if (process.env.FIREBASE_PROJECT_ID && 
            process.env.FIREBASE_CLIENT_EMAIL && 
            process.env.FIREBASE_PRIVATE_KEY) {
            
                // Use environment variables (SECURE METHOD)
                const serviceAccount = {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                };
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            
            console.log('✅ Firebase Admin initialized with environment variables');
        } else {
            // DEVELOPMENT MODE - Create a mock Firestore
            console.log('⚠️ Running in DEVELOPMENT MODE - Firebase credentials not found');
            console.log('📝 To use real Firebase, add to .env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
            
            // Initialize with empty project for development
            admin.initializeApp({
                projectId: 'demo-aquaroute'
            });
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        // Last resort fallback
        admin.initializeApp({
            projectId: 'demo-aquaroute'
        });
    }
}

const db = admin.firestore();

console.log(' Firebase Admin initialized (mock mode if no credentials)');

module.exports = { admin, db };