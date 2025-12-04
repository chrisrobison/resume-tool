// tier-enforcement.js - Middleware to enforce subscription tier limits
// Checks user's tier and usage limits before allowing operations

/**
 * Tier configuration defining limits for each subscription tier
 */
const TIER_LIMITS = {
    free: {
        jobs: 10,              // Max 10 jobs
        resumes: 1,            // Max 1 resume
        coverLetters: -1,      // Unlimited
        cloudSync: false,      // No cloud sync
        encryption: false,     // No encryption
        aiAssistant: false,    // No AI features
        apiAccess: false,      // No API access
        teamFeatures: false    // No team features
    },
    pro: {
        jobs: -1,              // Unlimited
        resumes: -1,           // Unlimited
        coverLetters: -1,      // Unlimited
        cloudSync: true,       // Cloud sync enabled
        encryption: true,      // Encryption enabled
        aiAssistant: true,     // AI features enabled
        apiAccess: false,      // No API access
        teamFeatures: false    // No team features
    },
    enterprise: {
        jobs: -1,              // Unlimited
        resumes: -1,           // Unlimited
        coverLetters: -1,      // Unlimited
        cloudSync: true,       // Cloud sync enabled
        encryption: true,      // Encryption enabled
        aiAssistant: true,     // AI features enabled
        apiAccess: true,       // API access enabled
        teamFeatures: true     // Team features enabled
    }
};

/**
 * Get tier limits for a given tier
 */
function getTierLimits(tier) {
    return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Check if a feature is available for a tier
 */
function hasFeature(tier, feature) {
    const limits = getTierLimits(tier);
    return limits[feature] === true;
}

/**
 * Check if user can perform operation based on tier limits
 */
function canPerformOperation(tier, resource, currentCount) {
    const limits = getTierLimits(tier);
    const limit = limits[resource];
    
    // -1 means unlimited
    if (limit === -1) {
        return true;
    }
    
    // Check if under limit
    return currentCount < limit;
}

/**
 * Middleware: Check if user can create a job
 */
async function canCreateJob(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db; // Database service attached to request
        if (!db) {
            return res.status(500).json({ error: 'Database service not available' });
        }

        // Get user's tier
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tier = user.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        // Check if unlimited
        if (limits.jobs === -1) {
            req.tierInfo = { tier, limits, canCreate: true };
            return next();
        }

        // Get current job count
        const jobCount = await db.getJobCount(userId);

        // Check if under limit
        if (jobCount >= limits.jobs) {
            return res.status(403).json({
                error: 'Job limit reached',
                tier,
                limit: limits.jobs,
                current: jobCount,
                upgradeRequired: true,
                upgradeMessage: 'Upgrade to Pro for unlimited jobs'
            });
        }

        req.tierInfo = { tier, limits, canCreate: true, current: jobCount };
        next();

    } catch (error) {
        console.error('Tier enforcement error:', error);
        res.status(500).json({ error: 'Failed to check tier limits' });
    }
}

/**
 * Middleware: Check if user can create a resume
 */
async function canCreateResume(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;
        if (!db) {
            return res.status(500).json({ error: 'Database service not available' });
        }

        // Get user's tier
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tier = user.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        // Check if unlimited
        if (limits.resumes === -1) {
            req.tierInfo = { tier, limits, canCreate: true };
            return next();
        }

        // Get current resume count
        const resumeCount = await db.getResumeCount(userId);

        // Check if under limit
        if (resumeCount >= limits.resumes) {
            return res.status(403).json({
                error: 'Resume limit reached',
                tier,
                limit: limits.resumes,
                current: resumeCount,
                upgradeRequired: true,
                upgradeMessage: 'Upgrade to Pro for unlimited resumes'
            });
        }

        req.tierInfo = { tier, limits, canCreate: true, current: resumeCount };
        next();

    } catch (error) {
        console.error('Tier enforcement error:', error);
        res.status(500).json({ error: 'Failed to check tier limits' });
    }
}

/**
 * Middleware: Check if user has access to a feature
 */
function requireFeature(featureName) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const db = req.db;
            if (!db) {
                return res.status(500).json({ error: 'Database service not available' });
            }

            // Get user's tier
            const user = await db.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const tier = user.subscription_tier || 'free';

            // Check if feature is available
            if (!hasFeature(tier, featureName)) {
                let upgradeMessage = 'Upgrade to access this feature';
                
                // Specific messages for common features
                if (featureName === 'cloudSync') {
                    upgradeMessage = 'Upgrade to Pro for cloud sync';
                } else if (featureName === 'encryption') {
                    upgradeMessage = 'Upgrade to Pro for zero-knowledge encryption';
                } else if (featureName === 'aiAssistant') {
                    upgradeMessage = 'Upgrade to Pro for AI assistant';
                } else if (featureName === 'apiAccess') {
                    upgradeMessage = 'Upgrade to Enterprise for API access';
                } else if (featureName === 'teamFeatures') {
                    upgradeMessage = 'Upgrade to Enterprise for team features';
                }

                return res.status(403).json({
                    error: `Feature not available: ${featureName}`,
                    tier,
                    featureRequired: featureName,
                    upgradeRequired: true,
                    upgradeMessage
                });
            }

            req.tierInfo = { tier, feature: featureName, hasAccess: true };
            next();

        } catch (error) {
            console.error('Feature check error:', error);
            res.status(500).json({ error: 'Failed to check feature access' });
        }
    };
}

/**
 * Middleware: Get user's tier information (non-blocking)
 */
async function attachTierInfo(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            req.tierInfo = { tier: 'free', limits: TIER_LIMITS.free };
            return next();
        }

        const db = req.db;
        if (!db) {
            req.tierInfo = { tier: 'free', limits: TIER_LIMITS.free };
            return next();
        }

        const user = await db.getUserById(userId);
        const tier = user?.subscription_tier || 'free';
        const limits = getTierLimits(tier);

        // Get usage tracking if available
        let usage = null;
        if (db.getUsageTracking) {
            try {
                usage = await db.getUsageTracking(userId);
            } catch (error) {
                console.error('Failed to get usage tracking:', error);
            }
        }

        req.tierInfo = {
            tier,
            limits,
            usage: usage ? {
                jobs: usage.jobs_count,
                resumes: usage.resumes_count,
                coverLetters: usage.cover_letters_count
            } : null,
            subscriptionStatus: user?.subscription_status || 'active'
        };

        next();

    } catch (error) {
        console.error('Failed to attach tier info:', error);
        req.tierInfo = { tier: 'free', limits: TIER_LIMITS.free };
        next();
    }
}

/**
 * Middleware: Require active subscription (Pro or Enterprise)
 */
async function requirePaidSubscription(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;
        if (!db) {
            return res.status(500).json({ error: 'Database service not available' });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tier = user.subscription_tier || 'free';

        if (tier === 'free') {
            return res.status(403).json({
                error: 'Paid subscription required',
                tier: 'free',
                upgradeRequired: true,
                upgradeMessage: 'Upgrade to Pro or Enterprise to access this feature'
            });
        }

        // Check subscription status
        const status = user.subscription_status || 'active';
        if (status !== 'active' && status !== 'trialing') {
            return res.status(403).json({
                error: 'Active subscription required',
                tier,
                status,
                renewalRequired: true,
                message: 'Please update your payment method to continue'
            });
        }

        req.tierInfo = { tier, status, hasAccess: true };
        next();

    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({ error: 'Failed to check subscription status' });
    }
}

/**
 * Get tier comparison information
 */
function getTierComparison() {
    return {
        tiers: ['free', 'pro', 'enterprise'],
        features: {
            jobs: {
                free: 10,
                pro: 'Unlimited',
                enterprise: 'Unlimited'
            },
            resumes: {
                free: 1,
                pro: 'Unlimited',
                enterprise: 'Unlimited'
            },
            cloudSync: {
                free: false,
                pro: true,
                enterprise: true
            },
            encryption: {
                free: false,
                pro: true,
                enterprise: true
            },
            aiAssistant: {
                free: false,
                pro: true,
                enterprise: true
            },
            apiAccess: {
                free: false,
                pro: false,
                enterprise: true
            },
            teamFeatures: {
                free: false,
                pro: false,
                enterprise: true
            }
        },
        pricing: {
            free: { monthly: 0, yearly: 0 },
            pro: { monthly: 999, yearly: 9990 },      // In cents
            enterprise: { monthly: 2999, yearly: 29990 }
        }
    };
}

module.exports = {
    TIER_LIMITS,
    getTierLimits,
    hasFeature,
    canPerformOperation,
    canCreateJob,
    canCreateResume,
    requireFeature,
    attachTierInfo,
    requirePaidSubscription,
    getTierComparison
};
