/**
 * Monetization UI Integration
 * Main file that coordinates all monetization UI components
 */

class MonetizationUI {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.apiBaseUrl = window.location.origin;
    }

    /**
     * Initialize all monetization UI components
     */
    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Monetization UI...');

        // Initialize tier enforcement first
        if (window.tierEnforcement) {
            await window.tierEnforcement.init();
            console.log('✅ Tier enforcement initialized');
        }

        // Initialize subscription widget if container exists
        const subscriptionContainer = document.getElementById('subscription-widget');
        if (subscriptionContainer) {
            this.components.subscriptionWidget = new SubscriptionWidget('subscription-widget');
            window.subscriptionWidget = this.components.subscriptionWidget;
            console.log('✅ Subscription widget initialized');
        }

        // Initialize billing history if container exists
        const billingContainer = document.getElementById('billing-history');
        if (billingContainer) {
            this.components.billingHistory = new BillingHistory('billing-history');
            console.log('✅ Billing history initialized');
        }

        // Add event listeners
        this.attachGlobalListeners();

        this.initialized = true;
        console.log('✅ Monetization UI ready');

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('monetization-ui-ready'));
    }

    /**
     * Attach global event listeners
     */
    attachGlobalListeners() {
        // Listen for job add attempts
        document.addEventListener('job-add-attempt', async (e) => {
            const allowed = await window.tierEnforcement.enforceLimit('addJob');
            if (allowed) {
                window.tierEnforcement.updateUsage('jobs', 1);
            } else {
                e.preventDefault();
            }
        });

        // Listen for resume add attempts
        document.addEventListener('resume-add-attempt', async (e) => {
            const allowed = await window.tierEnforcement.enforceLimit('addResume');
            if (allowed) {
                window.tierEnforcement.updateUsage('resumes', 1);
            } else {
                e.preventDefault();
            }
        });

        // Listen for feature access attempts
        document.addEventListener('feature-access-attempt', async (e) => {
            const feature = e.detail?.feature;
            if (!feature) return;

            const allowed = await window.tierEnforcement.enforceLimit(feature);
            if (!allowed) {
                e.preventDefault();
            }
        });

        // Listen for subscription changes (e.g., after Stripe redirect)
        document.addEventListener('subscription-changed', async (e) => {
            await this.refreshAll();
        });
    }

    /**
     * Check if user can perform an action
     */
    async canPerformAction(action) {
        if (!window.tierEnforcement) return true;
        return await window.tierEnforcement.enforceLimit(action);
    }

    /**
     * Show upgrade prompt for a specific feature
     */
    async showUpgradePrompt(feature, options = {}) {
        if (!window.tierEnforcement) return;
        await window.tierEnforcement.showUpgradePrompt(feature, { allowed: false }, options);
    }

    /**
     * Refresh all components
     */
    async refreshAll() {
        console.log('🔄 Refreshing monetization UI...');

        if (window.tierEnforcement) {
            await window.tierEnforcement.refresh();
        }

        if (this.components.subscriptionWidget) {
            await this.components.subscriptionWidget.refresh();
        }

        if (this.components.billingHistory) {
            await this.components.billingHistory.refresh();
        }

        console.log('✅ Monetization UI refreshed');
    }

    /**
     * Get current subscription tier
     */
    getCurrentTier() {
        if (!window.tierEnforcement) return 'free';
        return window.tierEnforcement.getCurrentTier();
    }

    /**
     * Check if feature is available
     */
    hasFeature(feature) {
        if (!window.tierEnforcement) return false;
        return window.tierEnforcement.hasFeature(feature);
    }

    /**
     * Get usage stats
     */
    getUsageStats() {
        if (!window.tierEnforcement || !window.tierEnforcement.usage) {
            return null;
        }
        return window.tierEnforcement.usage;
    }
}

/**
 * Helper Functions
 */

/**
 * Wrap an action with tier enforcement
 * Example: enforceAction('addJob', () => { ... });
 */
async function enforceAction(action, callback, options = {}) {
    if (!window.monetizationUI) {
        // If monetization UI not initialized, just run the callback
        return callback();
    }

    const allowed = await window.monetizationUI.canPerformAction(action);
    if (allowed) {
        return callback();
    }
}

/**
 * Show feature locked message
 */
function showFeatureLocked(feature, options = {}) {
    if (window.monetizationUI) {
        window.monetizationUI.showUpgradePrompt(feature, options);
    } else {
        alert(`This feature requires a subscription. Please upgrade your plan.`);
    }
}

/**
 * Check if user has access to a feature
 */
function hasFeatureAccess(feature) {
    if (!window.monetizationUI) return true; // Assume access if not initialized
    return window.monetizationUI.hasFeature(feature);
}

/**
 * Get tier badge HTML
 */
function getTierBadgeHTML(tier = null) {
    if (!tier && window.monetizationUI) {
        tier = window.monetizationUI.getCurrentTier();
    }

    const badges = {
        free: '<span class="tier-badge tier-free">🆓 Free</span>',
        pro: '<span class="tier-badge tier-pro">⭐ Pro</span>',
        enterprise: '<span class="tier-badge tier-enterprise">🚀 Enterprise</span>'
    };

    return badges[tier] || badges.free;
}

/**
 * Initialize monetization UI when DOM is ready
 */
function initializeMonetizationUI() {
    // Create global instance
    window.monetizationUI = new MonetizationUI();

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.monetizationUI.init();
        });
    } else {
        window.monetizationUI.init();
    }

    // Also export helper functions
    window.enforceAction = enforceAction;
    window.showFeatureLocked = showFeatureLocked;
    window.hasFeatureAccess = hasFeatureAccess;
    window.getTierBadgeHTML = getTierBadgeHTML;
}

// Auto-initialize
initializeMonetizationUI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MonetizationUI,
        enforceAction,
        showFeatureLocked,
        hasFeatureAccess,
        getTierBadgeHTML
    };
}
