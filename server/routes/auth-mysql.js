// auth-mysql.js - Enhanced authentication routes for MySQL backend
// Handles email verification, password reset, registration, login
// This version works with MySQL database (for monetization features)

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const SALT_ROUNDS = 10;

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default keyGenerator which properly handles IPv6
    validate: { xForwardedForHeader: false }
});

// Stricter rate limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: { error: 'Too many password reset attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default keyGenerator which properly handles IPv6
    validate: { xForwardedForHeader: false }
});

/**
 * Generate cryptographically secure user ID
 */
function generateSecureUserId() {
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(6).toString('base64url');
    return `user_${timestamp}_${randomPart}`;
}

/**
 * Initialize authentication routes
 * @param {Object} db - MySQL Database service
 * @param {Object} emailService - Email service
 */
function initializeAuthRoutes(db, emailService) {

    // ============================================================
    // Registration & Login
    // ============================================================

    /**
     * POST /api/auth/register
     * Register new user with email/password
     */
    router.post('/register', authLimiter, async (req, res) => {
        try {
            const { email, password, displayName } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            // Check if user exists
            const existingUser = await db.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            // Create user with cryptographically secure ID
            const userId = generateSecureUserId();

            await db.pool.execute(
                `INSERT INTO users (
                    id, email, password_hash, display_name, email_verified,
                    subscription_tier, subscription_status, created_at, last_login_at
                ) VALUES (?, ?, ?, ?, FALSE, 'free', 'active', NOW(), NOW())`,
                [userId, email, passwordHash, displayName || 'User']
            );

            // Initialize usage tracking
            await db.pool.execute(
                `INSERT INTO usage_tracking (user_id, jobs_limit, resumes_limit, jobs_count, resumes_count, api_calls_count)
                 VALUES (?, 10, 1, 0, 0, 0)`,
                [userId]
            );

            // Send verification email
            try {
                await emailService.sendVerificationEmail(userId, email);
            } catch (emailError) {
                console.error('⚠️ Failed to send verification email:', emailError);
                // Continue anyway - user can request resend
            }

            // Log registration
            await db.pool.execute(
                `INSERT INTO activity_logs (user_id, activity_type, details)
                 VALUES (?, 'user_registered', ?)`,
                [userId, JSON.stringify({ method: 'email', timestamp: new Date() })]
            );

            // Generate JWT token
            const token = generateToken({ id: userId, email });

            console.log(`✅ User registered: ${email}`);

            res.status(201).json({
                success: true,
                message: 'Account created! Please verify your email.',
                token,
                user: {
                    id: userId,
                    email,
                    emailVerified: false,
                    displayName: displayName || 'User',
                    tier: 'free'
                }
            });

        } catch (error) {
            console.error('❌ Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    /**
     * POST /api/auth/login
     * Login with email/password
     */
    router.post('/login', authLimiter, async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            // Get user
            const user = await db.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check password
            if (!user.password_hash) {
                return res.status(401).json({
                    error: 'Please login with OAuth provider',
                    oauthProvider: user.oauth_provider
                });
            }

            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Update last login
            await db.pool.execute(
                `UPDATE users SET last_login_at = NOW() WHERE id = ?`,
                [user.id]
            );

            // Log login
            await db.pool.execute(
                `INSERT INTO activity_logs (user_id, activity_type, details)
                 VALUES (?, 'user_login', ?)`,
                [user.id, JSON.stringify({ method: 'email', timestamp: new Date() })]
            );

            // Generate JWT token
            const token = generateToken({ id: user.id, email: user.email });

            console.log(`✅ User logged in: ${email}`);

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    emailVerified: user.email_verified,
                    displayName: user.display_name,
                    tier: user.subscription_tier,
                    avatarUrl: user.avatar_url
                }
            });

        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // ============================================================
    // Email Verification
    // ============================================================

    /**
     * POST /api/auth/resend-verification
     * Resend email verification link
     */
    router.post('/resend-verification', authLimiter, async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email required' });
            }

            // Get user
            const user = await db.getUserByEmail(email);
            if (!user) {
                // Don't reveal if email exists
                return res.json({ success: true, message: 'If the email exists, verification link sent' });
            }

            if (user.email_verified) {
                return res.status(400).json({ error: 'Email already verified' });
            }

            // Send verification email
            await emailService.sendVerificationEmail(user.id, email);

            console.log(`✅ Verification email resent to: ${email}`);

            res.json({
                success: true,
                message: 'Verification email sent'
            });

        } catch (error) {
            console.error('❌ Resend verification error:', error);
            res.status(500).json({ error: 'Failed to send verification email' });
        }
    });

    /**
     * GET /api/auth/verify-email
     * Verify email with token
     */
    router.get('/verify-email', async (req, res) => {
        try {
            const { token } = req.query;

            if (!token) {
                return res.status(400).json({ error: 'Token required' });
            }

            // Verify token
            const result = await emailService.verifyEmailToken(token);

            if (!result.valid) {
                return res.status(400).json({ error: result.error });
            }

            console.log(`✅ Email verified for user: ${result.userId}`);

            res.json({
                success: true,
                message: 'Email verified successfully!',
                userId: result.userId
            });

        } catch (error) {
            console.error('❌ Email verification error:', error);
            res.status(500).json({ error: 'Email verification failed' });
        }
    });

    // ============================================================
    // Password Reset
    // ============================================================

    /**
     * POST /api/auth/forgot-password
     * Request password reset link
     */
    router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email required' });
            }

            // Get user
            const user = await db.getUserByEmail(email);
            if (!user) {
                // Don't reveal if email exists
                return res.json({ success: true, message: 'If the email exists, reset link sent' });
            }

            if (!user.password_hash) {
                // OAuth-only user
                return res.status(400).json({
                    error: 'This account uses OAuth login',
                    oauthProvider: user.oauth_provider
                });
            }

            // Send reset email
            await emailService.sendPasswordResetEmail(user.id, email);

            console.log(`✅ Password reset email sent to: ${email}`);

            res.json({
                success: true,
                message: 'Password reset link sent to your email'
            });

        } catch (error) {
            console.error('❌ Forgot password error:', error);
            res.status(500).json({ error: 'Failed to send reset link' });
        }
    });

    /**
     * POST /api/auth/reset-password
     * Reset password with token
     */
    router.post('/reset-password', passwordResetLimiter, async (req, res) => {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token and new password required' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            // Verify token
            const result = await emailService.verifyPasswordResetToken(token);

            if (!result.valid) {
                return res.status(400).json({ error: result.error });
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            await db.pool.execute(
                `UPDATE users SET password_hash = ? WHERE id = ?`,
                [passwordHash, result.userId]
            );

            // Delete token
            await emailService.deletePasswordResetToken(token);

            // Log password change
            await db.pool.execute(
                `INSERT INTO activity_logs (user_id, activity_type, details)
                 VALUES (?, 'password_reset', ?)`,
                [result.userId, JSON.stringify({ timestamp: new Date() })]
            );

            console.log(`✅ Password reset for user: ${result.userId}`);

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            console.error('❌ Password reset error:', error);
            res.status(500).json({ error: 'Password reset failed' });
        }
    });

    // ============================================================
    // Account Management
    // ============================================================

    /**
     * POST /api/auth/change-password
     * Change password (requires authentication)
     */
    router.post('/change-password', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new password required' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'New password must be at least 8 characters' });
            }

            // Get user
            const user = await db.getUserById(userId);
            if (!user.password_hash) {
                return res.status(400).json({ error: 'Please set a password first' });
            }

            // Verify current password
            const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            await db.pool.execute(
                `UPDATE users SET password_hash = ? WHERE id = ?`,
                [passwordHash, userId]
            );

            // Log password change
            await db.pool.execute(
                `INSERT INTO activity_logs (user_id, activity_type, details)
                 VALUES (?, 'password_changed', ?)`,
                [userId, JSON.stringify({ timestamp: new Date() })]
            );

            console.log(`✅ Password changed for user: ${userId}`);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('❌ Change password error:', error);
            res.status(500).json({ error: 'Password change failed' });
        }
    });

    /**
     * GET /api/auth/me
     * Get current user info (requires authentication)
     */
    router.get('/me', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const user = await db.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                emailVerified: user.email_verified,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                tier: user.subscription_tier,
                subscriptionStatus: user.subscription_status,
                oauthProvider: user.oauth_provider,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            });

        } catch (error) {
            console.error('❌ Get user info error:', error);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    });

    // ============================================================
    // GDPR Compliance
    // ============================================================

    /**
     * GET /api/auth/export-data
     * Export all user data (GDPR compliance)
     */
    router.get('/export-data', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            console.log(`📦 Exporting data for user: ${userId}`);

            // Get user profile
            const user = await db.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Get subscription data
            const [subscriptions] = await db.pool.execute(
                `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );

            // Get payment transactions
            const [payments] = await db.pool.execute(
                `SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );

            // Get usage tracking
            const [usage] = await db.pool.execute(
                `SELECT * FROM usage_tracking WHERE user_id = ?`,
                [userId]
            );

            // Get activity logs (last 1000 entries)
            const [activityLogs] = await db.pool.execute(
                `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000`,
                [userId]
            );

            // Get API keys (if any)
            const [apiKeys] = await db.pool.execute(
                `SELECT key_prefix, name, scopes, created_at, last_used_at, expires_at
                 FROM api_keys WHERE user_id = ? AND revoked = FALSE`,
                [userId]
            );

            // Construct complete data export
            const exportData = {
                export_info: {
                    generated_at: new Date().toISOString(),
                    user_id: userId,
                    format_version: '1.0'
                },
                profile: {
                    id: user.id,
                    email: user.email,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url,
                    email_verified: user.email_verified,
                    oauth_provider: user.oauth_provider,
                    created_at: user.created_at,
                    last_login_at: user.last_login_at
                },
                subscription: {
                    current_tier: user.subscription_tier,
                    current_status: user.subscription_status,
                    stripe_customer_id: user.stripe_customer_id,
                    history: subscriptions.map(sub => ({
                        tier: sub.tier,
                        status: sub.status,
                        billing_cycle: sub.billing_cycle,
                        amount_cents: sub.amount_cents,
                        currency: sub.currency,
                        started_at: sub.current_period_start,
                        ends_at: sub.current_period_end,
                        canceled_at: sub.canceled_at
                    }))
                },
                payments: {
                    total_transactions: payments.length,
                    transactions: payments.map(payment => ({
                        transaction_type: payment.transaction_type,
                        amount_cents: payment.amount_cents,
                        currency: payment.currency,
                        status: payment.status,
                        description: payment.description,
                        created_at: payment.created_at
                    }))
                },
                usage: usage[0] ? {
                    jobs_count: usage[0].jobs_count,
                    jobs_limit: usage[0].jobs_limit,
                    resumes_count: usage[0].resumes_count,
                    resumes_limit: usage[0].resumes_limit,
                    api_calls_count: usage[0].api_calls_count,
                    storage_used_mb: usage[0].storage_used_mb,
                    last_updated: usage[0].last_updated
                } : null,
                activity_logs: {
                    total_entries: activityLogs.length,
                    note: 'Last 1000 entries included',
                    logs: activityLogs.map(log => ({
                        activity_type: log.activity_type,
                        details: log.details,
                        created_at: log.created_at
                    }))
                },
                api_keys: {
                    total_keys: apiKeys.length,
                    keys: apiKeys.map(key => ({
                        key_prefix: key.key_prefix,
                        name: key.name,
                        scopes: key.scopes,
                        created_at: key.created_at,
                        last_used_at: key.last_used_at,
                        expires_at: key.expires_at
                    }))
                },
                notes: [
                    'This export contains all personal data we store about you.',
                    'Encrypted application data (jobs, resumes) is stored locally in your browser and not included here.',
                    'For Pro/Enterprise users, encrypted cloud backups are stored but cannot be decrypted by us (zero-knowledge encryption).',
                    'To download your encrypted application data, use the "Export Data" feature in the app settings.'
                ]
            };

            // Log data export
            await db.pool.execute(
                `INSERT INTO activity_logs (user_id, activity_type, details)
                 VALUES (?, 'data_export', ?)`,
                [userId, JSON.stringify({ timestamp: new Date(), ip: req.ip })]
            );

            console.log(`✅ Data exported for user: ${userId}`);

            // Set headers for download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="jobtool-data-export-${userId}-${Date.now()}.json"`);

            res.json(exportData);

        } catch (error) {
            console.error('❌ Data export error:', error);
            res.status(500).json({ error: 'Data export failed' });
        }
    });

    /**
     * DELETE /api/auth/delete-account
     * Delete account and all data (GDPR "right to be forgotten")
     */
    router.delete('/delete-account', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const { password, confirm } = req.body;

            // Require confirmation
            if (confirm !== 'DELETE MY ACCOUNT') {
                return res.status(400).json({
                    error: 'Confirmation required',
                    message: 'Set confirm field to "DELETE MY ACCOUNT" to proceed'
                });
            }

            // Get user
            const user = await db.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verify password (if they have one)
            if (user.password_hash) {
                if (!password) {
                    return res.status(400).json({ error: 'Password required for deletion' });
                }

                const passwordValid = await bcrypt.compare(password, user.password_hash);
                if (!passwordValid) {
                    return res.status(401).json({ error: 'Incorrect password' });
                }
            }

            console.log(`🗑️ Deleting account for user: ${userId}`);

            // Cancel active subscription (if any)
            if (user.stripe_customer_id && user.subscription_status === 'active') {
                try {
                    const stripeService = require('../services/stripe-service');
                    await stripeService.cancelSubscription(user.stripe_customer_id);
                } catch (error) {
                    console.error('⚠️ Failed to cancel Stripe subscription:', error);
                    // Continue with deletion anyway
                }
            }

            // Delete all user data (cascade will handle related tables)
            await db.pool.execute(`DELETE FROM users WHERE id = ?`, [userId]);

            console.log(`✅ Account deleted: ${userId}`);

            res.json({
                success: true,
                message: 'Account and all data permanently deleted'
            });

        } catch (error) {
            console.error('❌ Account deletion error:', error);
            res.status(500).json({ error: 'Account deletion failed' });
        }
    });

    return router;
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign(
        { id: user.id, email: user.email },
        secret,
        { expiresIn }
    );
}

module.exports = initializeAuthRoutes;
