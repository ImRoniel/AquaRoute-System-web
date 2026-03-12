const axios = require('axios');
const { db } = require('../config/firebase');
const OverpassService = require('../utils/overpassService'); // reuse your existing class

async function refreshFerriesFromOverpass() {
  const overpass = new OverpassService();
  let ferries;

  try {
    ferries = await overpass.getFerryRoutes();
  } catch (error) {
    console.warn('Overpass failed, using fallback data');
    ferries = overpass.getFallbackFerryData();
  }

  const batch = db.batch();
  const ferriesRef = db.collection('ferries');

  // Optionally clear old ferries (or just update them)
  // For simplicity, we'll delete all and add new ones
  const snapshot = await ferriesRef.get();
  snapshot.forEach(doc => batch.delete(doc.ref));

  const now = Date.now();
  for (const ferry of ferries) {
    // Generate route points (simple straight line between A and B)
    const routePoints = [
      { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
      // you could add intermediate points for a more realistic curve
      { lat: ferry.pointB.lat, lng: ferry.pointB.lng }
    ];

    // Calculate total duration in milliseconds (using eta minutes)
    const etaMs = (ferry.eta || 60) * 60 * 1000;

    const ferryDoc = {
      name: ferry.name,
      route: ferry.route,
      pointA: ferry.pointA,
      pointB: ferry.pointB,
      speed_knots: ferry.speed_knots,
      status: ferry.status || 'on_time',
      eta: ferry.eta,
      current_lat: ferry.pointA.lat,
      current_lng: ferry.pointA.lng,
      source: ferry.source || 'overpass',
      routePoints: routePoints,
      startTime: now,
      endTime: now + etaMs,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const docRef = ferriesRef.doc(); // auto-generated ID
    batch.set(docRef, ferryDoc);
  }

  await batch.commit();
  return { count: ferries.length };
}

module.exports = { refreshFerriesFromOverpass };