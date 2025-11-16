// Job Manager Component - Migrated to ComponentBase
// Comprehensive job application management with auto-save, status tracking, and resume integration

import { ComponentBase } from '../js/component-base.js';

class JobManager extends ComponentBase {
    constructor() {
        super();
        
        // Component-specific properties
        this._jobs = {};
        this._selectedJob = null;
        this._currentTab = 'details';
        this._autoSaveStatus = 'saved';
        this._autoSaveTimeout = null;
        
        // Bind methods for external access and event handling
        this.loadJobs = this.loadJobs.bind(this);
        this.selectJob = this.selectJob.bind(this);
        this.refreshJobs = this.refreshJobs.bind(this);
        this.getSelectedJob = this.getSelectedJob.bind(this);
        this.addNewJob = this.addNewJob.bind(this);
        this.deleteJob = this.deleteJob.bind(this);
        this.updateJobStatus = this.updateJobStatus.bind(this);
        this.associateResume = this.associateResume.bind(this);
        this.performAutoSave = this.performAutoSave.bind(this);
        this.debouncedAutoSave = this.debouncedAutoSave.bind(this);
        this.switchTab = this.switchTab.bind(this);
        
        // Event handlers
        this.handleSelectJob = this.handleSelectJob.bind(this);
        this.handleAddJob = this.handleAddJob.bind(this);
        this.handleDeleteJob = this.handleDeleteJob.bind(this);
        this.handleUpdateStatus = this.handleUpdateStatus.bind(this);
        this.handleAssociateResume = this.handleAssociateResume.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
        this.handleFormInput = this.handleFormInput.bind(this);
        this.handleResumeAction = this.handleResumeAction.bind(this);
        this.handleStoreChange = this.handleStoreChange.bind(this);
        
        // Public API methods
        this.getAllJobs = this.getAllJobs.bind(this);
        this.createJob = this.createJob.bind(this);
        this.updateJob = this.updateJob.bind(this);
        this.removeJob = this.removeJob.bind(this);
        this.getJobById = this.getJobById.bind(this);
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('JobManager: Initializing Job Manager');
        
        // Load jobs from storage and global state
        await this.loadJobs();
        
        // Set initial data state
        this.setData({
            jobs: this._jobs,
            selectedJob: this._selectedJob,
            currentTab: this._currentTab
        }, 'initialization');
        
        // Render the component
        this.render();
        
        // Setup event listeners
        this.setupEventListeners();
        // Listen for document-level global store events (ensure compatibility with store dispatch)
        try {
            document.addEventListener('global-state-changed', this.handleStoreChange);
        } catch (e) {
            console.warn('JobManager: Failed to attach document global-state listener', e);
        }
        
        // Update global state
        this.updateGlobalState({ 
            jobs: this._jobs,
            currentJob: this._selectedJob 
        }, 'job-manager-init');
    }

    /**
     * Handle data changes
     * Called when setData() is used
     */
    onDataChange(newData, previousData, source) {
        console.log('JobManager: Job data changed from', source);
        
        // Update internal state based on data changes
        if (newData && typeof newData === 'object') {
            if (newData.jobs !== undefined) {
                // Accept array or object
                if (Array.isArray(newData.jobs)) {
                    const map = {};
                    newData.jobs.forEach(j => { if (j && j.id) map[j.id] = j; });
                    this._jobs = map;
                } else {
                    this._jobs = { ...newData.jobs };
                }
            }
            if (newData.selectedJob !== undefined) {
                this._selectedJob = newData.selectedJob;
            }
            if (newData.currentTab !== undefined) {
                this._currentTab = newData.currentTab;
            }
            
            // Save to storage if not from storage load
            if (source !== 'storage-load' && source !== 'initialization') {
                this.saveJobsToStorage();
            }
        }
        
        // Re-render when data changes
        if (this.isReady()) {
            this.render();
            
            // Update global state
            this.updateGlobalState({ 
                jobs: this._jobs,
                currentJob: this._selectedJob 
            }, 'job-data-change');
        }
    }

    /**
     * Handle component refresh
     * Called when refresh() is used
     */
    async onRefresh(force = false) {
        console.log('JobManager: Refreshing Job Manager');
        
        // Reload jobs if forced or if no jobs
        if (force || Object.keys(this._jobs).length === 0) {
            await this.loadJobs();
        }
        
        // Re-render the component
        this.render();
    }

    /**
     * Handle global store change events
     * This ensures the job manager updates when the central store mutates
     */
    handleStoreChange(event) {
        try {
            const payload = event && (event.detail?.newState || event.detail || event) || null;
            if (!payload) return;

            // If jobs changed in the global state, update internal jobs and re-render
            if (payload.jobs) {
                if (Array.isArray(payload.jobs)) {
                    const map = {};
                    payload.jobs.forEach(j => { if (j && j.id) map[j.id] = j; });
                    this._jobs = map;
                } else {
                    this._jobs = { ...payload.jobs };
                }
            }

            // Sync selected job if present
            if (payload.currentJob) {
                this._selectedJob = payload.currentJob;
            }

            // Apply the updates via setData so lifecycle hooks run
            this.setData({ jobs: this._jobs, selectedJob: this._selectedJob }, 'global-store-sync');
            // Also update any open details form/select to reflect new status/value
            setTimeout(() => {
                try {
                    const details = document.getElementById('details-content');
                    if (!details) return;

                    // Prefer name="status" (form-generated) or fallback to #job-status
                    const statusField = details.querySelector('[name="status"]') || details.querySelector('#job-status');
                    if (statusField && this._selectedJob && this._selectedJob.status) {
                        try { statusField.value = this._selectedJob.status; } catch (e) {}
                        // Trigger change event so any listeners update
                        const ev = new Event('change', { bubbles: true });
                        statusField.dispatchEvent(ev);
                    }
                } catch (e) {
                    // ignore
                }
            }, 50);
        } catch (e) {
            console.warn('JobManager: Error handling store change', e);
        }
    }

    /**
     * Component validation
     * Validate job manager state and data
     */
    onValidate() {
        const errors = [];
        
        // Validate jobs object
        if (!this._jobs || typeof this._jobs !== 'object') {
            errors.push('Jobs data must be an object');
        }
        
        // Validate selected job if set
        if (this._selectedJob) {
            if (!this._selectedJob.id) {
                errors.push('Selected job missing ID');
            }
            if (!this._selectedJob.title) {
                errors.push('Selected job missing title');
            }
            if (!this._selectedJob.company) {
                errors.push('Selected job missing company');
            }
        }
        
        // Validate current tab
        const validTabs = ['details', 'contact', 'resume', 'status'];
        if (!validTabs.includes(this._currentTab)) {
            errors.push(`Invalid current tab: ${this._currentTab}`);
        }
        
        // Validate auto-save status
        const validStatuses = ['saved', 'saving', 'pending'];
        if (!validStatuses.includes(this._autoSaveStatus)) {
            errors.push(`Invalid auto-save status: ${this._autoSaveStatus}`);
        }
        
        // Validate localStorage functionality
        if (!this.isLocalStorageAvailable()) {
            errors.push('localStorage not available - data persistence disabled');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Component cleanup
     * Replaces disconnectedCallback()
     */
    onCleanup() {
        console.log('JobManager: Cleaning up Job Manager');
        
        // Clear auto-save timeout
        if (this._autoSaveTimeout) {
            clearTimeout(this._autoSaveTimeout);
            this._autoSaveTimeout = null;
        }
        
        // Perform final save
        this.saveJobsToStorage();
        
        // Reset state
        this._autoSaveStatus = 'saved';
        try {
            document.removeEventListener('global-state-changed', this.handleStoreChange);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Check if localStorage is available
     */
    isLocalStorageAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Load jobs from storage and global state
     */
    async loadJobs() {
        try {
            // Try to get jobs from global state first
            const globalState = this.getGlobalState();
            if (globalState?.jobs && (Array.isArray(globalState.jobs) ? globalState.jobs.length > 0 : Object.keys(globalState.jobs).length > 0)) {
                console.log('Loading jobs from global state');
                // Support both array and object shapes for jobs
                if (Array.isArray(globalState.jobs)) {
                    const map = {};
                    globalState.jobs.forEach(j => { if (j && j.id) map[j.id] = j; });
                    this._jobs = map;
                } else {
                    this._jobs = { ...globalState.jobs };
                }
                this._selectedJob = globalState.currentJob || null;
                this.setData({
                    jobs: this._jobs,
                    selectedJob: this._selectedJob
                }, 'global-state-load');
                return;
            }
            
            // Fallback to localStorage
            if (this.isLocalStorageAvailable()) {
                const savedJobs = localStorage.getItem('jobs');
                if (savedJobs) {
                    try {
                        const parsedJobs = JSON.parse(savedJobs);
                        if (typeof parsedJobs === 'object' && parsedJobs !== null) {
                            console.log('Loading jobs from localStorage');
                            this._jobs = parsedJobs;
                            this.setData({ jobs: this._jobs }, 'storage-load');
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse saved jobs data:', e);
                    }
                }
            }
            
            // Use empty jobs if nothing found
            console.log('Using empty jobs data');
            this._jobs = {};
            this.setData({ jobs: this._jobs }, 'default-load');
            
        } catch (error) {
            this.handleError(error, 'Failed to load jobs');
            this._jobs = {};
            this.setData({ jobs: this._jobs }, 'error-fallback');
        }
    }

    /**
     * Save jobs to localStorage
     */
    saveJobsToStorage() {
        if (!this.isLocalStorageAvailable()) {
            return;
        }
        
        try {
            localStorage.setItem('jobs', JSON.stringify(this._jobs));
            this._autoSaveStatus = 'saved';
            this.updateAutoSaveIndicator();
            
            // Update global state
            this.updateGlobalState({ 
                jobs: this._jobs,
                currentJob: this._selectedJob 
            }, 'job-manager-save');
            
            // Emit save event
            this.emitEvent('jobs-saved', { jobs: this._jobs });
            
        } catch (error) {
            this.handleError(error, 'Failed to save jobs');
            this._autoSaveStatus = 'saved'; // Reset to avoid stuck pending state
        }
    }

    /**
     * Public API: Get all jobs
     */
    getAllJobs() {
        return { ...this._jobs };
    }

    /**
     * Public API: Get job by ID
     */
    getJobById(jobId) {
        return this._jobs[jobId] ? { ...this._jobs[jobId] } : null;
    }

    /**
     * Public API: Get selected job
     */
    getSelectedJob() {
        return this._selectedJob ? { ...this._selectedJob } : null;
    }

    /**
     * Public API: Select a job
     */
    selectJob(jobId) {
        if (this._jobs[jobId]) {
            this._selectedJob = this._jobs[jobId];
            this.setData({ selectedJob: this._selectedJob }, 'select-job');
            this.emitEvent('job-selected', { job: this._selectedJob });
        }
    }

    /**
     * Public API: Create new job
     */
    createJob(jobData) {
        const newJob = {
            id: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: jobData.title || '',
            company: jobData.company || '',
            location: jobData.location || '',
            url: jobData.url || '',
            description: jobData.description || '',
            status: 'saved',
            dateCreated: new Date().toISOString(),
            dateApplied: null,
            resumeId: null,
            statusHistory: [{
                from: null,
                to: 'saved',
                date: new Date().toISOString(),
                notes: 'Job created'
            }],
            ...jobData
        };
        
        this._jobs[newJob.id] = newJob;
        this.setData({ jobs: this._jobs }, 'create-job');
        this.emitEvent('job-created', { job: newJob });
        
        return newJob;
    }

    /**
     * Public API: Update job
     */
    updateJob(jobId, updates) {
        if (this._jobs[jobId]) {
            this._jobs[jobId] = { ...this._jobs[jobId], ...updates };
            
            // Update selected job if it's the one being updated
            if (this._selectedJob && this._selectedJob.id === jobId) {
                this._selectedJob = this._jobs[jobId];
            }
            
            this.setData({ 
                jobs: this._jobs,
                selectedJob: this._selectedJob 
            }, 'update-job');
            
            this.emitEvent('job-updated', { job: this._jobs[jobId] });
        }
    }

    /**
     * Public API: Remove job
     */
    removeJob(jobId) {
        if (this._jobs[jobId]) {
            const deletedJob = this._jobs[jobId];
            delete this._jobs[jobId];
            
            // Clear selected job if it was deleted
            if (this._selectedJob && this._selectedJob.id === jobId) {
                this._selectedJob = null;
            }
            
            this.setData({ 
                jobs: this._jobs,
                selectedJob: this._selectedJob 
            }, 'remove-job');
            
            this.emitEvent('job-deleted', { job: deletedJob });
        }
    }

    /**
     * Public API: Refresh jobs
     */
    refreshJobs() {
        this.refresh(true);
    }

    /**
     * Handle job selection
     */
    handleSelectJob(jobId) {
        this.selectJob(jobId);
        this.render();
    }

    /**
     * Handle adding new job
     */
    handleAddJob() {
        const newJob = this.createJob({
            title: 'New Job',
            company: 'Company Name'
        });
        
        this.selectJob(newJob.id);
        this.render();
        
        // Focus first input
        setTimeout(() => {
            const titleInput = this.querySelector('#job-title');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    /**
     * Handle job deletion
     */
    handleDeleteJob(jobId) {
        if (!confirm('Are you sure you want to delete this job?')) {
            return;
        }
        
        this.removeJob(jobId);
        this.render();
        this.showToast('Job deleted', 'info');
    }

    /**
     * Handle status update
     */
    handleUpdateStatus(newStatus) {
        if (!this._selectedJob) return;
        
        const oldStatus = this._selectedJob.status;
        const statusUpdate = {
            status: newStatus,
            statusHistory: [
                ...this._selectedJob.statusHistory,
                {
                    from: oldStatus,
                    to: newStatus,
                    date: new Date().toISOString(),
                    notes: `Status changed from ${oldStatus} to ${newStatus}`
                }
            ]
        };
        
        // Set date applied if moving to applied status
        if (newStatus === 'applied' && !this._selectedJob.dateApplied) {
            statusUpdate.dateApplied = new Date().toISOString();
        }
        
        this.updateJob(this._selectedJob.id, statusUpdate);
        this.render();
        this.showToast(`Status updated to ${newStatus}`, 'success');
    }

    /**
     * Handle resume association
     */
    handleAssociateResume(resumeId) {
        if (!this._selectedJob) return;
        
        this.updateJob(this._selectedJob.id, { resumeId });
        this.render();
        this.showToast('Resume associated with job', 'success');
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabName) {
        this.switchTab(tabName);
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabName) {
        if (this._currentTab === tabName) return;
        
        this._currentTab = tabName;
        this.setData({ currentTab: this._currentTab }, 'tab-change');
        
        // Update tab UI
        this.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
        
        // Emit tab change event
        this.emitEvent('tab-changed', { tab: tabName });
    }

    /**
     * Handle form input changes
     */
    handleFormInput(field, value) {
        if (!this._selectedJob) return;
        
        this.updateJob(this._selectedJob.id, { [field]: value });
        this.debouncedAutoSave();
    }

    /**
     * Handle resume actions
     */
    handleResumeAction(action, data) {
        switch (action) {
            case 'view':
                this.viewResume(data.resumeId);
                break;
            case 'tailor':
                this.tailorResume(data.resumeId);
                break;
            case 'create':
                this.createNewResume();
                break;
        }
    }

    /**
     * Perform auto-save
     */
    performAutoSave() {
        this._autoSaveStatus = 'saving';
        this.updateAutoSaveIndicator();
        
        // Simulate save delay
        setTimeout(() => {
            this.saveJobsToStorage();
        }, 500);
    }

    /**
     * Debounced auto-save
     */
    debouncedAutoSave() {
        this._autoSaveStatus = 'pending';
        this.updateAutoSaveIndicator();
        
        if (this._autoSaveTimeout) {
            clearTimeout(this._autoSaveTimeout);
        }
        
        this._autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, 1000);
    }

    /**
     * Update auto-save indicator
     */
    updateAutoSaveIndicator() {
        const indicator = this.querySelector('.auto-save-indicator');
        if (!indicator) return;
        
        const statusMap = {
            'saved': { text: 'Saved', class: 'saved' },
            'saving': { text: 'Saving...', class: 'saving' },
            'pending': { text: 'Pending...', class: 'pending' }
        };
        
        const status = statusMap[this._autoSaveStatus];
        indicator.textContent = status.text;
        indicator.className = `auto-save-indicator ${status.class}`;
    }

    /**
     * View resume (integration with app manager)
     */
    viewResume(resumeId) {
        // Prefer app-level API
        if (window.app && typeof window.app.loadNamedResume === 'function') {
            window.app.loadNamedResume(resumeId);
            return;
        }

        // Try appManager flow: switch to resumes and select the resume
        if (window.appManager && typeof window.appManager.switchSection === 'function') {
            try {
                window.appManager.switchSection('resumes');
                const resume = (window.appManager.data?.resumes || []).find(r => r.id === resumeId);
                if (resume) {
                    window.appManager.handleItemSelection(resume);
                }
                return;
            } catch (e) {
                // continue to fallback
            }
        }

        this.showToast('Resume viewer not available', 'warning');
    }

    /**
     * Tailor resume for job (integration with AI features)
     */
    tailorResume(resumeId) {
        if (!this._selectedJob) return;
        // Try app-level API
        if (window.app && typeof window.app.generateTailoredResume === 'function') {
            window.app.generateTailoredResume(this._selectedJob, resumeId);
            return;
        }

        // Try appManager helper (if available)
        if (window.appManager && typeof window.appManager.generateTailoredResume === 'function') {
            window.appManager.generateTailoredResume(this._selectedJob, resumeId);
            return;
        }

        // As a last resort, switch to resumes section and open create/tailor flow
        if (window.appManager && typeof window.appManager.switchSection === 'function') {
            try {
                window.appManager.switchSection('resumes');
                // Select resume so user can act on it
                const resume = (window.appManager.data?.resumes || []).find(r => r.id === resumeId);
                if (resume && typeof window.appManager.handleItemSelection === 'function') {
                    window.appManager.handleItemSelection(resume);
                }
                this.showToast('AI tailoring is available in the Resumes section', 'info');
                return;
            } catch (e) {
                // fallthrough
            }
        }

        this.showToast('AI tailoring not available', 'warning');
    }

    /**
     * Create new resume
     */
    createNewResume() {
        // Prefer app-level API
        if (window.app && typeof window.app.createNewResume === 'function') {
            window.app.createNewResume();
            return;
        }

        // Use appManager to switch to resumes and open the add modal
        if (window.appManager && typeof window.appManager.switchSection === 'function') {
            try {
                window.appManager.switchSection('resumes');
                if (typeof window.appManager.addNewItem === 'function') {
                    window.appManager.addNewItem();
                    return;
                }
            } catch (e) {
                // fallthrough
            }
        }

        this.showToast('Resume editor not available', 'warning');
    }

    /**
     * Get saved resumes for association
     */
    getSavedResumes() {
        // Prefer app-level API (app or appManager)
        try {
            if (window.app && typeof window.app.getSavedResumes === 'function') {
                return window.app.getSavedResumes() || [];
            }

            if (window.appManager && window.appManager.data && Array.isArray(window.appManager.data.resumes)) {
                return window.appManager.data.resumes || [];
            }

            // Fallback to common localStorage keys used across versions
            const tryKeys = ['resumeRegistry', 'resumes', 'jobHuntData'];
            for (const key of tryKeys) {
                const raw = localStorage.getItem(key);
                if (!raw) continue;

                try {
                    const parsed = JSON.parse(raw);
                    // jobHuntData shape: { resumes: [...] }
                    if (key === 'jobHuntData' && parsed && Array.isArray(parsed.resumes)) {
                        return parsed.resumes;
                    }

                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch (e) {
                    // ignore parse errors and continue
                }
            }

            return [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Not set';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Get status badge class
     */
    getStatusBadgeClass(status) {
        const statusMap = {
            'saved': 'secondary',
            'applied': 'primary',
            'interviewing': 'warning',
            'offered': 'success',
            'accepted': 'success',
            'rejected': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    /**
     * Setup event listeners for the component
     */
    setupEventListeners() {
        // Job list clicks
        this.addEventListener('click', (e) => {
            if (e.target.matches('.job-item')) {
                const jobId = e.target.dataset.jobId;
                if (jobId) this.handleSelectJob(jobId);
            }
            
            if (e.target.matches('.add-job-btn')) {
                this.handleAddJob();
            }
            
            if (e.target.matches('.delete-job-btn')) {
                const jobId = e.target.dataset.jobId;
                if (jobId) this.handleDeleteJob(jobId);
            }
        });
        
        // Tab navigation
        this.addEventListener('click', (e) => {
            if (e.target.matches('.tab')) {
                this.handleTabSwitch(e.target.dataset.tab);
            }
        });
        
        // Form inputs
        this.addEventListener('input', (e) => {
            const field = e.target.dataset.field;
            if (field) {
                this.handleFormInput(field, e.target.value);
            }
        });
        
        // Status updates
        this.addEventListener('change', (e) => {
            if (e.target.matches('#job-status')) {
                this.handleUpdateStatus(e.target.value);
            }
        });
        
        // Resume actions
        this.addEventListener('click', (e) => {
            if (e.target.matches('[data-resume-action]')) {
                const action = e.target.dataset.resumeAction;
                const resumeId = e.target.dataset.resumeId;
                this.handleResumeAction(action, { resumeId });
            }
        });
    }

    /**
     * Render the main component
     */
    render() {
        this.innerHTML = `
            <div class="job-manager">
                <div class="job-manager-layout">
                    <!-- Job List Sidebar -->
                    <div class="job-list-sidebar">
                        <div class="sidebar-header">
                            <h3>Jobs</h3>
                            <button class="btn btn-primary btn-sm add-job-btn">+ Add Job</button>
                        </div>
                        <div class="job-list">
                            ${this.renderJobList()}
                        </div>
                    </div>
                    
                    <!-- Job Details Main Area -->
                    <div class="job-details-main">
                        ${this.renderJobDetails()}
                    </div>
                </div>
                
                <!-- Styles -->
                ${this.renderStyles()}
            </div>
        `;
        
        // Update auto-save indicator after render
        setTimeout(() => this.updateAutoSaveIndicator(), 0);
    }

    /**
     * Render job list
     */
    renderJobList() {
        const jobs = Object.values(this._jobs);
        
        if (jobs.length === 0) {
            return `
                <div class="empty-state">
                    <p>No jobs yet</p>
                    <p class="text-muted">Click "Add Job" to get started</p>
                </div>
            `;
        }
        
        // Sort jobs by date created (newest first)
        jobs.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        
        return jobs.map(job => `
            <div class="job-item ${this._selectedJob?.id === job.id ? 'selected' : ''}" 
                 data-job-id="${job.id}">
                <div class="job-item-header">
                    <h4>${job.title || 'Untitled Job'}</h4>
                    <span class="badge badge-${this.getStatusBadgeClass(job.status)}">${job.status}</span>
                </div>
                <div class="job-item-company">${job.company || 'Company'}</div>
                <div class="job-item-location">${job.location || 'Location not specified'}</div>
                <div class="job-item-date">Created: ${this.formatDate(job.dateCreated)}</div>
                <div class="job-item-actions">
                    <button class="btn btn-danger btn-xs delete-job-btn" data-job-id="${job.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render job details
     */
    renderJobDetails() {
        if (!this._selectedJob) {
            return `
                <div class="no-selection">
                    <div class="no-selection-content">
                        <h3>Select a job to view details</h3>
                        <p>Choose a job from the list to see and edit its details</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="job-details">
                <div class="job-details-header">
                    <h2>${this._selectedJob.title || 'Untitled Job'}</h2>
                    <div class="auto-save-indicator saved">Saved</div>
                </div>
                
                <!-- Tab Navigation -->
                <div class="tab-nav">
                    <div class="tab ${this._currentTab === 'details' ? 'active' : ''}" data-tab="details">Details</div>
                    <div class="tab ${this._currentTab === 'contact' ? 'active' : ''}" data-tab="contact">Contact</div>
                    <div class="tab ${this._currentTab === 'resume' ? 'active' : ''}" data-tab="resume">Resume</div>
                    <div class="tab ${this._currentTab === 'status' ? 'active' : ''}" data-tab="status">Status</div>
                </div>
                
                <!-- Tab Content -->
                <div class="tab-content ${this._currentTab === 'details' ? 'active' : ''}" data-tab="details">
                    ${this.renderDetailsTab()}
                </div>
                
                <div class="tab-content ${this._currentTab === 'contact' ? 'active' : ''}" data-tab="contact">
                    ${this.renderContactTab()}
                </div>
                
                <div class="tab-content ${this._currentTab === 'resume' ? 'active' : ''}" data-tab="resume">
                    ${this.renderResumeTab()}
                </div>
                
                <div class="tab-content ${this._currentTab === 'status' ? 'active' : ''}" data-tab="status">
                    ${this.renderStatusTab()}
                </div>
            </div>
        `;
    }

    /**
     * Render details tab
     */
    renderDetailsTab() {
        return `
            <div class="form-section">
                <div class="form-row">
                    <div class="form-group">
                        <label for="job-title">Job Title</label>
                        <input type="text" id="job-title" data-field="title" 
                               value="${this._selectedJob.title || ''}" placeholder="e.g. Software Engineer">
                    </div>
                    <div class="form-group">
                        <label for="job-company">Company</label>
                        <input type="text" id="job-company" data-field="company" 
                               value="${this._selectedJob.company || ''}" placeholder="e.g. Tech Corp">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="job-location">Location</label>
                        <input type="text" id="job-location" data-field="location" 
                               value="${this._selectedJob.location || ''}" placeholder="e.g. San Francisco, CA">
                    </div>
                    <div class="form-group">
                        <label for="job-url">Job URL</label>
                        <input type="url" id="job-url" data-field="url" 
                               value="${this._selectedJob.url || ''}" placeholder="https://...">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="job-description">Job Description</label>
                    <textarea id="job-description" data-field="description" rows="8" 
                              placeholder="Paste the job description here...">${this._selectedJob.description || ''}</textarea>
                </div>
            </div>
        `;
    }

    /**
     * Render contact tab
     */
    renderContactTab() {
        const contact = this._selectedJob.contact || {};
        
        return `
            <div class="form-section">
                <h4>Contact Information</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="contact-name">Contact Name</label>
                        <input type="text" id="contact-name" data-field="contact.name" 
                               value="${contact.name || ''}" placeholder="e.g. John Doe">
                    </div>
                    <div class="form-group">
                        <label for="contact-title">Contact Title</label>
                        <input type="text" id="contact-title" data-field="contact.title" 
                               value="${contact.title || ''}" placeholder="e.g. Hiring Manager">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="contact-email">Email</label>
                        <input type="email" id="contact-email" data-field="contact.email" 
                               value="${contact.email || ''}" placeholder="contact@company.com">
                    </div>
                    <div class="form-group">
                        <label for="contact-phone">Phone</label>
                        <input type="tel" id="contact-phone" data-field="contact.phone" 
                               value="${contact.phone || ''}" placeholder="(555) 123-4567">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="contact-notes">Contact Notes</label>
                    <textarea id="contact-notes" data-field="contact.notes" rows="4" 
                              placeholder="Notes about the contact or conversation...">${contact.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    /**
     * Render resume tab
     */
    renderResumeTab() {
        const savedResumes = this.getSavedResumes();
        const associatedResume = savedResumes.find(r => r.id === this._selectedJob.resumeId);
        
        return `
            <div class="form-section">
                <h4>Resume Association</h4>
                
                ${associatedResume ? `
                    <div class="associated-resume">
                        <h5>Current Resume: ${associatedResume.name}</h5>
                        <p>Last modified: ${this.formatDate(associatedResume.lastModified)}</p>
                        <div class="resume-actions">
                            <button class="btn btn-primary" data-resume-action="view" data-resume-id="${associatedResume.id}">
                                View Resume
                            </button>
                            <button class="btn btn-secondary" data-resume-action="tailor" data-resume-id="${associatedResume.id}">
                                Tailor with AI
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="no-resume">
                        <p>No resume associated with this job yet.</p>
                    </div>
                `}
                
                <div class="resume-selection">
                    <h5>Available Resumes</h5>
                    ${savedResumes.length > 0 ? `
                        <div class="resume-list">
                            ${savedResumes.map(resume => `
                                <div class="resume-item ${resume.id === this._selectedJob.resumeId ? 'selected' : ''}">
                                    <div class="resume-info">
                                        <strong>${resume.name}</strong>
                                        <span class="resume-date">${this.formatDate(resume.lastModified)}</span>
                                    </div>
                                    <div class="resume-actions">
                                        ${resume.id !== this._selectedJob.resumeId ? `
                                            <button class="btn btn-sm btn-outline" onclick="this.closest('job-manager').handleAssociateResume('${resume.id}')">
                                                Associate
                                            </button>
                                        ` : `
                                            <span class="badge badge-success">Associated</span>
                                        `}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="text-muted">No saved resumes found.</p>
                    `}
                    
                    <div class="resume-actions-footer">
                        <button class="btn btn-primary" data-resume-action="create">
                            Create New Resume
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render status tab
     */
    renderStatusTab() {
        const statusOptions = [
            { value: 'saved', label: 'Saved' },
            { value: 'applied', label: 'Applied' },
            { value: 'interviewing', label: 'Interviewing' },
            { value: 'offered', label: 'Offered' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' }
        ];
        
        return `
            <div class="form-section">
                <div class="status-section">
                    <h4>Current Status</h4>
                    <div class="form-group">
                        <label for="job-status">Application Status</label>
                        <select id="job-status">
                            ${statusOptions.map(option => `
                                <option value="${option.value}" ${this._selectedJob.status === option.value ? 'selected' : ''}>
                                    ${option.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="status-dates">
                        <div class="form-row">
                            <div class="status-date">
                                <strong>Created:</strong> ${this.formatDate(this._selectedJob.dateCreated)}
                            </div>
                            <div class="status-date">
                                <strong>Applied:</strong> ${this.formatDate(this._selectedJob.dateApplied)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="status-history">
                    <h4>Status History</h4>
                    <div class="history-list">
                        ${(this._selectedJob.statusHistory || []).reverse().map(entry => `
                            <div class="history-item">
                                <div class="history-date">${this.formatDate(entry.date)}</div>
                                <div class="history-change">
                                    ${entry.from ? `${entry.from} → ` : ''}${entry.to}
                                </div>
                                ${entry.notes ? `<div class="history-notes">${entry.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render component styles
     */
    renderStyles() {
        return `
            <style>
                .job-manager {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #f8f9fa;
                }

                .job-manager-layout {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    height: 100%;
                    gap: 0;
                }

                .job-list-sidebar {
                    background: white;
                    border-right: 1px solid #dee2e6;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .sidebar-header {
                    padding: 20px;
                    border-bottom: 1px solid #dee2e6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }

                .sidebar-header h3 {
                    margin: 0;
                    color: #333;
                    font-size: 18px;
                }

                .job-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                }

                .job-item {
                    padding: 15px;
                    margin-bottom: 10px;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                    position: relative;
                }

                .job-item:hover {
                    border-color: #007bff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .job-item.selected {
                    border-color: #007bff;
                    background: #f0f8ff;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.2);
                }

                .job-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }

                .job-item-header h4 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                    line-height: 1.3;
                }

                .job-item-company {
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 4px;
                    font-weight: 500;
                }

                .job-item-location {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 4px;
                }

                .job-item-date {
                    font-size: 11px;
                    color: #aaa;
                    margin-bottom: 8px;
                }

                .job-item-actions {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .job-item:hover .job-item-actions {
                    opacity: 1;
                }

                .job-details-main {
                    background: white;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }

                .no-selection {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .no-selection-content {
                    text-align: center;
                    color: #666;
                }

                .no-selection-content h3 {
                    margin: 0 0 10px 0;
                    font-size: 20px;
                }

                .job-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .job-details-header {
                    padding: 20px;
                    border-bottom: 1px solid #dee2e6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }

                .job-details-header h2 {
                    margin: 0;
                    color: #333;
                    font-size: 22px;
                }

                .auto-save-indicator {
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: 500;
                }

                .auto-save-indicator.saved {
                    background: #d4edda;
                    color: #155724;
                }

                .auto-save-indicator.saving {
                    background: #d1ecf1;
                    color: #0c5460;
                }

                .auto-save-indicator.pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .tab-nav {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                }

                .tab {
                    padding: 15px 20px;
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s;
                    color: #666;
                    font-weight: 500;
                }

                .tab:hover {
                    background: #e9ecef;
                    color: #333;
                }

                .tab.active {
                    background: white;
                    color: #007bff;
                    border-bottom-color: #007bff;
                }

                .tab-content {
                    display: none;
                    flex: 1;
                    padding: 30px;
                    overflow-y: auto;
                }

                .tab-content.active {
                    display: block;
                }

                .form-section {
                    max-width: 800px;
                }

                .form-section h4 {
                    margin: 0 0 20px 0;
                    color: #333;
                    font-size: 18px;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 8px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #333;
                }

                .form-group input,
                .form-group textarea,
                .form-group select {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .form-group input:focus,
                .form-group textarea:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #80bdff;
                    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
                }

                .form-group textarea {
                    resize: vertical;
                    font-family: inherit;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                    display: inline-block;
                    transition: all 0.2s;
                    line-height: 1.5;
                }

                .btn-primary {
                    background: #007bff;
                    color: white;
                }

                .btn-primary:hover {
                    background: #0056b3;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #545b62;
                }

                .btn-outline {
                    background: white;
                    color: #007bff;
                    border: 1px solid #007bff;
                }

                .btn-outline:hover {
                    background: #007bff;
                    color: white;
                }

                .btn-danger {
                    background: #dc3545;
                    color: white;
                }

                .btn-danger:hover {
                    background: #c82333;
                }

                .btn-sm {
                    padding: 5px 10px;
                    font-size: 12px;
                }

                .btn-xs {
                    padding: 2px 6px;
                    font-size: 11px;
                }

                .badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .badge-primary { background: #007bff; color: white; }
                .badge-secondary { background: #6c757d; color: white; }
                .badge-success { background: #28a745; color: white; }
                .badge-warning { background: #ffc107; color: #212529; }
                .badge-danger { background: #dc3545; color: white; }

                .associated-resume {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    border: 1px solid #dee2e6;
                }

                .associated-resume h5 {
                    margin: 0 0 5px 0;
                    color: #333;
                }

                .resume-actions {
                    margin-top: 15px;
                    display: flex;
                    gap: 10px;
                }

                .no-resume {
                    color: #666;
                    font-style: italic;
                    margin-bottom: 20px;
                }

                .resume-list {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }

                .resume-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid #dee2e6;
                    background: white;
                }

                .resume-item:last-child {
                    border-bottom: none;
                }

                .resume-item.selected {
                    background: #f0f8ff;
                    border-color: #007bff;
                }

                .resume-info strong {
                    display: block;
                    color: #333;
                    margin-bottom: 4px;
                }

                .resume-date {
                    font-size: 12px;
                    color: #666;
                }

                .resume-actions-footer {
                    margin-top: 20px;
                }

                .status-section {
                    margin-bottom: 30px;
                }

                .status-dates {
                    margin-top: 15px;
                }

                .status-dates .form-row {
                    margin-bottom: 0;
                }

                .status-date {
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .status-date strong {
                    color: #333;
                }

                .status-history {
                    margin-top: 20px;
                }

                .history-list {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .history-item {
                    padding: 15px;
                    border-bottom: 1px solid #dee2e6;
                    background: white;
                }

                .history-item:last-child {
                    border-bottom: none;
                }

                .history-date {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 5px;
                }

                .history-change {
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 5px;
                }

                .history-notes {
                    font-size: 14px;
                    color: #666;
                    font-style: italic;
                }

                .text-muted {
                    color: #666 !important;
                }

                @media (max-width: 768px) {
                    .job-manager-layout {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto 1fr;
                    }

                    .job-list-sidebar {
                        max-height: 300px;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 15px;
                    }

                    .tab-nav {
                        overflow-x: auto;
                    }

                    .tab {
                        white-space: nowrap;
                        padding: 12px 15px;
                    }
                }
            </style>
        `;
    }
}

// Register the migrated component
customElements.define('job-manager', JobManager);

export { JobManager };
