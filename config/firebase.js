// C:\xampp\htdocs\AquaRoute-System-web\config\firebase.js
const admin = require('firebase-admin');
const path = require('path');

// Load service account
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🔥 Firebase Admin initialized');

module.exports = { admin, db };