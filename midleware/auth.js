// C:\xampp\htdocs\AquaRoute-System-web\midleware\auth.js
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
};

module.exports = { isAuthenticated };