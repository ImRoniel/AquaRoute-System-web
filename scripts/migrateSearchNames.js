// C:\xampp\htdocs\AquaRoute-System-web\scripts\migrateSearchNames.js
require('dotenv').config({ path: '../.env' }); // Make sure to load the env file as needed
const { db } = require('../config/firebase');

async function migrateSearchNames() {
  console.log('Starting migration to add searchName to all ports...');
  const portsRef = db.collection('ports');
  
  try {
    // using stream to avoid loading 17k documents fully into memory at once
    const snapshotStream = portsRef.stream();
    
    let batch = db.batch();
    let count = 0;
    let totalProcessed = 0;
    
    for await (const doc of snapshotStream) {
      const data = doc.data();
      
      // if already has searchName, we can skip or overwrite. We overwrite to ensure data integrity
      const searchName = (data.name || '').toLowerCase();
      batch.update(doc.ref, { searchName });
      
      count++;
      totalProcessed++;
      
      // Firestore allows max 500 operations per batch
      if (count === 490) {
        await batch.commit();
        console.log(`Processed ${totalProcessed} ports...`);
        count = 0;
        batch = db.batch(); // create a new batch
        
        // short delay to not overwhelm connection/quotas entirely (e.g. 500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // commit any remaining
    if (count > 0) {
      await batch.commit();
      console.log(`Processed final ${totalProcessed} ports. Migration complete.`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateSearchNames().then(() => {
  console.log('Finished script execution.');
  process.exit(0);
});
