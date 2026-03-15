const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount;

// Try to load the local service account file (for development)
const keyFilePath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(keyFilePath)) {
    try {
        serviceAccount = require(keyFilePath);
        console.log('✅ Using local serviceAccountKey.json');
    } catch (error) {
        console.error('❌ Failed to load local serviceAccountKey.json:', error.message);
    }
}

// If no local file, use environment variables (for production on Render)
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal \n with actual newlines – required for the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
    console.log('✅ Using Firebase environment variables');
}

// If we still don't have credentials, fallback to mock (optional – you can remove this)
if (!serviceAccount) {
    console.warn('⚠️ No Firebase credentials found. Using mock mode.');
    admin.initializeApp({ projectId: 'demo-aquaroute' });
} else {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
module.exports = { admin, db };