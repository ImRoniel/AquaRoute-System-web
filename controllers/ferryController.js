const DEBUG = require('../config/debug');
const Ferry = require('../models/ferry');

const ferryController = {
  getDashboard: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    try {
      const stats = await ferryModel.getStats();
      const ferries = await ferryModel.getAllWithCurrentPositions();
      const logs = await ferryModel.getLogs(5);
      res.render('admin/dashboard', { 
        title: 'Dashboard - AquaRoute Admin', 
        user: req.session.user, 
        stats, 
        ferries: ferries.slice(0,5), 
        logs 
      });
    } catch (error) {
      DEBUG.error('DASHBOARD', 'Error loading dashboard', error);
      res.status(500).render('error', { 
        title: 'Error', 
        error: 'Failed to load dashboard', 
        user: req.session.user 
      });
    }
  },

  getAllFerries: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    try {
      const ferries = await ferryModel.getAllWithCurrentPositions();
      res.render('admin/ferries', { 
        title: 'Ferry Management - AquaRoute Admin', 
        user: req.session.user, 
        ferries 
      });
    } catch (error) {
      DEBUG.error('FERRIES', 'Error loading ferries', error);
      res.status(500).send('Error loading ferries');
    }
  },

  addFerry: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    try {
      const { name, route, lat, lng, status, eta } = req.body;
      await ferryModel.add({ name, route, lat, lng, status, eta });
      res.redirect('/admin/ferries');
    } catch (error) {
      DEBUG.error('FERRIES', 'Error adding ferry', error);
      res.status(500).send('Error adding ferry');
    }
  },

  updateFerry: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    const ferryId = req.params.id;
    try {
      const { name, route, lat, lng, status, eta } = req.body;
      await ferryModel.update(ferryId, { name, route, lat, lng, status, eta });
      res.redirect('/admin/ferries');
    } catch (error) {
      DEBUG.error('FERRIES', 'Error updating ferry', error);
      res.status(500).send('Error updating ferry');
    }
  },

  deleteFerry: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    const ferryId = req.params.id;
    try {
      await ferryModel.delete(ferryId);
      res.redirect('/admin/ferries');
    } catch (error) {
      DEBUG.error('FERRIES', 'Error deleting ferry', error);
      res.status(500).send('Error deleting ferry');
    }
  },

  getLogs: async (req, res) => {
    const ferryModel = new Ferry(req.db);
    try {
      const logs = await ferryModel.getLogs(50);
      res.render('admin/auditLogs', { 
        title: 'Audit Logs - AquaRoute Admin', 
        user: req.session.user, 
        logs 
      });
    } catch (error) {
      DEBUG.error('LOGS', 'Error loading logs', error);
      res.status(500).send('Error loading logs');
    }
  }
};

module.exports = ferryController;