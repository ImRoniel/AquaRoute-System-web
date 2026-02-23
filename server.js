const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const webRoutes = require('./routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= Core Middleware =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'assets')));

// ================= Session =================
app.use(session({
  secret: process.env.SESSION_SECRET || 'aquaroute-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ================= View Engine =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ================= Database Bootstrap =================
(async () => {
  try {
    const db = await initializeDatabase();

    // Make db globally accessible to controllers
    app.locals.db = db;

    // Inject db into every request
    app.use((req, res, next) => {
      req.db = db;
      res.locals.user = req.session?.user || null;
      next();
    });

    // ================= Routes =================
    app.use('/', webRoutes);

    // ================= 404 =================
    app.use((req, res) => {
      res.status(404).render('landing/index', {
        title: 'Page Not Found',
        error: 'The page does not exist',
        user: req.session?.user || null
      });
    });

    // ================= Error Handler =================
    app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).render('error', {
        title: 'Server Error',
        error: 'Something went wrong.',
        user: req.session?.user || null
      });
    });

    // ================= Start Server =================
    app.listen(PORT, () => {
      console.log(` AquaRoute running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();