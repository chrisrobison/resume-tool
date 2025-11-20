// auth.js - Authentication middleware for JWT validation
// Handles both authenticated and anonymous users

const jwt = require('jsonwebtoken');

// JWT secret (should be in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'job-tool-secret-key-change-in-production';

// JWT options
const JWT_OPTIONS = {
    expiresIn: '30d', // Token valid for 30 days
    issuer: 'job-tool'
};

/**
 * Generate JWT token for a user
 * @param {string} userId - User ID
 * @param {boolean} isAnonymous - Whether user is anonymous
 * @returns {string} JWT token
 */
function generateToken(userId, isAnonymous = true) {
    return jwt.sign(
        {
            userId,
            isAnonymous,
            type: isAnonymous ? 'anonymous' : 'authenticated'
        },
        JWT_SECRET,
        JWT_OPTIONS
    );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, { issuer: 'job-tool' });
    } catch (error) {
        return null;
    }
}

/**
 * Authentication middleware - validates JWT token
 * Supports both Authorization header and query parameter
 */
function authenticateToken(req, res, next) {
    // Get token from Authorization header or query parameter
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.query.token;

    if (!token) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'No token provided. Please login or create an anonymous session.'
        });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(403).json({
            error: 'Invalid token',
            message: 'Token is invalid or expired. Please login again.'
        });
    }

    // Attach user info to request
    req.user = {
        userId: decoded.userId,
        isAnonymous: decoded.isAnonymous
    };

    next();
}

/**
 * Optional authentication middleware - allows both authenticated and unauthenticated requests
 * If token is provided and valid, attaches user to request
 * If not, continues without user
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.query.token;

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = {
                userId: decoded.userId,
                isAnonymous: decoded.isAnonymous
            };
        }
    }

    next();
}

/**
 * Middleware to require authenticated (non-anonymous) users
 * Must be used after authenticateToken middleware
 */
function requireAuthenticated(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'This action requires authentication'
        });
    }

    if (req.user.isAnonymous) {
        return res.status(403).json({
            error: 'Authenticated account required',
            message: 'Anonymous users cannot perform this action. Please create an account.'
        });
    }

    next();
}

/**
 * Extract device ID from request
 * Can come from header or body
 */
function getDeviceId(req) {
    return req.headers['x-device-id'] || req.body?.deviceId || 'unknown';
}

/**
 * Extract device name from request
 */
function getDeviceName(req) {
    return req.headers['x-device-name'] || req.body?.deviceName || null;
}

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth,
    requireAuthenticated,
    getDeviceId,
    getDeviceName,
    JWT_SECRET
};
