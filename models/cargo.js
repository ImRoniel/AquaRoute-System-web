// C:\xampp\htdocs\AquaRoute-System-web\models\cargo.js
const { db } = require('../config/firebase');
const DEBUG = require('../config/debug');

class Cargo {
    constructor() {
        this.collection = db ? db.collection('cargo') : null;
    }

    // Get all cargo with optional filters and pagination
    async getAll(filters = {}, limit = 50, lastDocId = null) {
        try {
            if (!this.collection) {
                return this.getMockData();
            }

            let query = this.collection;
            
            // Apply filters
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.ferryId) {
                query = query.where('ferryId', '==', filters.ferryId);
            }

            query = query.orderBy('createdAt', 'desc');

            if (lastDocId) {
                const lastDoc = await this.collection.doc(lastDocId).get();
                if (lastDoc.exists) {
                    query = query.startAfter(lastDoc);
                }
            }

            const snapshot = await query.limit(limit).get();
            
            if (snapshot.empty) {
                return { cargo: [], lastVisible: null };
            }

            const cargo = [];
            let lastVisible = null;
            snapshot.forEach(doc => {
                cargo.push({
                    id: doc.id,
                    ...doc.data()
                });
                lastVisible = doc;
            });
            
            return {
                cargo,
                lastVisible
            };
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error getting cargo', error);
            return { cargo: this.getMockData(), lastVisible: null };
        }
    }

    // Get cargo by ID
    async getById(id) {
        try {
            if (!this.collection) {
                const mockData = this.getMockData();
                return mockData.find(c => c.id === id) || null;
            }

            const doc = await this.collection.doc(id).get();
            if (!doc.exists) {
                return null;
            }

            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error getting cargo by ID', error);
            return null;
        }
    }

    // Get cargo by reference number
    async getByReference(reference) {
        try {
            if (!this.collection) {
                const mockData = this.getMockData();
                return mockData.find(c => c.reference === reference) || null;
            }

            const snapshot = await this.collection
                .where('reference', '==', reference)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error getting cargo by reference', error);
            return null;
        }
    }

    // Search cargo (indexed prefix search)
    async search(query) {
        try {
            if (!this.collection) {
                const mockData = this.getMockData();
                return mockData.filter(c => 
                    c.reference.toLowerCase().includes(query.toLowerCase()) ||
                    c.description.toLowerCase().includes(query.toLowerCase())
                );
            }

            const searchTerm = query.toLowerCase();
            
            // Use indexed prefix query on searchName field
            const snapshot = await this.collection
                .where('searchName', '>=', searchTerm)
                .where('searchName', '<=', searchTerm + '\uf8ff')
                .limit(50)
                .get();
            
            const results = [];
            snapshot.forEach(doc => {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return results;
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error searching cargo', error);
            return [];
        }
    }

    // Create new cargo
    async create(cargoData) {
        try {
            const newCargo = {
                reference: this.generateReference(),
                description: cargoData.description,
                weight: parseFloat(cargoData.weight) || 0,
                ferryId: cargoData.ferryId || null,
                status: cargoData.status || 'pending',
                searchName: `${this.generateReference().toLowerCase()} ${cargoData.description.toLowerCase()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: cargoData.createdBy || 'system'
            };

            if (!this.collection) {
                return {
                    id: 'mock-' + Date.now(),
                    ...newCargo
                };
            }

            const docRef = await this.collection.add({
                ...newCargo,
                reference: this.generateReference() // Re-generate to ensure uniqueness if needed or keep existing
            });
            return {
                id: docRef.id,
                ...newCargo
            };
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error creating cargo', error);
            throw error;
        }
    }

    // Update cargo
    async update(id, cargoData) {
        try {
            const updateData = {
                description: cargoData.description,
                weight: parseFloat(cargoData.weight) || 0,
                ferryId: cargoData.ferryId || null,
                status: cargoData.status,
                searchName: `${(cargoData.reference || '').toLowerCase()} ${(cargoData.description || '').toLowerCase()}`,
                updatedAt: new Date().toISOString()
            };

            // Remove undefined fields
            Object.keys(updateData).forEach(key => 
                updateData[key] === undefined && delete updateData[key]
            );

            if (!this.collection) {
                return true;
            }

            await this.collection.doc(id).update(updateData);
            return true;
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error updating cargo', error);
            throw error;
        }
    }

    // Delete cargo
    async delete(id) {
        try {
            if (!this.collection) {
                return true;
            }

            await this.collection.doc(id).delete();
            return true;
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error deleting cargo', error);
            throw error;
        }
    }

    // Update cargo status
    async updateStatus(id, status) {
        try {
            if (!this.collection) {
                return true;
            }

            await this.collection.doc(id).update({
                status,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error updating cargo status', error);
            throw error;
        }
    }

    // Get cargo statistics
    async getStats() {
        try {
            if (!this.collection) {
                const mockData = this.getMockData();
                return {
                    total: mockData.length,
                    inTransit: mockData.filter(c => c.status === 'in_transit').length,
                    pending: mockData.filter(c => c.status === 'pending').length,
                    delivered: mockData.filter(c => c.status === 'delivered').length
                };
            }

            const [totalSnap, inTransitSnap, pendingSnap, deliveredSnap] = await Promise.all([
                this.collection.count().get(),
                this.collection.where('status', '==', 'in_transit').count().get(),
                this.collection.where('status', '==', 'pending').count().get(),
                this.collection.where('status', '==', 'delivered').count().get()
            ]);

            return {
                total: totalSnap.data().count,
                inTransit: inTransitSnap.data().count,
                pending: pendingSnap.data().count,
                delivered: deliveredSnap.data().count
            };
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error getting stats', error);
            return { total: 0, inTransit: 0, pending: 0, delivered: 0 };
        }
    }

    // Generate unique reference number
    generateReference() {
        const prefix = 'CRG';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${timestamp}-${random}`;
    }

    // Mock data for development
    getMockData() {
        return [
            {
                id: 'mock-1',
                reference: 'CRG-001-0001',
                description: 'Electronics shipment - Smartphones and laptops',
                weight: 250.5,
                ferryId: 'ferry-1',
                ferryName: 'Starlite',
                status: 'in_transit',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'mock-2',
                reference: 'CRG-002-0002',
                description: 'Food supplies - Rice and canned goods',
                weight: 500.0,
                ferryId: 'ferry-2',
                ferryName: '2GO Ferry',
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'mock-3',
                reference: 'CRG-003-0003',
                description: 'Construction materials - Cement and steel',
                weight: 1200.0,
                ferryId: 'ferry-3',
                ferryName: 'FastCat Manila',
                status: 'delivered',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }
}

module.exports = Cargo;