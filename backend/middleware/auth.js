const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches decoded user payload { id, full_name, phone, email, role, district } to req.user
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No authentication token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'matira_secret_jwt_key_2026_cse3200';
        
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
};

/**
 * Middleware generator to enforce specific user role(s).
 * @param  {...string} allowedRoles - e.g. 'farmer', 'buyer', 'admin'
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden. Requires one of the following roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

module.exports = {
    verifyToken,
    requireRole
};
