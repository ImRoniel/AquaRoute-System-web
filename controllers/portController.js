//C:\xampp\htdocs\AquaRoute-System-web\controllers\portController.js 
const DEBUG = require('../config/debug');
const Port = require('../models/port');

const portController = {
  // Render ports page with first 25 ports
  getAllPorts: async (req, res) => {
    const portModel = new Port();

      try { 
          const limit = 25; // Only load 25
          const result = await portModel.getPaginated(limit);

          res.render('admin/ports', {
              title: 'Port Management - AquaRoute Admin',
              user: req.session.user,
              ports: result.ports,
              lastVisible: result.lastVisible ? result.lastVisible.id : null,
              currentPage: 'ports' 
          });

      } catch (error) {
          DEBUG.error('PORTS', 'Error loading ports', error);
          res.status(500).send('Error loading ports');
      }
  },

  // API: Search ports
  searchPorts: async (req, res) => {
    const portModel = new Port();
    const query = req.query.q || '';

    try {
      DEBUG.log('PORTS API', `Searching ports with query: "${query}"`);
      
      if (!query) {
        return res.json([]);
      }

      const ports = await portModel.searchByName(query);
      res.json(ports);
      
    } catch (error) {
      DEBUG.error('PORTS API', 'Error searching ports', error);
      res.status(500).json({ error: error.message });
    }
  },

  // API: Load more ports (pagination)
  loadMorePorts: async (req, res) => {
    const portModel = new Port();
    const lastId = req.query.lastId;

    try {
      const limit = 25;
      const result = await portModel.loadMore(limit, lastId);
      
      res.json({
        ports: result.ports,
        lastVisible: result.lastVisible ? { id: result.lastVisible.id } : null
      });
      
    } catch (error) {
      DEBUG.error('PORTS API', 'Error loading more ports', error);
      res.status(500).json({ error: error.message });
    }
  },

  // API: Toggle port status
  togglePortStatus: async (req, res) => {
    const portModel = new Port();
    const portId = req.params.id;
    const username = req.session.user.username;

    try {
      DEBUG.log('PORTS API', `User ${username} toggling status for port ${portId}`);
      
      const port = await portModel.getById(portId);
      if (!port) {
        return res.status(404).json({ error: 'Port not found' });
      }
      
      // Cycle through statuses: open -> limited -> closed -> open
      let newStatus;
      if (port.status === 'open') newStatus = 'limited';
      else if (port.status === 'limited') newStatus = 'closed';
      else newStatus = 'open';
      
      const updated = await portModel.updateStatus(portId, newStatus);
      
      DEBUG.success('PORTS API', `Port ${portId} status updated to ${newStatus}`);
      res.json({ success: true, port: updated, newStatus });
      
    } catch (error) {
      DEBUG.error('PORTS API', 'Error toggling port status', error);
      res.status(500).json({ error: error.message });
    }
  },

  addPort: async (req, res) => {
    const portModel = new Port();
    try {
      const { name, lat, lng, type, status, source, location, weather } = req.body;
      await portModel.add({ name, lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0, type, status, source, location, weather });
      res.redirect('/admin/ports');
    } catch (error) {
      DEBUG.error('PORTS', 'Error adding port', error);
      res.status(500).send('Error adding port');
    }
  },

  updatePort: async (req, res) => {
    const portModel = new Port();
    const portId = req.params.id;
    try {
      const { name, lat, lng, type, status, source, location, weather } = req.body;
      await portModel.update(portId, { name, lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0, type, status, source, location, weather });
      res.redirect('/admin/ports');
    } catch (error) {
      DEBUG.error('PORTS', 'Error updating port', error);
      res.status(500).send('Error updating port');
    }
  },

  deletePort: async (req, res) => {
    const portModel = new Port();
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