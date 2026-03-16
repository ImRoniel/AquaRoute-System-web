const { db, admin } = require('../config/firebase');

class Log {
    constructor() {
        this.collection = db ? db.collection('logs') : null;
    }

    async add(adminName, action, details) {
        if (!this.collection) throw new Error('Logs collection not available');
        await this.collection.add({
            admin: adminName,
            action,
            details,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async getLogs(startDate, endDate, limit = 50) {
        if (!this.collection) return [];
        let query = this.collection.orderBy('timestamp', 'desc');
        if (startDate) query = query.where('timestamp', '>=', startDate);
        if (endDate) query = query.where('timestamp', '<=', endDate);
        const snapshot = await query.limit(limit).get();

        const logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let timestamp;
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestamp = data.timestamp.toDate();
            } else if (data.timestamp) {
                const parsed = new Date(data.timestamp);
                timestamp = isNaN(parsed) ? new Date() : parsed;
            } else {
                timestamp = new Date();
            }
            logs.push({
                id: doc.id,
                admin: data.admin || 'System',
                action: data.action || 'Unknown',
                details: data.details || '',
                timestamp,
                timeFormatted: this.formatTimeAgo(timestamp)
            });
        });
        return logs;
    }

    async clearAll() {
        if (!this.collection) throw new Error('Logs collection not available');
        const snapshot = await this.collection.get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds} sec ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
        return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
    }
}

module.exports = Log;