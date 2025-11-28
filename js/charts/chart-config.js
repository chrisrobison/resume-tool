// chart-config.js - Chart.js Configuration Helper
// Provides consistent chart configurations and themes

/**
 * Chart Configuration Helper
 * Centralized configuration for all charts
 */
class ChartConfig {
    constructor() {
        // Color palette
        this.colors = {
            primary: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#3498db',
            secondary: '#95a5a6',
            purple: '#9b59b6',
            teal: '#1abc9c',
            pink: '#e91e63',
            orange: '#ff9800'
        };

        // Status colors
        this.statusColors = {
            wishlist: '#95a5a6',
            applied: '#3498db',
            interviewing: '#f39c12',
            offered: '#27ae60',
            rejected: '#e74c3c',
            accepted: '#9b59b6',
            archived: '#7f8c8d'
        };

        // Default fonts
        this.fonts = {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            size: 12,
            weight: 'normal',
            lineHeight: 1.5
        };
    }

    /**
     * Get base chart options
     */
    getBaseOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: this.fonts.family,
                            size: this.fonts.size
                        },
                        padding: 15,
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        family: this.fonts.family,
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: this.fonts.family,
                        size: 12
                    },
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {}
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };
    }

    /**
     * Get line chart configuration
     */
    getLineChartConfig(data, options = {}) {
        const baseOptions = this.getBaseOptions();

        return {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.color || this.getColorByIndex(index),
                    backgroundColor: this.addAlpha(dataset.color || this.getColorByIndex(index), 0.1),
                    borderWidth: 2,
                    fill: dataset.fill !== false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: dataset.color || this.getColorByIndex(index),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }))
            },
            options: {
                ...baseOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: this.fonts.family,
                                size: 11
                            },
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: this.fonts.family,
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                ...options
            }
        };
    }

    /**
     * Get bar chart configuration
     */
    getBarChartConfig(data, options = {}) {
        const baseOptions = this.getBaseOptions();

        return {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: dataset.colors || dataset.data.map((_, i) =>
                        this.addAlpha(this.getColorByIndex(i), 0.8)
                    ),
                    borderColor: dataset.borderColors || dataset.data.map((_, i) =>
                        this.getColorByIndex(i)
                    ),
                    borderWidth: 2,
                    borderRadius: 4
                }))
            },
            options: {
                ...baseOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: this.fonts.family,
                                size: 11
                            },
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: this.fonts.family,
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                ...options
            }
        };
    }

    /**
     * Get pie/doughnut chart configuration
     */
    getPieChartConfig(data, options = {}) {
        const baseOptions = this.getBaseOptions();

        return {
            type: options.doughnut ? 'doughnut' : 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: data.colors || data.values.map((_, i) =>
                        this.addAlpha(this.getColorByIndex(i), 0.8)
                    ),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                ...baseOptions,
                plugins: {
                    ...baseOptions.plugins,
                    legend: {
                        ...baseOptions.plugins.legend,
                        position: options.legendPosition || 'right'
                    },
                    tooltip: {
                        ...baseOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options
            }
        };
    }

    /**
     * Get radar chart configuration
     */
    getRadarChartConfig(data, options = {}) {
        const baseOptions = this.getBaseOptions();

        return {
            type: 'radar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: this.addAlpha(dataset.color || this.getColorByIndex(index), 0.2),
                    borderColor: dataset.color || this.getColorByIndex(index),
                    borderWidth: 2,
                    pointBackgroundColor: dataset.color || this.getColorByIndex(index),
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: dataset.color || this.getColorByIndex(index)
                }))
            },
            options: {
                ...baseOptions,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: this.fonts.family,
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                ...options
            }
        };
    }

    /**
     * Get status distribution config (pie chart with status colors)
     */
    getStatusDistributionConfig(statusData) {
        return this.getPieChartConfig({
            labels: statusData.map(s => s.status),
            values: statusData.map(s => s.count),
            colors: statusData.map(s => {
                const statusKey = s.status.toLowerCase().replace(/\s+/g, '');
                return this.statusColors[statusKey] || this.colors.secondary;
            })
        }, {
            doughnut: true,
            legendPosition: 'bottom'
        });
    }

    /**
     * Get timeline config (line chart)
     */
    getTimelineConfig(timelineData) {
        return this.getLineChartConfig({
            labels: timelineData.labels,
            datasets: [{
                label: 'Applications',
                data: timelineData.values,
                color: this.colors.primary,
                fill: true
            }]
        });
    }

    /**
     * Get company comparison config (horizontal bar chart)
     */
    getCompanyComparisonConfig(companies) {
        const config = this.getBarChartConfig({
            labels: companies.map(c => c.name),
            datasets: [{
                label: 'Applications',
                data: companies.map(c => c.count),
                colors: companies.map(() => this.addAlpha(this.colors.primary, 0.8))
            }]
        });

        // Make horizontal
        config.options.indexAxis = 'y';
        config.options.scales.x.beginAtZero = true;
        config.options.scales.y.grid = { display: false };

        return config;
    }

    /**
     * Get success funnel config
     */
    getSuccessFunnelConfig(metrics) {
        const stages = [
            { label: 'Applied', value: metrics.applied },
            { label: 'Response', value: Math.round(metrics.applied * (metrics.responseRate / 100)) },
            { label: 'Interview', value: Math.round(metrics.applied * (metrics.interviewRate / 100)) },
            { label: 'Offer', value: Math.round(metrics.applied * (metrics.offerRate / 100)) },
            { label: 'Accepted', value: Math.round(metrics.applied * (metrics.successRate / 100)) }
        ];

        return this.getBarChartConfig({
            labels: stages.map(s => s.label),
            datasets: [{
                label: 'Jobs',
                data: stages.map(s => s.value)
            }]
        }, {
            plugins: {
                legend: {
                    display: false
                }
            }
        });
    }

    // ========== Helper Methods ==========

    /**
     * Get color by index (cycles through color palette)
     */
    getColorByIndex(index) {
        const colorArray = Object.values(this.colors);
        return colorArray[index % colorArray.length];
    }

    /**
     * Add alpha transparency to hex color
     */
    addAlpha(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Get gradient for canvas
     */
    createGradient(ctx, color, height = 300) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.addAlpha(color, 0.8));
        gradient.addColorStop(1, this.addAlpha(color, 0.1));
        return gradient;
    }
}

// Make available globally
window.ChartConfig = ChartConfig;

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartConfig;
}
