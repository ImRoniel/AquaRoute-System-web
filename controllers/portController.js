const DEBUG = require('../config/debug');
const Port = require('../models/port');

const portController = {
  getAllPorts: async (req, res) => {
    const portModel = new Port(req.db);
    try {
      const ports = await portModel.getAll();
      res.render('admin/ports', { 
        title: 'Port Management - AquaRoute Admin', 
        user: req.session.user, 
        ports 
      });
    } catch (error) {
      DEBUG.error('PORTS', 'Error loading ports', error);
      res.status(500).send('Error loading ports');
    }
  },

  addPort: async (req, res) => {
    const portModel = new Port(req.db);
    try {
      const { name, lat, lng, type, status, source } = req.body;
      await portModel.add({ name, lat, lng, type, status, source });
      res.redirect('/admin/ports');
    } catch (error) {
      DEBUG.error('PORTS', 'Error adding port', error);
      res.status(500).send('Error adding port');
    }
  },

  updatePort: async (req, res) => {
    const portModel = new Port(req.db);
    const portId = req.params.id;
    try {
      const { name, lat, lng, type, status, source } = req.body;
      await portModel.update(portId, { name, lat, lng, type, status, source });
      res.redirect('/admin/ports');
    } catch (error) {
      DEBUG.error('PORTS', 'Error updating port', error);
      res.status(500).send('Error updating port');
    }
  },

  deletePort: async (req, res) => {
    const portModel = new Port(req.db);
    const portId = req.params.id;
    try {
      await portModel.delete(portId);
      res.redirect('/admin/ports');
    } catch (error) {
      DEBUG.error('PORTS', 'Error deleting port', error);
      res.status(500).send('Error deleting port');
    }
  }
};

module.exports = portController;