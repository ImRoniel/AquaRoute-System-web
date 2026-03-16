// scripts/migrateCargoSearchNames.js
const { db } = require('../config/firebase');

async function migrateCargo() {
  const collection = db.collection('cargo');
  const snapshot = await collection.get();
  
  console.log(`Starting migration for ${snapshot.size} cargo items...`);
  
  let count = 0;
  let batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.searchName) {
      const searchName = `${(data.reference || '').toLowerCase()} ${(data.description || '').toLowerCase()}`;
      batch.update(doc.ref, { searchName });
      count++;
    }
    
    if (count % 400 === 0 && count > 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Migrated ${count} items...`);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migration complete. Total cargo updated: ${count}`);
  process.exit(0);
}

migrateCargo().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
