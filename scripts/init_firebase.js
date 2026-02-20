const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const OverpassService = require('../utils/overpassService');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const overpass = new OverpassService();

/**
 * Check if a port exists in the ports collection
 */
async function findPort(name, lat, lng) {
    const portsRef = db.collection('ports');
    
    // Try to find by name first
    const nameSnapshot = await portsRef.where('name', '==', name).limit(1).get();
    if (!nameSnapshot.empty) {
        return { id: nameSnapshot.docs[0].id, ...nameSnapshot.docs[0].data() };
    }
    
    // Try to find by coordinates (within ~1km)
    const latRange = 0.01; // roughly 1km
    const lngRange = 0.01;
    
    const coordSnapshot = await portsRef
        .where('lat', '>=', lat - latRange)
        .where('lat', '<=', lat + latRange)
        .where('lng', '>=', lng - lngRange)
        .where('lng', '<=', lng + lngRange)
        .limit(1)
        .get();
    
    if (!coordSnapshot.empty) {
        return { id: coordSnapshot.docs[0].id, ...coordSnapshot.docs[0].data() };
    }
    
    return null;
}

/**
 * Extract port name from ferry route
 */
function extractPortNames(route) {
    const parts = route.split(' - ');
    return {
        from: parts[0] || 'Unknown',
        to: parts[1] || 'Unknown'
    };
}

/**
 * Initialize ferries collection
 */
async function initializeFerries(ferryData) {
    const ferriesRef = db.collection('ferries');
    
    console.log('\n🚢 Initializing Ferries Collection...');
    
    // Clear existing ferries
    const snapshot = await ferriesRef.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('✅ Cleared existing ferries');

    // Add new ferries
    for (const ferry of ferryData) {
        // Find or create ports for this route
        const ports = extractPortNames(ferry.route);
        
        const newFerry = {
            name: ferry.name,
            route: ferry.route,
            pointA: new admin.firestore.GeoPoint(ferry.pointA.lat, ferry.pointA.lng),
            pointB: new admin.firestore.GeoPoint(ferry.pointB.lat, ferry.pointB.lng),
            speed_knots: ferry.speed_knots,
            status: ferry.status,
            eta: ferry.eta,
            current_lat: ferry.pointA.lat,
            current_lng: ferry.pointA.lng,
            source: ferry.source || 'overpass',
            last_updated: admin.firestore.FieldValue.serverTimestamp(),
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await ferriesRef.add(newFerry);
        console.log(`✅ Added ferry: ${ferry.name} (${ferry.route})`);
    }
}

/**
 * Check and validate ports collection
 */
async function validatePorts() {
    console.log('\n🏭 Checking Ports Collection...');
    
    const portsSnapshot = await db.collection('ports').get();
    
    if (portsSnapshot.empty) {
        console.log('⚠️ No ports found in Firebase. Please add ports first.');
        return false;
    }

    console.log(`✅ Found ${portsSnapshot.size} ports in Firebase:`);
    portsSnapshot.forEach(doc => {
        const port = doc.data();
        console.log(`   - ${port.name} (${port.lat}, ${port.lng})`);
    });
    
    return true;
}

/**
 * Main initialization function
 */
async function initializeFirebase() {
    console.log('🔥 Firebase Initialization Started');
    console.log('==================================');
    
    try {
        // Step 1: Validate ports collection
        const portsExist = await validatePorts();
        if (!portsExist) {
            console.log('\n❌ Cannot proceed without ports. Please add ports to Firebase first.');
            process.exit(1);
        }

        // Step 2: Fetch ferry data from Overpass API
        console.log('\n🌐 Fetching ferry data from Overpass API...');
        let ferryData;
        
        try {
            ferryData = await overpass.getFerryRoutes();
            console.log(`✅ Successfully fetched ${ferryData.length} ferries from Overpass API`);
        } catch (error) {
            console.log('⚠️ Overpass API failed, using fallback data');
            ferryData = overpass.getFallbackFerryData();
        }

        // Step 3: Initialize ferries collection
        await initializeFerries(ferryData);

        // Step 4: Create indexes for better performance
        console.log('\n📊 Creating indexes...');
        
        // Note: These indexes need to be created in Firebase Console
        console.log('   Remember to create these composite indexes in Firebase Console:');
        console.log('   - Collection: ferries, Fields: status, last_updated');
        console.log('   - Collection: logs, Fields: timestamp (descending)');

        // Step 5: Summary
        console.log('\n📈 Initialization Summary');
        console.log('=========================');
        console.log(`✅ Ferries added: ${ferryData.length}`);
        console.log(`✅ Ports available: ${(await db.collection('ports').get()).size}`);
        console.log('\n🎉 Firebase initialization complete!');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error during initialization:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeFirebase();