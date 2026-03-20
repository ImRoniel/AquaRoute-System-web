const axios = require('axios');
const { db } = require('../config/firebase');
const OverpassService = require('../utils/overpassService');

/**
 * Calculate distance between two coordinates in km using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate ETA in minutes based on distance and speed
 */
function calculateETA(distanceKm, speedKnots) {
  if (!distanceKm || !speedKnots || speedKnots <= 0) return null;
  const speedKmh = speedKnots * 1.852;
  const timeHours = distanceKm / speedKmh;
  return Math.max(5, Math.round(timeHours * 60));
}

/**
 * Estimate ETA based on route name when distance/speed unavailable
 */
function estimateETAFromRoute(route) {
  if (!route) return 60;
  const routeLower = route.toLowerCase();
  if (routeLower.includes('manila') && routeLower.includes('cebu')) return 420;
  if (routeLower.includes('manila') && routeLower.includes('davao')) return 840;
  if (routeLower.includes('manila') && routeLower.includes('iloilo')) return 480;
  if (routeLower.includes('cebu') && routeLower.includes('bohol')) return 120;
  if (routeLower.includes('cebu') && routeLower.includes('leyte')) return 180;
  if (routeLower.includes('batangas') && routeLower.includes('mindoro')) return 180;
  if (routeLower.includes('short') || routeLower.includes('roro')) return 30;
  return 60;
}

/**
 * Round a coordinate to 5 decimal places for stable comparison.
 * Avoids false-positive diffs from floating-point noise.
 */
function roundCoord(val) {
  return Math.round((val || 0) * 100000) / 100000;
}

/**
 * Deep equality check for the physical fields that actually matter for billing.
 * Returns true if the Overpass data is DIFFERENT from what is stored in Firestore.
 *
 * BILLING RULE: Only coordinatees, status, and speed_knots trigger a write.
 * Time fields (startTime, endTime, eta, last_updated) are intentionally excluded
 * from this check — they are recalculated only when physical data has changed.
 */
function hasPhysicalDataChanged(incoming, existing) {
  const coordChanged =
    roundCoord(incoming.pointA.lat) !== roundCoord(existing.pointA?.lat) ||
    roundCoord(incoming.pointA.lng) !== roundCoord(existing.pointA?.lng) ||
    roundCoord(incoming.pointB.lat) !== roundCoord(existing.pointB?.lat) ||
    roundCoord(incoming.pointB.lng) !== roundCoord(existing.pointB?.lng);

  const statusChanged = (incoming.status || 'on_time') !== (existing.status || 'on_time');
  const speedChanged  = (incoming.speed_knots || 20) !== (existing.speed_knots || 20);
  const routeChanged  = (incoming.route || '') !== (existing.route || '');

  return coordChanged || statusChanged || speedChanged || routeChanged;
}

/**
 * Refresh ferries from Overpass API and update Firestore using a strict
 * deep-equality diff.
 *
 * QUOTA RULES ENFORCED:
 *  - batch.update() is only called when physical data has actually changed.
 *  - batch.set()    is only called for brand-new ferries.
 *  - batch.delete() is only called for ferries no longer returned by Overpass.
 *  - If a ferry is stationary (no physical change), a log line is printed and
 *    NO Firestore operation is executed.
 *  - startTime, endTime, eta, and last_updated are ONLY recalculated and written
 *    when the physical data changes.
 */
async function refreshFerriesFromOverpass() {
  const overpass = new OverpassService();
  let incomingFerries;

  // --- Step 1: Fetch latest data from Overpass ---
  try {
    incomingFerries = await overpass.getFerryRoutes();
    console.log(`✅ Fetched ${incomingFerries.length} ferries from Overpass API`);
  } catch (error) {
    console.warn('⚠️ Overpass failed, using fallback data');
    incomingFerries = overpass.getFallbackFerryData();
  }

  // --- Step 2: Load ALL existing Firestore ferry documents ---
  const ferriesRef = db.collection('ferries');
  const existingSnapshot = await ferriesRef.get();

  // Key existing docs by ferry name for O(1) lookup
  const existingByName = {};
  existingSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name) existingByName[data.name] = { id: doc.id, ref: doc.ref, data };
  });

  // Track which names appear in Overpass to find deletions
  const incomingNames = new Set(incomingFerries.map(f => f.name));

  // --- Step 3: Build the diff ---
  const batch = db.batch();
  let writeCount  = 0;
  let createCount = 0;
  let deleteCount = 0;
  let skipCount   = 0;

  for (const ferry of incomingFerries) {
    const ferryName = ferry.name || 'Unnamed Ferry';
    const existing  = existingByName[ferryName];

    // Compute distance and ETA (needed for creates and updates)
    const distance = (ferry.pointA && ferry.pointB)
      ? calculateDistance(ferry.pointA.lat, ferry.pointA.lng, ferry.pointB.lat, ferry.pointB.lng)
      : null;

    const calculatedEta = (distance && ferry.speed_knots && ferry.speed_knots > 0)
      ? calculateETA(distance, ferry.speed_knots)
      : null;

    const finalEta = calculatedEta || estimateETAFromRoute(ferry.route);
    const etaMs    = finalEta * 60 * 1000;
    const now      = Date.now();

    if (!existing) {
      // --- NEW ferry: always write ---
      const newDoc = {
        name: ferryName,
        route: ferry.route || 'Unknown Route',
        pointA: { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
        pointB: { lat: ferry.pointB.lat, lng: ferry.pointB.lng },
        speed_knots: ferry.speed_knots || 20,
        status: ferry.status || 'on_time',
        eta: finalEta,
        current_lat: ferry.pointA.lat,
        current_lng: ferry.pointA.lng,
        source: ferry.source || 'overpass',
        routePoints: [
          { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
          { lat: ferry.pointB.lat, lng: ferry.pointB.lng }
        ],
        startTime: now,
        endTime: now + etaMs,
        route_distance_km: distance ? Math.round(distance * 10) / 10 : null,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      batch.set(ferriesRef.doc(), newDoc);
      createCount++;
      console.log(`➕ Ferry "${ferryName}": NEW — adding to Firestore`);

    } else if (hasPhysicalDataChanged(ferry, existing.data)) {
      // --- CHANGED ferry: update only the changed fields + time fields ---
      const updatedFields = {
        route: ferry.route || 'Unknown Route',
        pointA: { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
        pointB: { lat: ferry.pointB.lat, lng: ferry.pointB.lng },
        speed_knots: ferry.speed_knots || 20,
        status: ferry.status || 'on_time',
        eta: finalEta,
        current_lat: ferry.pointA.lat,
        current_lng: ferry.pointA.lng,
        routePoints: [
          { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
          { lat: ferry.pointB.lat, lng: ferry.pointB.lng }
        ],
        startTime: now,
        endTime: now + etaMs,
        route_distance_km: distance ? Math.round(distance * 10) / 10 : null,
        last_updated: new Date().toISOString()
        // NOTE: created_at is intentionally NOT updated — preserve original creation time
      };
      batch.update(existing.ref, updatedFields);
      writeCount++;
      console.log(`✏️  Ferry "${ferryName}": CHANGED — updating Firestore`);

    } else {
      // --- UNCHANGED ferry: skip all Firestore writes ---
      skipCount++;
      console.log(`⏭️  Ferry "${ferryName}" unchanged — skipping Firestore write`);
    }
  }

  // --- Step 4: Delete ferries that no longer appear in Overpass ---
  for (const [name, existing] of Object.entries(existingByName)) {
    if (!incomingNames.has(name)) {
      batch.delete(existing.ref);
      deleteCount++;
      console.log(`🗑️  Ferry "${name}": removed from Overpass — deleting from Firestore`);
    }
  }

  // --- Step 5: Commit only if there is something to write ---
  if (writeCount + createCount + deleteCount === 0) {
    console.log('\n✅ No ferry data changed — skipping Firestore commit entirely (zero writes)');
    return { count: incomingFerries.length, writes: 0, skipped: skipCount };
  }

  await batch.commit();

  console.log('\n📈 Diff Summary:');
  console.log(`   ➕ Created  : ${createCount}`);
  console.log(`   ✏️  Updated  : ${writeCount}`);
  console.log(`   🗑️  Deleted  : ${deleteCount}`);
  console.log(`   ⏭️  Skipped  : ${skipCount} (no change — zero writes)`);

  return { count: incomingFerries.length, writes: writeCount + createCount + deleteCount, skipped: skipCount };
}

module.exports = { refreshFerriesFromOverpass };


