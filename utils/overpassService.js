const axios = require('axios');

class OverpassService {
    constructor() {
        this.baseUrl = 'https://overpass-api.de/api/interpreter';
    }

    /**
     * Query Overpass API for ferry routes in the Philippines
     */
    async getFerryRoutes() {
        // Overpass QL query to get ferry routes in the Philippines
        const query = `
            [out:json];
            (
              // Ferry routes (relations)
              relation["route"="ferry"](10,116,20,127);
              
              // Ferry terminals (nodes)
              node["amenity"="ferry_terminal"](10,116,20,127);
              
              // Ferry routes as ways
              way["route"="ferry"](10,116,20,127);
            );
            out body;
            >;
            out skel qt;
        `;

        try {
            const response = await axios.post(this.baseUrl, `data=${encodeURIComponent(query)}`);
            return this.parseFerryData(response.data);
        } catch (error) {
            console.error('❌ Overpass API error:', error.message);
            // Return fallback data if API fails
            return this.getFallbackFerryData();
        }
    }

    /**
     * Parse Overpass response into structured ferry data
     */
    parseFerryData(data) {
        const elements = data.elements;
        const nodes = {};
        const ferries = [];

        // First pass: collect all nodes (points)
        elements.forEach(element => {
            if (element.type === 'node') {
                nodes[element.id] = {
                    lat: element.lat,
                    lon: element.lon,
                    name: element.tags?.name || element.tags?.ref || `Terminal ${element.id}`
                };
            }
        });

        // Second pass: process ferry routes
        elements.forEach(element => {
            if (element.type === 'relation' && element.tags?.route === 'ferry') {
                const ferryName = element.tags?.name || element.tags?.ref || element.tags?.operator || 'Unnamed Ferry';
                const from = element.tags?.from;
                const to = element.tags?.to;
                
                // Try to find start and end nodes
                let startNode = null;
                let endNode = null;
                
                if (element.members) {
                    const nodeMembers = element.members.filter(m => m.type === 'node');
                    if (nodeMembers.length >= 2) {
                        startNode = nodes[nodeMembers[0].ref];
                        endNode = nodes[nodeMembers[nodeMembers.length - 1].ref];
                    }
                }

                // If we have both points, create a ferry
                if (startNode && endNode) {
                    ferries.push({
                        name: ferryName,
                        route: from && to ? `${from} - ${to}` : `${this.getCityName(startNode)} - ${this.getCityName(endNode)}`,
                        pointA: {
                            lat: startNode.lat,
                            lng: startNode.lon
                        },
                        pointB: {
                            lat: endNode.lat,
                            lng: endNode.lon
                        },
                        speed_knots: this.getRandomSpeed(18, 30), // Realistic ferry speeds
                        status: 'on_time',
                        eta: this.calculateETA(startNode, endNode, 25),
                        source: 'overpass'
                    });
                }
            }
        });

        return ferries.length > 0 ? ferries : this.getFallbackFerryData();
    }

    /**
     * Get city name from node (simplified)
     */
    getCityName(node) {
        if (node.name) {
            // Extract city from name (e.g., "Manila Ferry Terminal" -> "Manila")
            const parts = node.name.split(' ');
            return parts[0];
        }
        return 'Unknown';
    }

    /**
     * Calculate approximate ETA in minutes
     */
    calculateETA(pointA, pointB, speedKnots) {
        const distance = this.calculateDistance(
            pointA.lat, pointA.lng,
            pointB.lat, pointB.lng
        );
        
        // Convert knots to km/h (1 knot = 1.852 km/h)
        const speedKmh = speedKnots * 1.852;
        
        // Time in hours, convert to minutes
        const hours = distance / speedKmh;
        return Math.round(hours * 60);
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
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
     * Get random speed between min and max
     */
    getRandomSpeed(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Fallback ferry data if Overpass API fails
     */
    getFallbackFerryData() {
        return [
            {
                name: "FastCat Manila",
                route: "Manila - Batangas",
                pointA: { lat: 14.594, lng: 120.970 }, // Manila
                pointB: { lat: 13.756, lng: 121.058 }, // Batangas
                speed_knots: 25,
                status: "on_time",
                eta: 45,
                source: 'fallback'
            },
            {
                name: "OceanJet Manila",
                route: "Manila - Cavite",
                pointA: { lat: 14.594, lng: 120.970 }, // Manila
                pointB: { lat: 14.483, lng: 120.892 }, // Cavite
                speed_knots: 20,
                status: "on_time",
                eta: 30,
                source: 'fallback'
            },
            {
                name: "2GO Ferry",
                route: "Manila - Dagupan",
                pointA: { lat: 14.594, lng: 120.970 }, // Manila
                pointB: { lat: 16.043, lng: 120.334 }, // Dagupan
                speed_knots: 22,
                status: "on_time",
                eta: 180,
                source: 'fallback'
            },
            {
                name: "Starlite",
                route: "Batangas - Cebu",
                pointA: { lat: 13.756, lng: 121.058 }, // Batangas
                pointB: { lat: 10.315, lng: 123.885 }, // Cebu
                speed_knots: 28,
                status: "on_time",
                eta: 240,
                source: 'fallback'
            },
            {
                name: "Weesam Express",
                route: "Cebu - Bacolod",
                pointA: { lat: 10.315, lng: 123.885 }, // Cebu
                pointB: { lat: 10.667, lng: 122.950 }, // Bacolod
                speed_knots: 30,
                status: "on_time",
                eta: 60,
                source: 'fallback'
            }
        ];
    }
}

module.exports = OverpassService;