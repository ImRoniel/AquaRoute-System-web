const DEBUG = require('../config/debug');
const Ferry = require('../models/ferry');
const Log = require('../models/log');
const Users = require('../models/users');
const { db } = require('../config/firebase'); // ✅ Firestore instance

// Helper for audit logs – uses Log model
const logAudit = async (adminName, action, details) => {
    try {
        const logModel = new Log();
        await logModel.add(adminName, action, details);
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

const ferryController = {
    getDashboard: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        try {
            const stats = await ferryModel.getStats();
            const totalUsers = await Users.getCount();
            
            stats.totalFleet = stats.total;
            stats.totalUsers = totalUsers;

            const ferries = await ferryModel.getAllWithCurrentPositions();
            const logs = await ferryModel.getLogs(5);
            res.render('admin/dashboard', {
                title: 'Dashboard - AquaRoute Admin',
                user: req.session.user,
                stats,
                ferries: ferries.slice(0, 5),
                logs,
                currentPage: 'dashboard'
            });
        } catch (error) {
            DEBUG.error('DASHBOARD', 'Error loading dashboard', error);
            res.status(500).render('error', {
                title: 'Error',
                error: 'Failed to load dashboard',
                user: req.session.user,
                currentPage: 'error'
            });
        }
    },

    getAllFerries: async (req, res) => {
        const ferryModel = new Ferry();
        try {
            const { status, route } = req.query;
            const filters = {};
            if (status) filters.status = status;
            if (route) filters.route = route;

            const ferries = await ferryModel.getAll(100, filters);
            
            // Process current positions
            const ferriesWithPositions = [];
            const { calculatePosition, calculateETA, calculateDistance } = require('../utils/ferryMovement');

            for (const f of ferries) {
                const currentPos = calculatePosition(
                    f.pointA,
                    f.pointB,
                    f.speed_knots,
                    f.last_updated || new Date(),
                    f.status
                );
                const updatedETA = calculateETA(currentPos, f.pointB, f.speed_knots);
                // Prefer stored Firestore ETA (admin-set) over the dynamically computed value
                const displayETA = f.eta || updatedETA;
                ferriesWithPositions.push({ ...f, current_lat: currentPos.lat, current_lng: currentPos.lng, eta: displayETA });
            }

            res.render('admin/ferries', {
                title: 'Ferry Management - AquaRoute Admin',
                user: req.session.user,
                ferries: ferriesWithPositions,
                currentPage: 'ferries',
                query: req.query
            });
        } catch (error) {
            DEBUG.error('FERRIES', 'Error loading ferries', error);
            res.render('admin/ferries', {
                title: 'Ferry Management - AquaRoute Admin',
                user: req.session.user,
                ferries: [],
                currentPage: 'ferries',
                error: 'Failed to load ferries',
                query: {}
            });
        }
    },

    updateFerry: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        const ferryId = req.params.id;
        try {
            const { name, route, speed_knots, status, eta, pointA_lat, pointA_lng, pointB_lat, pointB_lng } = req.body;
            
            const updateProps = { name, route, status };
            if (speed_knots !== undefined && speed_knots !== '') updateProps.speed_knots = parseInt(speed_knots);
            if (eta !== undefined && eta !== '') updateProps.eta = parseInt(eta);

            const { admin } = require('../config/firebase');

            if (pointA_lat !== undefined && pointA_lat !== '' && pointA_lng !== undefined && pointA_lng !== '') {
                const lat = parseFloat(pointA_lat);
                const lng = parseFloat(pointA_lng);
                updateProps.pointA = new admin.firestore.GeoPoint(lat, lng);
                updateProps.current_lat = lat;
                updateProps.current_lng = lng;
            }
            if (pointB_lat !== undefined && pointB_lat !== '' && pointB_lng !== undefined && pointB_lng !== '') {
                updateProps.pointB = new admin.firestore.GeoPoint(parseFloat(pointB_lat), parseFloat(pointB_lng));
            }

            // --- ANIMATION SYNC FIX ---
            // If we have both points and an ETA, generate the timing fields for the Android Live Map animation.
            // This ensures manual updates behave the same way as the automated Overpass refresh.
            if (updateProps.pointA && updateProps.pointB && updateProps.eta) {
                const now = Date.now();
                updateProps.startTime = now;
                updateProps.endTime = now + (updateProps.eta * 60 * 1000);
                updateProps.routePoints = [
                    { lat: updateProps.pointA.latitude, lng: updateProps.pointA.longitude },
                    { lat: updateProps.pointB.latitude, lng: updateProps.pointB.longitude }
                ];
                updateProps.last_updated = new Date().toISOString();
            }

            await ferryModel.update(ferryId, updateProps);
            
            const adminName = req.session?.user?.username || 'System';
            await logAudit(adminName, 'UPDATE_FERRY', `Updated ferry ID: ${ferryId}`);
            
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({ success: true, message: 'Ferry updated successfully' });
            } else {
                res.redirect('/admin/ferries');
            }
        } catch (error) {
            DEBUG.error('FERRIES', 'Error updating ferry', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({ success: false, error: 'Error updating ferry: ' + error.message });
            } else {
                res.status(500).send('Error updating ferry');
            }
        }
    },

    deleteFerry: async (req, res) => {
        const ferryModel = new Ferry(req.db);
        const ferryId = req.params.id;
        try {
            await ferryModel.delete(ferryId);
            
            const adminName = req.session?.user?.username || 'System';
            await logAudit(adminName, 'DELETE_FERRY', `Deleted ferry ID: ${ferryId}`);
            
            if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.json({ success: true, message: 'Ferry deleted successfully' });
            }
            res.redirect('/admin/ferries');
        } catch (error) {
            DEBUG.error('FERRIES', 'Error deleting ferry', error);
            if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.status(500).json({ success: false, error: 'Error deleting ferry: ' + error.message });
            }
            res.status(500).send('Error deleting ferry');
        }
    },


    showAddForm: async (req, res) => {
        res.render('admin/add-ferry', {
            title: 'Add New Ferry - AquaRoute Admin',
            user: req.session.user,
            currentPage: 'ferries',
            error: null,
            formData: {}
        });
    },

    addFerry: async (req, res) => {
        try {
            const { name, route, speed_knots, status, eta, pointA_lat, pointA_lng, pointB_lat, pointB_lng, source } = req.body;

            if (!name || !route || !pointA_lat || !pointA_lng || !pointB_lat || !pointB_lng) {
                return res.redirect('/admin/ferries?error=' + encodeURIComponent('Name, route, and coordinates are required.'));
            }

            const FerryModel = new (require('../models/ferry'))();

            const now = Date.now();
            const finalEta = parseInt(eta) || 60;
            const latA = parseFloat(pointA_lat);
            const lngA = parseFloat(pointA_lng);
            const latB = parseFloat(pointB_lat);
            const lngB = parseFloat(pointB_lng);

            const newFerry = await FerryModel.create({
                name,
                route,
                speed_knots: parseInt(speed_knots) || 20,
                status: status || 'on_time',
                eta: finalEta,
                pointA: { lat: latA, lng: lngA },
                pointB: { lat: latB, lng: lngB },
                current_lat: latA,
                current_lng: lngA,
                startTime: now,
                endTime: now + (finalEta * 60 * 1000),
                routePoints: [
                    { lat: latA, lng: lngA },
                    { lat: latB, lng: lngB }
                ],
                source: source || 'manual'
            });

            const adminName = req.session?.user?.username || 'System';
            await logAudit(adminName, 'ADD_FERRY', `Added ferry: ${name}`);

            res.redirect('/admin/ferries?success=Ferry added successfully');
        } catch (error) {
            console.error('Error adding ferry:', error);
            res.redirect('/admin/ferries?error=' + encodeURIComponent('Failed to add ferry: ' + error.message));
        }
    },

    toggleStatus: async (req, res) => {
        const ferryModel = new Ferry();
        const id = req.params.id;
        try {
            const ferry = await ferryModel.getById(id);
            if (!ferry) return res.status(404).json({ success: false, error: 'Ferry not found' });

            const statusWorkflow = ['on_time', 'delayed', 'suspended'];
            const currentIndex = statusWorkflow.indexOf(ferry.status);
            const nextStatus = statusWorkflow[(currentIndex + 1) % statusWorkflow.length];

            await ferryModel.updateStatus(id, nextStatus);
            
            const adminName = req.session?.user?.username || 'System';
            await logAudit(adminName, 'TOGGLE_FERRY_STATUS', `Toggled status for ferry ${id} to ${nextStatus}`);

            res.json({ success: true, newStatus: nextStatus });
        } catch (error) {
            DEBUG.error('FERRIES', 'Error toggling status', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = ferryController;