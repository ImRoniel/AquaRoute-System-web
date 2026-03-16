// C:\xampp\htdocs\AquaRoute-System-web\models\port.js
const { db, admin } = require('../config/firebase');

class Port {
    constructor() {
        this.collection = db.collection('ports');
    }

    // getAll() has been removed to prevent Firestore quota exhaustion.

    /**
     * Get paginated ports
     */
    async getPaginated(limit = 20, lastDocId = null) {
        try {
            let query = this.collection.orderBy('name').limit(limit);
            
            if (lastDocId) {
                const lastDoc = await this.collection.doc(lastDocId).get();
                if (lastDoc.exists) {
                    query = query.startAfter(lastDoc);
                }
            }
            
            const snapshot = await query.get();
            
            const ports = [];
            let lastVisible = null;
            
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
                    location: data.location || '',
                    createdAt: data.createdAt ? data.createdAt.toDate() : null
                });
                lastVisible = doc;
            });
            
            // Fetch weather data for the batch of ports
            if (ports.length > 0) {
                const weatherCollection = db.collection('weather');
                
                // whereIn allows max 10 items per array filter, so chunk the IDs
                const portIds = ports.map(p => p.id);
                const weatherMap = {};
                
                // Process in chunks of 10
                for (let i = 0; i < portIds.length; i += 10) {
                    const chunk = portIds.slice(i, i + 10);
                    try {
                        const weatherSnapshot = await weatherCollection.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
                        weatherSnapshot.forEach(doc => {
                            weatherMap[doc.id] = doc.data();
                        });
                    } catch (err) {
                        console.error('Error fetching weather chunk:', err);
                    }
                }
                
                // Map weather back to ports
                ports.forEach(port => {
                    port.weatherData = weatherMap[port.id] || null;
                });
            }
            return {
                ports,
                lastVisible
            };
            
        } catch (error) {
            console.error('Pagination error:', error);
            return { ports: [], lastVisible: null };
        }
    }

    /**
     * Load more ports (alias for getPaginated with lastDocId)
     */
    async loadMore(limit, lastDocId) {
        return this.getPaginated(limit, lastDocId);
    }

    /**
     * Search ports by name (case-insensitive indexed search)
     */
    async searchByName(query) {
        try {
            const searchTerm = query.toLowerCase();
            
            // Use indexed prefix query on searchName field instead of full collection read
            const snapshot = await this.collection
                .where('searchName', '>=', searchTerm)
                .where('searchName', '<=', searchTerm + '\uf8ff')
                .limit(50)
                .get();
            
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
                    location: data.location || '',
                    createdAt: data.createdAt ? data.createdAt.toDate() : null
                });
            });
            
            // Fetch weather data for the filtered ports in batches (max 10)
            if (ports.length > 0) {
                const weatherCollection = db.collection('weather');
                const portIds = ports.map(p => p.id);
                const weatherMap = {};
                
                for (let i = 0; i < portIds.length; i += 10) {
                    const chunk = portIds.slice(i, i + 10);
                    try {
                        const weatherSnapshot = await weatherCollection.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
                        weatherSnapshot.forEach(doc => {
                            weatherMap[doc.id] = doc.data();
                        });
                    } catch (err) {
                        console.error('Error fetching weather chunk:', err);
                    }
                }
                
                ports.forEach(port => {
                    port.weatherData = weatherMap[port.id] || null;
                });
            }
            return ports;
            
        } catch (error) {
            console.error('Error searching ports:', error);
            throw error;
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
                location: data.location || '',
                weather: data.weather || 'Unknown',
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
            const cleanData = {};
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    cleanData[key] = data[key];
                }
            });

            const updateData = {
                ...cleanData,
                searchName: (cleanData.name || '').toLowerCase(),
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
     * Add new port
     */
    async add(data) {
        try {
            const cleanData = {};
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    cleanData[key] = data[key];
                }
            });

            const docRef = await this.collection.add({
                ...cleanData,
                searchName: (cleanData.name || '').toLowerCase(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });            return { id: docRef.id, ...cleanData };
        } catch (error) {
            console.error('❌ Error adding port:', error);
            throw error;
        }
    }

    /**
     * Delete port
     */
    async delete(id) {
        try {
            await this.collection.doc(id).delete();
            return { id };
        } catch (error) {
            console.error('❌ Error deleting port:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            // Use count() aggregation instead of fetching all documents
            const [totalSnap, openSnap, closedSnap, limitedSnap, ferrySnap, pierSnap, osmSnap] = await Promise.all([
                this.collection.count().get(),
                this.collection.where('status', '==', 'open').count().get(),
                this.collection.where('status', '==', 'closed').count().get(),
                this.collection.where('status', '==', 'limited').count().get(),
                this.collection.where('type', '==', 'ferry_terminal').count().get(),
                this.collection.where('type', '==', 'pier').count().get(),
                this.collection.where('source', '==', 'OSM').count().get()
            ]);
            
            return {
                total: totalSnap.data().count,
                open: openSnap.data().count,
                closed: closedSnap.data().count,
                limited: limitedSnap.data().count,
                // Count by type
                ferryTerminals: ferrySnap.data().count,
                piers: pierSnap.data().count,
                // Source breakdown
                osm: osmSnap.data().count
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
                .limit(100) // Added limit to prevent accidental large reads
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
                .limit(100) // Added limit to prevent accidental large reads
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
        if (port.name && port.name.startsWith('FERRY TERMINAL ')) {
            return port.name.replace('FERRY TERMINAL ', '');
        }
        return port.name || 'Unknown Port';
    }

    async getNearby(lat, lng, radiusKm = 10) {
        try {
            // Approx 1 degree latitude = 111 km
            const latOffset = radiusKm / 111.0;
            const lngOffset = radiusKm / (111.0 * Math.cos(lat * (Math.PI / 180)));
            
            const latMin = parseFloat(lat) - latOffset;
            const latMax = parseFloat(lat) + latOffset;
            
            // Using bounding box query (requires composite index on lat/lng if we also bound by lng directly)
            // Or we do a simple filter on lat, then manually filter lng to save reads
            const snapshot = await this.collection
                .where('lat', '>=', latMin)
                .where('lat', '<=', latMax)
                .get();
                
            let nearby = [];
            
            snapshot.forEach(doc => {
                const port = doc.data();
                if (port.lat && port.lng) {
                    const distance = this.calculateDistance(lat, lng, port.lat, port.lng);
                    if (distance <= radiusKm) {
                        nearby.push({
                            id: doc.id,
                            ...port
                        });
                    }
                }
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

// ✅ Export the class
module.exports = Port;