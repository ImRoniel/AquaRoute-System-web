// C:\xampp\htdocs\AquaRoute-System-web\models\ferry.js
const { db, admin } = require('../config/firebase');
const { calculatePosition, calculateETA, calculateDistance } = require('../utils/ferryMovement');

if (!db) {
    try {
        const firebase = require('../config/firebase');
        db = firebase.db;
    } catch (error) {
        console.log(' Firebase not available, using mock data mode');
        db = null;
    }
}

class Ferry {
    constructor() {
        this.collection = db.collection('ferries');
        this.logsCollection = db.collection('logs');
    }

    /**
     * Get all ferries from Firebase
     */
    async getAll() {
        try {
            const snapshot = await this.collection.get();
            const ferries = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                ferries.push({
                    id: doc.id,
                    name: data.name || 'Unknown Ferry',
                    route: data.route || 'Unknown Route',
                    pointA: data.pointA ? {
                        lat: data.pointA.latitude,
                        lng: data.pointA.longitude
                    } : null,
                    pointB: data.pointB ? {
                        lat: data.pointB.latitude,
                        lng: data.pointB.longitude
                    } : null,
                    speed_knots: data.speed_knots || 0,
                    status: data.status || 'unknown',
                    source: data.source || 'unknown',
                    current_lat: data.current_lat || (data.pointA?.latitude || 0),
                    current_lng: data.current_lng || (data.pointA?.longitude || 0),
                    eta: data.eta || 0,
                    created_at: data.created_at ? data.created_at.toDate() : new Date(),
                    last_updated: data.last_updated ? data.last_updated.toDate() : new Date(),
                    // Keep raw timestamps if needed
                    created_at_timestamp: data.created_at,
                    last_updated_timestamp: data.last_updated
                });
            });
            
            return ferries;
        } catch (error) {
            console.error('❌ Error getting ferries:', error);
            return [];
        }
    }

    /**
     * Get a single ferry by ID
     */
    async getById(id) {
        try {
            const doc = await this.collection.doc(id).get();
            if (!doc.exists) return null;
            
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Unknown Ferry',
                route: data.route || 'Unknown Route',
                pointA: data.pointA ? {
                    lat: data.pointA.latitude,
                    lng: data.pointA.longitude
                } : null,
                pointB: data.pointB ? {
                    lat: data.pointB.latitude,
                    lng: data.pointB.longitude
                } : null,
                speed_knots: data.speed_knots || 0,
                status: data.status || 'unknown',
                source: data.source || 'unknown',
                current_lat: data.current_lat || (data.pointA?.latitude || 0),
                current_lng: data.current_lng || (data.pointA?.longitude || 0),
                eta: data.eta || 0,
                created_at: data.created_at ? data.created_at.toDate() : new Date(),
                last_updated: data.last_updated ? data.last_updated.toDate() : new Date()
            };
        } catch (error) {
            console.error('❌ Error getting ferry by id:', error);
            return null;
        }
    }

    /**
     * Get ferry with calculated current position based on time
     */
    async getWithCurrentPosition(id) {
        try {
            const ferry = await this.getById(id);
            if (!ferry) return null;

            // Calculate current position based on time elapsed
            const currentPos = calculatePosition(
                ferry.pointA,
                ferry.pointB,
                ferry.speed_knots,
                ferry.last_updated || new Date(),
                ferry.status
            );

            // Calculate updated ETA
            const updatedETA = calculateETA(
                currentPos,
                ferry.pointB,
                ferry.speed_knots
            );

            // Calculate total distance
            const totalDistance = ferry.pointA && ferry.pointB ? 
                calculateDistance(
                    ferry.pointA.lat, ferry.pointA.lng,
                    ferry.pointB.lat, ferry.pointB.lng
                ) : 0;

            return {
                ...ferry,
                current_lat: currentPos.lat,
                current_lng: currentPos.lng,
                eta: updatedETA,
                progress: currentPos.progress,
                distance_remaining: currentPos.distanceRemaining,
                total_distance: totalDistance,
                last_calculated: new Date()
            };
        } catch (error) {
            console.error('❌ Error getting ferry with position:', error);
            return null;
        }
    }

    /**
     * Get all ferries with calculated current positions
     */
    async getAllWithCurrentPositions() {
        try {
            const ferries = await this.getAll();
            const ferriesWithPositions = [];

            for (const ferry of ferries) {
                const currentPos = calculatePosition(
                    ferry.pointA,
                    ferry.pointB,
                    ferry.speed_knots,
                    ferry.last_updated || new Date(),
                    ferry.status
                );

                const updatedETA = calculateETA(
                    currentPos,
                    ferry.pointB,
                    ferry.speed_knots
                );

                const totalDistance = ferry.pointA && ferry.pointB ? 
                    calculateDistance(
                        ferry.pointA.lat, ferry.pointA.lng,
                        ferry.pointB.lat, ferry.pointB.lng
                    ) : 0;

                ferriesWithPositions.push({
                    ...ferry,
                    current_lat: currentPos.lat,
                    current_lng: currentPos.lng,
                    eta: updatedETA,
                    progress: currentPos.progress,
                    distance_remaining: currentPos.distanceRemaining,
                    total_distance: totalDistance
                });
            }

            return ferriesWithPositions;
        } catch (error) {
            console.error('❌ Error getting ferries with positions:', error);
            return [];
        }
    }

    /**
     * Update ferry status
     */
    async updateStatus(id, newStatus) {
        try {
            const updateData = {
                status: newStatus,
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            };

            await this.collection.doc(id).update(updateData);
            
            // Add to logs
            const ferry = await this.getById(id);
            await this.addLog(
                'Status Update',
                `${ferry.name} -> ${newStatus}`,
                'System'
            );

            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error updating ferry status:', error);
            throw error;
        }
    }

    /**
     * Update ferry position (called periodically)
     */
    async updatePosition(id) {
        try {
            const ferry = await this.getById(id);
            if (!ferry) return null;

            const currentPos = calculatePosition(
                ferry.pointA,
                ferry.pointB,
                ferry.speed_knots,
                ferry.last_updated || new Date(),
                ferry.status
            );

            const updatedETA = calculateETA(
                currentPos,
                ferry.pointB,
                ferry.speed_knots
            );

            await this.collection.doc(id).update({
                current_lat: currentPos.lat,
                current_lng: currentPos.lng,
                eta: updatedETA,
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            });

            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error updating ferry position:', error);
            throw error;
        }
    }

    /**
     * Update multiple ferry fields
     */
    async update(id, data) {
        try {
            const updateData = {
                ...data,
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            };

            // Remove undefined fields
            Object.keys(updateData).forEach(key => 
                updateData[key] === undefined && delete updateData[key]
            );

            await this.collection.doc(id).update(updateData);
            
            // Log the update
            const ferry = await this.getById(id);
            await this.addLog(
                'Ferry Updated',
                `${ferry.name} details updated`,
                'System'
            );

            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error updating ferry:', error);
            throw error;
        }
    }

    /**
     * Create a new ferry
     */
    async create(ferryData) {
        try {
            // Convert pointA and pointB to GeoPoints
            const pointA = new admin.firestore.GeoPoint(
                ferryData.pointA.lat,
                ferryData.pointA.lng
            );
            const pointB = new admin.firestore.GeoPoint(
                ferryData.pointB.lat,
                ferryData.pointB.lng
            );

            const newFerry = {
                name: ferryData.name,
                route: ferryData.route,
                pointA,
                pointB,
                speed_knots: ferryData.speed_knots || 20,
                status: ferryData.status || 'on_time',
                source: ferryData.source || 'manual',
                current_lat: ferryData.pointA.lat,
                current_lng: ferryData.pointA.lng,
                eta: ferryData.eta || 0,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.collection.add(newFerry);
            
            // Log creation
            await this.addLog(
                'Ferry Created',
                `${ferryData.name} added to fleet`,
                'System'
            );

            return {
                id: docRef.id,
                ...newFerry,
                created_at: new Date(),
                last_updated: new Date()
            };
        } catch (error) {
            console.error('❌ Error creating ferry:', error);
            throw error;
        }
    }

    /**
     * Delete a ferry
     */
    async delete(id) {
        try {
            const ferry = await this.getById(id);
            if (!ferry) return null;

            await this.collection.doc(id).delete();
            
            // Log deletion
            await this.addLog(
                'Ferry Deleted',
                `${ferry.name} removed from fleet`,
                'System'
            );

            return ferry;
        } catch (error) {
            console.error('❌ Error deleting ferry:', error);
            throw error;
        }
    }

    /**
     * Get ferry statistics
     */
    async getStats() {
        try {
            const ferries = await this.getAll();
            
            // Calculate average speed
            const totalSpeed = ferries.reduce((sum, f) => sum + (f.speed_knots || 0), 0);
            const avgSpeed = ferries.length > 0 ? Math.round(totalSpeed / ferries.length) : 0;

            // Calculate total distance of all routes
            let totalRouteDistance = 0;
            ferries.forEach(f => {
                if (f.pointA && f.pointB) {
                    totalRouteDistance += calculateDistance(
                        f.pointA.lat, f.pointA.lng,
                        f.pointB.lat, f.pointB.lng
                    );
                }
            });

            return {
                total: ferries.length,
                onTime: ferries.filter(f => f.status === 'on_time').length,
                delayed: ferries.filter(f => f.status === 'delayed').length,
                suspended: ferries.filter(f => f.status === 'suspended').length,
                averageSpeed: avgSpeed,
                totalRouteDistance: Math.round(totalRouteDistance),
                sourceBreakdown: {
                    overpass: ferries.filter(f => f.source === 'overpass').length,
                    manual: ferries.filter(f => f.source === 'manual').length,
                    other: ferries.filter(f => !['overpass', 'manual'].includes(f.source)).length
                }
            };
        } catch (error) {
            console.error('❌ Error getting ferry stats:', error);
            return {
                total: 0,
                onTime: 0,
                delayed: 0,
                suspended: 0,
                averageSpeed: 0,
                totalRouteDistance: 0,
                sourceBreakdown: { overpass: 0, manual: 0, other: 0 }
            };
        }
    }

    /**
     * Get ferries by status
     */
    async getByStatus(status) {
        try {
            const snapshot = await this.collection
                .where('status', '==', status)
                .get();
            
            const ferries = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                ferries.push({
                    id: doc.id,
                    ...data,
                    pointA: data.pointA ? {
                        lat: data.pointA.latitude,
                        lng: data.pointA.longitude
                    } : null,
                    pointB: data.pointB ? {
                        lat: data.pointB.latitude,
                        lng: data.pointB.longitude
                    } : null,
                    created_at: data.created_at?.toDate(),
                    last_updated: data.last_updated?.toDate()
                });
            });
            
            return ferries;
        } catch (error) {
            console.error(`❌ Error getting ferries by status ${status}:`, error);
            return [];
        }
    }

    /**
     * Get ferries by source
     */
    async getBySource(source) {
        try {
            const snapshot = await this.collection
                .where('source', '==', source)
                .get();
            
            const ferries = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                ferries.push({
                    id: doc.id,
                    ...data,
                    pointA: data.pointA ? {
                        lat: data.pointA.latitude,
                        lng: data.pointA.longitude
                    } : null,
                    pointB: data.pointB ? {
                        lat: data.pointB.latitude,
                        lng: data.pointB.longitude
                    } : null
                });
            });
            
            return ferries;
        } catch (error) {
            console.error(`❌ Error getting ferries by source ${source}:`, error);
            return [];
        }
    }

    /**
     * Add a log entry
     */
    async addLog(action, details, adminName) {
        try {
            await this.logsCollection.add({
                admin: adminName,
                action,
                details,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Error adding log:', error);
        }
    }

    /**
     * Get recent logs
     */
    async getLogs(limit = 20) {
        try {
            const snapshot = await this.logsCollection
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const logs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    admin: data.admin || 'System',
                    action: data.action || 'Unknown',
                    details: data.details || '',
                    timestamp: data.timestamp?.toDate() || new Date(),
                    time: this.formatTimeAgo(data.timestamp?.toDate() || new Date())
                });
            });
            
            return logs;
        } catch (error) {
            console.error('❌ Error getting logs:', error);
            return [];
        }
    }

    /**
     * Format timestamp to "X ago"
     */
    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return `${seconds} sec ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
        return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
    }

    /**
     * Batch update all ferry positions (call this periodically)
     */
    async batchUpdatePositions() {
        try {
            const ferries = await this.getAll();
            const batch = db.batch();
            
            for (const ferry of ferries) {
                const currentPos = calculatePosition(
                    ferry.pointA,
                    ferry.pointB,
                    ferry.speed_knots,
                    ferry.last_updated || new Date(),
                    ferry.status
                );

                const updatedETA = calculateETA(
                    currentPos,
                    ferry.pointB,
                    ferry.speed_knots
                );

                const ferryRef = this.collection.doc(ferry.id);
                batch.update(ferryRef, {
                    current_lat: currentPos.lat,
                    current_lng: currentPos.lng,
                    eta: updatedETA,
                    last_updated: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            await batch.commit();
            console.log(`✅ Updated ${ferries.length} ferry positions`);
            
            return { success: true, updated: ferries.length };
        } catch (error) {
            console.error('❌ Error batch updating positions:', error);
            return { success: false, error: error.message };
        }
    }
}

// ✅ Export the class
module.exports = Ferry;