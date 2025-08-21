// AI Assistant Component using Web Worker
// This replaces the existing ai-assistant.js with worker-based implementation

import aiService from '../js/ai-service.js';
import { getState, setState, subscribe } from '../js/store.js';

class AIAssistantWorker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this._currentJob = null;
        this._currentResume = null;
        this._isProcessing = false;
        this._currentProgress = '';
        this._lastResult = null;
        
        // Bind methods
        this.handleProgress = this.handleProgress.bind(this);
    }

    connectedCallback() {
        console.log('AI Assistant component connected'); // Debug log
        
        // Wait for store to be ready before initializing
        this.waitForStore();
    }

    async waitForStore() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkStore = () => {
            const state = getState();
            if (state && typeof state === 'object') {
                console.log('AI Assistant: Store is ready');
                this.initializeComponent();
                return true;
            }
            return false;
        };
        
        // Check immediately
        if (checkStore()) return;
        
        // Keep checking every 100ms
        const interval = setInterval(() => {
            attempts++;
            if (checkStore()) {
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                console.warn('AI Assistant: Store not ready after maximum attempts, proceeding anyway');
                clearInterval(interval);
                this.initializeComponent();
            }
        }, 100);
    }

    initializeComponent() {
        this.render();
        this.setupEventListeners();
        this.subscribeToStore();
        this.updateFromStore();
    }

    subscribeToStore() {
        // Subscribe to store changes
        this._storeUnsubscribe = subscribe((event) => {
            console.log('AI Assistant: Store change event:', event); // Debug log
            // Listen for any state change that might affect currentJob, currentResume, or settings
            if (event.source.includes('job') || event.source.includes('resume') || 
                event.source.includes('Job') || event.source.includes('Resume') ||
                event.source.includes('settings') || event.source.includes('Settings')) {
                console.log('AI Assistant: Relevant state change detected, updating...'); // Debug log
                this.updateFromStore();
            }
        });
    }

    updateFromStore() {
        const state = getState();
        console.log('AI Assistant updating from store. State:', state); // Debug log
        this._currentJob = state?.currentJob || null;
        this._currentResume = state?.currentResume || null;
        console.log('AI Assistant current job:', this._currentJob); // Debug log
        console.log('AI Assistant current resume:', this._currentResume); // Debug log
        this.render();
    }

    disconnectedCallback() {
        if (this._storeUnsubscribe) {
            this._storeUnsubscribe();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
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
                
                .requirements h3 {
                    margin: 0 0 10px 0;
                    color: #007bff;
                    font-size: 14px;
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
                
                .match-score-excellent {
                    color: #28a745;
                }
                
                .match-score-good {
                    color: #17a2b8;
                }
                
                .match-score-fair {
                    color: #ffc107;
                }
                
                .match-score-poor {
                    color: #dc3545;
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
                
                .spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .hidden {
                    display: none;
                }
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

    renderCurrentSelection() {
        const allJobs = getState('jobs') || [];
        const allResumes = getState('resumes') || [];
        
        console.log('AI Assistant renderCurrentSelection - Available jobs:', allJobs); // Debug log
        console.log('AI Assistant renderCurrentSelection - Available resumes:', allResumes); // Debug log
        
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

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            console.log('Click detected:', e.target); // Debug log
            
            // Handle different types of clickable elements
            let target = null;
            
            if (e.target.tagName === 'BUTTON') {
                target = e.target;
            } else if (e.target.closest('button')) {
                target = e.target.closest('button');
            }
            
            if (!target) return;
            
            console.log('Button clicked:', target.id); // Debug log
            
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
                    console.log('Opening job selection modal'); // Debug log
                    this.showJobSelectionModal();
                    break;
                case 'select-resume':
                    console.log('Opening resume selection modal'); // Debug log
                    this.showResumeSelectionModal();
                    break;
                case 'cancel-job-selection':
                    this.hideJobSelectionModal();
                    break;
                case 'cancel-resume-selection':
                    this.hideResumeSelectionModal();
                    break;
                default:
                    console.log('Unknown button clicked:', target.id); // Debug log
            }
        });
        
        // Handle modal backdrop clicks
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('selection-modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    async handleTailorResume() {
        console.log('AI Assistant handleTailorResume called'); // Debug log
        console.log('Can tailor resume:', this.canTailorResume()); // Debug log
        console.log('Current job:', this._currentJob); // Debug log
        console.log('Current resume:', this._currentResume); // Debug log
        
        if (!this.canTailorResume()) {
            console.log('Cannot tailor resume - requirements not met'); // Debug log
            return;
        }
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const { provider, apiKey } = this.getApiConfig();
            console.log('AI Assistant - Using provider:', provider); // Debug log
            console.log('AI Assistant - API key length:', apiKey?.length); // Debug log
            
            console.log('AI Assistant - About to call aiService.tailorResume...'); // Debug log
            
            const resumeData = this._currentResume.content || this._currentResume.data;
            const jobDesc = this._currentJob.description || this._currentJob.jobDetails;
            
            console.log('AI Assistant - Sending parameters:');
            console.log('  - resume:', !!resumeData, resumeData);
            console.log('  - jobDescription:', !!jobDesc, jobDesc?.substring(0, 100) + '...');
            console.log('  - provider:', provider);
            console.log('  - apiKey:', !!apiKey, apiKey?.substring(0, 10) + '...');
            
            const result = await aiService.tailorResume({
                resume: resumeData,
                jobDescription: jobDesc,
                provider,
                apiKey,
                includeAnalysis: true,
                onProgress: this.handleProgress
            });
            
            console.log('AI Assistant - Received result:', result); // Debug log
            
            this._lastResult = { type: 'tailor-resume', data: result };
            
            // Update the resume in the store
            setState({
                currentResume: {
                    ...this._currentResume,
                    data: result.result.tailoredResume,
                    lastModified: new Date().toISOString()
                }
            }, 'ai-assistant-tailor');
            
        } catch (error) {
            console.error('AI Assistant - Error in handleTailorResume:', error); // Debug log
            this.showError(`Failed to tailor resume: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    async handleGenerateCoverLetter() {
        if (!this.canGenerateCoverLetter()) return;
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const { provider, apiKey } = this.getApiConfig();
            
            const result = await aiService.generateCoverLetter({
                resume: this._currentResume.content || this._currentResume.data,
                jobDescription: this._currentJob.description || this._currentJob.jobDetails,
                jobInfo: {
                    title: this._currentJob.title,
                    company: this._currentJob.company,
                    location: this._currentJob.location
                },
                provider,
                apiKey,
                includeAnalysis: true,
                onProgress: this.handleProgress
            });
            
            this._lastResult = { type: 'cover-letter', data: result };
            
            // TODO: Save cover letter to store
            
        } catch (error) {
            this.showError(`Failed to generate cover letter: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    async handleAnalyzeMatch() {
        if (!this.canAnalyzeMatch()) return;
        
        this._isProcessing = true;
        this._lastResult = null;
        this.render();
        
        try {
            const { provider, apiKey } = this.getApiConfig();
            
            const result = await aiService.analyzeMatch({
                resume: this._currentResume.content || this._currentResume.data,
                jobDescription: this._currentJob.description || this._currentJob.jobDetails,
                provider,
                apiKey,
                onProgress: this.handleProgress
            });
            
            this._lastResult = { type: 'match-analysis', data: result };
            
        } catch (error) {
            this.showError(`Failed to analyze match: ${error.message}`);
        } finally {
            this._isProcessing = false;
            this.render();
        }
    }

    handleViewDetails() {
        if (this._lastResult) {
            console.log('AI Result Details:', this._lastResult);
            // TODO: Open detailed view modal
        }
    }

    handleSaveResult() {
        if (this._lastResult) {
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
            
            setState({
                logs: [...getState('logs'), logEntry]
            }, 'ai-assistant-save');
        }
    }

    handleProgress(message) {
        this._currentProgress = message;
        this.render();
    }

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

    canTailorResume() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    canGenerateCoverLetter() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    canAnalyzeMatch() {
        return this._currentJob && (this._currentJob.description || this._currentJob.jobDetails) && 
               this._currentResume && this.hasValidApiKey() && 
               !this._isProcessing;
    }

    hasValidApiKey() {
        // Check localStorage for API keys (current implementation in jobs.html)
        const apiKey = localStorage.getItem('api_key');
        const apiType = localStorage.getItem('api_type');
        
        console.log('AI Assistant hasValidApiKey - API Key exists:', !!apiKey); // Debug log
        console.log('AI Assistant hasValidApiKey - API Type:', apiType); // Debug log
        
        const hasKey = apiKey && apiKey.trim().length > 0;
        
        // Also check newer settings structure for future compatibility
        const settings = getState('settings');
        if (settings && settings.apiProviders) {
            const providers = settings.apiProviders;
            const claudeValid = providers.claude && providers.claude.apiKey && providers.claude.apiKey.trim().length > 0;
            const openaiValid = providers.openai && providers.openai.apiKey && providers.openai.apiKey.trim().length > 0;
            
            console.log('AI Assistant hasValidApiKey - Settings structure found - Claude valid:', claudeValid); // Debug log
            console.log('AI Assistant hasValidApiKey - Settings structure found - OpenAI valid:', openaiValid); // Debug log
            
            return hasKey || claudeValid || openaiValid;
        }
        
        console.log('AI Assistant hasValidApiKey - Final result:', hasKey); // Debug log
        return hasKey;
    }

    getApiConfig() {
        // Check localStorage first (current implementation in jobs.html)
        const apiKey = localStorage.getItem('api_key');
        const apiType = localStorage.getItem('api_type') || 'claude';
        
        console.log('AI Assistant getApiConfig - localStorage API Key exists:', !!apiKey); // Debug log
        console.log('AI Assistant getApiConfig - localStorage API Type:', apiType); // Debug log
        
        if (apiKey && apiKey.trim().length > 0) {
            console.log('AI Assistant getApiConfig - Using localStorage config'); // Debug log
            return { 
                provider: apiType === 'chatgpt' ? 'openai' : apiType,
                apiKey: apiKey.trim() 
            };
        }
        
        // Check newer settings structure for future compatibility
        const settings = getState('settings');
        if (settings && settings.apiProviders) {
            const providers = settings.apiProviders;
            const defaultProvider = settings.preferences?.defaultProvider || 'claude';
            
            console.log('AI Assistant getApiConfig - Default provider:', defaultProvider); // Debug log
            console.log('AI Assistant getApiConfig - Providers:', providers); // Debug log
            
            // First try the default provider if it's enabled and has a key
            if (providers[defaultProvider] && 
                providers[defaultProvider].enabled && 
                providers[defaultProvider].apiKey && 
                providers[defaultProvider].apiKey.trim().length > 0) {
                console.log(`AI Assistant getApiConfig - Using default provider: ${defaultProvider}`); // Debug log
                return { 
                    provider: defaultProvider, 
                    apiKey: providers[defaultProvider].apiKey.trim() 
                };
            }
            
            // Fallback: try any enabled provider with a key
            for (const [providerName, config] of Object.entries(providers)) {
                if (config && config.enabled && config.apiKey && config.apiKey.trim().length > 0) {
                    console.log(`AI Assistant getApiConfig - Using fallback provider: ${providerName}`); // Debug log
                    return { 
                        provider: providerName, 
                        apiKey: config.apiKey.trim() 
                    };
                }
            }
        }
        
        console.log('AI Assistant getApiConfig - No valid API key found'); // Debug log
        throw new Error('No valid API key configured. Please set your API key in Settings.');
    }

    // Helper methods for enhanced match analysis display

    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

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

    handleApplyChanges() {
        if (this._lastResult && this._lastResult.type === 'tailor-resume') {
            const tailoredResume = this._lastResult.data.result.tailoredResume;
            
            // Update the current resume with the tailored version
            setState({
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
        }
    }

    handleSaveCoverLetter() {
        if (this._lastResult && this._lastResult.type === 'cover-letter') {
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
            
            // Add to cover letters in the store (extend the global store to handle cover letters)
            const currentState = getState();
            const coverLetters = currentState.coverLetters || [];
            setState({
                coverLetters: [...coverLetters, coverLetterEntry]
            }, 'ai-assistant-save-cover-letter');
            
            // Also associate with the current job
            if (this._currentJob) {
                setState({
                    currentJob: {
                        ...this._currentJob,
                        coverLetterId: coverLetterEntry.id
                    }
                }, 'ai-assistant-associate-cover-letter');
            }
            
            this.showSuccess('Cover letter saved successfully!');
        }
    }

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

    // Selection modal methods
    showJobSelectionModal() {
        console.log('showJobSelectionModal called'); // Debug log
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        const list = this.shadowRoot.getElementById('job-selection-list');
        
        console.log('Modal element:', modal); // Debug log
        console.log('List element:', list); // Debug log
        
        const jobs = getState('jobs') || [];
        console.log('Available jobs:', jobs); // Debug log
        
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
            console.log('Job item clicked:', e.target); // Debug log
            const item = e.target.closest('.selection-list-item');
            if (item) {
                const jobId = item.dataset.jobId;
                console.log('Selected job ID:', jobId); // Debug log
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    console.log('Setting job in store:', job); // Debug log
                    setState({ currentJob: job }, 'ai-assistant-job-selection');
                    this.hideJobSelectionModal();
                    // Force immediate update
                    setTimeout(() => this.updateFromStore(), 50);
                }
            }
        });
        
        console.log('Showing modal'); // Debug log
        modal.classList.add('show');
    }

    hideJobSelectionModal() {
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        modal.classList.remove('show');
    }

    showResumeSelectionModal() {
        console.log('showResumeSelectionModal called'); // Debug log
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        const list = this.shadowRoot.getElementById('resume-selection-list');
        
        const resumes = getState('resumes') || [];
        console.log('Available resumes:', resumes); // Debug log
        
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
            console.log('Resume item clicked:', e.target); // Debug log
            const item = e.target.closest('.selection-list-item');
            if (item) {
                const resumeId = item.dataset.resumeId;
                console.log('Selected resume ID:', resumeId); // Debug log
                const resume = resumes.find(r => r.id === resumeId);
                if (resume) {
                    console.log('Setting resume in store:', resume); // Debug log
                    setState({ currentResume: resume }, 'ai-assistant-resume-selection');
                    this.hideResumeSelectionModal();
                    // Force immediate update
                    setTimeout(() => this.updateFromStore(), 50);
                }
            }
        });
        
        console.log('Showing resume modal'); // Debug log
        modal.classList.add('show');
    }

    hideResumeSelectionModal() {
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        modal.classList.remove('show');
    }
}

customElements.define('ai-assistant-worker', AIAssistantWorker);

export { AIAssistantWorker };