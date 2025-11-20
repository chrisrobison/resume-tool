// auth.js - Authentication endpoints
// Handles user registration, login, and anonymous sessions

const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { getInstance: getDbInstance } = require('../services/db-service');

const router = express.Router();

const SALT_ROUNDS = 10; // bcrypt salt rounds

/**
 * POST /api/auth/anonymous
 * Create an anonymous user session
 * No signup required - generates a unique ID and returns a JWT
 */
router.post('/anonymous', async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        // Generate anonymous user ID
        const userId = `anon_${uuidv4()}`;

        // Create anonymous user in database
        db.createUser(userId, {
            isAnonymous: true,
            displayName: req.body.deviceName || 'Anonymous User'
        });

        // Generate JWT token
        const token = generateToken(userId, true);

        res.json({
            success: true,
            userId,
            token,
            isAnonymous: true,
            message: 'Anonymous session created. Data will be synced using this ID.'
        });

    } catch (error) {
        console.error('Anonymous auth error:', error);
        res.status(500).json({
            error: 'Failed to create anonymous session',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/register
 * Register a new authenticated user
 *
 * Request body:
 * {
 *   email: 'user@example.com',
 *   password: 'secure-password',
 *   displayName: 'John Doe' (optional)
 * }
 */
router.post('/register', async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { email, password, displayName } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check if email already exists
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate user ID
        const userId = `user_${uuidv4()}`;

        // Create user
        db.createUser(userId, {
            email,
            passwordHash,
            displayName: displayName || email.split('@')[0],
            isAnonymous: false
        });

        // Generate JWT token
        const token = generateToken(userId, false);

        res.status(201).json({
            success: true,
            userId,
            token,
            email,
            displayName: displayName || email.split('@')[0],
            isAnonymous: false,
            message: 'Account created successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 *
 * Request body:
 * {
 *   email: 'user@example.com',
 *   password: 'secure-password'
 * }
 */
router.post('/login', async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = db.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Update last login
        db.updateLastLogin(user.id);

        // Generate JWT token
        const token = generateToken(user.id, false);

        res.json({
            success: true,
            userId: user.id,
            token,
            email: user.email,
            displayName: user.display_name,
            isAnonymous: false,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/convert
 * Convert anonymous user to authenticated user
 * Preserves all data and associates it with the new email/password
 *
 * Request body:
 * {
 *   email: 'user@example.com',
 *   password: 'secure-password',
 *   displayName: 'John Doe' (optional)
 * }
 */
router.post('/convert', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId, isAnonymous } = req.user;
        const { email, password, displayName } = req.body;

        // Only anonymous users can convert
        if (!isAnonymous) {
            return res.status(400).json({
                error: 'Already authenticated',
                message: 'This account is already authenticated'
            });
        }

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        // Check if email already exists
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Update user to authenticated
        const stmt = db.db.prepare(`
            UPDATE users
            SET email = ?, password_hash = ?, display_name = ?, is_anonymous = 0
            WHERE id = ?
        `);

        stmt.run(email, passwordHash, displayName || email.split('@')[0], userId);

        // Generate new JWT token (with isAnonymous: false)
        const token = generateToken(userId, false);

        res.json({
            success: true,
            userId,
            token,
            email,
            displayName: displayName || email.split('@')[0],
            isAnonymous: false,
            message: 'Account converted successfully. All your data has been preserved.'
        });

    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({
            error: 'Conversion failed',
            message: error.message
        });
    }
});

/**
 * GET /api/auth/status
 * Get current authentication status
 * Requires valid token
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId, isAnonymous } = req.user;

        // Get user details
        const user = db.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account no longer exists'
            });
        }

        res.json({
            success: true,
            userId: user.id,
            email: user.email || null,
            displayName: user.display_name,
            isAnonymous: isAnonymous || user.is_anonymous === 1,
            createdAt: user.created_at,
            lastLogin: user.last_login
        });

    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete token)
 * This endpoint is mainly for logging purposes
 */
router.post('/logout', authenticateToken, async (req, res) => {
    // In JWT, logout is handled client-side by deleting the token
    // We just return success here
    res.json({
        success: true,
        message: 'Logged out successfully. Please delete your token.'
    });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (extend expiration)
 */
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const { userId, isAnonymous } = req.user;

        // Generate new token
        const token = generateToken(userId, isAnonymous);

        res.json({
            success: true,
            token,
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({
            error: 'Token refresh failed',
            message: error.message
        });
    }
});

module.exports = router;
