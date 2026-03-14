const axios = require('axios');
const { db } = require('../config/firebase');
const OverpassService = require('../utils/overpassService');

/**
 * Calculate distance between two coordinates in km using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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
  
  // Convert knots to km/h (1 knot = 1.852 km/h)
  const speedKmh = speedKnots * 1.852;
  
  // Time in hours = distance / speed
  const timeHours = distanceKm / speedKmh;
  
  // Convert to minutes and round to nearest minute
  return Math.max(5, Math.round(timeHours * 60)); // Minimum 5 minutes
}

/**
 * Estimate ETA based on route name when distance/speed unavailable
 */
function estimateETAFromRoute(route) {
  if (!route) return 60;
  
  const routeLower = route.toLowerCase();
  
  // Long haul routes
  if (routeLower.includes('manila') && routeLower.includes('cebu')) return 420; // 7 hours
  if (routeLower.includes('manila') && routeLower.includes('davao')) return 840; // 14 hours
  if (routeLower.includes('manila') && routeLower.includes('iloilo')) return 480; // 8 hours
  
  // Medium routes
  if (routeLower.includes('cebu') && routeLower.includes('bohol')) return 120; // 2 hours
  if (routeLower.includes('cebu') && routeLower.includes('leyte')) return 180; // 3 hours
  if (routeLower.includes('batangas') && routeLower.includes('mindoro')) return 180; // 3 hours
  
  // Short routes
  if (routeLower.includes('short') || routeLower.includes('roro')) return 30;
  
  // Default
  return 60;
}

/**
 * Refresh ferries from Overpass API and update Firestore
 */
async function refreshFerriesFromOverpass() {
  const overpass = new OverpassService();
  let ferries;

  try {
    ferries = await overpass.getFerryRoutes();
    console.log(`✅ Fetched ${ferries.length} ferries from Overpass API`);
  } catch (error) {
    console.warn('⚠️ Overpass failed, using fallback data');
    ferries = overpass.getFallbackFerryData();
  }

  const batch = db.batch();
  const ferriesRef = db.collection('ferries');

  // Clear old ferries
  const snapshot = await ferriesRef.get();
  snapshot.forEach(doc => batch.delete(doc.ref));

  const now = Date.now();
  let calculatedCount = 0;
  let estimatedCount = 0;

  for (const ferry of ferries) {
    // Generate route points (simple straight line between A and B)
    const routePoints = [
      { lat: ferry.pointA.lat, lng: ferry.pointA.lng },
      { lat: ferry.pointB.lat, lng: ferry.pointB.lng }
    ];

    // Calculate distance between pointA and pointB
    let distance = null;
    let calculatedEta = null;
    
    if (ferry.pointA && ferry.pointB) {
      distance = calculateDistance(
        ferry.pointA.lat, ferry.pointA.lng,
        ferry.pointB.lat, ferry.pointB.lng
      );
      
      // Calculate ETA based on distance and speed
      if (distance && ferry.speed_knots && ferry.speed_knots > 0) {
        calculatedEta = calculateETA(distance, ferry.speed_knots);
      }
    }

    // Determine final ETA
    let finalEta;
    if (calculatedEta) {
      finalEta = calculatedEta;
      calculatedCount++;
      console.log(`📏 ${ferry.name}: ${distance.toFixed(1)}km at ${ferry.speed_knots}kts = ${finalEta} mins`);
    } else {
      finalEta = estimateETAFromRoute(ferry.route);
      estimatedCount++;
      console.log(`📊 ${ferry.name}: using estimated ETA = ${finalEta} mins`);
    }

    // Calculate total duration in milliseconds
    const etaMs = finalEta * 60 * 1000;

    const ferryDoc = {
      name: ferry.name || 'Unnamed Ferry',
      route: ferry.route || 'Unknown Route',
      pointA: {
        lat: ferry.pointA.lat,
        lng: ferry.pointA.lng
      },
      pointB: {
        lat: ferry.pointB.lat,
        lng: ferry.pointB.lng
      },
      speed_knots: ferry.speed_knots || 20,
      status: ferry.status || 'on_time',
      eta: finalEta,
      current_lat: ferry.pointA.lat,
      current_lng: ferry.pointA.lng,
      source: ferry.source || 'overpass',
      routePoints: routePoints,
      startTime: now,
      endTime: now + etaMs,
      route_distance_km: distance ? Math.round(distance * 10) / 10 : null,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const docRef = ferriesRef.doc(); // auto-generated ID
    batch.set(docRef, ferryDoc);
  }

  await batch.commit();
  
  console.log('\n📈 Update Summary:');
  console.log(`   - Total ferries: ${ferries.length}`);
  console.log(`   - Calculated ETAs: ${calculatedCount}`);
  console.log(`   - Estimated ETAs: ${estimatedCount}`);
  
  return { count: ferries.length };
}

module.exports = { refreshFerriesFromOverpass };