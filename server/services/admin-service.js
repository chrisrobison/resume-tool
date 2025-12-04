// admin-service.js - Admin operations service
// Handles user management, subscription management, analytics, support

class AdminService {
    constructor(db, stripeService) {
        this.db = db;
        this.stripeService = stripeService;
    }

    // ============================================================
    // User Management
    // ============================================================

    /**
     * Get all users with pagination and filtering
     */
    async getUsers({ page = 1, limit = 50, search = '', tier = null, status = null, sortBy = 'created_at', sortOrder = 'DESC' }) {
        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];

            // Search filter
            if (search) {
                whereConditions.push('(email LIKE ? OR display_name LIKE ? OR id LIKE ?)');
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            // Tier filter
            if (tier) {
                whereConditions.push('subscription_tier = ?');
                params.push(tier);
            }

            // Status filter
            if (status) {
                whereConditions.push('subscription_status = ?');
                params.push(status);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get total count
            const [countResult] = await this.db.pool.execute(
                `SELECT COUNT(*) as total FROM users ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get users
            const [users] = await this.db.pool.execute(
                `SELECT
                    id, email, display_name, email_verified, avatar_url,
                    subscription_tier, subscription_status,
                    stripe_customer_id, stripe_subscription_id,
                    oauth_provider, created_at, last_login_at
                FROM users
                ${whereClause}
                ORDER BY ${sortBy} ${sortOrder}
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('❌ Get users error:', error);
            throw error;
        }
    }

    /**
     * Get user details with subscription and usage info
     */
    async getUserDetails(userId) {
        try {
            const user = await this.db.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get subscription details
            const [subscriptions] = await this.db.pool.execute(
                `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );

            // Get usage tracking
            const usage = await this.db.getUsageTracking(userId);

            // Get payment history
            const [payments] = await this.db.pool.execute(
                `SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
                [userId]
            );

            // Get activity logs
            const [activities] = await this.db.pool.execute(
                `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
                [userId]
            );

            // Get job count
            const jobCount = await this.db.getJobCount(userId);

            // Get resume count
            const resumeCount = await this.db.getResumeCount(userId);

            return {
                user,
                subscriptions,
                usage,
                payments,
                activities,
                stats: {
                    jobCount,
                    resumeCount
                }
            };

        } catch (error) {
            console.error('❌ Get user details error:', error);
            throw error;
        }
    }

    /**
     * Update user subscription tier (manual override)
     */
    async updateUserTier(userId, newTier) {
        try {
            await this.db.updateSubscriptionTier(userId, newTier, 'active');

            // Log admin action
            await this.db.pool.execute(
                `INSERT INTO admin_audit_log (action_type, target_user_id, details, performed_by)
                 VALUES ('tier_change', ?, ?, 'admin')`,
                [userId, JSON.stringify({ newTier, timestamp: new Date() })]
            );

            console.log(`✅ User ${userId} tier changed to ${newTier} by admin`);
            return { success: true };

        } catch (error) {
            console.error('❌ Update user tier error:', error);
            throw error;
        }
    }

    /**
     * Ban/suspend user
     */
    async suspendUser(userId, reason) {
        try {
            await this.db.pool.execute(
                `UPDATE users SET subscription_status = 'suspended', updated_at = NOW() WHERE id = ?`,
                [userId]
            );

            // Log admin action
            await this.db.pool.execute(
                `INSERT INTO admin_audit_log (action_type, target_user_id, details, performed_by)
                 VALUES ('user_suspended', ?, ?, 'admin')`,
                [userId, JSON.stringify({ reason, timestamp: new Date() })]
            );

            console.log(`✅ User ${userId} suspended: ${reason}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Suspend user error:', error);
            throw error;
        }
    }

    /**
     * Delete user account (GDPR compliance)
     */
    async deleteUser(userId) {
        try {
            const connection = await this.db.pool.getConnection();
            await connection.beginTransaction();

            try {
                // Delete in order of foreign key dependencies
                await connection.execute(`DELETE FROM verification_tokens WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM api_keys WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM usage_tracking WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM payment_transactions WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM subscriptions WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM activity_logs WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM cover_letters WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM resumes WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM jobs WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM sync_sessions WHERE user_id = ?`, [userId]);
                await connection.execute(`DELETE FROM users WHERE id = ?`, [userId]);

                // Log admin action (in separate table that survives user deletion)
                await connection.execute(
                    `INSERT INTO admin_audit_log (action_type, target_user_id, details, performed_by)
                     VALUES ('user_deleted', ?, ?, 'admin')`,
                    [userId, JSON.stringify({ timestamp: new Date() })]
                );

                await connection.commit();
                console.log(`✅ User ${userId} deleted (GDPR compliance)`);

                return { success: true, message: 'User and all associated data deleted' };

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }

        } catch (error) {
            console.error('❌ Delete user error:', error);
            throw error;
        }
    }

    // ============================================================
    // Subscription Management
    // ============================================================

    /**
     * Get all subscriptions with filtering
     */
    async getSubscriptions({ page = 1, limit = 50, tier = null, status = null }) {
        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];

            if (tier) {
                whereConditions.push('tier = ?');
                params.push(tier);
            }

            if (status) {
                whereConditions.push('status = ?');
                params.push(status);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get total count
            const [countResult] = await this.db.pool.execute(
                `SELECT COUNT(*) as total FROM subscriptions ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get subscriptions with user info
            const [subscriptions] = await this.db.pool.execute(
                `SELECT
                    s.*,
                    u.email, u.display_name
                FROM subscriptions s
                JOIN users u ON s.user_id = u.id
                ${whereClause}
                ORDER BY s.created_at DESC
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return {
                subscriptions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('❌ Get subscriptions error:', error);
            throw error;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId, reason = 'admin_action') {
        try {
            const user = await this.db.getUserById(userId);
            if (!user || !user.stripe_subscription_id) {
                throw new Error('No active subscription found');
            }

            // Cancel in Stripe
            await this.stripeService.cancelSubscription(user.stripe_subscription_id);

            // Update database
            await this.db.pool.execute(
                `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW() WHERE user_id = ? AND status = 'active'`,
                [userId]
            );

            await this.db.pool.execute(
                `UPDATE users SET subscription_status = 'canceled' WHERE id = ?`,
                [userId]
            );

            // Log admin action
            await this.db.pool.execute(
                `INSERT INTO admin_audit_log (action_type, target_user_id, details, performed_by)
                 VALUES ('subscription_canceled', ?, ?, 'admin')`,
                [userId, JSON.stringify({ reason, timestamp: new Date() })]
            );

            console.log(`✅ Subscription canceled for user ${userId}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Cancel subscription error:', error);
            throw error;
        }
    }

    /**
     * Issue refund
     */
    async issueRefund(paymentId, amount = null, reason = '') {
        try {
            // Get payment details
            const [payments] = await this.db.pool.execute(
                `SELECT * FROM payment_transactions WHERE id = ?`,
                [paymentId]
            );

            if (payments.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = payments[0];

            // Issue refund in Stripe
            const refundAmount = amount || payment.amount_cents;
            const refund = await this.stripeService.stripe.refunds.create({
                payment_intent: payment.stripe_payment_intent_id,
                amount: refundAmount,
                reason: reason || 'requested_by_customer'
            });

            // Record refund
            await this.db.pool.execute(
                `INSERT INTO payment_transactions (
                    user_id, amount_cents, currency, transaction_type, status,
                    stripe_payment_intent_id, description
                ) VALUES (?, ?, ?, 'refund', 'completed', ?, ?)`,
                [payment.user_id, -refundAmount, payment.currency, refund.id, `Refund: ${reason}`]
            );

            // Log admin action
            await this.db.pool.execute(
                `INSERT INTO admin_audit_log (action_type, target_user_id, details, performed_by)
                 VALUES ('refund_issued', ?, ?, 'admin')`,
                [payment.user_id, JSON.stringify({ paymentId, amount: refundAmount, reason, timestamp: new Date() })]
            );

            console.log(`✅ Refund issued: $${refundAmount / 100} for payment ${paymentId}`);
            return { success: true, refund };

        } catch (error) {
            console.error('❌ Issue refund error:', error);
            throw error;
        }
    }

    // ============================================================
    // Analytics & Reporting
    // ============================================================

    /**
     * Get dashboard analytics
     */
    async getDashboardAnalytics() {
        try {
            // Total users by tier
            const [usersByTier] = await this.db.pool.execute(
                `SELECT subscription_tier as tier, COUNT(*) as count
                 FROM users
                 GROUP BY subscription_tier`
            );

            // Revenue metrics
            const [revenueData] = await this.db.pool.execute(
                `SELECT
                    SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN transaction_type = 'refund' THEN ABS(amount_cents) ELSE 0 END) as total_refunds,
                    COUNT(CASE WHEN transaction_type = 'payment' THEN 1 END) as total_payments
                 FROM payment_transactions
                 WHERE status = 'completed'`
            );

            // Monthly recurring revenue (MRR)
            const [mrrData] = await this.db.pool.execute(
                `SELECT
                    tier,
                    COUNT(*) as subscribers,
                    SUM(amount_cents) as mrr
                 FROM subscriptions
                 WHERE status = 'active'
                 GROUP BY tier`
            );

            // New signups (last 30 days)
            const [signupData] = await this.db.pool.execute(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*) as signups
                 FROM users
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date DESC`
            );

            // Churn rate (last 30 days)
            const [churnData] = await this.db.pool.execute(
                `SELECT
                    COUNT(*) as churned_users
                 FROM subscriptions
                 WHERE status = 'canceled' AND canceled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
            );

            // Active subscriptions count
            const [activeSubsCount] = await this.db.pool.execute(
                `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`
            );

            return {
                usersByTier,
                revenue: {
                    totalRevenue: revenueData[0].total_revenue || 0,
                    totalRefunds: revenueData[0].total_refunds || 0,
                    netRevenue: (revenueData[0].total_revenue || 0) - (revenueData[0].total_refunds || 0),
                    totalPayments: revenueData[0].total_payments || 0
                },
                mrr: mrrData,
                signups: signupData,
                churn: {
                    last30Days: churnData[0].churned_users || 0,
                    rate: activeSubsCount[0].count > 0
                        ? ((churnData[0].churned_users || 0) / activeSubsCount[0].count * 100).toFixed(2) + '%'
                        : '0%'
                },
                activeSubscriptions: activeSubsCount[0].count || 0
            };

        } catch (error) {
            console.error('❌ Get analytics error:', error);
            throw error;
        }
    }

    /**
     * Get user growth chart data
     */
    async getUserGrowthData(days = 30) {
        try {
            const [data] = await this.db.pool.execute(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*) as new_users,
                    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users
                 FROM users
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC`,
                [days]
            );

            return data;

        } catch (error) {
            console.error('❌ Get user growth data error:', error);
            throw error;
        }
    }

    /**
     * Get revenue chart data
     */
    async getRevenueData(days = 30) {
        try {
            const [data] = await this.db.pool.execute(
                `SELECT
                    DATE(created_at) as date,
                    SUM(CASE WHEN transaction_type = 'payment' THEN amount_cents ELSE 0 END) as revenue,
                    COUNT(CASE WHEN transaction_type = 'payment' THEN 1 END) as transactions
                 FROM payment_transactions
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                   AND status = 'completed'
                 GROUP BY DATE(created_at)
                 ORDER BY date ASC`,
                [days]
            );

            return data;

        } catch (error) {
            console.error('❌ Get revenue data error:', error);
            throw error;
        }
    }

    // ============================================================
    // Support Tools
    // ============================================================

    /**
     * Get recent activity logs for support
     */
    async getRecentActivity({ page = 1, limit = 100, userId = null, activityType = null }) {
        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];

            if (userId) {
                whereConditions.push('user_id = ?');
                params.push(userId);
            }

            if (activityType) {
                whereConditions.push('activity_type = ?');
                params.push(activityType);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const [activities] = await this.db.pool.execute(
                `SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return activities;

        } catch (error) {
            console.error('❌ Get recent activity error:', error);
            throw error;
        }
    }

    /**
     * Search users for support
     */
    async searchUsers(query) {
        try {
            const [users] = await this.db.pool.execute(
                `SELECT
                    id, email, display_name, subscription_tier, subscription_status, created_at
                 FROM users
                 WHERE email LIKE ? OR display_name LIKE ? OR id LIKE ?
                 LIMIT 10`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );

            return users;

        } catch (error) {
            console.error('❌ Search users error:', error);
            throw error;
        }
    }

    /**
     * Get admin audit log
     */
    async getAuditLog({ page = 1, limit = 50 }) {
        try {
            const offset = (page - 1) * limit;

            const [logs] = await this.db.pool.execute(
                `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            return logs;

        } catch (error) {
            console.error('❌ Get audit log error:', error);
            throw error;
        }
    }
}

module.exports = AdminService;
