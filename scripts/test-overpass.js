// C:\xampp\htdocs\AquaRoute-System-web\scripts\test-overpass.js
const OverpassService = require('../utils/overpassService');

async function testOverpass() {
    console.log('🔍 Testing Overpass API...');
    
    const overpass = new OverpassService();
    
    try {
        const ferries = await overpass.getFerryRoutes();
        
        console.log(`\n✅ Found ${ferries.length} ferries:`);
        console.log('===========================\n');
        
        ferries.forEach((ferry, index) => {
            console.log(`${index + 1}. ${ferry.name}`);
            console.log(`   Route: ${ferry.route}`);
            console.log(`   From: (${ferry.pointA.lat.toFixed(4)}, ${ferry.pointA.lng.toFixed(4)})`);
            console.log(`   To: (${ferry.pointB.lat.toFixed(4)}, ${ferry.pointB.lng.toFixed(4)})`);
            console.log(`   Speed: ${ferry.speed_knots} knots`);
            console.log(`   ETA: ${ferry.eta} minutes`);
            console.log(`   Source: ${ferry.source}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testOverpass();