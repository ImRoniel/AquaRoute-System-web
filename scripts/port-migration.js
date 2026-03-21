/**
 * scripts/port-migration.js
 *
 * Adds a `search_name` field (lowercase of `name`) to every document in the
 * `ports` collection. Uses streaming + batch writes (≤ 490 ops per batch) so
 * 17,000+ documents are processed without OOM or quota issues.
 *
 * USAGE:
 *   node scripts/port-migration.js
 *
 * SWITCHING PROJECTS:
 *   Copy the target project's service account key to config/serviceAccountKey.json,
 *   or pass the filename as an argument:
 *
 *   node scripts/port-migration.js serviceAccountKey-88a37.json
 *   node scripts/port-migration.js serviceAccountKey-485505.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin   = require('firebase-admin');
const fs      = require('fs');
const path    = require('path');

// ── Service-account resolution ────────────────────────────────────────────────
// Accepts an optional CLI arg so you can target different projects without
// editing this file: node scripts/port-migration.js serviceAccountKey-88a37.json
const keyArg      = process.argv[2];
const keyFilename = keyArg || 'serviceAccountKey.json';
const keyFilePath = path.join(__dirname, '../config', keyFilename);

if (!fs.existsSync(keyFilePath)) {
  console.error(`❌  Service account key not found: ${keyFilePath}`);
  console.error('    Ensure the file exists in config/ or pass the filename as an argument.');
  process.exit(1);
}

const serviceAccount = require(keyFilePath);
const projectId      = serviceAccount.project_id || '(unknown)';

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Migration ─────────────────────────────────────────────────────────────────
const COLLECTION  = 'ports';
const BATCH_LIMIT = 490;   // Firestore max is 500; stay under to be safe

async function runPortMigration() {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  PORT SEARCH_NAME MIGRATION');
  console.log(`  Project  : ${projectId}`);
  console.log(`  Key file : ${keyFilename}`);
  console.log('══════════════════════════════════════════════');
  console.log('');

  const portsRef     = db.collection(COLLECTION);
  const stream       = portsRef.stream();   // memory-efficient — does not load all 17k at once

  let currentBatch   = db.batch();
  let batchOpCount   = 0;
  let batchNumber    = 0;
  let totalProcessed = 0;
  let totalSkipped   = 0;
  let totalBatches   = 0;   // incremented on every commit

  const commitBatch = async () => {
    if (batchOpCount === 0) return;
    totalBatches++;
    console.log(`  → Committing batch ${totalBatches} (${batchOpCount} writes)…`);
    await currentBatch.commit();
    console.log(`  ✓ Batch ${totalBatches} committed.`);
    currentBatch = db.batch();
    batchOpCount = 0;
    // Brief pause between batches to stay well within Firestore write quotas
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  console.log('Streaming documents from Firestore…');

  for await (const doc of stream) {
    const data = doc.data();
    const name = data.name;

    if (!name || typeof name !== 'string') {
      console.warn(`  ⚠ SKIP  doc ${doc.id} — 'name' missing or not a string`);
      totalSkipped++;
      continue;
    }

    const searchName = name.toLowerCase();
    currentBatch.update(doc.ref, { search_name: searchName });
    batchOpCount++;
    totalProcessed++;

    // Flush when we hit the batch limit
    if (batchOpCount >= BATCH_LIMIT) {
      await commitBatch();
    }
  }

  // Commit any remaining writes
  await commitBatch();

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(`  MIGRATION COMPLETE`);
  console.log(`  Documents updated : ${totalProcessed}`);
  console.log(`  Documents skipped : ${totalSkipped}`);
  console.log(`  Total batches     : ${totalBatches}`);
  console.log(`  Project           : ${projectId}`);
  console.log('══════════════════════════════════════════════');
  console.log('');
}

runPortMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('');
    console.error('❌  MIGRATION FAILED:', err.message);
    console.error(err);
    process.exit(1);
  });
