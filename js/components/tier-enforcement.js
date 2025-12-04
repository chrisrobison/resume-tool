/**
 * Tier Enforcement Utility
 * Client-side checks for subscription tier limits
 */

class TierEnforcement {
    constructor() {
        this.subscription = null;
        this.usage = null;
        this.apiBaseUrl = window.location.origin;

        // Tier limits configuration
        this.limits = {
            free: {
                jobs: 10,
                resumes: 1,
                cloudSync: false,
                encryption: false,
                aiAssistant: false,
                apiAccess: false
            },
            pro: {
                jobs: null, // unlimited
                resumes: null, // unlimited
                cloudSync: true,
                encryption: true,
                aiAssistant: true,
                apiAccess: false
            },
            enterprise: {
                jobs: null, // unlimited
                resumes: null, // unlimited
                cloudSync: true,
                encryption: true,
                aiAssistant: true,
                apiAccess: true
            }
        };
    }

    /**
     * Initialize - load subscription and usage data
     */
    async init() {
        await this.loadSubscriptionData();
        await this.loadUsageData();
    }

    /**
     * Load subscription data
     */
    async loadSubscriptionData() {
        const token = this.getAuthToken();
        if (!token) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/subscriptions/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.subscription = await response.json();
            }
        } catch (error) {
            console.error('Failed to load subscription:', error);
        }
    }

    /**
     * Load usage data
     */
    async loadUsageData() {
        const token = this.getAuthToken();
        if (!token) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/subscriptions/usage`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.usage = await response.json();
            }
        } catch (error) {
            console.error('Failed to load usage:', error);
        }
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || localStorage.getItem('token');
    }

    /**
     * Get current tier
     */
    getCurrentTier() {
        return this.subscription?.tier || 'free';
    }

    /**
     * Check if user can add a job
     */
    canAddJob() {
        const tier = this.getCurrentTier();
        const limit = this.limits[tier].jobs;

        if (limit === null) return { allowed: true }; // unlimited

        const current = this.usage?.jobs_count || 0;
        const allowed = current < limit;

        return {
            allowed,
            current,
            limit,
            remaining: limit - current
        };
    }

    /**
     * Check if user can add a resume
     */
    canAddResume() {
        const tier = this.getCurrentTier();
        const limit = this.limits[tier].resumes;

        if (limit === null) return { allowed: true }; // unlimited

        const current = this.usage?.resumes_count || 0;
        const allowed = current < limit;

        return {
            allowed,
            current,
            limit,
            remaining: limit - current
        };
    }

    /**
     * Check if user has feature access
     */
    hasFeature(feature) {
        const tier = this.getCurrentTier();
        return this.limits[tier][feature] || false;
    }

    /**
     * Show upgrade prompt if action not allowed
     */
    async enforceLimit(action, options = {}) {
        let check;

        switch (action) {
            case 'addJob':
                check = this.canAddJob();
                break;
            case 'addResume':
                check = this.canAddResume();
                break;
            case 'cloudSync':
                check = { allowed: this.hasFeature('cloudSync') };
                break;
            case 'encryption':
                check = { allowed: this.hasFeature('encryption') };
                break;
            case 'aiAssistant':
                check = { allowed: this.hasFeature('aiAssistant') };
                break;
            case 'apiAccess':
                check = { allowed: this.hasFeature('apiAccess') };
                break;
            default:
                check = { allowed: true };
        }

        if (!check.allowed) {
            await this.showUpgradePrompt(action, check, options);
            return false;
        }

        return true;
    }

    /**
     * Show upgrade prompt modal
     */
    async showUpgradePrompt(action, check, options = {}) {
        const modal = new UpgradePromptModal({
            action,
            check,
            currentTier: this.getCurrentTier(),
            ...options
        });

        modal.show();
    }

    /**
     * Update usage count (optimistic update)
     */
    updateUsage(type, delta = 1) {
        if (!this.usage) return;

        if (type === 'jobs') {
            this.usage.jobs_count = Math.max(0, this.usage.jobs_count + delta);
        } else if (type === 'resumes') {
            this.usage.resumes_count = Math.max(0, this.usage.resumes_count + delta);
        }
    }

    /**
     * Refresh data
     */
    async refresh() {
        await this.init();
    }

    /**
     * Get upgrade message for action
     */
    getUpgradeMessage(action) {
        const messages = {
            addJob: {
                title: 'Job Limit Reached',
                description: 'You\'ve reached the maximum of 10 jobs on the Free plan.',
                cta: 'Upgrade to Pro for unlimited jobs'
            },
            addResume: {
                title: 'Resume Limit Reached',
                description: 'You\'ve reached the maximum of 1 resume on the Free plan.',
                cta: 'Upgrade to Pro for unlimited resumes'
            },
            cloudSync: {
                title: 'Cloud Sync Unavailable',
                description: 'Cloud sync is only available on Pro and Enterprise plans.',
                cta: 'Upgrade to Pro to sync across devices'
            },
            encryption: {
                title: 'Encryption Unavailable',
                description: 'Zero-knowledge encryption is only available on Pro and Enterprise plans.',
                cta: 'Upgrade to Pro for secure cloud storage'
            },
            aiAssistant: {
                title: 'AI Assistant Unavailable',
                description: 'AI-powered features are only available on Pro and Enterprise plans.',
                cta: 'Upgrade to Pro to unlock AI features'
            },
            apiAccess: {
                title: 'API Access Unavailable',
                description: 'API access is only available on the Enterprise plan.',
                cta: 'Upgrade to Enterprise for API access'
            }
        };

        return messages[action] || {
            title: 'Feature Unavailable',
            description: 'This feature is not available on your current plan.',
            cta: 'Upgrade to unlock this feature'
        };
    }
}

/**
 * Upgrade Prompt Modal
 */
class UpgradePromptModal {
    constructor(options) {
        this.options = options;
        this.modal = null;
    }

    /**
     * Show the modal
     */
    show() {
        this.create();
        this.attachEventListeners();
        document.body.appendChild(this.modal);
        setTimeout(() => this.modal.classList.add('show'), 10);
    }

    /**
     * Hide the modal
     */
    hide() {
        this.modal.classList.remove('show');
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
        }, 300);
    }

    /**
     * Create modal element
     */
    create() {
        const message = window.tierEnforcement.getUpgradeMessage(this.options.action);
        const currentTier = this.options.currentTier;

        this.modal = document.createElement('div');
        this.modal.className = 'upgrade-prompt-modal';
        this.modal.innerHTML = `
            <div class="upgrade-prompt-overlay"></div>
            <div class="upgrade-prompt-content">
                <button class="upgrade-prompt-close">×</button>

                <div class="upgrade-prompt-header">
                    <div class="upgrade-icon">⚡</div>
                    <h2>${message.title}</h2>
                    <p>${message.description}</p>
                </div>

                ${this.options.check?.limit ? `
                    <div class="upgrade-limit-info">
                        <div class="limit-bar">
                            <div class="limit-fill" style="width: ${(this.options.check.current / this.options.check.limit) * 100}%;"></div>
                        </div>
                        <p class="limit-text">${this.options.check.current} / ${this.options.check.limit} used</p>
                    </div>
                ` : ''}

                <div class="upgrade-options">
                    ${currentTier === 'free' ? `
                        <div class="upgrade-card recommended">
                            <div class="upgrade-badge">Recommended</div>
                            <h3>⭐ Pro Plan</h3>
                            <p class="upgrade-price">$9.99/month</p>
                            <ul class="upgrade-features">
                                <li>✓ Unlimited jobs & resumes</li>
                                <li>✓ Cloud sync</li>
                                <li>✓ Zero-knowledge encryption</li>
                                <li>✓ AI assistant</li>
                                <li>✓ Email support (24h)</li>
                            </ul>
                            <button class="btn-upgrade-pro btn-primary" data-tier="pro">
                                Upgrade to Pro
                            </button>
                        </div>

                        <div class="upgrade-card">
                            <h3>🚀 Enterprise</h3>
                            <p class="upgrade-price">$29.99/month</p>
                            <ul class="upgrade-features">
                                <li>✓ All Pro features</li>
                                <li>✓ API access</li>
                                <li>✓ Team features</li>
                                <li>✓ SSO</li>
                                <li>✓ Priority support</li>
                            </ul>
                            <button class="btn-upgrade-enterprise btn-secondary" data-tier="enterprise">
                                Upgrade to Enterprise
                            </button>
                        </div>
                    ` : currentTier === 'pro' ? `
                        <div class="upgrade-card recommended">
                            <h3>🚀 Enterprise Plan</h3>
                            <p class="upgrade-price">$29.99/month</p>
                            <ul class="upgrade-features">
                                <li>✓ All Pro features</li>
                                <li>✓ API access</li>
                                <li>✓ Team collaboration</li>
                                <li>✓ SSO (SAML/OAuth)</li>
                                <li>✓ Priority support (4h)</li>
                                <li>✓ Dedicated account manager</li>
                            </ul>
                            <button class="btn-upgrade-enterprise btn-primary" data-tier="enterprise">
                                Upgrade to Enterprise
                            </button>
                        </div>
                    ` : `
                        <p>You're on the highest plan!</p>
                    `}
                </div>

                <div class="upgrade-prompt-footer">
                    <button class="btn-cancel">Maybe Later</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.upgrade-prompt-close');
        closeBtn.addEventListener('click', () => this.hide());

        // Overlay click
        const overlay = this.modal.querySelector('.upgrade-prompt-overlay');
        overlay.addEventListener('click', () => this.hide());

        // Cancel button
        const cancelBtn = this.modal.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => this.hide());

        // Upgrade buttons
        const upgradeButtons = this.modal.querySelectorAll('[data-tier]');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.getAttribute('data-tier');
                this.handleUpgrade(tier);
            });
        });
    }

    /**
     * Handle upgrade action
     */
    async handleUpgrade(tier) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
            alert('Please sign in to upgrade');
            return;
        }

        try {
            // Redirect to subscription widget or directly to Stripe
            if (window.subscriptionWidget) {
                this.hide();
                window.subscriptionWidget.handleUpgrade(tier);
            } else {
                // Direct API call
                const response = await fetch(`${window.location.origin}/api/payments/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        tier: tier,
                        billingCycle: 'monthly'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        window.location.href = data.url;
                    }
                }
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Failed to start upgrade. Please try again.');
        }
    }
}

// Create global instance
window.tierEnforcement = new TierEnforcement();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tierEnforcement.init();
    });
} else {
    window.tierEnforcement.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TierEnforcement, UpgradePromptModal };
}
