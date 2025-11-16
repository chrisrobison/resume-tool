// AI Assistant Worker Component - Migrated to ComponentBase
// Manages AI-powered resume tailoring, cover letter generation, and job matching

import { ComponentBase } from '../js/component-base.js';
import aiService from '../js/ai-service.js';
import { addResume, setCurrentResume, updateJob } from '../js/store.js';

class AIAssistantWorker extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component-specific properties
        this._currentJob = null;
        this._currentResume = null;
        this._isProcessing = false;
        this._currentProgress = '';
        this._lastResult = null;
        
        // Bind methods for external access and event handling
        this.handleProgress = this.handleProgress.bind(this);
        this.handleTailorResume = this.handleTailorResume.bind(this);
        this.handleGenerateCoverLetter = this.handleGenerateCoverLetter.bind(this);
        this.handleAnalyzeMatch = this.handleAnalyzeMatch.bind(this);
        this.handleViewDetails = this.handleViewDetails.bind(this);
        this.handleSaveResult = this.handleSaveResult.bind(this);
        this.handleApplyChanges = this.handleApplyChanges.bind(this);
        this.handleSaveCoverLetter = this.handleSaveCoverLetter.bind(this);
        this.showJobSelectionModal = this.showJobSelectionModal.bind(this);
        this.showResumeSelectionModal = this.showResumeSelectionModal.bind(this);
        
        // Public API methods
        this.setCurrentJob = this.setCurrentJob.bind(this);
        this.setCurrentResume = this.setCurrentResume.bind(this);
        this.getCurrentJob = this.getCurrentJob.bind(this);
        this.getCurrentResume = this.getCurrentResume.bind(this);
        this.isProcessing = this.isProcessing.bind(this);
        this.getLastResult = this.getLastResult.bind(this);
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('AIAssistantWorker: Initializing AI Assistant');
        
        // Load current state from global store
        await this.updateFromStore();
        
        // Render the component
        this.render();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Handle data changes
     * Called when setData() is used
     */
    onDataChange(newData, previousData, source) {
        console.log('AIAssistantWorker: AI data changed from', source);
        
        // Handle AI operation results or configuration changes
        if (newData && typeof newData === 'object') {
            if (newData.currentJob !== undefined) this._currentJob = newData.currentJob;
            if (newData.currentResume !== undefined) this._currentResume = newData.currentResume;
            if (newData.isProcessing !== undefined) this._isProcessing = newData.isProcessing;
            if (newData.lastResult !== undefined) this._lastResult = newData.lastResult;
        }
        
        // Re-render when data changes
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Handle component refresh
     * Called when refresh() is used
     */
    async onRefresh(force = false) {
        console.log('AIAssistantWorker: Refreshing AI Assistant');
        
        // Update from global store
        await this.updateFromStore();
        
        // Re-render the component
        this.render();
    }

    /**
     * Component validation
     * Validate AI assistant state and requirements
     */
    onValidate() {
        const errors = [];
        
        // Validate current job if set
        if (this._currentJob) {
            if (!this._currentJob.id) {
                errors.push('Current job missing ID');
            }
            if (!this._currentJob.description && !this._currentJob.jobDetails) {
                errors.push('Current job missing description');
            }
        }
        
        // Validate current resume if set
        if (this._currentResume) {
            if (!this._currentResume.id) {
                errors.push('Current resume missing ID');
            }
            if (!this._currentResume.data && !this._currentResume.content) {
                errors.push('Current resume missing data');
            }
        }
        
        // Validate API configuration
        try {
            this.getApiConfig();
        } catch (error) {
            errors.push('API configuration invalid: ' + error.message);
        }
        
        // Validate last result structure if exists
        if (this._lastResult) {
            if (!this._lastResult.type || !this._lastResult.data) {
                errors.push('Invalid result structure');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Handle global store changes
     * Called when store state changes
     */
    handleStoreChange(event) {
        // React to relevant store changes
        const source = event.detail?.source || '';
        if (source.includes('job') || source.includes('Job') || 
            source.includes('resume') || source.includes('Resume') ||
            source.includes('settings') || source.includes('Settings')) {
            console.log('AIAssistantWorker: Relevant state change detected, updating...', source);
            this.updateFromStore();
        }
    }

    /**
     * Component cleanup
     * Replaces disconnectedCallback()
     */
    onCleanup() {
        console.log('AIAssistantWorker: Cleaning up AI Assistant');
        
        // Clear any ongoing processing
        this._isProcessing = false;
        this._currentProgress = '';
        
        // Remove any global event listeners or timeouts
        this.removeEventListeners();
    }

    /**
     * Update component state from global store
     */
    async updateFromStore() {
        try {
            const state = this.getGlobalState();
            console.log('AIAssistantWorker updating from store. State:', state);
            
            const previousJob = this._currentJob;
            const previousResume = this._currentResume;
            
            this._currentJob = state?.currentJob || null;
            this._currentResume = state?.currentResume || null;
            
            console.log('AIAssistantWorker current job:', this._currentJob);
            console.log('AIAssistantWorker current resume:', this._currentResume);
            
            // Only re-render if job or resume changed
            if (this._currentJob !== previousJob || this._currentResume !== previousResume) {
                if (this.isReady()) {
                    this.render();
                }
            }
            
        } catch (error) {
            this.handleError(error, 'Failed to update from store');
        }
    }

    /**
     * Public API: Set current job
     * @param {object} job - Job object
     */
    setCurrentJob(job) {
        this._currentJob = job;
        this.updateGlobalState({ currentJob: job }, 'ai-assistant-set-job');
        this.render();
    }

    /**
     * Public API: Set current resume
     * @param {object} resume - Resume object
     */
    setCurrentResume(resume) {
        this._currentResume = resume;
        this.updateGlobalState({ currentResume: resume }, 'ai-assistant-set-resume');
        this.render();
    }

    /**
     * Public API: Get current job
     * @returns {object} Current job object
     */
    getCurrentJob() {
        return this._currentJob;
    }

    /**
     * Public API: Get current resume
     * @returns {object} Current resume object
     */
    getCurrentResume() {
        return this._currentResume;
    }

    /**
     * Public API: Check if processing
     * @returns {boolean} True if currently processing
     */
    isProcessing() {
        return this._isProcessing;
    }

    /**
     * Public API: Get last result
     * @returns {object} Last AI operation result
     */
    getLastResult() {
        return this._lastResult;
    }

    /**
     * Render the component
     */
    render() {
        if (!this.shadowRoot) return;
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>
            
            <div class="ai-assistant">
                <div class="header">
                    <div class="status-icon"></div>
                    <h2>AI Assistant</h2>
                    <span style="font-size: 12px; color: #666; margin-left: auto;">
                        ${this._isProcessing ? 'Processing...' : aiService.isWorkerReady() ? 'Ready' : 'Initializing...'}
                    </span>
                </div>
                
                <div class="requirements">
                    <h3>Current Selection</h3>
                    ${this.renderCurrentSelection()}
                </div>
                
                <div class="requirements">
                    <h3>Requirements Status</h3>
                    ${this.renderRequirements()}
                </div>
                
                ${this._isProcessing ? this.renderProgress() : ''}
                ${this._lastResult ? this.renderResult() : ''}
                
                <div class="actions">
                    <div class="action-group">
                        <button class="action-btn primary" id="tailor-resume" ${this.canTailorResume() ? '' : 'disabled'}>
                            <i class="fas fa-magic"></i>
                            Tailor Resume
                        </button>
                        <button class="action-btn secondary" id="generate-cover-letter" ${this.canGenerateCoverLetter() ? '' : 'disabled'}>
                            <i class="fas fa-envelope"></i>
                            Generate Cover Letter
                        </button>
                    </div>
                    <div class="action-group">
                        <button class="action-btn success" id="analyze-match" ${this.canAnalyzeMatch() ? '' : 'disabled'}>
                            <i class="fas fa-search"></i>
                            Analyze Match
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Selection Modals -->
            <div class="selection-modal" id="job-selection-modal">
                <div class="selection-modal-content">
                    <h4>Select a Job</h4>
                    <div class="selection-list" id="job-selection-list">
                        <!-- Jobs will be populated here -->
                    </div>
                    <div style="margin-top: 15px; text-align: right;">
                        <button class="btn btn-secondary" id="cancel-job-selection">Cancel</button>
                    </div>
                </div>
            </div>
            
            <div class="selection-modal" id="resume-selection-modal">
                <div class="selection-modal-content">
                    <h4>Select a Resume</h4>
                    <div class="selection-list" id="resume-selection-list">
                        <!-- Resumes will be populated here -->
                    </div>
                    <div style="margin-top: 15px; text-align: right;">
                        <button class="btn btn-secondary" id="cancel-resume-selection">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render current job and resume selection
     */
    renderCurrentSelection() {
        const allJobs = this.getGlobalState('jobs') || [];
        const allResumes = this.getGlobalState('resumes') || [];
        
        console.log('AIAssistantWorker renderCurrentSelection - Available jobs:', allJobs);
        console.log('AIAssistantWorker renderCurrentSelection - Available resumes:', allResumes);
        
        return `
            <div class="selection-item">
                <div class="selection-info">
                    <div class="label">Current Job</div>
                    <div class="value ${!this._currentJob ? 'no-selection' : ''}">
                        ${this._currentJob ? 
                            `${this._currentJob.title || this._currentJob.position || 'Untitled'} at ${this._currentJob.company || 'Unknown Company'}` : 
                            'No job selected'
                        }
                    </div>
                </div>
                <div class="selection-actions">
                    <button class="selection-btn" id="select-job" ${allJobs.length === 0 ? 'disabled' : ''}>
                        ${this._currentJob ? 'Change' : 'Select'} Job
                    </button>
                </div>
            </div>
            
            <div class="selection-item">
                <div class="selection-info">
                    <div class="label">Current Resume</div>
                    <div class="value ${!this._currentResume ? 'no-selection' : ''}">
                        ${this._currentResume ? 
                            `${this._currentResume.name || 'Untitled Resume'}${this._currentResume.data?.basics?.name ? ` (${this._currentResume.data.basics.name})` : ''}` : 
                            'No resume selected'
                        }
                    </div>
                </div>
                <div class="selection-actions">
                    <button class="selection-btn" id="select-resume" ${allResumes.length === 0 ? 'disabled' : ''}>
                        ${this._currentResume ? 'Change' : 'Select'} Resume
                    </button>
                </div>
            </div>
            
            ${allJobs.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create jobs in the Jobs section first</p>' : ''}
            ${allResumes.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create resumes in the Resumes section first</p>' : ''}
        `;
    }

    /**
     * Render requirements status
     */
    renderRequirements() {
        const hasJob = !!this._currentJob;
        const hasResume = !!this._currentResume;
        const hasJobDescription = hasJob && (this._currentJob.description || this._currentJob.jobDetails);
        const hasApiKey = this.hasValidApiKey();
        
        return `
            <div class="requirement-item">
                <div class="requirement-status ${hasJob ? 'valid' : 'invalid'}">
                    ${hasJob ? '✓' : '✗'}
                </div>
                Job selected
            </div>
            <div class="requirement-item">
                <div class="requirement-status ${hasJobDescription ? 'valid' : 'invalid'}">
                    ${hasJobDescription ? '✓' : '✗'}
                </div>
                Job description provided
            </div>
            <div class="requirement-item">
                <div class="requirement-status ${hasResume ? 'valid' : 'invalid'}">
                    ${hasResume ? '✓' : '✗'}
                </div>
                Resume selected
            </div>
            <div class="requirement-item">
                <div class="requirement-status ${hasApiKey ? 'valid' : 'invalid'}">
                    ${hasApiKey ? '✓' : '✗'}
                </div>
                AI API key configured
            </div>
        `;
    }

    /**
     * Render progress indicator
     */
    renderProgress() {
        return `
            <div class="progress">
                <div class="progress-message">${this._currentProgress}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        `;
    }

    /**
     * Render AI operation result
     */
    renderResult() {
        const result = this._lastResult;
        let content = '';
        
        if (result.type === 'tailor-resume') {
            const analysis = result.data.result.analysis;
            content = `
                <h4>✨ Resume Tailored Successfully</h4>
                <div class="result-summary">
                    <div class="result-stat">
                        <span class="stat-label">Changes Made:</span>
                        <span class="stat-value">${result.data.result.changes?.length || 0}</span>
                    </div>
                    ${analysis ? `
                        <div class="result-stat">
                            <span class="stat-label">Match Score:</span>
                            <span class="stat-value match-score-${this.getScoreClass(analysis.matchScore)}">${analysis.matchScore}%</span>
                        </div>
                    ` : ''}
                </div>
                ${analysis ? this.renderMatchAnalysisSummary(analysis) : ''}
                ${result.data.result.changes?.length > 0 ? `
                    <div class="changes-preview">
                        <h5>Key Changes:</h5>
                        <ul>
                            ${result.data.result.changes.slice(0, 3).map(change => `<li>${change}</li>`).join('')}
                            ${result.data.result.changes.length > 3 ? `<li><em>+${result.data.result.changes.length - 3} more changes</em></li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            `;
        } else if (result.type === 'cover-letter') {
            const analysis = result.data.result.analysis;
            content = `
                <h4>📝 Cover Letter Generated</h4>
                <div class="result-summary">
                    <div class="result-stat">
                        <span class="stat-label">Length:</span>
                        <span class="stat-value">${result.data.result.coverLetter?.length || 0} characters</span>
                    </div>
                    ${analysis ? `
                        <div class="result-stat">
                            <span class="stat-label">Match Score:</span>
                            <span class="stat-value match-score-${this.getScoreClass(analysis.matchScore)}">${analysis.matchScore}%</span>
                        </div>
                    ` : ''}
                </div>
                ${analysis ? this.renderMatchAnalysisSummary(analysis) : ''}
                ${result.data.result.keyPoints?.length > 0 ? `
                    <div class="key-points">
                        <h5>Key Selling Points:</h5>
                        <ul>
                            ${result.data.result.keyPoints.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        } else if (result.type === 'match-analysis') {
            const analysis = result.data.result.analysis;
            content = `
                <h4>🔍 Match Analysis Complete</h4>
                <div class="result-summary">
                    <div class="result-stat">
                        <span class="stat-label">Overall Score:</span>
                        <span class="stat-value match-score-${this.getScoreClass(analysis.overallScore)}">${analysis.overallScore}%</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">Skills Match:</span>
                        <span class="stat-value match-score-${this.getScoreClass(analysis.skillsMatch.score)}">${analysis.skillsMatch.score}%</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">Experience Match:</span>
                        <span class="stat-value match-score-${this.getScoreClass(analysis.experienceMatch.score)}">${analysis.experienceMatch.score}%</span>
                    </div>
                </div>
                ${this.renderDetailedAnalysis(analysis)}
            `;
        }
        
        return `
            <div class="result">
                ${content}
                <div class="result-actions">
                    <button class="result-btn" id="view-details">View Full Details</button>
                    <button class="result-btn" id="save-result">Save to History</button>
                    ${result.type === 'tailor-resume' ? '<button class="result-btn" id="apply-changes">Apply Changes</button>' : ''}
                    ${result.type === 'cover-letter' ? '<button class="result-btn" id="save-cover-letter">Save Cover Letter</button>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Setup component event listeners
     */
    setupEventListeners() {
        if (!this.shadowRoot) return;
        
        this.shadowRoot.addEventListener('click', (e) => {
            console.log('AIAssistantWorker: Click detected:', e.target);
            
            // Handle different types of clickable elements
            let target = null;
            
            if (e.target.tagName === 'BUTTON') {
                target = e.target;
            } else if (e.target.closest('button')) {
                target = e.target.closest('button');
            }
            
            if (!target) return;
            
            console.log('AIAssistantWorker: Button clicked:', target.id);
            
            switch (target.id) {
                case 'tailor-resume':
                    this.handleTailorResume();
                    break;
                case 'generate-cover-letter':
                    this.handleGenerateCoverLetter();
                    break;
                case 'analyze-match':
                    this.handleAnalyzeMatch();
                    break;
                case 'view-details':
                    this.handleViewDetails();
                    break;
                case 'save-result':
                    this.handleSaveResult();
                    break;
                case 'apply-changes':
                    this.handleApplyChanges();
                    break;
                case 'save-cover-letter':
                    this.handleSaveCoverLetter();
                    break;
                case 'select-job':
                    console.log('AIAssistantWorker: Opening job selection modal');
                    this.showJobSelectionModal();
                    break;
                case 'select-resume':
                    console.log('AIAssistantWorker: Opening resume selection modal');
                    this.showResumeSelectionModal();
                    break;
                case 'cancel-job-selection':
                    this.hideJobSelectionModal();
                    break;
                case 'cancel-resume-selection':
                    this.hideResumeSelectionModal();
                    break;
                default:
                    console.log('AIAssistantWorker: Unknown button clicked:', target.id);
            }
        });
        
        // Handle modal backdrop clicks
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('selection-modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    /**
     * Remove component event listeners
     */
    removeEventListeners() {
        // Shadow DOM listeners are automatically cleaned up
        // but we can do manual cleanup here if needed
    }

    // AI Operation Handlers

    /**
     * Handle resume tailoring
     */
    async handleTailorResume() {
        console.log('AIAssistantWorker handleTailorResume called');
        console.log('Can tailor resume:', this.canTailorResume());
        console.log('Current job:', this._currentJob);
        console.log('Current resume:', this._currentResume);
        
        if (!this.canTailorResume()) {
            console.log('Cannot tailor resume - requirements not met');
            return;
        }
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const providerList = this.getApiConfig();
            console.log('AIAssistantWorker - Provider list:', providerList);

            console.log('AIAssistantWorker - About to call aiService.tailorResume...');

            const resumeData = this._currentResume.content || this._currentResume.data;
            const jobDesc = this._currentJob.description || this._currentJob.jobDetails;

            console.log('AIAssistantWorker - Sending parameters:');
            console.log('  - resume:', !!resumeData);
            console.log('  - jobDescription:', !!jobDesc, jobDesc?.substring(0, 100) + '...');
            console.log('  - providerList length:', providerList.length);

            const result = await aiService.tailorResume({
                resume: resumeData,
                jobDescription: jobDesc,
                providerList,
                includeAnalysis: true,
                onProgress: this.handleProgress
            });
            
            console.log('AIAssistantWorker - Received result:', result);
            
            this._lastResult = { type: 'tailor-resume', data: result };

            // Persist the tailored resume as a new saved resume and associate with the job
            try {
                // Robustly extract the tailored resume from the AI response. Different AI shapes
                // may return the object under different keys or as a JSON string.
                let tailored = null;
                const payload = result?.result ?? result;

                if (payload && typeof payload === 'object') {
                    tailored = payload.tailoredResume || payload.tailored_resume || payload.tailored || null;
                    // Sometimes the assistant returns the tailored resume directly under 'result'
                    if (!tailored && payload.result && typeof payload.result === 'object') {
                        tailored = payload.result.tailoredResume || payload.result.tailored || null;
                    }
                }

                // If it's still a string, try to parse JSON
                if (!tailored && typeof payload === 'string') {
                    try {
                        const parsed = JSON.parse(payload);
                        tailored = parsed.tailoredResume || parsed;
                    } catch (e) {
                        // ignore parse error
                    }
                }

                if (!tailored) {
                    // As a last resort, try to parse JSON from any string fields
                    const maybeText = JSON.stringify(result);
                    try {
                        const parsed = JSON.parse(maybeText);
                        tailored = parsed?.tailoredResume || parsed;
                    } catch (e) {
                        // give up
                        tailored = null;
                    }
                }

                if (!tailored) throw new Error('AI response did not contain a tailored resume');

                const timestamp = new Date().toISOString();
                const newResume = {
                    id: 'resume_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    name: `${this._currentJob?.title || 'Tailored Resume'} - ${new Date().toLocaleDateString()}`,
                    content: tailored,
                    dateCreated: timestamp,
                    dateModified: timestamp
                };

                // Add to global store using helper functions
                try {
                    addResume(newResume);
                    console.log('AIAssistantWorker: Added tailored resume via store helper', newResume.id);
                } catch (e) {
                    // Fallback to direct state update
                    const currentRes = this.getGlobalState('resumes') || [];
                    this.updateGlobalState({ resumes: [...currentRes, newResume] }, 'ai-assistant-add-resume');
                }

                // Associate the new resume with the job if a job is selected
                if (this._currentJob && this._currentJob.id) {
                    try {
                        updateJob(this._currentJob.id, { resumeId: newResume.id, dateUpdated: timestamp });
                    } catch (e) {
                        this.updateGlobalState({ currentJob: { ...this._currentJob, resumeId: newResume.id } }, 'ai-assistant-associate-resume');
                    }
                }

                // Update the currentResume pointer
                try {
                    setCurrentResume(newResume);
                } catch (e) {
                    this.updateGlobalState({ currentResume: newResume }, 'ai-assistant-tailor');
                }

                // Log the AI operation using logs.js
                try {
                    const { logApiCall } = await import('../js/logs.js');
                    const usedProvider = result.usedProvider || result.provider || 'unknown';
                    const usedModel = result.usedModel || 'unknown';
                    logApiCall(usedProvider, 'tailor_resume', {
                        model: usedModel,
                        resume: !!this._currentResume,
                        jobDescriptionLength: (this._currentJob?.description || '').length || 0
                    }, result, null, { jobId: this._currentJob?.id, resumeId: newResume.id });
                } catch (logErr) {
                    console.warn('AIAssistantWorker: Failed to log API call', logErr);
                }

                // Update the currentResume pointer
                this.updateGlobalState({ currentResume: newResume }, 'ai-assistant-tailor');

            } catch (persistError) {
                console.error('AIAssistantWorker: Failed to persist tailored resume', persistError);
            }

            // Emit successful tailor event
            this.emitEvent('resume-tailored', {
                jobId: this._currentJob?.id,
                resumeId: this._currentResume?.id,
                changes: result.result.changes?.length || 0,
                matchScore: result.result.analysis?.matchScore
            });
            
        } catch (error) {
            console.error('AIAssistantWorker - Error in handleTailorResume:', error);
            this.handleError(error, 'Failed to tailor resume');
            this.showError(`Failed to tailor resume: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    /**
     * Handle cover letter generation
     */
    async handleGenerateCoverLetter() {
        if (!this.canGenerateCoverLetter()) return;
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const providerList = this.getApiConfig();

            const result = await aiService.generateCoverLetter({
                resume: this._currentResume.content || this._currentResume.data,
                jobDescription: this._currentJob.description || this._currentJob.jobDetails,
                jobInfo: {
                    title: this._currentJob.title,
                    company: this._currentJob.company,
                    location: this._currentJob.location
                },
                providerList,
                includeAnalysis: true,
                onProgress: this.handleProgress
            });
            
            this._lastResult = { type: 'cover-letter', data: result };

            // Persist the generated cover letter and log the API call
            try {
                const coverLetter = result.result.coverLetter;
                const usedProvider = result.usedProvider || result.provider || 'unknown';
                const usedModel = result.usedModel || 'unknown';
                const entry = {
                    id: 'cover_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
                    jobId: this._currentJob?.id,
                    resumeId: this._currentResume?.id,
                    content: coverLetter,
                    createdDate: new Date().toISOString(),
                    provider: usedProvider
                };

                const gs = window.globalStore;
                if (gs && typeof gs.setState === 'function') {
                    const existing = gs.getState('coverLetters') || [];
                    gs.setState({ coverLetters: [...existing, entry] }, 'ai-assistant-save-cover-letter');
                } else {
                    const existing = this.getGlobalState('coverLetters') || [];
                    this.updateGlobalState({ coverLetters: [...existing, entry] }, 'ai-assistant-save-cover-letter');
                }

                // log API call
                try {
                    const { logApiCall } = await import('../js/logs.js');
                    logApiCall(usedProvider, 'generate_cover_letter', { model: usedModel }, result, null, { jobId: this._currentJob?.id, resumeId: this._currentResume?.id });
                } catch (logErr) {
                    console.warn('AIAssistantWorker: Failed to log cover letter API call', logErr);
                }

            } catch (persistErr) {
                console.warn('AIAssistantWorker: Failed to persist cover letter', persistErr);
            }

            // Emit successful cover letter event
            this.emitEvent('cover-letter-generated', {
                jobId: this._currentJob?.id,
                resumeId: this._currentResume?.id,
                length: result.result.coverLetter?.length || 0,
                matchScore: result.result.analysis?.matchScore
            });
            
        } catch (error) {
            this.handleError(error, 'Failed to generate cover letter');
            this.showError(`Failed to generate cover letter: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    /**
     * Handle match analysis
     */
    async handleAnalyzeMatch() {
        if (!this.canAnalyzeMatch()) return;
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const providerList = this.getApiConfig();

            const result = await aiService.analyzeMatch({
                resume: this._currentResume.content || this._currentResume.data,
                jobDescription: this._currentJob.description || this._currentJob.jobDetails,
                providerList,
                onProgress: this.handleProgress
            });
            
            this._lastResult = { type: 'match-analysis', data: result };
            
            // Emit successful analysis event
            this.emitEvent('match-analyzed', {
                jobId: this._currentJob?.id,
                resumeId: this._currentResume?.id,
                overallScore: result.result.analysis?.overallScore,
                skillsScore: result.result.analysis?.skillsMatch?.score,
                experienceScore: result.result.analysis?.experienceMatch?.score
            });
            
        } catch (error) {
            this.handleError(error, 'Failed to analyze match');
            this.showError(`Failed to analyze match: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    /**
     * Handle view details
     */
    handleViewDetails() {
        if (this._lastResult) {
            console.log('AIAssistantWorker Result Details:', this._lastResult);
            // Emit event for external detail viewing
            this.emitEvent('view-details-requested', {
                result: this._lastResult
            });
        }
    }

    /**
     * Handle save result to history
     */
    handleSaveResult() {
        if (this._lastResult) {
            try {
                // Add to logs
                const logEntry = {
                    id: 'log_' + Date.now(),
                    type: 'ai_action',
                    action: this._lastResult.type,
                    timestamp: new Date().toISOString(),
                    details: {
                        jobId: this._currentJob?.id,
                        resumeId: this._currentResume?.id,
                        provider: this._lastResult.data.provider,
                        result: this._lastResult.data.result
                    }
                };
                
                const currentLogs = this.getGlobalState('logs') || [];
                this.updateGlobalState({
                    logs: [...currentLogs, logEntry]
                }, 'ai-assistant-save');
                
                this.showToast('Result saved to history', 'success');
                
                // Emit save event
                this.emitEvent('result-saved', {
                    logId: logEntry.id,
                    type: this._lastResult.type
                });
                
            } catch (error) {
                this.handleError(error, 'Failed to save result');
            }
        }
    }

    /**
     * Handle apply changes from resume tailoring
     */
    handleApplyChanges() {
        if (this._lastResult && this._lastResult.type === 'tailor-resume') {
            try {
                const tailoredResume = this._lastResult.data.result.tailoredResume;
                
                // Update the current resume with the tailored version
                this.updateGlobalState({
                    currentResume: {
                        ...this._currentResume,
                        data: tailoredResume,
                        lastModified: new Date().toISOString(),
                        tailoredFor: this._currentJob?.id
                    }
                }, 'ai-assistant-apply-changes');
                
                // Show success message
                this.showSuccess('Resume changes applied successfully!');
                
                // Clear the result since changes have been applied
                this._lastResult = null;
                this.render();
                
                // Emit apply event
                this.emitEvent('changes-applied', {
                    jobId: this._currentJob?.id,
                    resumeId: this._currentResume?.id
                });
                
            } catch (error) {
                this.handleError(error, 'Failed to apply changes');
            }
        }
    }

    /**
     * Handle save cover letter
     */
    handleSaveCoverLetter() {
        if (this._lastResult && this._lastResult.type === 'cover-letter') {
            try {
                const coverLetter = this._lastResult.data.result.coverLetter;
                
                // Create a new cover letter entry
                const coverLetterEntry = {
                    id: 'cover_' + Date.now(),
                    jobId: this._currentJob?.id,
                    resumeId: this._currentResume?.id,
                    content: coverLetter,
                    keyPoints: this._lastResult.data.result.keyPoints || [],
                    analysis: this._lastResult.data.result.analysis,
                    createdDate: new Date().toISOString(),
                    provider: this._lastResult.data.provider
                };
                
                // Add to cover letters in the store
                const currentCoverLetters = this.getGlobalState('coverLetters') || [];
                this.updateGlobalState({
                    coverLetters: [...currentCoverLetters, coverLetterEntry]
                }, 'ai-assistant-save-cover-letter');
                
                // Also associate with the current job
                if (this._currentJob) {
                    this.updateGlobalState({
                        currentJob: {
                            ...this._currentJob,
                            coverLetterId: coverLetterEntry.id
                        }
                    }, 'ai-assistant-associate-cover-letter');
                }
                
                this.showSuccess('Cover letter saved successfully!');
                
                // Emit save event
                this.emitEvent('cover-letter-saved', {
                    coverLetterId: coverLetterEntry.id,
                    jobId: this._currentJob?.id,
                    resumeId: this._currentResume?.id
                });
                
            } catch (error) {
                this.handleError(error, 'Failed to save cover letter');
            }
        }
    }

    /**
     * Handle progress updates during AI operations
     */
    handleProgress(message) {
        this._currentProgress = message;
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const existing = this.shadowRoot.querySelector('.error');
        if (existing) {
            existing.remove();
        }
        
        this.shadowRoot.querySelector('.ai-assistant').appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            padding: 15px 20px;
            border-radius: 6px;
            border: 1px solid #c3e6cb;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Capability Check Methods

    /**
     * Check if resume can be tailored
     */
    canTailorResume() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    /**
     * Check if cover letter can be generated
     */
    canGenerateCoverLetter() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    /**
     * Check if match can be analyzed
     */
    canAnalyzeMatch() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    /**
     * Check if valid API key is configured
     */
    hasValidApiKey() {
        try {
            this.getApiConfig();
            return true;
        } catch (error) {
            console.log('AIAssistantWorker hasValidApiKey - No valid API key:', error.message);
            return false;
        }
    }

    /**
     * Get API configuration - returns ordered list of providers to try
     * @returns {Array} Array of provider configs in priority order
     */
    getApiConfig() {
        const providerList = [];

        // Check localStorage first (legacy support)
        const apiKey = localStorage.getItem('api_key');
        const apiType = localStorage.getItem('api_type') || 'claude';

        console.log('AIAssistantWorker getApiConfig - localStorage API Key exists:', !!apiKey);
        console.log('AIAssistantWorker getApiConfig - localStorage API Type:', apiType);

        if (apiKey && apiKey.trim().length > 0) {
            console.log('AIAssistantWorker getApiConfig - Using localStorage config');
            const provider = apiType === 'chatgpt' ? 'openai' : apiType;
            const defaultModels = { claude: 'claude-3-5-sonnet-20241022', openai: 'gpt-4o', browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC' };

            // Try to get route from settings if available, fallback to 'auto'
            let route = 'auto';
            const settings = this.getGlobalState('settings');
            if (settings && settings.apiProviders && settings.apiProviders[provider]) {
                route = settings.apiProviders[provider].route || 'auto';
            }

            providerList.push({
                provider,
                apiKey: apiKey.trim(),
                model: defaultModels[provider] || 'gpt-4o',
                route: route
            });
            console.log(`AIAssistantWorker getApiConfig - Using route: ${route} for ${provider}`);
        }

        // Check newer settings structure
        const settings = this.getGlobalState('settings');
        if (settings && settings.apiProviders) {
            const providers = settings.apiProviders;
            const providerPriority = settings.preferences?.providerPriority || ['claude', 'openai', 'browser'];

            console.log('AIAssistantWorker getApiConfig - Provider priority:', providerPriority);
            console.log('AIAssistantWorker getApiConfig - Providers:', providers);

            // Build provider list in priority order
            for (const providerName of providerPriority) {
                const config = providers[providerName];

                // Skip if not configured, not enabled, or missing API key (browser provider doesn't need key)
                if (!config || !config.enabled) continue;
                if (providerName !== 'browser' && (!config.apiKey || config.apiKey.trim().length === 0)) continue;

                // Don't add duplicate if already in list from localStorage
                if (providerList.some(p => p.provider === providerName)) continue;

                const defaultModels = {
                    claude: 'claude-3-5-sonnet-20241022',
                    openai: 'gpt-4o',
                    browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
                };

                const providerConfig = {
                    provider: providerName,
                    apiKey: config.apiKey ? config.apiKey.trim() : '',
                    model: config.model || defaultModels[providerName] || 'gpt-4o',
                    route: config.route || 'auto'
                };
                providerList.push(providerConfig);

                console.log(`AIAssistantWorker getApiConfig - Added provider to list: ${providerName}, route: ${providerConfig.route}, model: ${providerConfig.model}`);
            }

            // Fallback: add any remaining enabled providers not in priority list
            for (const [providerName, config] of Object.entries(providers)) {
                if (!config || !config.enabled) continue;
                if (providerName !== 'browser' && (!config.apiKey || config.apiKey.trim().length === 0)) continue;
                if (providerList.some(p => p.provider === providerName)) continue;

                const defaultModels = {
                    claude: 'claude-3-5-sonnet-20241022',
                    openai: 'gpt-4o',
                    browser: 'Llama-3.1-8B-Instruct-q4f32_1-MLC'
                };

                const providerConfig = {
                    provider: providerName,
                    apiKey: config.apiKey ? config.apiKey.trim() : '',
                    model: config.model || defaultModels[providerName] || 'gpt-4o',
                    route: config.route || 'auto'
                };
                providerList.push(providerConfig);

                console.log(`AIAssistantWorker getApiConfig - Added fallback provider: ${providerName}, route: ${providerConfig.route}, model: ${providerConfig.model}`);
            }
        }

        if (providerList.length === 0) {
            console.log('AIAssistantWorker getApiConfig - No valid API providers found');
            throw new Error('No valid API providers configured. Please set your API keys in Settings.');
        }

        console.log('AIAssistantWorker getApiConfig - Final provider list:', providerList);
        return providerList;
    }

    /**
     * Get single API configuration (legacy support)
     * Returns the first provider from the list
     */
    getSingleApiConfig() {
        const providerList = this.getApiConfig();
        if (providerList.length === 0) {
            throw new Error('No valid API providers configured');
        }
        return providerList[0];
    }

    // Selection Modal Methods

    /**
     * Show job selection modal
     */
    showJobSelectionModal() {
        console.log('AIAssistantWorker showJobSelectionModal called');
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        const list = this.shadowRoot.getElementById('job-selection-list');
        
        console.log('Modal element:', modal);
        console.log('List element:', list);
        
        const jobs = this.getGlobalState('jobs') || [];
        console.log('Available jobs:', jobs);
        
        if (jobs.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No jobs available. Create jobs in the Jobs section first.</div>';
        } else {
            list.innerHTML = jobs.map(job => `
                <div class="selection-list-item ${this._currentJob?.id === job.id ? 'selected' : ''}" 
                     data-job-id="${job.id}">
                    <div class="title">${job.title || job.position || 'Untitled Job'}</div>
                    <div class="subtitle">${job.company || 'Unknown Company'}${job.location ? ` • ${job.location}` : ''}</div>
                </div>
            `).join('');
        }
        
        // Remove any existing event listeners to prevent duplicates
        const newList = list.cloneNode(true);
        list.parentNode.replaceChild(newList, list);
        
        // Add click handlers for job selection
        newList.addEventListener('click', (e) => {
            console.log('Job item clicked:', e.target);
            const item = e.target.closest('.selection-list-item');
            if (item) {
                const jobId = item.dataset.jobId;
                console.log('Selected job ID:', jobId);
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    console.log('Setting job in store:', job);
                    this.updateGlobalState({ currentJob: job }, 'ai-assistant-job-selection');
                    this.hideJobSelectionModal();
                    // Force immediate update
                    setTimeout(() => this.updateFromStore(), 50);
                }
            }
        });
        
        console.log('Showing job modal');
        modal.classList.add('show');
    }

    /**
     * Hide job selection modal
     */
    hideJobSelectionModal() {
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        modal.classList.remove('show');
    }

    /**
     * Show resume selection modal
     */
    showResumeSelectionModal() {
        console.log('AIAssistantWorker showResumeSelectionModal called');
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        const list = this.shadowRoot.getElementById('resume-selection-list');
        
        const resumes = this.getGlobalState('resumes') || [];
        console.log('Available resumes:', resumes);
        
        if (resumes.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resumes available. Create resumes in the Resumes section first.</div>';
        } else {
            list.innerHTML = resumes.map(resume => `
                <div class="selection-list-item ${this._currentResume?.id === resume.id ? 'selected' : ''}" 
                     data-resume-id="${resume.id}">
                    <div class="title">${resume.name || 'Untitled Resume'}</div>
                    <div class="subtitle">${resume.data?.basics?.name || 'No name set'}${resume.lastModified ? ` • Updated ${new Date(resume.lastModified).toLocaleDateString()}` : ''}</div>
                </div>
            `).join('');
        }
        
        // Remove any existing event listeners to prevent duplicates
        const newList = list.cloneNode(true);
        list.parentNode.replaceChild(newList, list);
        
        // Add click handlers for resume selection
        newList.addEventListener('click', (e) => {
            console.log('Resume item clicked:', e.target);
            const item = e.target.closest('.selection-list-item');
            if (item) {
                const resumeId = item.dataset.resumeId;
                console.log('Selected resume ID:', resumeId);
                const resume = resumes.find(r => r.id === resumeId);
                if (resume) {
                    console.log('Setting resume in store:', resume);
                    this.updateGlobalState({ currentResume: resume }, 'ai-assistant-resume-selection');
                    this.hideResumeSelectionModal();
                    // Force immediate update
                    setTimeout(() => this.updateFromStore(), 50);
                }
            }
        });
        
        console.log('Showing resume modal');
        modal.classList.add('show');
    }

    /**
     * Hide resume selection modal
     */
    hideResumeSelectionModal() {
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        modal.classList.remove('show');
    }

    // Analysis Helper Methods

    /**
     * Get score class for styling
     */
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

    /**
     * Render match analysis summary
     */
    renderMatchAnalysisSummary(analysis) {
        if (!analysis) return '';
        
        return `
            <div class="analysis-section">
                <h5>📊 Match Analysis Summary</h5>
                <div class="analysis-grid">
                    ${analysis.strengths?.length > 0 ? `
                        <div class="analysis-item">
                            <h6>💪 Key Strengths</h6>
                            <ul>
                                ${analysis.strengths.slice(0, 3).map(strength => `<li>${strength}</li>`).join('')}
                                ${analysis.strengths.length > 3 ? `<li><em>+${analysis.strengths.length - 3} more</em></li>` : ''}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${analysis.improvements?.length > 0 || analysis.missingSkills?.length > 0 ? `
                        <div class="analysis-item">
                            <h6>🎯 Areas for Improvement</h6>
                            <ul>
                                ${(analysis.improvements || []).slice(0, 2).map(improvement => `<li>${improvement}</li>`).join('')}
                                ${(analysis.missingSkills || []).slice(0, 2).map(skill => `<li>Missing: ${skill}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render detailed analysis
     */
    renderDetailedAnalysis(analysis) {
        if (!analysis) return '';
        
        return `
            <div class="analysis-section">
                <h5>📋 Detailed Analysis</h5>
                <div class="analysis-grid">
                    ${analysis.skillsMatch ? `
                        <div class="analysis-item">
                            <h6>🛠️ Skills Analysis</h6>
                            ${analysis.skillsMatch.matchedSkills?.length > 0 ? `
                                <p style="font-size: 12px; margin: 5px 0; color: #28a745;"><strong>Matched:</strong> ${analysis.skillsMatch.matchedSkills.slice(0, 3).join(', ')}</p>
                            ` : ''}
                            ${analysis.skillsMatch.missingSkills?.length > 0 ? `
                                <p style="font-size: 12px; margin: 5px 0; color: #dc3545;"><strong>Missing:</strong> ${analysis.skillsMatch.missingSkills.slice(0, 3).join(', ')}</p>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${analysis.experienceMatch ? `
                        <div class="analysis-item">
                            <h6>💼 Experience Analysis</h6>
                            ${analysis.experienceMatch.relevantExperience?.length > 0 ? `
                                <ul>
                                    ${analysis.experienceMatch.relevantExperience.slice(0, 2).map(exp => `<li>${exp}</li>`).join('')}
                                </ul>
                            ` : ''}
                            ${analysis.experienceMatch.gaps?.length > 0 ? `
                                <p style="font-size: 12px; margin: 5px 0; color: #ffc107;"><strong>Gaps:</strong> ${analysis.experienceMatch.gaps.slice(0, 2).join(', ')}</p>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${analysis.recommendations?.length > 0 ? `
                        <div class="analysis-item" style="grid-column: 1 / -1;">
                            <h6>💡 Recommendations</h6>
                            <ul>
                                ${analysis.recommendations.slice(0, 4).map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${analysis.concerns?.length > 0 ? `
                        <div class="analysis-item" style="grid-column: 1 / -1;">
                            <h6>⚠️ Potential Concerns</h6>
                            <ul>
                                ${analysis.concerns.slice(0, 3).map(concern => `<li>${concern}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get component styles
     */
    getStyles() {
        return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .ai-assistant {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                padding: 20px;
                margin: 20px 0;
            }
            
            .header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            
            .header h2 {
                margin: 0;
                color: #333;
                font-size: 18px;
            }
            
            .status-icon {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${this._isProcessing ? '#ff6b35' : aiService.isWorkerReady() ? '#4caf50' : '#f44336'};
            }
            
            .requirements {
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
            }
            
            .requirements h3 {
                margin: 0 0 10px 0;
                color: #007bff;
                font-size: 14px;
            }
            
            .selection-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 10px 0;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e0e0e0;
            }
            
            .selection-info {
                flex: 1;
            }
            
            .selection-info .label {
                font-weight: 600;
                color: #333;
                font-size: 14px;
            }
            
            .selection-info .value {
                color: #666;
                font-size: 12px;
                margin-top: 2px;
            }
            
            .selection-info .no-selection {
                color: #dc3545;
                font-style: italic;
            }
            
            .selection-actions {
                display: flex;
                gap: 8px;
            }
            
            .selection-btn {
                padding: 6px 12px;
                border: 1px solid #007bff;
                background: white;
                color: #007bff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .selection-btn:hover {
                background: #007bff;
                color: white;
            }
            
            .selection-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .requirement-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 8px 0;
                font-size: 14px;
            }
            
            .requirement-status {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
            }
            
            .requirement-status.valid {
                background: #4caf50;
            }
            
            .requirement-status.invalid {
                background: #f44336;
            }
            
            .actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .action-group {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .action-btn {
                flex: 1;
                min-width: 140px;
                padding: 12px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .action-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .action-btn.primary {
                background: #007bff;
                color: white;
            }
            
            .action-btn.primary:hover:not(:disabled) {
                background: #0056b3;
            }
            
            .action-btn.secondary {
                background: #6c757d;
                color: white;
            }
            
            .action-btn.secondary:hover:not(:disabled) {
                background: #545b62;
            }
            
            .action-btn.success {
                background: #28a745;
                color: white;
            }
            
            .action-btn.success:hover:not(:disabled) {
                background: #1e7e34;
            }
            
            .progress {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 15px;
                margin: 15px 0;
                border-left: 4px solid #ff6b35;
            }
            
            .progress-message {
                font-size: 14px;
                color: #333;
                margin-bottom: 10px;
            }
            
            .progress-bar {
                width: 100%;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: #ff6b35;
                border-radius: 2px;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .result {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 6px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .result h4 {
                margin: 0 0 10px 0;
                color: #155724;
            }
            
            .result-summary {
                display: flex;
                gap: 20px;
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .result-stat {
                text-align: center;
                flex: 1;
            }
            
            .stat-label {
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .stat-value {
                display: block;
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }
            
            .match-score-excellent { color: #28a745; }
            .match-score-good { color: #17a2b8; }
            .match-score-fair { color: #ffc107; }
            .match-score-poor { color: #dc3545; }
            
            .result-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .result-btn {
                padding: 8px 12px;
                border: 1px solid #28a745;
                background: white;
                color: #28a745;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .result-btn:hover {
                background: #28a745;
                color: white;
            }
            
            .changes-preview, .key-points, .analysis-section {
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .changes-preview h5, .key-points h5, .analysis-section h5 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 14px;
            }
            
            .changes-preview ul, .key-points ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .changes-preview li, .key-points li {
                margin: 5px 0;
                font-size: 13px;
                line-height: 1.4;
            }
            
            .analysis-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 10px 0;
            }
            
            .analysis-item {
                background: white;
                padding: 10px;
                border-radius: 4px;
                border-left: 3px solid #007bff;
            }
            
            .analysis-item h6 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 13px;
            }
            
            .analysis-item ul {
                margin: 0;
                padding-left: 15px;
                font-size: 12px;
            }
            
            .analysis-item li {
                margin: 3px 0;
                line-height: 1.3;
            }
            
            .error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 6px;
                padding: 15px;
                margin: 15px 0;
                color: #721c24;
            }
            
            .selection-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            
            .selection-modal.show {
                display: flex;
            }
            
            .selection-modal-content {
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .selection-modal h4 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .selection-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
            }
            
            .selection-list-item {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .selection-list-item:hover {
                background: #f8f9fa;
            }
            
            .selection-list-item:last-child {
                border-bottom: none;
            }
            
            .selection-list-item.selected {
                background: #e7f3ff;
                border-left: 3px solid #007bff;
            }
            
            .selection-list-item .title {
                font-weight: 600;
                color: #333;
            }
            
            .selection-list-item .subtitle {
                color: #666;
                font-size: 12px;
                margin-top: 2px;
            }
            
            .btn {
                padding: 8px 16px;
                border: 1px solid #6c757d;
                background: white;
                color: #6c757d;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .btn:hover {
                background: #6c757d;
                color: white;
            }
            
            .hidden {
                display: none;
            }
        `;
    }
}

// Register the migrated component
customElements.define('ai-assistant-worker', AIAssistantWorker);

export { AIAssistantWorker };
