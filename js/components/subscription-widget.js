/**
 * Subscription Widget Component
 * Displays current subscription tier, usage stats, and upgrade options
 */

class SubscriptionWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        this.subscription = null;
        this.usage = null;
        this.loading = false;
        this.apiBaseUrl = window.location.origin;

        this.init();
    }

    /**
     * Initialize the widget
     */
    async init() {
        this.render(); // Render loading state
        await this.loadData();
        this.render(); // Render with data
        this.attachEventListeners();
    }

    /**
     * Load subscription and usage data from API
     */
    async loadData() {
        this.loading = true;
        const token = this.getAuthToken();

        if (!token) {
            console.error('No auth token found');
            this.renderLoginPrompt();
            return;
        }

        try {
            // Load subscription data
            const subResponse = await fetch(`${this.apiBaseUrl}/api/subscriptions/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (subResponse.ok) {
                this.subscription = await subResponse.json();
            }

            // Load usage data
            const usageResponse = await fetch(`${this.apiBaseUrl}/api/subscriptions/usage`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (usageResponse.ok) {
                this.usage = await usageResponse.json();
            }

        } catch (error) {
            console.error('Failed to load subscription data:', error);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Get authentication token from localStorage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || localStorage.getItem('token');
    }

    /**
     * Render the widget
     */
    render() {
        if (this.loading) {
            this.container.innerHTML = this.renderLoading();
            return;
        }

        if (!this.subscription) {
            this.container.innerHTML = this.renderError();
            return;
        }

        const tier = this.subscription.tier || 'free';
        this.container.innerHTML = `
            <div class="subscription-widget">
                ${this.renderTierBadge(tier)}
                ${this.renderUsageStats()}
                ${this.renderFeatures(tier)}
                ${this.renderActions(tier)}
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="subscription-widget loading">
                <div class="loading-spinner"></div>
                <p>Loading subscription info...</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        return `
            <div class="subscription-widget error">
                <div class="error-icon">⚠️</div>
                <p>Unable to load subscription information</p>
                <button class="btn-retry" onclick="window.subscriptionWidget.init()">Retry</button>
            </div>
        `;
    }

    /**
     * Render login prompt
     */
    renderLoginPrompt() {
        this.container.innerHTML = `
            <div class="subscription-widget login-prompt">
                <div class="lock-icon">🔒</div>
                <h3>Sign in to view subscription</h3>
                <p>Please sign in to access your subscription details</p>
                <button class="btn-primary" onclick="window.location.href='/login'">Sign In</button>
            </div>
        `;
    }

    /**
     * Render tier badge
     */
    renderTierBadge(tier) {
        const tierInfo = {
            free: {
                name: 'Free',
                icon: '🆓',
                color: '#6c757d',
                bgColor: '#f8f9fa'
            },
            pro: {
                name: 'Pro',
                icon: '⭐',
                color: '#0d6efd',
                bgColor: '#e7f1ff'
            },
            enterprise: {
                name: 'Enterprise',
                icon: '🚀',
                color: '#6f42c1',
                bgColor: '#f3e8ff'
            }
        };

        const info = tierInfo[tier] || tierInfo.free;

        return `
            <div class="tier-badge" style="background: ${info.bgColor}; color: ${info.color};">
                <span class="tier-icon">${info.icon}</span>
                <span class="tier-name">${info.name}</span>
                ${this.subscription.status === 'active' ?
                    '<span class="tier-status">Active</span>' :
                    '<span class="tier-status inactive">Inactive</span>'
                }
            </div>
        `;
    }

    /**
     * Render usage statistics
     */
    renderUsageStats() {
        if (!this.usage) return '';

        const jobsPercent = this.usage.jobs_limit ?
            Math.round((this.usage.jobs_count / this.usage.jobs_limit) * 100) : 0;
        const resumesPercent = this.usage.resumes_limit ?
            Math.round((this.usage.resumes_count / this.usage.resumes_limit) * 100) : 0;

        return `
            <div class="usage-stats">
                <h3>Usage</h3>

                <div class="usage-item">
                    <div class="usage-header">
                        <span>Job Listings</span>
                        <span class="usage-count">${this.usage.jobs_count} / ${this.usage.jobs_limit === null ? '∞' : this.usage.jobs_limit}</span>
                    </div>
                    ${this.usage.jobs_limit ? `
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: ${jobsPercent}%; background: ${jobsPercent > 80 ? '#dc3545' : '#0d6efd'};"></div>
                        </div>
                        ${jobsPercent > 80 ? '<p class="usage-warning">⚠️ Approaching limit</p>' : ''}
                    ` : '<p class="usage-unlimited">✨ Unlimited</p>'}
                </div>

                <div class="usage-item">
                    <div class="usage-header">
                        <span>Resumes</span>
                        <span class="usage-count">${this.usage.resumes_count} / ${this.usage.resumes_limit === null ? '∞' : this.usage.resumes_limit}</span>
                    </div>
                    ${this.usage.resumes_limit ? `
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: ${resumesPercent}%; background: ${resumesPercent > 80 ? '#dc3545' : '#0d6efd'};"></div>
                        </div>
                        ${resumesPercent > 80 ? '<p class="usage-warning">⚠️ Approaching limit</p>' : ''}
                    ` : '<p class="usage-unlimited">✨ Unlimited</p>'}
                </div>

                ${this.usage.storage_used_mb !== undefined ? `
                    <div class="usage-item">
                        <div class="usage-header">
                            <span>Cloud Storage</span>
                            <span class="usage-count">${this.formatBytes(this.usage.storage_used_mb * 1024 * 1024)}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render features for current tier
     */
    renderFeatures(tier) {
        const features = {
            free: [
                { icon: '📝', text: '10 job listings', available: true },
                { icon: '📄', text: '1 resume', available: true },
                { icon: '💾', text: 'Local storage only', available: true },
                { icon: '☁️', text: 'Cloud sync', available: false },
                { icon: '🔒', text: 'Zero-knowledge encryption', available: false },
                { icon: '🤖', text: 'AI assistant', available: false }
            ],
            pro: [
                { icon: '📝', text: 'Unlimited jobs', available: true },
                { icon: '📄', text: 'Unlimited resumes', available: true },
                { icon: '☁️', text: 'Cloud sync', available: true },
                { icon: '🔒', text: 'Zero-knowledge encryption', available: true },
                { icon: '🤖', text: 'AI assistant', available: true },
                { icon: '📧', text: 'Email support (24h)', available: true }
            ],
            enterprise: [
                { icon: '✨', text: 'All Pro features', available: true },
                { icon: '🔌', text: 'API access', available: true },
                { icon: '👥', text: 'Team collaboration', available: true },
                { icon: '🔐', text: 'SSO (SAML/OAuth)', available: true },
                { icon: '⚡', text: 'Priority support (4h)', available: true },
                { icon: '👔', text: 'Dedicated account manager', available: true }
            ]
        };

        const tierFeatures = features[tier] || features.free;

        return `
            <div class="features-list">
                <h3>Features</h3>
                ${tierFeatures.map(f => `
                    <div class="feature-item ${f.available ? 'available' : 'unavailable'}">
                        <span class="feature-icon">${f.icon}</span>
                        <span class="feature-text">${f.text}</span>
                        <span class="feature-status">${f.available ? '✓' : '✗'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render action buttons
     */
    renderActions(tier) {
        if (tier === 'free') {
            return `
                <div class="actions">
                    <button class="btn-upgrade btn-primary" data-tier="pro">
                        ⭐ Upgrade to Pro - $9.99/month
                    </button>
                    <button class="btn-upgrade btn-secondary" data-tier="enterprise">
                        🚀 Upgrade to Enterprise - $29.99/month
                    </button>
                </div>
            `;
        } else if (tier === 'pro') {
            return `
                <div class="actions">
                    <button class="btn-upgrade btn-primary" data-tier="enterprise">
                        🚀 Upgrade to Enterprise - $29.99/month
                    </button>
                    <button class="btn-manage btn-secondary">
                        ⚙️ Manage Subscription
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="actions">
                    <button class="btn-manage btn-primary">
                        ⚙️ Manage Subscription
                    </button>
                    <a href="/billing-history" class="btn-secondary">
                        📊 View Billing History
                    </a>
                </div>
            `;
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Upgrade buttons
        const upgradeButtons = this.container.querySelectorAll('.btn-upgrade');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.getAttribute('data-tier');
                this.handleUpgrade(tier);
            });
        });

        // Manage subscription button
        const manageButton = this.container.querySelector('.btn-manage');
        if (manageButton) {
            manageButton.addEventListener('click', () => this.handleManageSubscription());
        }
    }

    /**
     * Handle upgrade action
     */
    async handleUpgrade(tier) {
        const token = this.getAuthToken();
        if (!token) {
            alert('Please sign in to upgrade your subscription');
            return;
        }

        try {
            // Show loading state
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Creating checkout session...';
            button.disabled = true;

            // Create Stripe checkout session
            const response = await fetch(`${this.apiBaseUrl}/api/payments/create-checkout-session`, {
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

            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }

            const data = await response.json();

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Failed to start upgrade process. Please try again.');
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    /**
     * Handle manage subscription action
     */
    async handleManageSubscription() {
        const token = this.getAuthToken();
        if (!token) {
            alert('Please sign in to manage your subscription');
            return;
        }

        try {
            // Get Stripe customer portal URL
            const response = await fetch(`${this.apiBaseUrl}/api/payments/customer-portal`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get portal URL');
            }

            const data = await response.json();

            // Redirect to Stripe customer portal
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No portal URL received');
            }

        } catch (error) {
            console.error('Manage subscription error:', error);
            alert('Failed to open subscription management. Please try again.');
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Refresh widget data
     */
    async refresh() {
        await this.loadData();
        this.render();
        this.attachEventListeners();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionWidget;
}
