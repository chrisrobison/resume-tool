// analytics-dashboard.js - Analytics Dashboard Component
// Displays comprehensive job search analytics and insights

/**
 * Analytics Dashboard Component
 * Shows metrics, charts, and insights about job search progress
 */
class AnalyticsDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // State
        this.analytics = null;
        this.charts = {};
        this.analyticsService = null;
        this.chartConfig = null;
        this.isLoading = true;
    }

    connectedCallback() {
        this.render();
        this.init();
    }

    /**
     * Initialize services and load data
     */
    async init() {
        // Initialize services
        this.analyticsService = new AnalyticsService();
        this.chartConfig = new ChartConfig();

        // Load data
        await this.loadData();

        // Calculate analytics
        this.calculateAnalytics();

        // Render with data
        this.isLoading = false;
        this.render();

        // Initialize charts after render
        setTimeout(() => this.initializeCharts(), 100);
    }

    /**
     * Load data from storage
     */
    async loadData() {
        try {
            // Get data from global store or localStorage
            const jobs = await this.getJobs();
            const resumes = await this.getResumes();
            const letters = await this.getLetters();

            this.analyticsService.loadData(jobs, resumes, letters);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    /**
     * Get jobs from storage
     */
    async getJobs() {
        // Try global store first
        if (window.globalStore && window.globalStore.getJobs) {
            return window.globalStore.getJobs();
        }

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('jobs');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Get resumes from storage
     */
    async getResumes() {
        if (window.globalStore && window.globalStore.getResumes) {
            return window.globalStore.getResumes();
        }

        try {
            const stored = localStorage.getItem('resumes');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Get cover letters from storage
     */
    async getLetters() {
        if (window.globalStore && window.globalStore.getLetters) {
            return window.globalStore.getLetters();
        }

        try {
            const stored = localStorage.getItem('letters');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Calculate analytics
     */
    calculateAnalytics() {
        this.analytics = this.analyticsService.getAll();
        console.log('Analytics calculated:', this.analytics);
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        const shadow = this.shadowRoot;

        // Status Distribution (Doughnut)
        this.initStatusChart(shadow);

        // Applications Over Time (Line)
        this.initTimelineChart(shadow);

        // Top Companies (Horizontal Bar)
        this.initCompaniesChart(shadow);

        // Success Funnel (Bar)
        this.initFunnelChart(shadow);

        // Activity by Day (Bar)
        this.initActivityChart(shadow);
    }

    /**
     * Initialize status distribution chart
     */
    initStatusChart(shadow) {
        const canvas = shadow.getElementById('statusChart');
        if (!canvas || !this.analytics) return;

        const ctx = canvas.getContext('2d');
        const config = this.chartConfig.getStatusDistributionConfig(
            this.analytics.status.distribution
        );

        this.charts.status = new Chart(ctx, config);
    }

    /**
     * Initialize timeline chart
     */
    initTimelineChart(shadow) {
        const canvas = shadow.getElementById('timelineChart');
        if (!canvas || !this.analytics) return;

        const timeline = this.analytics.timeline;
        const data = timeline.applicationsByWeek || [];

        const ctx = canvas.getContext('2d');
        const config = this.chartConfig.getTimelineConfig({
            labels: data.map(d => d.week),
            values: data.map(d => d.count)
        });

        this.charts.timeline = new Chart(ctx, config);
    }

    /**
     * Initialize companies chart
     */
    initCompaniesChart(shadow) {
        const canvas = shadow.getElementById('companiesChart');
        if (!canvas || !this.analytics) return;

        const companies = this.analytics.companies.topCompanies.slice(0, 10);

        const ctx = canvas.getContext('2d');
        const config = this.chartConfig.getCompanyComparisonConfig(companies);

        this.charts.companies = new Chart(ctx, config);
    }

    /**
     * Initialize success funnel chart
     */
    initFunnelChart(shadow) {
        const canvas = shadow.getElementById('funnelChart');
        if (!canvas || !this.analytics) return;

        const metrics = {
            applied: this.analytics.overview.applied,
            responseRate: this.analytics.success.responseRate,
            interviewRate: this.analytics.success.interviewRate,
            offerRate: this.analytics.success.offerRate,
            successRate: this.analytics.success.successRate
        };

        const ctx = canvas.getContext('2d');
        const config = this.chartConfig.getSuccessFunnelConfig(metrics);

        this.charts.funnel = new Chart(ctx, config);
    }

    /**
     * Initialize activity chart
     */
    initActivityChart(shadow) {
        const canvas = shadow.getElementById('activityChart');
        if (!canvas || !this.analytics) return;

        const activity = this.analytics.activity.byDayOfWeek;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const ctx = canvas.getContext('2d');
        const config = this.chartConfig.getBarChartConfig({
            labels: days,
            datasets: [{
                label: 'Applications',
                data: days.map(day => activity[day] || 0)
            }]
        });

        this.charts.activity = new Chart(ctx, config);
    }

    /**
     * Export analytics
     */
    exportAnalytics(format = 'json') {
        if (format === 'csv') {
            const csv = this.analyticsService.exportCSV();
            this.downloadFile(csv, 'analytics.csv', 'text/csv');
        } else {
            const json = JSON.stringify(this.analyticsService.export(), null, 2);
            this.downloadFile(json, 'analytics.json', 'application/json');
        }
    }

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Refresh analytics
     */
    async refresh() {
        this.isLoading = true;
        this.render();

        await this.loadData();
        this.calculateAnalytics();

        this.isLoading = false;
        this.render();

        // Destroy old charts
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};

        // Initialize new charts
        setTimeout(() => this.initializeCharts(), 100);
    }

    /**
     * Render component
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>

            <div class="dashboard-container">
                ${this.isLoading ? this.renderLoading() : this.renderDashboard()}
            </div>
        `;

        // Attach event listeners
        setTimeout(() => this.attachEventListeners(), 0);
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading analytics...</p>
            </div>
        `;
    }

    /**
     * Render dashboard
     */
    renderDashboard() {
        if (!this.analytics || this.analytics.overview.totalJobs === 0) {
            return this.renderEmptyState();
        }

        return `
            ${this.renderHeader()}
            ${this.renderOverview()}
            ${this.renderCharts()}
            ${this.renderRecommendations()}
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h2>No Data Yet</h2>
                <p>Start tracking jobs to see your analytics</p>
                <button class="btn-primary" onclick="window.location.hash = '#jobs'">
                    Add Your First Job
                </button>
            </div>
        `;
    }

    /**
     * Render header
     */
    renderHeader() {
        return `
            <div class="dashboard-header">
                <div>
                    <h1>📊 Analytics Dashboard</h1>
                    <p class="subtitle">Insights into your job search progress</p>
                </div>
                <div class="header-actions">
                    <button class="btn-secondary" id="refresh-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button class="btn-secondary" id="export-json-btn">
                        <i class="fas fa-download"></i> Export JSON
                    </button>
                    <button class="btn-secondary" id="export-csv-btn">
                        <i class="fas fa-file-csv"></i> Export CSV
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render overview metrics
     */
    renderOverview() {
        const { overview, success, timeline } = this.analytics;

        return `
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <div class="metric-icon">💼</div>
                    <div class="metric-content">
                        <div class="metric-value">${overview.totalJobs}</div>
                        <div class="metric-label">Total Jobs</div>
                    </div>
                </div>

                <div class="metric-card success">
                    <div class="metric-icon">✅</div>
                    <div class="metric-content">
                        <div class="metric-value">${overview.applied}</div>
                        <div class="metric-label">Applied</div>
                    </div>
                </div>

                <div class="metric-card warning">
                    <div class="metric-icon">📞</div>
                    <div class="metric-content">
                        <div class="metric-value">${overview.interviewing}</div>
                        <div class="metric-label">Interviewing</div>
                    </div>
                </div>

                <div class="metric-card info">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-content">
                        <div class="metric-value">${overview.offered}</div>
                        <div class="metric-label">Offers</div>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-icon">📈</div>
                    <div class="metric-content">
                        <div class="metric-value">${success.responseRate}%</div>
                        <div class="metric-label">Response Rate</div>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-icon">🎤</div>
                    <div class="metric-content">
                        <div class="metric-value">${success.interviewRate}%</div>
                        <div class="metric-label">Interview Rate</div>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-icon">💰</div>
                    <div class="metric-content">
                        <div class="metric-value">${success.offerRate}%</div>
                        <div class="metric-label">Offer Rate</div>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-icon">⏱️</div>
                    <div class="metric-content">
                        <div class="metric-value">${timeline.averageApplicationsPerWeek}</div>
                        <div class="metric-label">Apps/Week</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render charts
     */
    renderCharts() {
        return `
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>Status Distribution</h3>
                    <div class="chart-container">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Applications Over Time</h3>
                    <div class="chart-container">
                        <canvas id="timelineChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Top Companies</h3>
                    <div class="chart-container">
                        <canvas id="companiesChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Application Funnel</h3>
                    <div class="chart-container">
                        <canvas id="funnelChart"></canvas>
                    </div>
                </div>

                <div class="chart-card full-width">
                    <h3>Activity by Day of Week</h3>
                    <div class="chart-container">
                        <canvas id="activityChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render recommendations
     */
    renderRecommendations() {
        const recommendations = this.analytics.recommendations;

        if (!recommendations || recommendations.length === 0) {
            return '';
        }

        return `
            <div class="recommendations-section">
                <h2>💡 Recommendations</h2>
                <div class="recommendations-grid">
                    ${recommendations.map(rec => `
                        <div class="recommendation-card ${rec.type}">
                            <div class="rec-icon">${this.getRecommendationIcon(rec.type)}</div>
                            <div class="rec-content">
                                <h4>${rec.title}</h4>
                                <p>${rec.message}</p>
                                ${rec.action ? `<button class="rec-action">${rec.action}</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Get recommendation icon
     */
    getRecommendationIcon(type) {
        const icons = {
            warning: '⚠️',
            tip: '💡',
            success: '🎉',
            info: 'ℹ️'
        };
        return icons[type] || '💡';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const shadow = this.shadowRoot;

        // Refresh button
        const refreshBtn = shadow.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Export buttons
        const exportJsonBtn = shadow.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportAnalytics('json'));
        }

        const exportCsvBtn = shadow.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportAnalytics('csv'));
        }
    }

    /**
     * Get component styles
     */
    getStyles() {
        return `
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            :host {
                display: block;
                width: 100%;
            }

            .dashboard-container {
                padding: 24px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .loading-state,
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                padding: 40px;
                text-align: center;
            }

            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(52, 152, 219, 0.2);
                border-top-color: #3498db;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-bottom: 20px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .empty-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }

            .empty-state h2 {
                font-size: 1.5rem;
                color: #2c3e50;
                margin-bottom: 12px;
            }

            .empty-state p {
                color: #6c757d;
                margin-bottom: 24px;
            }

            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 32px;
                flex-wrap: wrap;
                gap: 16px;
            }

            .dashboard-header h1 {
                font-size: 2rem;
                color: #2c3e50;
                margin-bottom: 4px;
            }

            .subtitle {
                color: #6c757d;
                font-size: 0.95rem;
            }

            .header-actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            button {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .btn-primary {
                background: #3498db;
                color: white;
            }

            .btn-primary:hover {
                background: #2980b9;
                transform: translateY(-1px);
            }

            .btn-secondary {
                background: #e9ecef;
                color: #495057;
            }

            .btn-secondary:hover {
                background: #dee2e6;
            }

            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 32px;
            }

            .metric-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 16px;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .metric-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .metric-card.primary { border-left: 4px solid #3498db; }
            .metric-card.success { border-left: 4px solid #27ae60; }
            .metric-card.warning { border-left: 4px solid #f39c12; }
            .metric-card.info { border-left: 4px solid #3498db; }

            .metric-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }

            .metric-value {
                font-size: 1.75rem;
                font-weight: bold;
                color: #2c3e50;
            }

            .metric-label {
                font-size: 0.85rem;
                color: #6c757d;
                margin-top: 4px;
            }

            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }

            .chart-card {
                background: white;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .chart-card.full-width {
                grid-column: 1 / -1;
            }

            .chart-card h3 {
                font-size: 1.1rem;
                color: #2c3e50;
                margin-bottom: 20px;
            }

            .chart-container {
                position: relative;
                height: 300px;
            }

            .recommendations-section {
                margin-top: 32px;
            }

            .recommendations-section h2 {
                font-size: 1.5rem;
                color: #2c3e50;
                margin-bottom: 20px;
            }

            .recommendations-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 16px;
            }

            .recommendation-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                display: flex;
                gap: 16px;
                border-left: 4px solid #6c757d;
            }

            .recommendation-card.warning { border-left-color: #f39c12; }
            .recommendation-card.tip { border-left-color: #3498db; }
            .recommendation-card.success { border-left-color: #27ae60; }

            .rec-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }

            .rec-content h4 {
                font-size: 1rem;
                color: #2c3e50;
                margin-bottom: 8px;
            }

            .rec-content p {
                color: #6c757d;
                font-size: 0.9rem;
                line-height: 1.5;
                margin-bottom: 12px;
            }

            .rec-action {
                padding: 8px 16px;
                font-size: 0.85rem;
            }

            @media (max-width: 768px) {
                .dashboard-container {
                    padding: 16px;
                }

                .dashboard-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .header-actions {
                    width: 100%;
                }

                .header-actions button {
                    flex: 1;
                }

                .metrics-grid {
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                }

                .charts-grid {
                    grid-template-columns: 1fr;
                }

                .chart-container {
                    height: 250px;
                }

                .recommendations-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
}

// Register custom element
customElements.define('analytics-dashboard', AnalyticsDashboard);

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsDashboard;
}

// Make available globally
window.AnalyticsDashboard = AnalyticsDashboard;
