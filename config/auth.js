// C:\xampp\htdocs\AquaRoute-System-web\config\auth.js
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

module.exports = {
  session: session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: './database'
    }),
    secret: process.env.SESSION_SECRET || '2b2399bce7fa8d49a95f8c56917a7e2ad6b3af25e772e02b43a417cb45c61906',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  })
};