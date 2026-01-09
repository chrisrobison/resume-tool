// Account Dashboard Component - Unified account management interface
// Handles subscription, billing, usage stats, and settings

import { ComponentBase } from '../js/component-base.js';

class AccountDashboard extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Component state
        this._activeTab = 'overview';
        this._userData = null;
        this._subscription = null;
        this._usage = null;
        this._billingHistory = [];
        this._loading = true;
    }

    async onInitialize() {
        console.log('AccountDashboard: Initializing');

        // Load account data
        await this.loadAccountData();

        // Render
        this.render();

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadAccountData() {
        try {
            this._loading = true;
            this.render();

            // Check if user is authenticated
            const token = localStorage.getItem('authToken');
            if (!token) {
                this._error = 'Not authenticated. Please log in.';
                this._loading = false;
                this.render();
                return;
            }

            // Fetch user data
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Load subscription info
            const subResponse = await fetch('/api/subscriptions/me', { headers });
            if (subResponse.ok) {
                this._subscription = await subResponse.json();
            }

            // Load usage stats
            const usageResponse = await fetch('/api/subscriptions/usage', { headers });
            if (usageResponse.ok) {
                this._usage = await usageResponse.json();
            }

            // Load billing history
            const billingResponse = await fetch('/api/subscriptions/billing-history', { headers });
            if (billingResponse.ok) {
                this._billingHistory = await billingResponse.json();
            }

            this._loading = false;
            this.render();

        } catch (error) {
            console.error('Error loading account data:', error);
            this._error = error.message;
            this._loading = false;
            this.render();
        }
    }

    onDataChange(newData, previousData, source) {
        console.log('AccountDashboard: Data changed from', source);
        if (newData?.user) {
            this._userData = newData.user;
            this.render();
        }
    }

    async onRefresh(force = false) {
        console.log('AccountDashboard: Refreshing');
        await this.loadAccountData();
    }

    setupEventListeners() {
        const shadow = this.shadowRoot;

        // Tab switching
        shadow.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                this._activeTab = e.target.dataset.tab;
                this.render();
            }
        });

        // Upgrade button
        shadow.addEventListener('click', async (e) => {
            if (e.target.matches('.upgrade-btn')) {
                const tier = e.target.dataset.tier;
                await this.handleUpgrade(tier);
            }
        });

        // Cancel subscription
        shadow.addEventListener('click', async (e) => {
            if (e.target.matches('.cancel-subscription-btn')) {
                await this.handleCancelSubscription();
            }
        });

        // Manage billing (Stripe portal)
        shadow.addEventListener('click', async (e) => {
            if (e.target.matches('.manage-billing-btn')) {
                await this.handleManageBilling();
            }
        });
    }

    async handleUpgrade(tier) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/payments/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tier })
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }

            const { url } = await response.json();
            window.location.href = url; // Redirect to Stripe Checkout

        } catch (error) {
            console.error('Error upgrading:', error);
            this.showNotification('Failed to upgrade subscription', 'error');
        }
    }

    async handleCancelSubscription() {
        if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/subscriptions/cancel', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel subscription');
            }

            this.showNotification('Subscription cancelled successfully', 'success');
            await this.loadAccountData();

        } catch (error) {
            console.error('Error cancelling:', error);
            this.showNotification('Failed to cancel subscription', 'error');
        }
    }

    async handleManageBilling() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/payments/create-portal-session', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to create portal session');
            }

            const { url } = await response.json();
            window.location.href = url; // Redirect to Stripe Customer Portal

        } catch (error) {
            console.error('Error opening billing portal:', error);
            this.showNotification('Failed to open billing portal', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Dispatch event for global toast notification
        this.dispatchEvent(new CustomEvent('show-notification', {
            detail: { message, type },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>
            <div class="account-dashboard">
                ${this.renderHeader()}
                ${this.renderTabs()}
                ${this.renderContent()}
            </div>
        `;
    }

    renderHeader() {
        const userName = this._userData?.displayName || this._userData?.email || 'User';
        const userEmail = this._userData?.email || '';

        return `
            <div class="dashboard-header">
                <div class="user-info">
                    <div class="user-avatar">
                        ${userName.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <h2>${userName}</h2>
                        <p>${userEmail}</p>
                    </div>
                </div>
                <div class="subscription-badge ${this._subscription?.tier || 'free'}">
                    ${(this._subscription?.tier || 'free').toUpperCase()}
                </div>
            </div>
        `;
    }

    renderTabs() {
        const tabs = [
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'subscription', label: 'Subscription', icon: '💳' },
            { id: 'billing', label: 'Billing History', icon: '📜' },
            { id: 'usage', label: 'Usage Stats', icon: '📈' }
        ];

        return `
            <div class="tabs">
                ${tabs.map(tab => `
                    <button
                        class="tab-button ${this._activeTab === tab.id ? 'active' : ''}"
                        data-tab="${tab.id}"
                    >
                        <span class="tab-icon">${tab.icon}</span>
                        <span class="tab-label">${tab.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderContent() {
        if (this._loading) {
            return '<div class="loading">Loading account data...</div>';
        }

        if (this._error) {
            return `<div class="error">${this._error}</div>`;
        }

        switch (this._activeTab) {
            case 'overview':
                return this.renderOverview();
            case 'subscription':
                return this.renderSubscription();
            case 'billing':
                return this.renderBillingHistory();
            case 'usage':
                return this.renderUsageStats();
            default:
                return '';
        }
    }

    renderOverview() {
        const sub = this._subscription || {};
        const usage = this._usage || {};

        return `
            <div class="tab-content overview">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💼</div>
                        <div class="stat-info">
                            <div class="stat-value">${usage.jobsUsed || 0}</div>
                            <div class="stat-label">Jobs Tracked</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📄</div>
                        <div class="stat-info">
                            <div class="stat-value">${usage.resumesUsed || 0}</div>
                            <div class="stat-label">Resumes Created</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🤖</div>
                        <div class="stat-info">
                            <div class="stat-value">${usage.aiRequestsUsed || 0}</div>
                            <div class="stat-label">AI Requests</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💾</div>
                        <div class="stat-info">
                            <div class="stat-value">${this.formatBytes(usage.storageUsed || 0)}</div>
                            <div class="stat-label">Storage Used</div>
                        </div>
                    </div>
                </div>

                ${sub.tier === 'free' ? this.renderUpgradePrompt() : ''}
            </div>
        `;
    }

    renderSubscription() {
        const sub = this._subscription || { tier: 'free' };
        const tiers = {
            free: {
                name: 'Free',
                price: '$0/month',
                features: [
                    '10 job applications',
                    '1 resume',
                    'Basic features',
                    'Local storage only'
                ]
            },
            pro: {
                name: 'Pro',
                price: '$9.99/month',
                features: [
                    'Unlimited job applications',
                    'Unlimited resumes',
                    'AI-powered tailoring',
                    'Cloud sync',
                    'Data encryption',
                    'Priority support'
                ]
            },
            enterprise: {
                name: 'Enterprise',
                price: '$29.99/month',
                features: [
                    'Everything in Pro',
                    'API access',
                    'Team collaboration',
                    'SSO integration',
                    'Custom features',
                    'Dedicated support'
                ]
            }
        };

        return `
            <div class="tab-content subscription">
                <div class="current-plan">
                    <h3>Current Plan: ${tiers[sub.tier]?.name || 'Free'}</h3>
                    <p class="plan-price">${tiers[sub.tier]?.price || '$0/month'}</p>
                    ${sub.tier !== 'free' && sub.renewsAt ? `
                        <p class="renewal-date">Renews on ${new Date(sub.renewsAt).toLocaleDateString()}</p>
                    ` : ''}
                </div>

                <div class="plans-grid">
                    ${Object.entries(tiers).map(([tierKey, tierData]) => `
                        <div class="plan-card ${sub.tier === tierKey ? 'current' : ''}">
                            <h4>${tierData.name}</h4>
                            <p class="price">${tierData.price}</p>
                            <ul class="features">
                                ${tierData.features.map(f => `<li>✓ ${f}</li>`).join('')}
                            </ul>
                            ${sub.tier === tierKey ?
                                '<button class="plan-button current-plan-btn" disabled>Current Plan</button>' :
                                `<button class="plan-button upgrade-btn" data-tier="${tierKey}">
                                    ${tierKey === 'free' ? 'Downgrade' : 'Upgrade'}
                                </button>`
                            }
                        </div>
                    `).join('')}
                </div>

                ${sub.tier !== 'free' ? `
                    <div class="subscription-actions">
                        <button class="manage-billing-btn">Manage Billing</button>
                        <button class="cancel-subscription-btn danger">Cancel Subscription</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderBillingHistory() {
        if (!this._billingHistory || this._billingHistory.length === 0) {
            return `
                <div class="tab-content billing">
                    <p class="empty-state">No billing history available.</p>
                </div>
            `;
        }

        return `
            <div class="tab-content billing">
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Invoice</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._billingHistory.map(item => `
                            <tr>
                                <td>${new Date(item.date).toLocaleDateString()}</td>
                                <td>${item.description}</td>
                                <td>$${(item.amount / 100).toFixed(2)}</td>
                                <td><span class="status ${item.status}">${item.status}</span></td>
                                <td>
                                    ${item.invoiceUrl ?
                                        `<a href="${item.invoiceUrl}" target="_blank">View</a>` :
                                        '-'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderUsageStats() {
        const usage = this._usage || {};
        const limits = this.getLimitsForTier(this._subscription?.tier || 'free');

        return `
            <div class="tab-content usage">
                <div class="usage-bars">
                    ${this.renderUsageBar('Jobs', usage.jobsUsed || 0, limits.jobs)}
                    ${this.renderUsageBar('Resumes', usage.resumesUsed || 0, limits.resumes)}
                    ${this.renderUsageBar('AI Requests', usage.aiRequestsUsed || 0, limits.aiRequests)}
                    ${this.renderUsageBar('Storage', usage.storageUsed || 0, limits.storage, true)}
                </div>

                ${this.isNearLimit(usage, limits) ? this.renderUpgradePrompt() : ''}
            </div>
        `;
    }

    renderUsageBar(label, used, limit, isBytes = false) {
        const isUnlimited = limit === -1;
        const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
        const isNearLimit = percentage > 80;

        return `
            <div class="usage-bar">
                <div class="usage-label">
                    <span>${label}</span>
                    <span class="usage-value ${isNearLimit ? 'warning' : ''}">
                        ${isBytes ? this.formatBytes(used) : used}
                        ${isUnlimited ? '' : `/ ${isBytes ? this.formatBytes(limit) : limit}`}
                    </span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${isNearLimit ? 'warning' : ''}"
                         style="width: ${isUnlimited ? 0 : percentage}%"></div>
                </div>
            </div>
        `;
    }

    renderUpgradePrompt() {
        return `
            <div class="upgrade-prompt">
                <h3>🚀 Upgrade to Pro</h3>
                <p>Unlock unlimited jobs, resumes, and AI-powered features</p>
                <button class="upgrade-btn primary" data-tier="pro">
                    Upgrade Now - $9.99/month
                </button>
            </div>
        `;
    }

    getLimitsForTier(tier) {
        const limits = {
            free: {
                jobs: 10,
                resumes: 1,
                aiRequests: 0,
                storage: 10 * 1024 * 1024 // 10MB
            },
            pro: {
                jobs: -1, // unlimited
                resumes: -1,
                aiRequests: -1,
                storage: 1024 * 1024 * 1024 // 1GB
            },
            enterprise: {
                jobs: -1,
                resumes: -1,
                aiRequests: -1,
                storage: 10 * 1024 * 1024 * 1024 // 10GB
            }
        };
        return limits[tier] || limits.free;
    }

    isNearLimit(usage, limits) {
        if (limits.jobs === -1) return false; // unlimited

        return (
            (usage.jobsUsed || 0) / limits.jobs > 0.8 ||
            (usage.resumesUsed || 0) / limits.resumes > 0.8 ||
            (usage.storageUsed || 0) / limits.storage > 0.8
        );
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getStyles() {
        return `
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .account-dashboard {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                background: #f5f5f5;
                min-height: 100vh;
                padding: 20px;
            }

            .dashboard-header {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .user-avatar {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
            }

            .user-details h2 {
                font-size: 20px;
                color: #333;
                margin-bottom: 4px;
            }

            .user-details p {
                color: #666;
                font-size: 14px;
            }

            .subscription-badge {
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 12px;
                text-transform: uppercase;
            }

            .subscription-badge.free {
                background: #e0e0e0;
                color: #666;
            }

            .subscription-badge.pro {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .subscription-badge.enterprise {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
            }

            .tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .tab-button {
                flex: 1;
                padding: 12px 20px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 14px;
                color: #666;
                transition: all 0.2s;
            }

            .tab-button:hover {
                background: #f5f5f5;
            }

            .tab-button.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .tab-icon {
                font-size: 18px;
            }

            .tab-content {
                background: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .loading, .error, .empty-state {
                text-align: center;
                padding: 40px;
                color: #666;
            }

            .error {
                color: #e53e3e;
            }

            /* Overview */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                padding: 20px;
                color: white;
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .stat-icon {
                font-size: 32px;
            }

            .stat-value {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 4px;
            }

            .stat-label {
                font-size: 14px;
                opacity: 0.9;
            }

            /* Subscription */
            .current-plan {
                text-align: center;
                margin-bottom: 30px;
            }

            .current-plan h3 {
                font-size: 24px;
                margin-bottom: 10px;
            }

            .plan-price {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 8px;
            }

            .renewal-date {
                color: #666;
                font-size: 14px;
            }

            .plans-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .plan-card {
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 24px;
                text-align: center;
                transition: all 0.3s;
            }

            .plan-card:hover {
                border-color: #667eea;
                transform: translateY(-4px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            }

            .plan-card.current {
                border-color: #667eea;
                background: #f7fafc;
            }

            .plan-card h4 {
                font-size: 20px;
                margin-bottom: 12px;
            }

            .plan-card .price {
                font-size: 28px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 20px;
            }

            .plan-card .features {
                list-style: none;
                text-align: left;
                margin-bottom: 20px;
            }

            .plan-card .features li {
                padding: 8px 0;
                color: #666;
                font-size: 14px;
            }

            .plan-button {
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .upgrade-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .upgrade-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .current-plan-btn {
                background: #e0e0e0;
                color: #999;
                cursor: not-allowed;
            }

            .subscription-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }

            .manage-billing-btn, .cancel-subscription-btn {
                padding: 12px 24px;
                border: 2px solid #667eea;
                border-radius: 6px;
                background: white;
                color: #667eea;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .manage-billing-btn:hover {
                background: #667eea;
                color: white;
            }

            .cancel-subscription-btn.danger {
                border-color: #e53e3e;
                color: #e53e3e;
            }

            .cancel-subscription-btn.danger:hover {
                background: #e53e3e;
                color: white;
            }

            /* Billing History */
            .billing-table {
                width: 100%;
                border-collapse: collapse;
            }

            .billing-table th {
                text-align: left;
                padding: 12px;
                border-bottom: 2px solid #e0e0e0;
                color: #666;
                font-weight: 600;
            }

            .billing-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }

            .billing-table .status {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .billing-table .status.paid {
                background: #d4edda;
                color: #155724;
            }

            .billing-table .status.pending {
                background: #fff3cd;
                color: #856404;
            }

            .billing-table .status.failed {
                background: #f8d7da;
                color: #721c24;
            }

            .billing-table a {
                color: #667eea;
                text-decoration: none;
            }

            .billing-table a:hover {
                text-decoration: underline;
            }

            /* Usage Stats */
            .usage-bars {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 30px;
            }

            .usage-bar {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .usage-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                font-weight: 600;
            }

            .usage-value {
                color: #666;
            }

            .usage-value.warning {
                color: #d97706;
            }

            .progress-bar {
                height: 12px;
                background: #e0e0e0;
                border-radius: 6px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s;
            }

            .progress-fill.warning {
                background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
            }

            /* Upgrade Prompt */
            .upgrade-prompt {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px;
                text-align: center;
            }

            .upgrade-prompt h3 {
                font-size: 24px;
                margin-bottom: 10px;
            }

            .upgrade-prompt p {
                margin-bottom: 20px;
                opacity: 0.9;
            }

            .upgrade-prompt .primary {
                background: white;
                color: #667eea;
                padding: 12px 32px;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .upgrade-prompt .primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            @media (max-width: 768px) {
                .dashboard-header {
                    flex-direction: column;
                    gap: 15px;
                }

                .tabs {
                    flex-direction: column;
                }

                .tab-button {
                    justify-content: flex-start;
                }

                .stats-grid, .plans-grid {
                    grid-template-columns: 1fr;
                }

                .subscription-actions {
                    flex-direction: column;
                }
            }
        `;
    }
}

customElements.define('account-dashboard', AccountDashboard);

export default AccountDashboard;
