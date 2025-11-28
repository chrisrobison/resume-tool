// popup.js - Popup script for Job Hunt Manager Extension
// Displays saved jobs and manages extension settings

(function() {
    'use strict';

    // State
    let jobs = [];
    let expandedJobId = null;

    /**
     * Initialize popup
     */
    async function init() {
        console.log('Popup initialized');

        // Set up event listeners
        document.getElementById('refreshBtn').addEventListener('click', refresh);
        document.getElementById('openAppBtn').addEventListener('click', openApp);
        document.getElementById('syncLink').addEventListener('click', syncJobs);

        // Load jobs
        await loadJobs();
    }

    /**
     * Load jobs from storage
     */
    async function loadJobs() {
        try {
            // Request jobs from background script
            chrome.runtime.sendMessage({ action: 'getJobs' }, (response) => {
                if (response && response.success) {
                    jobs = response.jobs || [];
                    render();
                } else {
                    showError('Failed to load jobs');
                }
            });
        } catch (error) {
            console.error('Load error:', error);
            showError(error.message);
        }
    }

    /**
     * Render popup UI
     */
    function render() {
        // Update count
        const countEl = document.getElementById('jobCount');
        countEl.textContent = `${jobs.length} saved job${jobs.length !== 1 ? 's' : ''}`;

        // Render content
        const contentEl = document.getElementById('content');

        if (jobs.length === 0) {
            contentEl.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <h3>No saved jobs yet</h3>
                    <p>Visit LinkedIn, Indeed, or Glassdoor and click the "Save Job" button</p>
                </div>
            `;
        } else {
            contentEl.innerHTML = `
                <div class="job-list">
                    ${jobs.map(job => renderJobItem(job)).join('')}
                </div>
            `;

            // Add event listeners to job items
            jobs.forEach(job => {
                const jobEl = document.getElementById(`job-${job.id}`);
                if (jobEl) {
                    jobEl.addEventListener('click', (e) => {
                        if (!e.target.closest('.job-actions')) {
                            toggleJobExpanded(job.id);
                        }
                    });

                    // Add listeners for action buttons
                    const viewBtn = jobEl.querySelector('.view-btn');
                    const deleteBtn = jobEl.querySelector('.delete-btn');
                    const statusSelect = jobEl.querySelector('.status-select');

                    if (viewBtn) {
                        viewBtn.addEventListener('click', () => viewJob(job));
                    }

                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', () => deleteJob(job.id));
                    }

                    if (statusSelect) {
                        statusSelect.addEventListener('change', (e) => {
                            updateJobStatus(job.id, e.target.value);
                        });
                    }
                }
            });
        }
    }

    /**
     * Render a job item
     */
    function renderJobItem(job) {
        const isExpanded = expandedJobId === job.id;
        const date = job.dateApplied || job.createdAt;
        const dateStr = date ? formatDate(date) : '';

        return `
            <div class="job-item ${isExpanded ? 'expanded' : ''}" id="job-${job.id}">
                <div class="job-title">${escapeHtml(job.title)}</div>
                <div class="job-company">${escapeHtml(job.company)}</div>
                <div class="job-meta">
                    <span class="job-status ${job.status}">${job.status}</span>
                    ${job.location ? `<span>📍 ${escapeHtml(job.location)}</span>` : ''}
                    ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
                </div>
                <div class="job-actions">
                    <button class="view-btn">View</button>
                    <select class="status-select">
                        <option value="">Change Status</option>
                        <option value="wishlist" ${job.status === 'wishlist' ? 'selected' : ''}>Wishlist</option>
                        <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>Applied</option>
                        <option value="interviewing" ${job.status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
                        <option value="offered" ${job.status === 'offered' ? 'selected' : ''}>Offered</option>
                        <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        <option value="accepted" ${job.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                    </select>
                    <button class="delete-btn danger">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Toggle job expanded state
     */
    function toggleJobExpanded(jobId) {
        if (expandedJobId === jobId) {
            expandedJobId = null;
        } else {
            expandedJobId = jobId;
        }
        render();
    }

    /**
     * View job in new tab
     */
    function viewJob(job) {
        if (job.url) {
            chrome.tabs.create({ url: job.url });
        }
    }

    /**
     * Delete job
     */
    async function deleteJob(jobId) {
        if (!confirm('Are you sure you want to delete this job?')) {
            return;
        }

        try {
            chrome.runtime.sendMessage({
                action: 'deleteJob',
                jobId: jobId
            }, (response) => {
                if (response && response.success) {
                    // Remove from local array
                    jobs = jobs.filter(j => j.id !== jobId);
                    expandedJobId = null;
                    render();
                } else {
                    showError('Failed to delete job');
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
            showError(error.message);
        }
    }

    /**
     * Update job status
     */
    async function updateJobStatus(jobId, newStatus) {
        if (!newStatus) return;

        try {
            chrome.runtime.sendMessage({
                action: 'updateJobStatus',
                jobId: jobId,
                status: newStatus
            }, (response) => {
                if (response && response.success) {
                    // Update local array
                    const job = jobs.find(j => j.id === jobId);
                    if (job) {
                        job.status = newStatus;
                        render();
                    }
                } else {
                    showError('Failed to update status');
                }
            });
        } catch (error) {
            console.error('Update error:', error);
            showError(error.message);
        }
    }

    /**
     * Refresh job list
     */
    async function refresh() {
        const contentEl = document.getElementById('content');
        contentEl.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Refreshing...</p>
            </div>
        `;
        await loadJobs();
    }

    /**
     * Open main app
     */
    function openApp() {
        // Open the main application in a new tab
        chrome.tabs.create({ url: 'https://jobhuntmanager.com' });
        // For local development, you could use:
        // chrome.tabs.create({ url: chrome.runtime.getURL('app-responsive.html') });
    }

    /**
     * Sync jobs with web app
     */
    async function syncJobs() {
        alert('Sync feature coming soon! For now, use the "Open App" button to access the full web application.');
    }

    /**
     * Show error message
     */
    function showError(message) {
        const contentEl = document.getElementById('content');
        contentEl.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    /**
     * Format date for display
     */
    function formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays} days ago`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            } else {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                });
            }
        } catch (error) {
            return '';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
