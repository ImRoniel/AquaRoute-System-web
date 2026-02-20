/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in kilometers
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
 * Convert knots to km/h
 */
function knotsToKmh(knots) {
    return knots * 1.852;
}

/**
 * Calculate current position based on time elapsed
 */
function calculatePosition(pointA, pointB, speedKnots, lastUpdated, status) {
    // Handle null/undefined points
    if (!pointA || !pointB) {
        return {
            lat: 0,
            lng: 0,
            progress: 0,
            distanceRemaining: 0
        };
    }

    // Extract coordinates (handle both object formats)
    const latA = pointA.lat ?? pointA.latitude;
    const lngA = pointA.lng ?? pointA.longitude;
    const latB = pointB.lat ?? pointB.latitude;
    const lngB = pointB.lng ?? pointB.longitude;

    // If ferry is suspended, don't move
    if (status === 'suspended') {
        return {
            lat: latA,
            lng: lngA,
            progress: 0,
            distanceRemaining: calculateDistance(latA, lngA, latB, lngB)
        };
    }

    const now = new Date();
    const lastUpdate = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
    const elapsedHours = (now - lastUpdate) / (1000 * 60 * 60);
    
    // Total distance in km
    const totalDistance = calculateDistance(latA, lngA, latB, lngB);
    
    // Speed in km/h
    const speedKmh = knotsToKmh(speedKnots);
    
    // Distance traveled since last update
    let distanceTraveled = speedKmh * elapsedHours;
    
    // Apply delay factor if delayed (move slower)
    if (status === 'delayed') {
        distanceTraveled *= 0.5; // Move at half speed
    }
    
    // Progress as fraction of total journey
    const progress = Math.min(distanceTraveled / totalDistance, 1);
    
    // Calculate current position using linear interpolation
    const currentLat = latA + (latB - latA) * progress;
    const currentLng = lngA + (lngB - lngA) * progress;
    
    // If reached destination, reset to start for demo purposes
    if (progress >= 1) {
        return {
            lat: latA,
            lng: lngA,
            progress: 0,
            distanceRemaining: totalDistance
        };
    }
    
    return {
        lat: currentLat,
        lng: currentLng,
        progress,
        distanceRemaining: totalDistance - distanceTraveled
    };
}

/**
 * Calculate ETA in minutes
 */
function calculateETA(currentPos, destination, speedKnots) {
    if (!currentPos || !destination || !speedKnots || speedKnots === 0) {
        return 0;
    }

    const destLat = destination.lat ?? destination.latitude;
    const destLng = destination.lng ?? destination.longitude;
    
    const distanceRemaining = calculateDistance(
        currentPos.lat, currentPos.lng,
        destLat, destLng
    );
    
    const speedKmh = knotsToKmh(speedKnots);
    const hoursRemaining = distanceRemaining / speedKmh;
    
    return Math.round(hoursRemaining * 60); // Return minutes
}

/**
 * Format coordinates for display
 */
function formatCoordinates(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

module.exports = {
    calculateDistance,
    knotsToKmh,
    calculatePosition,
    calculateETA,
    formatCoordinates
};