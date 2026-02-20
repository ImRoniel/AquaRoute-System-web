const { db, admin } = require('../config/firebase');

class Port {
    constructor() {
        this.collection = db.collection('ports');
    }

    /**
     * Get all ports from Firebase
     */
    async getAll() {
        try {
            const snapshot = await this.collection.get();
            const ports = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                ports.push({
                    id: doc.id,
                    name: data.name || 'Unknown Port',
                    lat: data.lat || 0,
                    lng: data.lng || 0,
                    type: data.type || 'unknown',
                    status: data.status || 'unknown',
                    source: data.source || 'unknown',
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    // Keep raw timestamp if needed
                    createdAtTimestamp: data.createdAt
                });
            });
            
            return ports;
        } catch (error) {
            console.error('❌ Error getting ports:', error);
            return [];
        }
    }

    /**
     * Get a single port by ID
     */
    async getById(id) {
        try {
            const doc = await this.collection.doc(id).get();
            if (!doc.exists) return null;
            
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Unknown Port',
                lat: data.lat || 0,
                lng: data.lng || 0,
                type: data.type || 'unknown',
                status: data.status || 'unknown',
                source: data.source || 'unknown',
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                createdAtTimestamp: data.createdAt
            };
        } catch (error) {
            console.error('❌ Error getting port by id:', error);
            return null;
        }
    }

    /**
     * Update port status
     */
    async updateStatus(id, newStatus) {
        try {
            await this.collection.doc(id).update({
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Get and return updated port
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error updating port status:', error);
            throw error;
        }
    }

    /**
     * Update multiple port fields
     */
    async update(id, data) {
        try {
            const updateData = {
                ...data,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await this.collection.doc(id).update(updateData);
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error updating port:', error);
            throw error;
        }
    }

    /**
     * Get port statistics
     */
    async getStats() {
        try {
            const ports = await this.getAll();
            
            return {
                total: ports.length,
                open: ports.filter(p => p.status?.toLowerCase() === 'open').length,
                closed: ports.filter(p => p.status?.toLowerCase() === 'closed').length,
                limited: ports.filter(p => p.status?.toLowerCase() === 'limited').length,
                // Count by type
                ferryTerminals: ports.filter(p => p.type === 'ferry_terminal').length,
                piers: ports.filter(p => p.type === 'pier').length,
                // Source breakdown
                osm: ports.filter(p => p.source === 'OSM').length
            };
        } catch (error) {
            console.error('❌ Error getting port stats:', error);
            return {
                total: 0,
                open: 0,
                closed: 0,
                limited: 0,
                ferryTerminals: 0,
                piers: 0,
                osm: 0
            };
        }
    }

    /**
     * Get ports by type
     */
    async getByType(type) {
        try {
            const snapshot = await this.collection
                .where('type', '==', type)
                .get();
            
            const ports = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                ports.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                });
            });
            
            return ports;
        } catch (error) {
            console.error(`❌ Error getting ports by type ${type}:`, error);
            return [];
        }
    }

    /**
     * Get ports by status
     */
    async getByStatus(status) {
        try {
            const snapshot = await this.collection
                .where('status', '==', status)
                .get();
            
            const ports = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                ports.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                });
            });
            
            return ports;
        } catch (error) {
            console.error(`❌ Error getting ports by status ${status}:`, error);
            return [];
        }
    }

    /**
     * Format port name for display (remove "FERRY TERMINAL " prefix if needed)
     */
    formatDisplayName(port) {
        if (port.name.startsWith('FERRY TERMINAL ')) {
            return port.name.replace('FERRY TERMINAL ', '');
        }
        return port.name;
    }

    /**
     * Get ports near coordinates (within radius in km)
     */
    async getNearby(lat, lng, radiusKm = 10) {
        try {
            const ports = await this.getAll();
            
            // Filter ports within radius
            const nearby = ports.filter(port => {
                const distance = this.calculateDistance(
                    lat, lng,
                    port.lat, port.lng
                );
                return distance <= radiusKm;
            });
            
            return nearby;
        } catch (error) {
            console.error('❌ Error getting nearby ports:', error);
            return [];
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
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
     * Format createdAt date for display
     */
    formatDate(port) {
        if (!port.createdAt) return 'Unknown date';
        
        const date = port.createdAt;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ✅ CRITICAL: Export the class properly
module.exports = Port;