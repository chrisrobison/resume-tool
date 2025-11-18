// Job Manager Component - Migrated to ComponentBase
// Comprehensive job application management with auto-save, status tracking, AI ingestion, and resume integration

import { ComponentBase } from '../js/component-base.js';
import aiService from '../js/ai-service.js';
import { createDefaultJob } from '../js/jobs.js';

class JobManagerMigrated extends ComponentBase {
    constructor() {
        super();
        
        // Component-specific properties
        this._jobs = {};
        this._selectedJob = null;
        this._currentTab = 'details';
        this._autoSaveStatus = 'saved';
        this._autoSaveTimeout = null;
        this._strongMatchThreshold = 75;
        this._ingestionState = {
            url: '',
            keywords: '',
            maxJobs: 15,
            includeAnalysis: true,
            isLoading: false,
            progress: '',
            error: null,
            results: [],
            metadata: null,
            lastSourceUrl: null
        };
        this._generationState = {
            includeResume: true,
            includeCoverLetter: true,
            isProcessing: false,
            progress: '',
            error: null
        };
        
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
        console.log('JobManagerMigrated: Initializing Job Manager');
        
        // Load jobs from storage and global state
        await this.loadJobs();
        this.applyJobFeedDefaults();
        
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
            console.warn('JobManagerMigrated: Failed to attach document global-state listener', e);
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
        console.log('JobManagerMigrated: Job data changed from', source);
        
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
        console.log('JobManagerMigrated: Refreshing Job Manager');
        
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
            console.warn('JobManagerMigrated: Error handling store change', e);
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
        console.log('JobManagerMigrated: Cleaning up Job Manager');
        
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
            this.resetGenerationState();
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
            const deleteBtn = e.target.closest('.delete-job-btn');
            if (deleteBtn) {
                const jobId = deleteBtn.dataset.jobId;
                if (jobId) this.handleDeleteJob(jobId);
                return;
            }

            const jobItem = e.target.closest('.job-item');
            if (jobItem) {
                const jobId = jobItem.dataset.jobId;
                if (jobId) this.handleSelectJob(jobId);
                return;
            }

            if (e.target.matches('.add-job-btn')) {
                this.handleAddJob();
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
            const generateField = e.target.dataset.generateField;
            if (generateField) {
                this.handleGenerationFieldChange(generateField, e.target);
                return;
            }

            const ingestField = e.target.dataset.ingestField;
            if (ingestField) {
                this.handleIngestionFieldChange(ingestField, e.target);
                return;
            }

            const field = e.target.dataset.field;
            if (field) {
                this.handleFormInput(field, e.target.value);
            }
        });
        
        // Status updates
        this.addEventListener('change', (e) => {
            const generateField = e.target.dataset.generateField;
            if (generateField) {
                this.handleGenerationFieldChange(generateField, e.target);
                return;
            }

            const ingestField = e.target.dataset.ingestField;
            if (ingestField) {
                this.handleIngestionFieldChange(ingestField, e.target);
                return;
            }

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

        // AI ingestion actions
        this.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;
            switch (action) {
                case 'ingest-jobs':
                    this.handleIngestJobs();
                    break;
                case 'clear-ingestion-results':
                    this.clearIngestionResults();
                    break;
                case 'import-ingested-job': {
                    const index = parseInt(actionEl.dataset.index, 10);
                    if (!Number.isNaN(index)) {
                        this.handleImportIngestedJob(index);
                    }
                    break;
                }
                case 'import-all-ingested':
                    this.handleImportAllIngestedJobs();
                    break;
                case 'generate-ai-docs':
                    this.handleGenerateAIDocuments();
                    break;
                case 'download-ai-doc': {
                    const docType = actionEl.dataset.docType;
                    this.handleDownloadAIDocument(docType);
                    break;
                }
                default:
                    break;
            }
        });
    }

    handleIngestionFieldChange(field, target) {
        if (!target) return;
        
        let value;
        if (target.type === 'checkbox') {
            value = target.checked;
        } else if (field === 'maxJobs') {
            const parsed = parseInt(target.value, 10);
            if (Number.isNaN(parsed)) {
                value = this._ingestionState.maxJobs || 15;
            } else {
                value = Math.min(50, Math.max(1, parsed));
            }
        } else {
            value = target.value;
        }

        this.updateIngestionState({ [field]: value }, false);
    }

    resetGenerationState() {
        this._generationState = {
            includeResume: true,
            includeCoverLetter: true,
            isProcessing: false,
            progress: '',
            error: null
        };
    }

    applyJobFeedDefaults() {
        try {
            if (this._ingestionState.keywords) return;
            const state = this.getGlobalState();
            const prefs = state?.settings?.jobFeeds;
            if (prefs?.keywords) {
                this._ingestionState.keywords = prefs.keywords;
            }
        } catch (error) {
            console.warn('JobManager: Unable to apply job feed defaults', error);
        }
    }

    updateIngestionState(updates = {}, rerender = true) {
        this._ingestionState = {
            ...this._ingestionState,
            ...updates
        };

        if (rerender) {
            this.render();
        } else {
            this.updateIngestionProgressDisplay();
        }
    }

    updateIngestionProgressDisplay() {
        const progressNode = this.querySelector('.ai-ingest-progress-text');
        if (progressNode) {
            progressNode.textContent = this._ingestionState.progress || '';
        }

        const spinner = this.querySelector('.ai-ingest-spinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !this._ingestionState.isLoading);
        }
    }

    normalizeKeywords(value) {
        if (Array.isArray(value)) {
            return value.map(kw => typeof kw === 'string' ? kw.trim() : kw).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value
                .split(/[,;]+/g)
                .map(kw => kw.trim())
                .filter(Boolean);
        }
        return [];
    }

    resolveAIProvider(preferred = null) {
        try {
            const state = this.getGlobalState();
            const providers = state?.settings?.apiProviders || {};
            const order = [];
            if (preferred) order.push(preferred);
            order.push('openai', 'claude');

            const seen = new Set();
            for (const provider of order) {
                if (!provider || seen.has(provider)) continue;
                seen.add(provider);
                const config = providers[provider];
                if (config && config.apiKey) {
                    return {
                        provider,
                        apiKey: config.apiKey,
                        model: config.model || null,
                        route: config.route || 'auto'
                    };
                }
            }

            const localFallbacks = [
                { provider: 'openai', key: 'openai_api_key' },
                { provider: 'claude', key: 'claude_api_key' },
                { provider: 'openai', key: 'api_key' }
            ];

            for (const candidate of localFallbacks) {
                const stored = localStorage.getItem(candidate.key);
                if (stored) {
                    return {
                        provider: candidate.provider,
                        apiKey: stored,
                        model: null,
                        route: 'auto'
                    };
                }
            }
        } catch (error) {
            console.warn('JobManager: Failed to resolve AI provider', error);
        }

        return null;
    }

    getActiveResumeData() {
        try {
            const state = this.getGlobalState();
            const currentResume = state?.currentResume || null;

            const clone = (data) => JSON.parse(JSON.stringify(data));

            if (currentResume) {
                if (currentResume.data) {
                    return clone(currentResume.data);
                }
                if (currentResume.content) {
                    if (typeof currentResume.content === 'string') {
                        try {
                            return JSON.parse(currentResume.content);
                        } catch (error) {
                            console.warn('JobManager: Failed to parse current resume content', error);
                        }
                    } else {
                        return clone(currentResume.content);
                    }
                }
            }

            if (Array.isArray(state?.resumes) && state.resumes.length > 0) {
                const defaultResume = state.resumes.find(resume => resume.isDefault) || state.resumes[0];
                if (defaultResume) {
                    if (defaultResume.data) {
                        return clone(defaultResume.data);
                    }
                    if (defaultResume.content) {
                        if (typeof defaultResume.content === 'string') {
                            try {
                                return JSON.parse(defaultResume.content);
                            } catch (error) {
                                console.warn('JobManager: Failed to parse default resume content', error);
                            }
                        } else {
                            return clone(defaultResume.content);
                        }
                    }
                }
            }

            if (window.app && window.app.data) {
                return clone(window.app.data);
            }

            if (window.appManager && window.appManager.data?.resume) {
                return clone(window.appManager.data.resume);
            }
        } catch (error) {
            console.warn('JobManager: Unable to extract resume data', error);
        }
        return null;
    }

    getJobFeedPreferences() {
        try {
            const state = this.getGlobalState();
            return state?.settings?.jobFeeds || null;
        } catch (error) {
            return null;
        }
    }

    async handleIngestJobs() {
        if (this._ingestionState.isLoading) return;

        const url = (this._ingestionState.url || '').trim();
        if (!url) {
            this.showToast('Enter a job listing URL to fetch.', 'warning');
            return;
        }

        if (!aiService || typeof aiService.isWorkerReady !== 'function' || !aiService.isWorkerReady()) {
            this.showToast('AI worker is still loading. Please try again in a moment.', 'warning');
            return;
        }

        const providerInfo = this.resolveAIProvider();
        if (!providerInfo) {
            this.showToast('Configure an AI provider in Settings before using job ingestion.', 'error');
            return;
        }

        const keywordList = this.normalizeKeywords(this._ingestionState.keywords);
        let includeAnalysis = !!this._ingestionState.includeAnalysis;
        let resumeData = null;

        if (includeAnalysis) {
            resumeData = this.getActiveResumeData();
            if (!resumeData) {
                includeAnalysis = false;
                this.showToast('No resume detected. Fetching jobs without match scoring.', 'warning');
            }
        }

        const maxJobs = Math.min(50, Math.max(1, parseInt(this._ingestionState.maxJobs, 10) || 15));

        this.updateIngestionState({
            isLoading: true,
            progress: 'Preparing AI request...',
            error: null,
            metadata: null
        });

        try {
            const result = await aiService.ingestJobs({
                url,
                keywords: keywordList,
                maxJobs,
                includeAnalysis,
                resume: includeAnalysis ? resumeData : null,
                provider: providerInfo.provider,
                apiKey: providerInfo.apiKey,
                model: providerInfo.model,
                route: providerInfo.route,
                onProgress: (message) => {
                    this._ingestionState.progress = message;
                    this.updateIngestionProgressDisplay();
                }
            });

            const jobs = Array.isArray(result?.jobs)
                ? result.jobs.slice()
                : Array.isArray(result?.result?.jobs)
                    ? result.result.jobs.slice()
                    : [];

            const sorted = jobs.sort((a, b) => {
                const scoreA = typeof a.matchScore === 'number' ? a.matchScore : -1;
                const scoreB = typeof b.matchScore === 'number' ? b.matchScore : -1;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return (a.order || 0) - (b.order || 0);
            });

            this.updateIngestionState({
                isLoading: false,
                progress: sorted.length ? `Found ${sorted.length} jobs` : 'No jobs found',
                results: sorted,
                metadata: result?.metadata || null,
                lastSourceUrl: url
            });

            this.showToast(
                sorted.length ? `Fetched ${sorted.length} job${sorted.length === 1 ? '' : 's'}` : 'No jobs detected at that source.',
                sorted.length ? 'success' : 'info'
            );
        } catch (error) {
            console.error('JobManager: Job ingestion failed', error);
            this.updateIngestionState({
                isLoading: false,
                progress: '',
                error: error?.message || 'Job ingestion failed. Please try again.'
            });
            this.showToast('Job ingestion failed. Check the console for details.', 'error');
        }
    }

    clearIngestionResults() {
        if (this._ingestionState.isLoading) return;
        if (!this._ingestionState.results?.length && !this._ingestionState.progress) return;

        this.updateIngestionState({
            results: [],
            progress: '',
            error: null,
            metadata: null
        });
    }

    handleImportIngestedJob(index) {
        const results = Array.isArray(this._ingestionState.results) ? this._ingestionState.results : [];
        if (!results.length) return;
        const target = results[index];
        if (!target) return;

        const job = this.buildAIImportedJob(target, index);
        if (!job) {
            this.showToast('Unable to import the selected job.', 'error');
            return;
        }

        this._jobs[job.id] = job;
        this._selectedJob = job;
        this.saveJobsToStorage();
        this.setData({
            jobs: this._jobs,
            selectedJob: this._selectedJob
        }, 'ai-ingest-import');

        const remaining = results.filter((_, idx) => idx !== index);
        this.updateIngestionState({
            results: remaining,
            progress: remaining.length ? `${remaining.length} job${remaining.length === 1 ? '' : 's'} remaining` : '',
            metadata: this._ingestionState.metadata
        });

        this.showToast('Job imported from AI results.', 'success');
    }

    handleImportAllIngestedJobs() {
        const results = Array.isArray(this._ingestionState.results) ? this._ingestionState.results : [];
        if (!results.length) return;

        let lastImported = null;
        results.forEach((result, index) => {
            const job = this.buildAIImportedJob(result, index);
            if (job) {
                this._jobs[job.id] = job;
                lastImported = job;
            }
        });

        if (lastImported) {
            this._selectedJob = lastImported;
            this.saveJobsToStorage();
            this.setData({
                jobs: this._jobs,
                selectedJob: this._selectedJob
            }, 'ai-ingest-import-all');

            this.updateIngestionState({
                results: [],
                progress: '',
                metadata: this._ingestionState.metadata
            });

            this.showToast(`Imported ${results.length} job${results.length === 1 ? '' : 's'} from AI results.`, 'success');
        } else {
            this.showToast('No valid jobs were imported.', 'warning');
        }
    }

    buildAIImportedJob(result, position = 0) {
        if (!result || typeof result !== 'object') return null;

        const now = new Date().toISOString();
        const job = createDefaultJob();
        job.id = this.generateJobId();
        job.title = result.title || 'Untitled Position';
        job.company = result.company || '';
        job.location = result.location || (result.remote ? 'Remote' : '');
        job.description = (result.description || result.rawText || '').slice(0, 10000);
        job.url = result.applyUrl || result.sourceUrl || this._ingestionState.lastSourceUrl || '';
        job.notes = this.buildImportedJobNotes(result);
        job.dateCreated = now;
        job.dateUpdated = now;

        job.aiMatch = {
            score: typeof result.matchScore === 'number' ? Math.round(result.matchScore) : null,
            status: result.matchStatus || null,
            analysis: result.matchAnalysis || null,
            matchedKeywords: Array.isArray(result.matchedKeywords) ? result.matchedKeywords : [],
            tags: Array.isArray(result.tags) ? result.tags : [],
            skills: Array.isArray(result.skills) ? result.skills : [],
            requirements: Array.isArray(result.requirements) ? result.requirements : [],
            responsibilities: Array.isArray(result.responsibilities) ? result.responsibilities : [],
            summary: result.summary || '',
            sourceUrl: result.sourceUrl || this._ingestionState.lastSourceUrl || '',
            applyUrl: result.applyUrl || '',
            jobType: result.jobType || '',
            compensation: result.compensation || '',
            remote: result.remote ?? null,
            importedAt: now,
            order: typeof result.order === 'number' ? result.order : position + 1,
            rawText: result.rawText || ''
        };

        job.source = {
            type: 'ai-ingest',
            url: result.sourceUrl || this._ingestionState.lastSourceUrl || '',
            fetchedAt: now
        };

        job.tags = Array.isArray(result.tags) ? result.tags : [];
        job.skills = Array.isArray(result.skills) ? result.skills : [];
        job.applyUrl = job.url;

        return job;
    }

    buildImportedJobNotes(result) {
        const sections = [];
        if (result.summary) {
            sections.push(result.summary);
        }
        if (Array.isArray(result.matchedKeywords) && result.matchedKeywords.length) {
            sections.push(`Matched keywords: ${result.matchedKeywords.join(', ')}`);
        }
        if (Array.isArray(result.skills) && result.skills.length) {
            sections.push(`Skills: ${result.skills.slice(0, 10).join(', ')}`);
        }
        if (Array.isArray(result.requirements) && result.requirements.length) {
            const bullets = result.requirements.slice(0, 5).map(item => `- ${item}`).join('\n');
            sections.push(`Key requirements:\n${bullets}`);
        }
        return sections.join('\n\n');
    }

    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    getJobMatchScore(job) {
        if (!job) return null;
        if (job.aiMatch && typeof job.aiMatch.score === 'number') {
            return job.aiMatch.score;
        }
        if (typeof job.matchScore === 'number') {
            return job.matchScore;
        }
        if (job.aiMatch && typeof job.aiMatch.matchScore === 'number') {
            return job.aiMatch.matchScore;
        }
        return null;
    }

    getMatchScoreClass(score) {
        if (typeof score !== 'number' || Number.isNaN(score)) {
            return 'match-score-unknown';
        }
        if (score >= this._strongMatchThreshold) {
            return 'match-score-strong';
        }
        if (score >= 50) {
            return 'match-score-medium';
        }
        return 'match-score-low';
    }

    renderIngestionPanel() {
        const state = this._ingestionState;
        const jobFeedPrefs = this.getJobFeedPreferences();
        const keywordValue = state.keywords || jobFeedPrefs?.keywords || '';
        const ingestDisabled = state.isLoading ? 'disabled' : '';
        const clearDisabled = state.isLoading || !(state.results && state.results.length) ? 'disabled' : '';

        const progressMarkup = state.progress || state.error ? `
            <div class="ingest-status">
                <div class="ingest-progress">
                    <span class="ai-ingest-spinner ${state.isLoading ? '' : 'hidden'}"></span>
                    <span class="ai-ingest-progress-text">${this.escapeHtml(state.progress || '')}</span>
                </div>
                ${state.error ? `<div class="ingest-error">${this.escapeHtml(state.error)}</div>` : ''}
            </div>
        ` : '';

        return `
            <div class="ai-ingest-panel">
                <h4>AI Job Finder</h4>
                <div class="form-group">
                    <label for="ai-ingest-url">Source URL</label>
                    <input type="url" id="ai-ingest-url" data-ingest-field="url"
                        placeholder="https://news.ycombinator.com/..."
                        value="${this.escapeHtml(state.url || '')}"
                        ${state.isLoading ? 'readonly' : ''}>
                </div>
                <div class="form-row two-column">
                <div class="form-group">
                    <label for="ai-ingest-keywords">Keywords</label>
                    <input type="text" id="ai-ingest-keywords" data-ingest-field="keywords"
                        placeholder="python, ai, remote"
                        value="${this.escapeHtml(keywordValue)}"
                        ${state.isLoading ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label for="ai-ingest-max">Max Jobs</label>
                    <input type="number" id="ai-ingest-max" data-ingest-field="maxJobs"
                            min="1" max="50"
                            value="${this.escapeHtml(String(state.maxJobs || 15))}"
                            ${state.isLoading ? 'readonly' : ''}>
                    </div>
                </div>
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" data-ingest-field="includeAnalysis"
                            ${state.includeAnalysis ? 'checked' : ''}
                            ${state.isLoading ? 'disabled' : ''}>
                        Score matches against my resume
                    </label>
                </div>
                <div class="form-row action-row">
                    <button class="btn btn-primary" data-action="ingest-jobs" ${ingestDisabled}>
                        ${state.isLoading ? 'Fetching…' : 'Fetch Jobs'}
                    </button>
                    <button class="btn btn-outline" data-action="import-all-ingested"
                        ${state.results && state.results.length ? '' : 'disabled'}>
                        Import All
                    </button>
                    <button class="btn btn-link" data-action="clear-ingestion-results" ${clearDisabled}>
                        Clear
                    </button>
                </div>
                ${progressMarkup}
                ${jobFeedPrefs?.autoImport ? '<div class="auto-import-note">Auto-import is enabled. Fresh matches will be queued automatically.</div>' : ''}
            </div>
        `;
    }

    renderIngestionResults() {
        const results = Array.isArray(this._ingestionState.results) ? this._ingestionState.results : [];
        if (!results.length) {
            return '';
        }

        const metaParts = [];
        const source = this._ingestionState.metadata?.sourceUrl || this._ingestionState.lastSourceUrl;
        if (source) {
            try {
                const hostname = new URL(source).hostname;
                metaParts.push(`Source: ${hostname}`);
            } catch (error) {
                metaParts.push(`Source: ${source}`);
            }
        }
        if (this._ingestionState.metadata?.processingTimeMs) {
            const ms = this._ingestionState.metadata.processingTimeMs;
            metaParts.push(`Processed in ${(ms / 1000).toFixed(1)}s`);
        }

        const metaLine = metaParts.length ? `<div class="ingest-meta">${metaParts.join(' • ')}</div>` : '';

        return `
            <div class="ingest-results">
                <div class="ingest-results-header">
                    <h4>AI Matches <span class="count">(${results.length})</span></h4>
                    ${metaLine}
                </div>
                <div class="ingest-result-list">
                    ${results.map((job, index) => this.renderIngestionResult(job, index)).join('')}
                </div>
            </div>
        `;
    }

    renderIngestionResult(job, index) {
        if (!job || typeof job !== 'object') return '';

        const score = typeof job.matchScore === 'number' ? Math.round(job.matchScore) : null;
        const scoreClass = this.getMatchScoreClass(score);
        const strong = score !== null && score >= this._strongMatchThreshold;
        const summary = job.summary || '';
        const descriptionPreview = job.description ? job.description.slice(0, 220) : '';
        const hasMoreDescription = job.description && job.description.length > 220;
        const matchedKeywords = Array.isArray(job.matchedKeywords) ? job.matchedKeywords : [];
        const tags = Array.isArray(job.tags) ? job.tags.slice(0, 6) : [];
        const requirements = Array.isArray(job.requirements) ? job.requirements.slice(0, 5) : [];
        const descriptionHtml = this.escapeHtml(job.description || '').replace(/\n/g, '<br>');

        return `
            <div class="ingest-result-card ${strong ? 'strong-match' : ''}">
                <div class="ingest-result-header">
                    <div>
                        <h5>${this.escapeHtml(job.title || 'Untitled Role')}</h5>
                        <div class="company-line">
                            <span class="company">${this.escapeHtml(job.company || 'Unknown Company')}</span>
                            ${job.remote ? '<span class="tag-pill">Remote</span>' : ''}
                        </div>
                    </div>
                    <div class="match-score ${scoreClass}">
                        ${score !== null ? `${score}%` : '—'}
                    </div>
                </div>
                <div class="ingest-result-body">
                    ${summary ? `<p class="summary">${this.escapeHtml(summary)}</p>` : ''}
                    ${!summary && descriptionPreview ? `<p class="summary">${this.escapeHtml(descriptionPreview)}${hasMoreDescription ? '&hellip;' : ''}</p>` : ''}
                    ${matchedKeywords.length ? `
                        <div class="keyword-list">
                            ${matchedKeywords.map(keyword => `<span class="keyword-pill">${this.escapeHtml(keyword)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${tags.length ? `
                        <div class="tag-list">
                            ${tags.map(tag => `<span class="tag-pill">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                    <details>
                        <summary>View full details</summary>
                        <div class="ingest-detail-text">${descriptionHtml}</div>
                        ${requirements.length ? `
                            <div class="ingest-requirements">
                                <strong>Requirements</strong>
                                <ul>${requirements.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
                            </div>
                        ` : ''}
                    </details>
                </div>
                <div class="ingest-result-actions">
                    ${job.applyUrl || job.sourceUrl ? `
                        <a class="btn btn-link" href="${this.escapeHtml(job.applyUrl || job.sourceUrl)}" target="_blank" rel="noopener">
                            Open Listing
                        </a>
                    ` : '<span class="btn btn-link disabled">No Link</span>'}
                    <button class="btn btn-sm btn-primary" data-action="import-ingested-job" data-index="${index}">
                        Import
                    </button>
                </div>
            </div>
        `;
    }

    renderMatchInsight(job) {
        if (!job) return '';

        const matchScore = this.getJobMatchScore(job);
        const match = job.aiMatch || {};

        const hasKeywords = Array.isArray(match.matchedKeywords) && match.matchedKeywords.length > 0;
        const hasAnalysis = match.analysis && (Array.isArray(match.analysis.strengths) || Array.isArray(match.analysis.recommendations));

        if (matchScore === null && !hasKeywords && !hasAnalysis) {
            return '';
        }

        const scoreClass = this.getMatchScoreClass(matchScore);

        const strengthsList = Array.isArray(match.analysis?.strengths) && match.analysis.strengths.length
            ? `<ul>${match.analysis.strengths.slice(0, 4).map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`
            : '';

        const recommendationsList = Array.isArray(match.analysis?.recommendations) && match.analysis.recommendations.length
            ? `<ul>${match.analysis.recommendations.slice(0, 4).map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`
            : '';

        return `
            <div class="match-insight">
                <div class="match-score-pill ${scoreClass}">
                    ${matchScore !== null ? `${Math.round(matchScore)}% match` : 'Match analysis unavailable'}
                </div>
                ${hasKeywords ? `
                    <div class="match-keywords">
                        ${match.matchedKeywords.map(keyword => `<span class="keyword-pill">${this.escapeHtml(keyword)}</span>`).join('')}
                    </div>
                ` : ''}
                ${strengthsList ? `
                    <div class="match-section">
                        <strong>Strengths</strong>
                        ${strengthsList}
                    </div>
                ` : ''}
                ${recommendationsList ? `
                    <div class="match-section">
                        <strong>Recommendations</strong>
                        ${recommendationsList}
                    </div>
                ` : ''}
            </div>
        `;
    }

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    handleGenerationFieldChange(field, target) {
        if (!target) return;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        this.updateGenerationState({ [field]: value }, false);
    }

    updateGenerationState(updates = {}, rerender = true) {
        this._generationState = {
            ...this._generationState,
            ...updates
        };

        if (rerender) {
            this.render();
        } else {
            this.updateGenerationProgressDisplay();
        }
    }

    updateGenerationProgressDisplay() {
        const progressNode = this.querySelector('.ai-generate-progress-text');
        if (progressNode) {
            progressNode.textContent = this._generationState.progress || '';
        }

        const spinner = this.querySelector('.ai-generate-spinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !this._generationState.isProcessing);
        }
    }

    async handleGenerateAIDocuments() {
        if (!this._selectedJob) {
            this.showToast('Select a job before generating documents.', 'warning');
            return;
        }

        if (this._generationState.isProcessing) return;

        const generateResume = !!this._generationState.includeResume;
        const generateCoverLetter = !!this._generationState.includeCoverLetter;

        if (!generateResume && !generateCoverLetter) {
            this.showToast('Select at least one document to generate.', 'warning');
            return;
        }

        const providerInfo = this.resolveAIProvider();
        if (!providerInfo) {
            this.showToast('Configure an AI provider in Settings before generating documents.', 'error');
            return;
        }

        const resumeData = this.getActiveResumeData();
        if (!resumeData) {
            this.showToast('Unable to load resume data for tailoring.', 'error');
            return;
        }

        let jobDescription = this._selectedJob.description || '';
        if (!jobDescription && this._selectedJob.aiMatch?.rawText) {
            jobDescription = this._selectedJob.aiMatch.rawText;
        }
        if (!jobDescription && this._selectedJob.aiMatch?.summary) {
            jobDescription = this._selectedJob.aiMatch.summary;
        }

        if (!jobDescription) {
            this.showToast('Add a job description before generating documents.', 'warning');
            return;
        }

        if (Array.isArray(this._selectedJob.aiMatch?.requirements) && this._selectedJob.aiMatch.requirements.length) {
            jobDescription += '\n\nKey Requirements:\n' + this._selectedJob.aiMatch.requirements.join('\n');
        }

        if (Array.isArray(this._selectedJob.aiMatch?.responsibilities) && this._selectedJob.aiMatch.responsibilities.length) {
            jobDescription += '\n\nResponsibilities:\n' + this._selectedJob.aiMatch.responsibilities.join('\n');
        }

        if (jobDescription.length > 8000) {
            jobDescription = jobDescription.slice(0, 8000);
        }

        this.updateGenerationState({
            isProcessing: true,
            progress: 'Starting AI generation...',
            error: null
        });

        const jobInfo = {
            title: this._selectedJob.title || '',
            company: this._selectedJob.company || '',
            location: this._selectedJob.location || ''
        };

        const newDocs = {};
        const timestamp = new Date().toISOString();

        try {
            if (generateResume) {
                this._generationState.progress = 'Tailoring resume...';
                this.updateGenerationProgressDisplay();

                const resumeResult = await aiService.tailorResume({
                    resume: resumeData,
                    jobDescription,
                    includeAnalysis: true,
                    provider: providerInfo.provider,
                    apiKey: providerInfo.apiKey,
                    model: providerInfo.model,
                    route: providerInfo.route,
                    onProgress: (message) => {
                        this._generationState.progress = message;
                        this.updateGenerationProgressDisplay();
                    }
                });

                const tailoredResume = resumeResult?.result?.tailoredResume || resumeResult?.tailoredResume || null;
                if (!tailoredResume) {
                    throw new Error('AI did not return a tailored resume.');
                }

                const resumePdf = await this.generateResumePdf(tailoredResume, this._selectedJob);
                newDocs.resume = {
                    fileName: resumePdf.fileName,
                    dataUrl: resumePdf.dataUrl,
                    resume: tailoredResume,
                    analysis: resumeResult?.result?.analysis || resumeResult?.analysis || null,
                    provider: providerInfo.provider,
                    generatedAt: timestamp
                };
            }

            if (generateCoverLetter) {
                this._generationState.progress = generateResume ? 'Generating cover letter...' : 'Generating cover letter...';
                this.updateGenerationProgressDisplay();

                const coverResult = await aiService.generateCoverLetter({
                    resume: resumeData,
                    jobDescription,
                    jobInfo,
                    includeAnalysis: true,
                    provider: providerInfo.provider,
                    apiKey: providerInfo.apiKey,
                    model: providerInfo.model,
                    route: providerInfo.route,
                    onProgress: (message) => {
                        this._generationState.progress = message;
                        this.updateGenerationProgressDisplay();
                    }
                });

                const coverLetterText = coverResult?.result?.coverLetter || coverResult?.coverLetter || null;
                if (!coverLetterText) {
                    throw new Error('AI did not return a cover letter.');
                }

                const coverPdf = await this.generateCoverLetterPdf(coverLetterText, this._selectedJob);
                newDocs.coverLetter = {
                    fileName: coverPdf.fileName,
                    dataUrl: coverPdf.dataUrl,
                    letter: coverLetterText,
                    analysis: coverResult?.result?.analysis || coverResult?.analysis || null,
                    provider: providerInfo.provider,
                    generatedAt: timestamp
                };
            }

            if (Object.keys(newDocs).length === 0) {
                throw new Error('No documents were generated.');
            }

            const updatedJob = {
                ...this._selectedJob,
                aiDocuments: {
                    ...(this._selectedJob.aiDocuments || {}),
                    ...newDocs
                },
                dateUpdated: timestamp
            };

            this._jobs[updatedJob.id] = updatedJob;
            this._selectedJob = updatedJob;
            this.saveJobsToStorage();
            this.setData({
                jobs: this._jobs,
                selectedJob: this._selectedJob
            }, 'ai-docs-generated');

            this.updateGenerationState({
                isProcessing: false,
                progress: 'Generation complete!',
                error: null
            });

            this.showToast('AI documents generated and attached to the job.', 'success');
        } catch (error) {
            console.error('JobManager: Document generation failed', error);
            this.updateGenerationState({
                isProcessing: false,
                progress: '',
                error: error?.message || 'Failed to generate documents.'
            });
            this.showToast('Document generation failed. Check the console for details.', 'error');
        }
    }

    async generateResumePdf(resumeData, job) {
        const safeCompany = (job?.company || 'company').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const safeTitle = (job?.title || 'role').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const base = [safeCompany, safeTitle].filter(Boolean).join('-') || 'resume';
        const fileName = `${base}-tailored-resume.pdf`;
        const html = this.buildResumeHtml(resumeData, job);
        const pdf = await this.createPdfData(html, fileName);
        return { ...pdf, resumeData };
    }

    async generateCoverLetterPdf(letterText, job) {
        const safeCompany = (job?.company || 'company').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const safeTitle = (job?.title || 'role').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const base = [safeCompany, safeTitle].filter(Boolean).join('-') || 'cover-letter';
        const fileName = `${base}-cover-letter.pdf`;
        const html = this.buildCoverLetterHtml(letterText, job);
        return this.createPdfData(html, fileName);
    }

    async createPdfData(html, fileName) {
        if (typeof html2pdf === 'undefined') {
            throw new Error('PDF generator is not available in this environment.');
        }

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '8.5in';
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
            const options = {
                margin: 0.5,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            const dataUrl = await html2pdf().set(options).from(container).outputPdf('datauristring');
            return { dataUrl, fileName };
        } finally {
            document.body.removeChild(container);
        }
    }

    buildResumeHtml(resumeData, job) {
        const basics = resumeData?.basics || {};
        const name = this.escapeHtml(basics.name || '');
        const label = this.escapeHtml(basics.label || '');
        const contactParts = [];
        if (basics.email) contactParts.push(this.escapeHtml(basics.email));
        if (basics.phone) contactParts.push(this.escapeHtml(basics.phone));
        if (basics.location?.city || basics.location?.region) {
            const locationText = [basics.location.city, basics.location.region].filter(Boolean).join(', ');
            if (locationText) contactParts.push(this.escapeHtml(locationText));
        }
        if (basics.website) contactParts.push(this.escapeHtml(basics.website));

        const workItems = Array.isArray(resumeData?.work) ? resumeData.work : [];
        const workHtml = workItems.map(item => `
            <section class="resume-section">
                <div class="section-header">
                    <strong>${this.escapeHtml(item.position || '')}</strong>
                    <span>${this.escapeHtml(item.startDate || '')}${item.endDate ? ' - ' + this.escapeHtml(item.endDate) : ' - Present'}</span>
                </div>
                <div class="section-subheader">${this.escapeHtml(item.name || '')}${item.location ? ' • ' + this.escapeHtml(item.location) : ''}</div>
                ${item.summary ? `<p>${this.escapeHtml(item.summary)}</p>` : ''}
                ${Array.isArray(item.highlights) && item.highlights.length ? `
                    <ul>
                        ${item.highlights.slice(0, 6).map(highlight => `<li>${this.escapeHtml(highlight)}</li>`).join('')}
                    </ul>
                ` : ''}
            </section>
        `).join('');

        const educationItems = Array.isArray(resumeData?.education) ? resumeData.education : [];
        const educationHtml = educationItems.map(item => `
            <section class="resume-section">
                <div class="section-header">
                    <strong>${this.escapeHtml(item.institution || '')}</strong>
                    <span>${this.escapeHtml(item.startDate || '')}${item.endDate ? ' - ' + this.escapeHtml(item.endDate) : ''}</span>
                </div>
                <div class="section-subheader">${this.escapeHtml(item.studyType || '')}${item.area ? ' • ' + this.escapeHtml(item.area) : ''}</div>
                ${item.score ? `<p>GPA: ${this.escapeHtml(item.score)}</p>` : ''}
            </section>
        `).join('');

        const skillsItems = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
        const skillsHtml = skillsItems.map(item => `<li>${this.escapeHtml(item.name || '')}${Array.isArray(item.keywords) && item.keywords.length ? ': ' + item.keywords.slice(0, 8).map(kw => this.escapeHtml(kw)).join(', ') : ''}</li>`).join('');

        const projectsItems = Array.isArray(resumeData?.projects) ? resumeData.projects : [];
        const projectsHtml = projectsItems.map(item => `
            <section class="resume-section">
                <div class="section-header">
                    <strong>${this.escapeHtml(item.name || '')}</strong>
                    <span>${this.escapeHtml(item.startDate || '')}${item.endDate ? ' - ' + this.escapeHtml(item.endDate) : ''}</span>
                </div>
                ${item.description ? `<p>${this.escapeHtml(item.description)}</p>` : ''}
                ${Array.isArray(item.highlights) && item.highlights.length ? `
                    <ul>
                        ${item.highlights.slice(0, 5).map(highlight => `<li>${this.escapeHtml(highlight)}</li>`).join('')}
                    </ul>
                ` : ''}
            </section>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 32px; color: #1a1a1a; }
        .resume-header { border-bottom: 2px solid #0b7285; padding-bottom: 12px; margin-bottom: 16px; }
        .resume-header h1 { margin: 0; font-size: 26px; color: #0b7285; }
        .resume-header h2 { margin: 4px 0 12px 0; font-size: 16px; font-weight: 400; color: #495057; }
        .contact-line { font-size: 12px; color: #495057; display: flex; flex-wrap: wrap; gap: 12px; }
        .resume-section { margin-bottom: 16px; }
        .resume-section h3 { margin: 0 0 8px 0; color: #0b7285; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; }
        .section-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #212529; }
        .section-subheader { font-size: 12px; color: #495057; margin: 4px 0 8px 0; }
        p { font-size: 12px; margin: 0 0 8px 0; line-height: 1.4; }
        ul { margin: 0 0 8px 18px; padding: 0; }
        li { font-size: 12px; margin-bottom: 4px; line-height: 1.4; }
    </style>
</head>
<body>
    <header class="resume-header">
        <h1>${name}</h1>
        ${label ? `<h2>${label}</h2>` : ''}
        ${contactParts.length ? `<div class="contact-line">${contactParts.join(' • ')}</div>` : ''}
    </header>
    <main>
        ${workHtml ? `<h3>Experience</h3>${workHtml}` : ''}
        ${projectsHtml ? `<h3>Projects</h3>${projectsHtml}` : ''}
        ${educationHtml ? `<h3>Education</h3>${educationHtml}` : ''}
        ${skillsHtml ? `
            <section class="resume-section">
                <h3>Skills</h3>
                <ul>${skillsHtml}</ul>
            </section>
        ` : ''}
    </main>
</body>
</html>
        `;
    }

    buildCoverLetterHtml(letterText, job) {
        const safeCompany = this.escapeHtml(job?.company || '');
        const safeTitle = this.escapeHtml(job?.title || '');
        const paragraphs = letterText
            .split(/\n{2,}/)
            .map(paragraph => paragraph.trim())
            .filter(Boolean)
            .map(paragraph => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
            .join('\n');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Georgia', serif; margin: 0; padding: 32px; color: #1a1a1a; line-height: 1.6; }
        header { margin-bottom: 24px; }
        header h1 { margin: 0 0 8px 0; font-size: 20px; color: #0b7285; }
        header span { font-size: 12px; color: #495057; }
        p { margin: 0 0 12px 0; font-size: 13px; }
    </style>
</head>
<body>
    <header>
        <h1>Cover Letter${safeCompany ? ` – ${safeCompany}` : ''}${safeTitle ? ` (${safeTitle})` : ''}</h1>
        <span>Generated on ${this.formatDate(new Date().toISOString())}</span>
    </header>
    <main>
        ${paragraphs}
    </main>
</body>
</html>
        `;
    }

    renderGeneratedDocuments(job) {
        const docs = job?.aiDocuments || {};
        const items = [];

        if (docs.resume) {
            items.push(`
                <div class="generated-doc-item">
                    <div class="doc-info">
                        <strong>Tailored Resume</strong>
                        <span>${this.formatDate(docs.resume.generatedAt)} • ${this.escapeHtml(docs.resume.provider || 'AI')}</span>
                    </div>
                    <div class="doc-actions">
                        <button class="btn btn-sm btn-outline" data-action="download-ai-doc" data-doc-type="resume">
                            Download PDF
                        </button>
                    </div>
                </div>
            `);
        }

        if (docs.coverLetter) {
            items.push(`
                <div class="generated-doc-item">
                    <div class="doc-info">
                        <strong>Cover Letter</strong>
                        <span>${this.formatDate(docs.coverLetter.generatedAt)} • ${this.escapeHtml(docs.coverLetter.provider || 'AI')}</span>
                    </div>
                    <div class="doc-actions">
                        <button class="btn btn-sm btn-outline" data-action="download-ai-doc" data-doc-type="coverLetter">
                            Download PDF
                        </button>
                    </div>
                </div>
            `);
        }

        if (!items.length) {
            return '';
        }

        return `
            <div class="generated-documents">
                <h5>Generated Documents</h5>
                ${items.join('')}
            </div>
        `;
    }

    handleDownloadAIDocument(docType) {
        if (!this._selectedJob || !this._selectedJob.aiDocuments) {
            this.showToast('No AI documents available for this job.', 'warning');
            return;
        }

        const doc = this._selectedJob.aiDocuments[docType];
        if (!doc || !doc.dataUrl) {
            this.showToast('Requested document is not available.', 'warning');
            return;
        }

        const link = document.createElement('a');
        link.href = doc.dataUrl;
        link.download = doc.fileName || `${docType}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                        ${this.renderIngestionPanel()}
                        ${this.renderIngestionResults()}
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
        
        return jobs.map(job => {
            const matchScore = this.getJobMatchScore(job);
            const isStrongMatch = typeof matchScore === 'number' && matchScore >= this._strongMatchThreshold;
            const matchBadge = matchScore !== null
                ? `<span class="match-score-badge ${this.getMatchScoreClass(matchScore)}">${Math.round(matchScore)}%</span>`
                : '';
            const matchedKeywords = job.aiMatch?.matchedKeywords || job.matchedKeywords;
            const keywordLine = Array.isArray(matchedKeywords) && matchedKeywords.length
                ? `<div class="job-item-keywords">${matchedKeywords.slice(0, 4).map(keyword => `<span class="keyword-pill">${this.escapeHtml(keyword)}</span>`).join('')}</div>`
                : '';

            return `
                <div class="job-item ${this._selectedJob?.id === job.id ? 'selected' : ''} ${isStrongMatch ? 'strong-match' : ''}"
                     data-job-id="${job.id}">
                    <div class="job-item-header">
                        <h4>${this.escapeHtml(job.title || 'Untitled Job')}</h4>
                        <div class="job-item-metrics">
                            ${matchBadge}
                            <span class="badge badge-${this.getStatusBadgeClass(job.status)}">${this.escapeHtml(job.status || 'saved')}</span>
                        </div>
                    </div>
                    <div class="job-item-company">${this.escapeHtml(job.company || 'Company')}</div>
                    <div class="job-item-location">${this.escapeHtml(job.location || 'Location not specified')}</div>
                    ${keywordLine}
                    <div class="job-item-date">Created: ${this.formatDate(job.dateCreated)}</div>
                    <div class="job-item-actions">
                        <button class="btn btn-danger btn-xs delete-job-btn" data-job-id="${job.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
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
        const matchInsight = this.renderMatchInsight(this._selectedJob);

        return `
            ${matchInsight}
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
        const aiDocMarkup = this.renderGeneratedDocuments(this._selectedJob);
        const generationState = this._generationState;

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
                                            <button class="btn btn-sm btn-outline" onclick="this.closest('job-manager-migrated').handleAssociateResume('${resume.id}')">
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
            <div class="form-section ai-generate-section">
                <h4>Generate Tailored Documents</h4>
                <div class="ai-generate-panel-body">
                    <div class="generate-options">
                        <label>
                            <input type="checkbox" data-generate-field="includeResume"
                                ${generationState.includeResume ? 'checked' : ''}
                                ${generationState.isProcessing ? 'disabled' : ''}>
                            Resume
                        </label>
                        <label>
                            <input type="checkbox" data-generate-field="includeCoverLetter"
                                ${generationState.includeCoverLetter ? 'checked' : ''}
                                ${generationState.isProcessing ? 'disabled' : ''}>
                            Cover Letter
                        </label>
                    </div>
                    <div class="generate-actions">
                        <button class="btn btn-primary" data-action="generate-ai-docs"
                            ${generationState.isProcessing ? 'disabled' : ''}>
                            ${generationState.isProcessing ? 'Generating…' : 'Generate'}
                        </button>
                    </div>
                    <div class="generate-progress">
                        <span class="ai-generate-spinner ${generationState.isProcessing ? '' : 'hidden'}"></span>
                        <span class="ai-generate-progress-text">${this.escapeHtml(generationState.progress || '')}</span>
                    </div>
                    ${generationState.error ? `<div class="generate-error">${this.escapeHtml(generationState.error)}</div>` : ''}
                </div>
                ${aiDocMarkup}
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

                .ai-ingest-panel {
                    padding: 16px;
                    border-bottom: 1px solid #dee2e6;
                    background: #fff;
                }

                .ai-ingest-panel h4 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    color: #1d3557;
                }

                .form-row.two-column {
                    grid-template-columns: 2fr 1fr;
                    margin-bottom: 12px;
                }

                .checkbox-group label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #495057;
                    cursor: pointer;
                }

                .action-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .ai-ingest-panel .btn.btn-link {
                    font-size: 12px;
                    color: #6c757d;
                    padding: 0 4px;
                }

                .ai-ingest-panel .btn.btn-link[disabled],
                .btn.btn-link.disabled {
                    pointer-events: none;
                    color: #ced4da;
                }

                .ingest-status {
                    font-size: 12px;
                    color: #495057;
                }

                .ingest-progress {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .ai-ingest-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid #dee2e6;
                    border-top-color: #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .ai-ingest-spinner.hidden {
                    display: none;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .ingest-error {
                    margin-top: 4px;
                    color: #dc3545;
                }

                .auto-import-note {
                    margin-top: 6px;
                    font-size: 11px;
                    color: #0b7285;
                }

                .ingest-results {
                    border-bottom: 1px solid #dee2e6;
                    max-height: 280px;
                    overflow-y: auto;
                    padding: 12px 16px;
                    background: #fafbff;
                }

                .ingest-results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 10px;
                }

                .ingest-results-header h4 {
                    margin: 0;
                    font-size: 14px;
                    color: #1d3557;
                }

                .ingest-results-header .count {
                    font-size: 12px;
                    color: #6c757d;
                }

                .ingest-meta {
                    font-size: 11px;
                    color: #6c757d;
                }

                .ingest-result-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .ingest-result-card {
                    background: white;
                    border: 1px solid #dbe2ef;
                    border-radius: 8px;
                    padding: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .ingest-result-card.strong-match {
                    border-color: #28a745;
                    box-shadow: 0 2px 6px rgba(40,167,69,0.15);
                }

                .ingest-result-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .ingest-result-header .match-score {
                    min-width: 48px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 14px;
                    border-radius: 16px;
                    padding: 4px 8px;
                    color: white;
                    background: #6c757d;
                }

                .ingest-result-header .match-score.match-score-strong {
                    background: #28a745;
                }

                .ingest-result-header .match-score.match-score-medium {
                    background: #ffc107;
                    color: #333;
                }

                .ingest-result-header .match-score.match-score-low {
                    background: #dc3545;
                }

                .ingest-result-header h5 {
                    margin: 0;
                    font-size: 14px;
                    color: #1d3557;
                }

                .company-line {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    font-size: 12px;
                    color: #6c757d;
                }

                .ingest-result-body .summary {
                    font-size: 12px;
                    color: #495057;
                    margin: 0 0 6px 0;
                }

                .keyword-list,
                .tag-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-bottom: 6px;
                }

                .ingest-result-body details {
                    font-size: 12px;
                    color: #495057;
                }

                .ingest-detail-text {
                    margin: 8px 0;
                    color: #495057;
                    line-height: 1.4;
                }

                .ingest-requirements ul {
                    margin: 4px 0 0 16px;
                    padding: 0;
                }

                .ingest-result-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 10px;
                }

                .ingest-result-actions .btn-link[data-disabled="true"] {
                    pointer-events: none;
                    color: #adb5bd;
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

                .job-item.strong-match {
                    border-color: #28a745;
                    box-shadow: 0 2px 8px rgba(40,167,69,0.15);
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

                .job-item-metrics {
                    display: flex;
                    gap: 6px;
                    align-items: center;
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

                .job-item-keywords {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-bottom: 6px;
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

                .match-score-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 42px;
                    padding: 2px 6px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: white;
                }

                .match-score-strong {
                    background: #28a745;
                }

                .match-score-medium {
                    background: #ffc107;
                    color: #333;
                }

                .match-score-low {
                    background: #dc3545;
                }

                .match-score-unknown {
                    background: #6c757d;
                }

                .keyword-pill,
                .tag-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    background: #f1f3f5;
                    color: #495057;
                }

                .tag-pill {
                    font-size: 11px;
                    background: #e9ecef;
                    color: #343a40;
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

                .match-insight {
                    background: #f1f8ff;
                    border: 1px solid #cfe2ff;
                    border-radius: 10px;
                    padding: 16px;
                    margin-bottom: 20px;
                }

                .match-score-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-weight: 600;
                    font-size: 12px;
                    margin-bottom: 10px;
                    color: white;
                }

                .match-section {
                    margin-top: 12px;
                    font-size: 13px;
                    color: #1d3557;
                }

                .match-section ul {
                    margin: 6px 0 0 20px;
                    padding: 0;
                    color: #495057;
                }

                .match-keywords {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 6px;
                }

                .match-score-pill.match-score-strong {
                    background: #28a745;
                }

                .match-score-pill.match-score-medium {
                    background: #ffc107;
                    color: #333;
                }

                .match-score-pill.match-score-low {
                    background: #dc3545;
                }

                .match-score-pill.match-score-unknown {
                    background: #6c757d;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .ai-generate-section {
                    margin-top: 24px;
                }

                .ai-generate-panel-body {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 16px;
                    background: #fff;
                }

                .generate-options {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 12px;
                    font-size: 13px;
                    color: #495057;
                }

                .generate-options label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                }

                .generate-actions {
                    margin-bottom: 10px;
                }

                .generate-progress {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #495057;
                    min-height: 18px;
                }

                .ai-generate-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid #dee2e6;
                    border-top-color: #20c997;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .ai-generate-spinner.hidden {
                    display: none;
                }

                .generate-error {
                    margin-top: 6px;
                    color: #dc3545;
                    font-size: 12px;
                }

                .generated-documents {
                    margin-top: 16px;
                    border-top: 1px solid #dee2e6;
                    padding-top: 12px;
                }

                .generated-documents h5 {
                    margin: 0 0 10px 0;
                    font-size: 15px;
                    color: #1d3557;
                }

                .generated-doc-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    background: #fdfdff;
                }

                .generated-doc-item:last-child {
                    margin-bottom: 0;
                }

                .generated-doc-item .doc-info span {
                    display: block;
                    font-size: 11px;
                    color: #6c757d;
                    margin-top: 2px;
                }

                .generated-doc-item .doc-actions {
                    display: flex;
                    gap: 8px;
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
customElements.define('job-manager-migrated', JobManagerMigrated);

export { JobManagerMigrated };
