const admin = require("firebase-admin");
const fs = require("fs");

console.log("🚀 Script started");

// Load service account
const serviceAccount = require("./serviceAccountKey.json");
console.log("✅ Service account loaded");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
console.log("✅ Firebase Admin initialized");

const db = admin.firestore();

// Load cleaned ports data
const ports = JSON.parse(fs.readFileSync("ports_clean.json", "utf-8"));
console.log(`📦 Loaded ${ports.length} ports from JSON`);

async function seedPorts() {
  console.log("🛠 Seeding started");

  const batch = db.batch();

  ports.forEach((port, index) => {
    const docRef = db.collection("ports").doc();
    batch.set(docRef, {
      name: port.name,
      lat: port.lat,
      lng: port.lng,
      type: port.type,
      status: port.status,
      source: port.source,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  console.log("📤 Committing batch...");
  await batch.commit();

  console.log(`✅ Successfully seeded ${ports.length} ports`);
}

seedPorts()
  .then(() => console.log("🎉 Script finished"))
  .catch(err => {
    console.error("❌ ERROR during seeding:");
    console.error(err);
  });
