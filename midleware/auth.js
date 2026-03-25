const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    // For AJAX/API requests, return JSON error
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ 
            success: false, 
            error: 'Session expired or unauthorized. Please log in again.' 
        });
    }

    // For standard page requests, redirect to login
    res.redirect('/login');
};

module.exports = { isAuthenticated };