// C:\xampp\htdocs\AquaRoute-System-web\models\cargo.js
const { db } = require('../config/firebase');
const DEBUG = require('../config/debug');

class Cargo {
    constructor() {
        this.collection = db ? db.collection('cargo') : null;
    }

    // Get all cargo with optional filters
    async getAll(filters = {}) {
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

            const snapshot = await query.orderBy('createdAt', 'desc').get();
            
            if (snapshot.empty) {
                return [];
            }

            const cargo = [];
            snapshot.forEach(doc => {
                cargo.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return cargo;
        } catch (error) {
            DEBUG.error('CARGO MODEL', 'Error getting cargo', error);
            return this.getMockData(); // Fallback to mock data
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

    // Search cargo
    async search(query) {
        try {
            if (!this.collection) {
                const mockData = this.getMockData();
                return mockData.filter(c => 
                    c.reference.toLowerCase().includes(query.toLowerCase()) ||
                    c.description.toLowerCase().includes(query.toLowerCase())
                );
            }

            // Firebase doesn't support text search natively
            // This is a simple implementation - for production, consider Algolia or similar
            const snapshot = await this.collection.get();
            
            const results = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.reference?.toLowerCase().includes(query.toLowerCase()) ||
                    data.description?.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        id: doc.id,
                        ...data
                    });
                }
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

            const docRef = await this.collection.add(newCargo);
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
                updatedAt: new Date().toISOString()
            };

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

            const snapshot = await this.collection.get();
            const total = snapshot.size;
            
            let inTransit = 0, pending = 0, delivered = 0;
            
            snapshot.forEach(doc => {
                const status = doc.data().status;
                if (status === 'in_transit') inTransit++;
                else if (status === 'pending') pending++;
                else if (status === 'delivered') delivered++;
            });

            return {
                total,
                inTransit,
                pending,
                delivered
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