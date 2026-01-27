// AI Assistant Worker Component - Migrated to ComponentBase
// Manages AI-powered resume tailoring, cover letter generation, and job matching

import { ComponentBase } from '../js/component-base.js';
import aiService from '../js/ai-service.js';
import { addResume, setCurrentResume, updateJob } from '../js/store.js';

// Import extracted services
import { getApiConfig, hasValidApiKey } from '../js/ai-config-provider.js';
import { formatTime, escapeHtml } from '../js/ai-analysis-formatter.js';
import * as UIHelpers from '../js/ai-ui-helpers.js';
import * as AIOperations from '../js/ai-operation-handlers.js';

class AIAssistantWorker extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component-specific properties
        this._currentJob = null;
        this._currentResume = null;
        this._isProcessing = false;
        this._currentProgress = ''; // For compatibility - kept for simple display
        this._progressLog = []; // Array of {timestamp, message} objects
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
        const detail = event.detail || {};

        console.log('AIAssistantWorker: Store change received', { source, hasCurrentJob: !!detail.currentJob, hasCurrentResume: !!detail.currentResume });

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
            console.log('AIAssistantWorker: Updating from store', {
                hasState: !!state,
                hasCurrentJob: !!state?.currentJob,
                hasCurrentResume: !!state?.currentResume,
                isReady: this.isReady()
            });

            const previousJob = this._currentJob;
            const previousResume = this._currentResume;

            this._currentJob = state?.currentJob || null;
            this._currentResume = state?.currentResume || null;

            // Log the actual selections
            if (this._currentJob) {
                console.log('AIAssistantWorker: Current job set -', this._currentJob.title || this._currentJob.position || 'Untitled');
            } else {
                console.log('AIAssistantWorker: No current job selected');
            }

            if (this._currentResume) {
                console.log('AIAssistantWorker: Current resume set -', this._currentResume.name || 'Untitled');
            } else {
                console.log('AIAssistantWorker: No current resume selected');
            }

            // Only re-render if job or resume changed
            if (this._currentJob !== previousJob || this._currentResume !== previousResume) {
                console.log('AIAssistantWorker: Selection changed, re-rendering');
                if (this.isReady()) {
                    this.render();
                } else {
                    console.warn('AIAssistantWorker: Component not ready for render, deferring...');
                    // Defer render until component is ready
                    setTimeout(() => {
                        if (this.isReady()) {
                            this.render();
                        }
                    }, 100);
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

                <!-- AI Activity Log -->
                ${this.renderProgressLog()}

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

        return UIHelpers.renderCurrentSelection(this._currentJob, this._currentResume, allJobs, allResumes);
    }

    /**
     * Render requirements status
     */
    renderRequirements() {
        const hasApiKey = this.hasValidApiKey();
        return UIHelpers.renderRequirements(this._currentJob, this._currentResume, hasApiKey);
    }

    /**
     * Render progress indicator
     */
    renderProgress() {
        return UIHelpers.renderProgress(this._currentProgress);
    }

    /**
     * Render progress log (interactive console)
     */
    renderProgressLog() {
        return UIHelpers.renderProgressLog(this._progressLog);
    }


    /**
     * Render AI operation result
     */
    renderResult() {
        return UIHelpers.renderResult(this._lastResult);
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
                case 'clear-log':
                    this.clearProgressLog();
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
        if (!this.canTailorResume()) {
            return;
        }

        this._isProcessing = true;
        this._lastResult = null;
        this.render();

        try {
            const providerList = getApiConfig(this.getGlobalState());
            const resumeData = this._currentResume.content || this._currentResume.data;
            const jobDesc = this._currentJob.description || this._currentJob.jobDetails;

            const result = await AIOperations.executeTailorResume({
                resume: resumeData,
                jobDescription: jobDesc,
                providerList,
                onProgress: this.handleProgress,
                currentJob: this._currentJob,
                currentResume: this._currentResume
            });

            this._lastResult = { type: 'tailor-resume', data: result };

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
            UIHelpers.showToast(`Failed to tailor resume: ${error.message}`, 'error');
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
            const providerList = getApiConfig(this.getGlobalState());

            const result = await AIOperations.executeGenerateCoverLetter({
                resume: this._currentResume.content || this._currentResume.data,
                jobDescription: this._currentJob.description || this._currentJob.jobDetails,
                jobInfo: {
                    title: this._currentJob.title,
                    company: this._currentJob.company,
                    location: this._currentJob.location
                },
                providerList,
                onProgress: this.handleProgress,
                currentJob: this._currentJob,
                currentResume: this._currentResume
            });

            this._lastResult = { type: 'cover-letter', data: result };

            // Emit successful cover letter event
            this.emitEvent('cover-letter-generated', {
                jobId: this._currentJob?.id,
                resumeId: this._currentResume?.id,
                length: result.result.coverLetter?.length || 0,
                matchScore: result.result.analysis?.matchScore
            });

        } catch (error) {
            this.handleError(error, 'Failed to generate cover letter');
            UIHelpers.showToast(`Failed to generate cover letter: ${error.message}`, 'error');
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
            const providerList = getApiConfig(this.getGlobalState());

            const result = await AIOperations.executeAnalyzeMatch({
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
            UIHelpers.showToast(`Failed to analyze match: ${error.message}`, 'error');
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
                const logEntry = AIOperations.saveResultToHistory(
                    this._lastResult,
                    this._currentJob,
                    this._currentResume,
                    this.updateGlobalState.bind(this)
                );

                UIHelpers.showToast('Result saved to history', 'success');

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
                AIOperations.applyTailoredChanges(
                    this._lastResult,
                    this._currentResume,
                    this._currentJob,
                    this.updateGlobalState.bind(this)
                );

                // Show success message
                UIHelpers.showToast('Resume changes applied successfully!', 'success');

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

                UIHelpers.showToast('Cover letter saved successfully!', 'success');

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

        // Add to progress log with timestamp
        this._progressLog.push({
            timestamp: new Date(),
            message: message
        });

        // Keep log size reasonable (max 100 entries)
        if (this._progressLog.length > 100) {
            this._progressLog.shift();
        }

        if (this.isReady()) {
            this.render();

            // Auto-scroll to bottom of log after render
            setTimeout(() => {
                const logContainer = this.shadowRoot.querySelector('.progress-log-messages');
                UIHelpers.scrollLogToBottom(logContainer);
            }, 0);
        }
    }

    /**
     * Clear progress log
     */
    clearProgressLog() {
        this._progressLog = [];
        if (this.isReady()) {
            this.render();
        }
    }

    // Capability Check Methods

    /**
     * Check if resume can be tailored
     */
    canTailorResume() {
        return AIOperations.canTailorResume(this._currentJob, this._currentResume, this.hasValidApiKey(), this._isProcessing);
    }

    /**
     * Check if cover letter can be generated
     */
    canGenerateCoverLetter() {
        return AIOperations.canGenerateCoverLetter(this._currentJob, this._currentResume, this.hasValidApiKey(), this._isProcessing);
    }

    /**
     * Check if match can be analyzed
     */
    canAnalyzeMatch() {
        return AIOperations.canAnalyzeMatch(this._currentJob, this._currentResume, this.hasValidApiKey(), this._isProcessing);
    }

    /**
     * Check if valid API key is configured
     */
    hasValidApiKey() {
        return hasValidApiKey(this.getGlobalState());
    }


    // Selection Modal Methods

    /**
     * Show job selection modal
     */
    showJobSelectionModal() {
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        const list = this.shadowRoot.getElementById('job-selection-list');
        const jobs = this.getGlobalState('jobs') || [];

        UIHelpers.populateJobSelectionModal(
            list,
            jobs,
            this._currentJob?.id,
            (job) => {
                this.updateGlobalState({ currentJob: job }, 'ai-assistant-job-selection');
                this.hideJobSelectionModal();
                setTimeout(() => this.updateFromStore(), 50);
            }
        );

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
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        const list = this.shadowRoot.getElementById('resume-selection-list');
        const resumes = this.getGlobalState('resumes') || [];

        UIHelpers.populateResumeSelectionModal(
            list,
            resumes,
            this._currentResume?.id,
            (resume) => {
                this.updateGlobalState({ currentResume: resume }, 'ai-assistant-resume-selection');
                this.hideResumeSelectionModal();
                setTimeout(() => this.updateFromStore(), 50);
            }
        );

        modal.classList.add('show');
    }

    /**
     * Hide resume selection modal
     */
    hideResumeSelectionModal() {
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        modal.classList.remove('show');
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

            /* Progress Log Styles */
            .progress-log {
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                margin: 20px 0;
                overflow: hidden;
            }

            .progress-log.empty {
                border-style: dashed;
            }

            .progress-log-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: #e9ecef;
                border-bottom: 1px solid #dee2e6;
            }

            .progress-log-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #495057;
            }

            .progress-log-controls {
                display: flex;
                gap: 8px;
            }

            .btn-small {
                padding: 4px 10px;
                font-size: 12px;
                border: 1px solid #6c757d;
                background: white;
                color: #6c757d;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .btn-small:hover {
                background: #dc3545;
                border-color: #dc3545;
                color: white;
            }

            .btn-small i {
                font-size: 10px;
            }

            .progress-log-messages {
                max-height: 300px;
                min-height: 120px;
                overflow-y: auto;
                padding: 12px 16px;
                background: #ffffff;
                font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.6;
            }

            .progress-log-messages::-webkit-scrollbar {
                width: 8px;
            }

            .progress-log-messages::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .progress-log-messages::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
            }

            .progress-log-messages::-webkit-scrollbar-thumb:hover {
                background: #555;
            }

            .log-entry {
                display: flex;
                gap: 12px;
                padding: 4px 0;
                border-bottom: 1px solid #f0f0f0;
            }

            .log-entry:last-child {
                border-bottom: none;
            }

            .log-time {
                color: #6c757d;
                font-weight: 600;
                white-space: nowrap;
                flex-shrink: 0;
                min-width: 115px;
            }

            .log-message {
                color: #212529;
                flex: 1;
                word-wrap: break-word;
            }

            .log-empty {
                color: #6c757d;
                font-style: italic;
                text-align: center;
                padding: 40px 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
        `;
    }
}

// Register the migrated component
customElements.define('ai-assistant-worker', AIAssistantWorker);

export { AIAssistantWorker };
