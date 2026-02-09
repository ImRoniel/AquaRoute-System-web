// clean_ports.js - Final version
const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('osm_data.json', 'utf8'));
  console.log('Processing OSM GeoJSON data...');
  console.log(`Total features: ${data.features.length}`);

  const cleanedPorts = [];

  data.features.forEach((feature, index) => {
    const props = feature.properties || {};
    
    // Check if this is a port-related feature
    const isPortRelated = 
      props.amenity === 'ferry_terminal' ||
      props.leisure === 'marina' ||
      props.man_made === 'pier' ||
      props.waterway === 'boatyard' ||
      props.harbour ||
      props.industrial === 'port' ||
      props['seamark:type'] === 'harbour' ||
      (props.public_transport === 'station' && props.ferry === 'yes') ||
      props.ferry === 'yes';
    
    if (!isPortRelated) return;

    // Get coordinates - handle different geometry types
    let lat, lng;
    
    if (feature.geometry && feature.geometry.coordinates) {
      // For Polygon - calculate centroid
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        let sumLng = 0, sumLat = 0;
        
        for (let i = 0; i < coords.length - 1; i++) { // Skip last (duplicate of first)
          sumLng += coords[i][0];
          sumLat += coords[i][1];
        }
        
        lng = sumLng / (coords.length - 1);
        lat = sumLat / (coords.length - 1);
      }
      // For Point
      else if (feature.geometry.type === 'Point') {
        [lng, lat] = feature.geometry.coordinates;
      }
      // For LineString - use midpoint of first segment
      else if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        const midIndex = Math.floor(coords.length / 2);
        [lng, lat] = coords[midIndex];
      }
    }
    
    if (!lat || !lng) {
      console.warn(`Skipping ${props.name || 'unnamed feature'}: No valid coordinates`);
      return;
    }

    // Determine type
    let type = 'other';
    if (props.amenity === 'ferry_terminal') type = 'ferry_terminal';
    else if (props.leisure === 'marina') type = 'marina';
    else if (props.man_made === 'pier') type = 'pier';
    else if (props.waterway === 'boatyard') type = 'boatyard';
    else if (props.harbour) type = 'harbour';
    else if (props.industrial === 'port') type = 'port';
    else if (props['seamark:type'] === 'harbour') type = 'harbour';
    else if (props.ferry === 'yes') type = 'ferry_terminal';

    // Get name
    let name = props.name || props['addr:place'] || props['addr:city'] || 
               props['addr:town'] || props['addr:village'] || '';
    
    // If still no name, generate one
    if (!name && props['@id']) {
      const idParts = props['@id'].split('/');
      name = `${type.replace('_', ' ').toUpperCase()} ${idParts[1] || ''}`;
    } else if (!name) {
      name = `${type.replace('_', ' ').toUpperCase()} ${index + 1}`;
    }

    // Create the port object
    const port = {
      name: name.trim(),
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      type: type,
      status: "Open",
      source: "OSM"
    };

    // Add optional fields
    if (props.operator) port.operator = props.operator;
    if (props['addr:town']) port.town = props['addr:town'];
    if (props['addr:city']) port.city = props['addr:city'];
    if (props.mooring) port.mooring = props.mooring;
    if (props.ferry) port.ferry_type = props.ferry;

    cleanedPorts.push(port);
  });

  console.log(`\n✅ Extracted ${cleanedPorts.length} ports`);
  
  // Save in the exact format you requested
  fs.writeFileSync('cleaned_ports.json', JSON.stringify(cleanedPorts, null, 2));
  console.log('✅ Saved to cleaned_ports.json');

  // Display first 10 ports as examples
  console.log('\n=== First 10 Ports ===');
  cleanedPorts.slice(0, 10).forEach((port, i) => {
    console.log(`${i + 1}. ${port.name} (${port.type})`);
    console.log(`   Location: ${port.lat}, ${port.lng}`);
    if (port.town || port.city) {
      console.log(`   Area: ${port.town || port.city}`);
    }
    console.log();
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}