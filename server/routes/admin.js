// admin.js - Admin dashboard API routes
// Requires admin authentication
// Handles user management, subscriptions, analytics, support

const express = require('express');
const router = express.Router();

/**
 * Initialize admin routes
 * @param {AdminService} adminService - Admin service instance
 */
function initializeAdminRoutes(adminService) {

    // ============================================================
    // Middleware: Require Admin Role
    // ============================================================

    const requireAdmin = (req, res, next) => {
        // Check if user is admin
        // TODO: Implement proper admin role checking
        const isAdmin = req.user?.email === process.env.ADMIN_EMAIL || req.user?.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }

        next();
    };

    // Apply admin middleware to all routes
    router.use(requireAdmin);

    // ============================================================
    // User Management
    // ============================================================

    /**
     * GET /api/admin/users
     * Get all users with pagination and filtering
     */
    router.get('/users', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                search = '',
                tier = null,
                status = null,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = req.query;

            // Validate and sanitize numeric parameters to prevent type confusion
            const validatedPage = Math.max(1, Math.floor(Number(page)) || 1);
            const validatedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 50));

            // Validate sortBy to prevent SQL injection
            const allowedSortFields = ['created_at', 'email', 'display_name', 'subscription_tier', 'last_login_at'];
            const validatedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

            // Validate sortOrder
            const validatedSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

            // Validate tier and status if provided
            const allowedTiers = ['free', 'pro', 'enterprise', null];
            const validatedTier = allowedTiers.includes(tier) ? tier : null;

            const allowedStatuses = ['active', 'suspended', 'cancelled', null];
            const validatedStatus = allowedStatuses.includes(status) ? status : null;

            const result = await adminService.getUsers({
                page: validatedPage,
                limit: validatedLimit,
                search: String(search || '').substring(0, 100), // Limit search length
                tier: validatedTier,
                status: validatedStatus,
                sortBy: validatedSortBy,
                sortOrder: validatedSortOrder
            });

            res.json(result);

        } catch (error) {
            console.error('❌ Admin get users error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/admin/users/:userId
     * Get detailed user information
     */
    router.get('/users/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const details = await adminService.getUserDetails(userId);

            res.json(details);

        } catch (error) {
            console.error('❌ Admin get user details error:', error);
            res.status(error.message === 'User not found' ? 404 : 500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/admin/users/:userId/tier
     * Update user subscription tier
     */
    router.put('/users/:userId/tier', async (req, res) => {
        try {
            const { userId } = req.params;
            const { tier } = req.body;

            if (!['free', 'pro', 'enterprise'].includes(tier)) {
                return res.status(400).json({ error: 'Invalid tier' });
            }

            const result = await adminService.updateUserTier(userId, tier);

            res.json(result);

        } catch (error) {
            console.error('❌ Admin update tier error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/admin/users/:userId/suspend
     * Suspend user account
     */
    router.post('/users/:userId/suspend', async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'Reason required' });
            }

            const result = await adminService.suspendUser(userId, reason);

            res.json(result);

        } catch (error) {
            console.error('❌ Admin suspend user error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/admin/users/:userId
     * Delete user account (GDPR compliance)
     */
    router.delete('/users/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { confirm } = req.query;

            // Validate userId to prevent type confusion attacks
            if (typeof userId !== 'string' || !userId.match(/^[\w-]+$/)) {
                return res.status(400).json({
                    error: 'Invalid user ID format'
                });
            }

            if (confirm !== 'DELETE') {
                return res.status(400).json({
                    error: 'Confirmation required',
                    message: 'Add ?confirm=DELETE to confirm deletion'
                });
            }

            const result = await adminService.deleteUser(String(userId));

            res.json(result);

        } catch (error) {
            console.error('❌ Admin delete user error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/admin/users/search
     * Search users
     */
    router.get('/users/search', async (req, res) => {
        try {
            const { q } = req.query;

            // Ensure q is a string to prevent type confusion (e.g., q being an array)
            if (typeof q !== 'string') {
                return res.status(400).json({ error: 'Search query too short (min 2 characters)' });
            }

            const query = q.trim();

            if (!query || query.length < 2) {
                return res.status(400).json({ error: 'Search query too short (min 2 characters)' });
            }

            const users = await adminService.searchUsers(query);

            res.json({ users });

        } catch (error) {
            console.error('❌ Admin search users error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Subscription Management
    // ============================================================

    /**
     * GET /api/admin/subscriptions
     * Get all subscriptions
     */
    router.get('/subscriptions', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                tier = null,
                status = null
            } = req.query;

            const result = await adminService.getSubscriptions({
                page: parseInt(page),
                limit: parseInt(limit),
                tier,
                status
            });

            res.json(result);

        } catch (error) {
            console.error('❌ Admin get subscriptions error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/admin/subscriptions/:userId/cancel
     * Cancel user subscription
     */
    router.post('/subscriptions/:userId/cancel', async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const result = await adminService.cancelSubscription(userId, reason);

            res.json(result);

        } catch (error) {
            console.error('❌ Admin cancel subscription error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/admin/payments/:paymentId/refund
     * Issue refund for payment
     */
    router.post('/payments/:paymentId/refund', async (req, res) => {
        try {
            const { paymentId } = req.params;
            const { amount, reason } = req.body;

            const result = await adminService.issueRefund(
                parseInt(paymentId),
                amount ? parseInt(amount) : null,
                reason
            );

            res.json(result);

        } catch (error) {
            console.error('❌ Admin issue refund error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Analytics & Reporting
    // ============================================================

    /**
     * GET /api/admin/analytics/dashboard
     * Get dashboard analytics
     */
    router.get('/analytics/dashboard', async (req, res) => {
        try {
            const analytics = await adminService.getDashboardAnalytics();

            res.json(analytics);

        } catch (error) {
            console.error('❌ Admin get analytics error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/admin/analytics/user-growth
     * Get user growth chart data
     */
    router.get('/analytics/user-growth', async (req, res) => {
        try {
            const { days = 30 } = req.query;

            const data = await adminService.getUserGrowthData(parseInt(days));

            res.json({ data });

        } catch (error) {
            console.error('❌ Admin get user growth error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/admin/analytics/revenue
     * Get revenue chart data
     */
    router.get('/analytics/revenue', async (req, res) => {
        try {
            const { days = 30 } = req.query;

            const data = await adminService.getRevenueData(parseInt(days));

            res.json({ data });

        } catch (error) {
            console.error('❌ Admin get revenue error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Support Tools
    // ============================================================

    /**
     * GET /api/admin/activity
     * Get recent activity logs
     */
    router.get('/activity', async (req, res) => {
        try {
            const {
                page = 1,
                limit = 100,
                userId = null,
                activityType = null
            } = req.query;

            const activities = await adminService.getRecentActivity({
                page: parseInt(page),
                limit: parseInt(limit),
                userId,
                activityType
            });

            res.json({ activities });

        } catch (error) {
            console.error('❌ Admin get activity error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/admin/audit-log
     * Get admin audit log
     */
    router.get('/audit-log', async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;

            const logs = await adminService.getAuditLog({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({ logs });

        } catch (error) {
            console.error('❌ Admin get audit log error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // System Health
    // ============================================================

    /**
     * GET /api/admin/health
     * Get system health status
     */
    router.get('/health', async (req, res) => {
        try {
            // Check database connection
            const [dbTest] = await adminService.db.pool.execute('SELECT 1');
            const dbHealthy = dbTest.length > 0;

            // Check Stripe connection
            let stripeHealthy = false;
            try {
                await adminService.stripeService.stripe.balance.retrieve();
                stripeHealthy = true;
            } catch (error) {
                console.error('⚠️ Stripe health check failed:', error);
            }

            const overall = dbHealthy && stripeHealthy ? 'healthy' : 'degraded';

            res.json({
                status: overall,
                services: {
                    database: dbHealthy ? 'healthy' : 'unhealthy',
                    stripe: stripeHealthy ? 'healthy' : 'unhealthy'
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Admin health check error:', error);
            res.status(500).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });

    /**
     * GET /api/admin/stats
     * Quick stats summary
     */
    router.get('/stats', async (req, res) => {
        try {
            const [stats] = await adminService.db.pool.execute(`
                SELECT
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM users WHERE subscription_tier = 'pro') as pro_users,
                    (SELECT COUNT(*) FROM users WHERE subscription_tier = 'enterprise') as enterprise_users,
                    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
                    (SELECT SUM(amount_cents) FROM subscriptions WHERE status = 'active') as mrr,
                    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as signups_7d,
                    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as signups_30d
            `);

            res.json(stats[0]);

        } catch (error) {
            console.error('❌ Admin get stats error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = initializeAdminRoutes;
