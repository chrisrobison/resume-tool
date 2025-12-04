// analytics-service.js - Job Search Analytics and Metrics Calculator
// Provides insights into job search progress, success rates, and trends

/**
 * Analytics Service
 * Calculates metrics and generates insights from job search data
 */
class AnalyticsService {
    constructor() {
        this.jobs = [];
        this.resumes = [];
        this.letters = [];
    }

    /**
     * Load data from storage
     * @param {Array} jobs - Job data
     * @param {Array} resumes - Resume data (optional)
     * @param {Array} letters - Cover letter data (optional)
     */
    loadData(jobs = [], resumes = [], letters = []) {
        this.jobs = jobs || [];
        this.resumes = resumes || [];
        this.letters = letters || [];
    }

    /**
     * Get all analytics
     * @returns {Object} Complete analytics object
     */
    getAll() {
        return {
            overview: this.getOverviewMetrics(),
            success: this.getSuccessMetrics(),
            timeline: this.getTimelineMetrics(),
            companies: this.getCompanyMetrics(),
            locations: this.getLocationMetrics(),
            status: this.getStatusMetrics(),
            activity: this.getActivityMetrics(),
            recommendations: this.getRecommendations()
        };
    }

    /**
     * Get overview metrics
     * @returns {Object} Overview statistics
     */
    getOverviewMetrics() {
        const total = this.jobs.length;
        const statusCounts = this.countByStatus();

        return {
            totalJobs: total,
            totalResumes: this.resumes.length,
            totalLetters: this.letters.length,
            applied: statusCounts.applied || 0,
            interviewing: statusCounts.interviewing || 0,
            offered: statusCounts.offered || 0,
            rejected: statusCounts.rejected || 0,
            accepted: statusCounts.accepted || 0
        };
    }

    /**
     * Get success metrics
     * @returns {Object} Success rates and ratios
     */
    getSuccessMetrics() {
        const applied = this.getJobsByStatus('applied').length;
        const interviewing = this.getJobsByStatus('interviewing').length;
        const offered = this.getJobsByStatus('offered').length;
        const accepted = this.getJobsByStatus('accepted').length;
        const rejected = this.getJobsByStatus('rejected').length;

        const totalResponses = interviewing + offered + accepted + rejected;

        return {
            responseRate: this.calculateRate(totalResponses, applied),
            interviewRate: this.calculateRate(interviewing + offered + accepted, applied),
            offerRate: this.calculateRate(offered + accepted, interviewing + offered + accepted),
            acceptanceRate: this.calculateRate(accepted, offered + accepted),
            rejectionRate: this.calculateRate(rejected, totalResponses),
            successRate: this.calculateRate(accepted, applied)
        };
    }

    /**
     * Get timeline metrics
     * @returns {Object} Time-based statistics
     */
    getTimelineMetrics() {
        const jobsWithDates = this.jobs.filter(j => j.dateApplied || j.createdAt);

        if (jobsWithDates.length === 0) {
            return {
                applicationsByWeek: [],
                applicationsByMonth: [],
                applicationsByDay: [],
                averageApplicationsPerWeek: 0,
                averageTimeToInterview: null,
                averageTimeToOffer: null,
                firstApplication: null,
                lastApplication: null,
                searchDuration: 0
            };
        }

        // Sort by date
        jobsWithDates.sort((a, b) => {
            const dateA = new Date(a.dateApplied || a.createdAt);
            const dateB = new Date(b.dateApplied || b.createdAt);
            return dateA - dateB;
        });

        const firstApp = new Date(jobsWithDates[0].dateApplied || jobsWithDates[0].createdAt);
        const lastApp = new Date(jobsWithDates[jobsWithDates.length - 1].dateApplied || jobsWithDates[jobsWithDates.length - 1].createdAt);

        const searchDurationDays = Math.ceil((lastApp - firstApp) / (1000 * 60 * 60 * 24));
        const searchDurationWeeks = searchDurationDays / 7;

        return {
            applicationsByWeek: this.groupByWeek(jobsWithDates),
            applicationsByMonth: this.groupByMonth(jobsWithDates),
            applicationsByDay: this.groupByDay(jobsWithDates),
            averageApplicationsPerWeek: searchDurationWeeks > 0 ? (jobsWithDates.length / searchDurationWeeks).toFixed(1) : 0,
            averageTimeToInterview: this.calculateAverageTimeToStatus('interviewing'),
            averageTimeToOffer: this.calculateAverageTimeToStatus('offered'),
            firstApplication: firstApp.toISOString().split('T')[0],
            lastApplication: lastApp.toISOString().split('T')[0],
            searchDuration: searchDurationDays
        };
    }

    /**
     * Get company metrics
     * @returns {Object} Company statistics
     */
    getCompanyMetrics() {
        const byCompany = {};

        this.jobs.forEach(job => {
            const company = job.company || 'Unknown';
            if (!byCompany[company]) {
                byCompany[company] = {
                    count: 0,
                    statuses: {},
                    jobs: []
                };
            }

            byCompany[company].count++;
            byCompany[company].jobs.push(job);

            const status = job.status || 'wishlist';
            byCompany[company].statuses[status] = (byCompany[company].statuses[status] || 0) + 1;
        });

        // Convert to array and sort by count
        const companies = Object.entries(byCompany)
            .map(([name, data]) => ({
                name,
                count: data.count,
                statuses: data.statuses,
                successRate: this.calculateCompanySuccessRate(data.jobs)
            }))
            .sort((a, b) => b.count - a.count);

        return {
            topCompanies: companies.slice(0, 10),
            totalCompanies: companies.length,
            averageApplicationsPerCompany: (this.jobs.length / companies.length).toFixed(1)
        };
    }

    /**
     * Get location metrics
     * @returns {Object} Location statistics
     */
    getLocationMetrics() {
        const byLocation = {};

        this.jobs.forEach(job => {
            const location = this.normalizeLocation(job.location || 'Unknown');
            byLocation[location] = (byLocation[location] || 0) + 1;
        });

        const locations = Object.entries(byLocation)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return {
            topLocations: locations.slice(0, 10),
            totalLocations: locations.length,
            remoteCount: this.jobs.filter(j =>
                (j.location || '').toLowerCase().includes('remote')
            ).length
        };
    }

    /**
     * Get status distribution metrics
     * @returns {Object} Status breakdown
     */
    getStatusMetrics() {
        const statusCounts = this.countByStatus();
        const total = this.jobs.length;

        const statusData = Object.entries(statusCounts).map(([status, count]) => ({
            status: this.normalizeStatusName(status),
            count,
            percentage: ((count / total) * 100).toFixed(1)
        }));

        return {
            distribution: statusData,
            total
        };
    }

    /**
     * Get activity metrics
     * @returns {Object} Activity patterns
     */
    getActivityMetrics() {
        const jobsWithDates = this.jobs.filter(j => j.dateApplied || j.createdAt);

        const byDayOfWeek = {
            'Monday': 0,
            'Tuesday': 0,
            'Wednesday': 0,
            'Thursday': 0,
            'Friday': 0,
            'Saturday': 0,
            'Sunday': 0
        };

        const byHourOfDay = Array(24).fill(0);

        jobsWithDates.forEach(job => {
            const date = new Date(job.dateApplied || job.createdAt);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const hour = date.getHours();

            byDayOfWeek[dayName]++;
            byHourOfDay[hour]++;
        });

        // Find best day and time
        const bestDay = Object.entries(byDayOfWeek)
            .sort((a, b) => b[1] - a[1])[0];

        const bestHour = byHourOfDay.indexOf(Math.max(...byHourOfDay));

        return {
            byDayOfWeek,
            byHourOfDay,
            bestDay: bestDay ? { day: bestDay[0], count: bestDay[1] } : null,
            bestHour: bestHour !== -1 ? { hour: bestHour, count: byHourOfDay[bestHour] } : null
        };
    }

    /**
     * Get recommendations based on data
     * @returns {Array} List of recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const metrics = this.getSuccessMetrics();
        const timeline = this.getTimelineMetrics();

        // Low application volume
        if (this.jobs.length < 10) {
            recommendations.push({
                type: 'warning',
                title: 'Increase Application Volume',
                message: 'You have fewer than 10 applications. Consider applying to more positions to increase your chances.',
                action: 'Add more jobs'
            });
        }

        // Low response rate
        if (metrics.responseRate < 10) {
            recommendations.push({
                type: 'tip',
                title: 'Improve Response Rate',
                message: `Your response rate is ${metrics.responseRate}%. Consider tailoring your resume and cover letter to each position.`,
                action: 'Use AI to tailor resumes'
            });
        }

        // Good success rate
        if (metrics.successRate > 5) {
            recommendations.push({
                type: 'success',
                title: 'Great Success Rate!',
                message: `You have a ${metrics.successRate}% success rate. Keep up the good work!`,
                action: null
            });
        }

        // Low activity
        if (timeline.averageApplicationsPerWeek < 3) {
            recommendations.push({
                type: 'tip',
                title: 'Increase Application Frequency',
                message: `You're averaging ${timeline.averageApplicationsPerWeek} applications per week. Aim for 5-10 for better results.`,
                action: 'Set weekly goals'
            });
        }

        // No activity recently
        const lastAppDate = timeline.lastApplication ? new Date(timeline.lastApplication) : null;
        if (lastAppDate) {
            const daysSinceLastApp = Math.ceil((new Date() - lastAppDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastApp > 7) {
                recommendations.push({
                    type: 'warning',
                    title: 'Resume Your Search',
                    message: `It's been ${daysSinceLastApp} days since your last application. Keep the momentum going!`,
                    action: 'Browse jobs'
                });
            }
        }

        return recommendations;
    }

    // ========== Helper Methods ==========

    /**
     * Count jobs by status
     */
    countByStatus() {
        const counts = {};
        this.jobs.forEach(job => {
            const status = job.status || 'wishlist';
            counts[status] = (counts[status] || 0) + 1;
        });
        return counts;
    }

    /**
     * Get jobs by status
     */
    getJobsByStatus(status) {
        return this.jobs.filter(j => j.status === status);
    }

    /**
     * Calculate rate as percentage
     */
    calculateRate(numerator, denominator) {
        if (!denominator || denominator === 0) return 0;
        return ((numerator / denominator) * 100).toFixed(1);
    }

    /**
     * Calculate average time to reach a status
     */
    calculateAverageTimeToStatus(targetStatus) {
        const jobsAtStatus = this.jobs.filter(j => {
            return j.status === targetStatus &&
                   (j.dateApplied || j.createdAt) &&
                   j.statusHistory;
        });

        if (jobsAtStatus.length === 0) return null;

        let totalDays = 0;
        let count = 0;

        jobsAtStatus.forEach(job => {
            const startDate = new Date(job.dateApplied || job.createdAt);

            // Find when status changed to target
            const statusChange = (job.statusHistory || []).find(h => h.status === targetStatus);
            if (statusChange) {
                const statusDate = new Date(statusChange.date);
                const days = Math.ceil((statusDate - startDate) / (1000 * 60 * 60 * 24));
                totalDays += days;
                count++;
            }
        });

        return count > 0 ? (totalDays / count).toFixed(1) : null;
    }

    /**
     * Group jobs by week
     */
    groupByWeek(jobs) {
        const weeks = {};

        jobs.forEach(job => {
            const date = new Date(job.dateApplied || job.createdAt);
            const weekStart = this.getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];

            weeks[weekKey] = (weeks[weekKey] || 0) + 1;
        });

        return Object.entries(weeks)
            .map(([week, count]) => ({ week, count }))
            .sort((a, b) => a.week.localeCompare(b.week));
    }

    /**
     * Group jobs by month
     */
    groupByMonth(jobs) {
        const months = {};

        jobs.forEach(job => {
            const date = new Date(job.dateApplied || job.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            months[monthKey] = (months[monthKey] || 0) + 1;
        });

        return Object.entries(months)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    /**
     * Group jobs by day of week
     */
    groupByDay(jobs) {
        const days = {};

        jobs.forEach(job => {
            const date = new Date(job.dateApplied || job.createdAt);
            const dayKey = date.toISOString().split('T')[0];

            days[dayKey] = (days[dayKey] || 0) + 1;
        });

        return Object.entries(days)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => a.day.localeCompare(b.day));
    }

    /**
     * Get start of week for a date
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(d.setDate(diff));
    }

    /**
     * Normalize location string
     */
    normalizeLocation(location) {
        if (!location) return 'Unknown';

        // Extract city/state if present
        const parts = location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            return `${parts[0]}, ${parts[1]}`;
        }

        return location;
    }

    /**
     * Normalize status name for display
     */
    normalizeStatusName(status) {
        const names = {
            'wishlist': 'Wishlist',
            'applied': 'Applied',
            'interviewing': 'Interviewing',
            'offered': 'Offered',
            'rejected': 'Rejected',
            'accepted': 'Accepted',
            'archived': 'Archived'
        };

        return names[status] || status;
    }

    /**
     * Calculate company success rate
     */
    calculateCompanySuccessRate(jobs) {
        const total = jobs.length;
        const successful = jobs.filter(j =>
            j.status === 'offered' || j.status === 'accepted'
        ).length;

        return total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
    }

    /**
     * Export analytics to JSON
     */
    export() {
        return {
            generatedAt: new Date().toISOString(),
            analytics: this.getAll(),
            metadata: {
                totalJobs: this.jobs.length,
                totalResumes: this.resumes.length,
                totalLetters: this.letters.length
            }
        };
    }

    /**
     * Export analytics to CSV
     */
    exportCSV() {
        const metrics = this.getAll();

        // Overview CSV
        const overviewRows = [
            ['Metric', 'Value'],
            ['Total Jobs', metrics.overview.totalJobs],
            ['Applied', metrics.overview.applied],
            ['Interviewing', metrics.overview.interviewing],
            ['Offered', metrics.overview.offered],
            ['Rejected', metrics.overview.rejected],
            ['Response Rate', `${metrics.success.responseRate}%`],
            ['Interview Rate', `${metrics.success.interviewRate}%`],
            ['Offer Rate', `${metrics.success.offerRate}%`]
        ];

        return overviewRows.map(row => row.join(',')).join('\n');
    }
}

// Make available globally
window.AnalyticsService = AnalyticsService;

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsService;
}
