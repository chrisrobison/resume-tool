// subscriptions.js - API routes for subscription management
// Handles tier info, usage tracking, and subscription queries

const express = require('express');
const router = express.Router();
const { getTierComparison, getTierLimits } = require('../middleware/tier-enforcement');

/**
 * GET /api/subscriptions/me
 * Get current user's subscription information
 */
router.get('/me', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;
        const user = await db.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tier = user.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        // Get usage tracking
        let usage = null;
        if (db.getUsageTracking) {
            try {
                usage = await db.getUsageTracking(userId);
            } catch (error) {
                console.error('Failed to get usage:', error);
            }
        }

        // Get active subscription details (if Pro/Enterprise)
        let subscriptionDetails = null;
        if (tier !== 'free' && db.getActiveSubscription) {
            try {
                subscriptionDetails = await db.getActiveSubscription(userId);
            } catch (error) {
                console.error('Failed to get subscription:', error);
            }
        }

        res.json({
            tier,
            status: user.subscription_status || 'active',
            limits,
            usage: usage ? {
                jobs: {
                    current: usage.jobs_count,
                    limit: usage.jobs_limit,
                    unlimited: usage.jobs_limit === -1
                },
                resumes: {
                    current: usage.resumes_count,
                    limit: usage.resumes_limit,
                    unlimited: usage.resumes_limit === -1
                },
                coverLetters: {
                    current: usage.cover_letters_count,
                    unlimited: true
                }
            } : null,
            subscription: subscriptionDetails ? {
                id: subscriptionDetails.id,
                startedAt: subscriptionDetails.started_at,
                currentPeriodStart: subscriptionDetails.current_period_start,
                currentPeriodEnd: subscriptionDetails.current_period_end,
                billingCycle: subscriptionDetails.billing_cycle,
                amount: subscriptionDetails.amount_cents,
                currency: subscriptionDetails.currency,
                cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end
            } : null
        });

    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription information' });
    }
});

/**
 * GET /api/subscriptions/tiers
 * Get tier comparison and pricing information
 */
router.get('/tiers', (req, res) => {
    try {
        const comparison = getTierComparison();
        res.json(comparison);
    } catch (error) {
        console.error('Error fetching tiers:', error);
        res.status(500).json({ error: 'Failed to fetch tier information' });
    }
});

/**
 * GET /api/subscriptions/usage
 * Get detailed usage statistics for current user
 */
router.get('/usage', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;

        // Get usage tracking
        const usage = await db.getUsageTracking(userId);
        
        // Get user tier
        const user = await db.getUserById(userId);
        const tier = user?.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        res.json({
            tier,
            limits,
            current: {
                jobs: usage.jobs_count,
                resumes: usage.resumes_count,
                coverLetters: usage.cover_letters_count,
                aiRequests: usage.ai_requests_count,
                apiCalls: usage.api_calls_count
            },
            monthly: {
                aiRequests: usage.monthly_ai_requests,
                apiCalls: usage.monthly_api_calls,
                syncOperations: usage.monthly_sync_operations,
                storageBytes: usage.monthly_storage_bytes
            },
            lastReset: usage.last_reset_at,
            canCreate: {
                job: usage.jobs_limit === -1 || usage.jobs_count < usage.jobs_limit,
                resume: usage.resumes_limit === -1 || usage.resumes_count < usage.resumes_limit
            }
        });

    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage information' });
    }
});

/**
 * GET /api/subscriptions/billing-history
 * Get payment history for current user
 */
router.get('/billing-history', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;
        
        // Check if user has paid subscription
        const user = await db.getUserById(userId);
        const tier = user?.subscription_tier || 'free';
        
        if (tier === 'free') {
            return res.json({ transactions: [] });
        }

        // Get payment history
        const limit = parseInt(req.query.limit) || 50;
        const transactions = await db.getPaymentHistory(userId, limit);

        res.json({
            transactions: transactions.map(t => ({
                id: t.id,
                amount: t.amount_cents,
                currency: t.currency,
                status: t.status,
                paymentMethod: t.payment_method,
                description: t.description,
                refundedAmount: t.refunded_amount_cents,
                createdAt: t.created_at,
                stripeInvoiceId: t.stripe_invoice_id
            }))
        });

    } catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({ error: 'Failed to fetch billing history' });
    }
});

/**
 * GET /api/subscriptions/features
 * Check which features are available to current user
 */
router.get('/features', async (req, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            // Anonymous user - return free tier features
            return res.json({
                tier: 'free',
                features: getTierLimits('free')
            });
        }

        const db = req.db;
        const user = await db.getUserById(userId);
        const tier = user?.subscription_tier || 'free';
        const features = getTierLimits(tier);

        res.json({
            tier,
            status: user?.subscription_status || 'active',
            features
        });

    } catch (error) {
        console.error('Error fetching features:', error);
        res.status(500).json({ error: 'Failed to fetch feature information' });
    }
});

/**
 * POST /api/subscriptions/check-limit
 * Check if user can perform an action (job/resume creation)
 */
router.post('/check-limit', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { resource } = req.body; // 'job' or 'resume'
        
        if (!resource || !['job', 'resume'].includes(resource)) {
            return res.status(400).json({ error: 'Invalid resource type' });
        }

        const db = req.db;
        const user = await db.getUserById(userId);
        const tier = user?.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        let canCreate = false;
        let current = 0;
        let limit = 0;

        if (resource === 'job') {
            canCreate = await db.canCreateJob(userId);
            current = await db.getJobCount(userId);
            limit = limits.jobs;
        } else if (resource === 'resume') {
            canCreate = await db.canCreateResume(userId);
            current = await db.getResumeCount(userId);
            limit = limits.resumes;
        }

        res.json({
            canCreate,
            resource,
            tier,
            current,
            limit: limit === -1 ? 'unlimited' : limit,
            upgradeRequired: !canCreate
        });

    } catch (error) {
        console.error('Error checking limit:', error);
        res.status(500).json({ error: 'Failed to check resource limit' });
    }
});

module.exports = router;
