// AI Assistant Component - Fixed Version
// This version includes comprehensive debugging and improved state management

import aiService from '../js/ai-service.js';
import { getState, setState, subscribe } from '../js/store.js';

class AIAssistantFixed extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this._currentJob = null;
        this._currentResume = null;
        this._isProcessing = false;
        this._currentProgress = '';
        this._lastResult = null;
        this._storeReady = false;
        
        // Bind methods
        this.handleProgress = this.handleProgress.bind(this);
        this.handleStoreReady = this.handleStoreReady.bind(this);
        
        console.log('AI Assistant Fixed: constructor called');
    }

    connectedCallback() {
        console.log('AI Assistant Fixed: connected to DOM');
        
        // Wait for global store to be ready
        this.waitForStore();
    }

    async waitForStore() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkStore = () => {
            const state = getState();
            if (state && typeof state === 'object') {
                console.log('AI Assistant Fixed: Store is ready with state:', state);
                this._storeReady = true;
                this.handleStoreReady();
                return true;
            }
            return false;
        };
        
        // Check immediately
        if (checkStore()) return;
        
        // Keep checking every 100ms
        const interval = setInterval(() => {
            attempts++;
            console.log(`AI Assistant Fixed: Waiting for store (attempt ${attempts}/${maxAttempts})`);
            
            if (checkStore()) {
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                console.error('AI Assistant Fixed: Store not ready after maximum attempts');
                clearInterval(interval);
                // Proceed anyway with null state
                this.handleStoreReady();
            }
        }, 100);
    }

    handleStoreReady() {
        console.log('AI Assistant Fixed: Store ready, initializing component');
        this.render();
        this.setupEventListeners();
        this.subscribeToStore();
        this.updateFromStore();
    }

    subscribeToStore() {
        console.log('AI Assistant Fixed: Subscribing to store changes');
        this._storeUnsubscribe = subscribe((event) => {
            console.log('AI Assistant Fixed: Store change event:', event);
            // Listen for any state change that might affect currentJob or currentResume
            if (event.source.includes('job') || event.source.includes('resume') || 
                event.source.includes('Job') || event.source.includes('Resume')) {
                console.log('AI Assistant Fixed: Relevant state change detected, updating...');
                this.updateFromStore();
            }
        });
    }

    updateFromStore() {
        const state = getState();
        console.log('AI Assistant Fixed: Updating from store, full state:', state);
        
        this._currentJob = state?.currentJob || null;
        this._currentResume = state?.currentResume || null;
        
        console.log('AI Assistant Fixed: Current job set to:', this._currentJob);
        console.log('AI Assistant Fixed: Current resume set to:', this._currentResume);
        
        // Re-render to update the UI
        this.render();
    }

    disconnectedCallback() {
        if (this._storeUnsubscribe) {
            this._storeUnsubscribe();
        }
    }

    render() {
        console.log('AI Assistant Fixed: Rendering component');
        
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
                    background: ${this._isProcessing ? '#ff6b35' : this._storeReady ? '#4caf50' : '#f44336'};
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
                
                .selection-btn:hover:not(:disabled) {
                    background: #007bff;
                    color: white;
                }
                
                .selection-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    border-color: #ccc;
                    color: #999;
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
                    background: #6c757d;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-left: 10px;
                }
                
                .btn:hover {
                    background: #545b62;
                }
                
                .debug-info {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 10px;
                    margin: 10px 0;
                    font-family: monospace;
                    font-size: 11px;
                    max-height: 200px;
                    overflow-y: auto;
                }
            </style>
            
            <div class="ai-assistant">
                <div class="header">
                    <div class="status-icon"></div>
                    <h2>AI Assistant (Fixed)</h2>
                    <span style="font-size: 12px; color: #666; margin-left: auto;">
                        ${this._isProcessing ? 'Processing...' : this._storeReady ? 'Ready' : 'Initializing...'}
                    </span>
                </div>
                
                <div class="requirements">
                    <h3>Current Selection</h3>
                    ${this.renderCurrentSelection()}
                </div>
                
                <div class="debug-info">
                    <strong>Debug Info:</strong><br>
                    Store Ready: ${this._storeReady}<br>
                    Current Job: ${this._currentJob ? `${this._currentJob.title || this._currentJob.position || 'Untitled'} at ${this._currentJob.company}` : 'None'}<br>
                    Current Resume: ${this._currentResume ? this._currentResume.name : 'None'}<br>
                    Available Jobs: ${this.getAvailableJobs().length}<br>
                    Available Resumes: ${this.getAvailableResumes().length}
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
                        <button class="btn" id="cancel-job-selection">Cancel</button>
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
                        <button class="btn" id="cancel-resume-selection">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    getAvailableJobs() {
        const state = getState();
        return state?.jobs || [];
    }

    getAvailableResumes() {
        const state = getState();
        return state?.resumes || [];
    }

    renderCurrentSelection() {
        const allJobs = this.getAvailableJobs();
        const allResumes = this.getAvailableResumes();
        
        console.log('AI Assistant Fixed: Rendering selection. Jobs:', allJobs.length, 'Resumes:', allResumes.length);
        
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
                        ${this._currentJob ? 'Change' : 'Select'} Job (${allJobs.length} available)
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
                        ${this._currentResume ? 'Change' : 'Select'} Resume (${allResumes.length} available)
                    </button>
                </div>
            </div>
            
            ${allJobs.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create jobs first to enable selection</p>' : ''}
            ${allResumes.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create resumes first to enable selection</p>' : ''}
        `;
    }

    setupEventListeners() {
        console.log('AI Assistant Fixed: Setting up event listeners');
        
        this.shadowRoot.addEventListener('click', (e) => {
            console.log('AI Assistant Fixed: Click detected on:', e.target);
            
            // Find the button that was clicked
            let target = null;
            if (e.target.tagName === 'BUTTON') {
                target = e.target;
            } else if (e.target.closest('button')) {
                target = e.target.closest('button');
            }
            
            if (!target) {
                console.log('AI Assistant Fixed: No button found in click target');
                return;
            }
            
            console.log('AI Assistant Fixed: Button clicked:', target.id, 'disabled:', target.disabled);
            
            // Don't handle disabled buttons
            if (target.disabled) {
                console.log('AI Assistant Fixed: Button is disabled, ignoring click');
                return;
            }
            
            switch (target.id) {
                case 'select-job':
                    console.log('AI Assistant Fixed: Opening job selection modal');
                    this.showJobSelectionModal();
                    break;
                case 'select-resume':
                    console.log('AI Assistant Fixed: Opening resume selection modal');
                    this.showResumeSelectionModal();
                    break;
                case 'cancel-job-selection':
                    this.hideJobSelectionModal();
                    break;
                case 'cancel-resume-selection':
                    this.hideResumeSelectionModal();
                    break;
                default:
                    console.log('AI Assistant Fixed: Unknown button clicked:', target.id);
            }
        });
        
        // Handle modal backdrop clicks
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('selection-modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    showJobSelectionModal() {
        console.log('AI Assistant Fixed: showJobSelectionModal called');
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        const list = this.shadowRoot.getElementById('job-selection-list');
        
        const jobs = this.getAvailableJobs();
        console.log('AI Assistant Fixed: Available jobs for modal:', jobs);
        
        if (jobs.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No jobs available. Create jobs first.</div>';
        } else {
            list.innerHTML = jobs.map(job => `
                <div class="selection-list-item ${this._currentJob?.id === job.id ? 'selected' : ''}" 
                     data-job-id="${job.id}">
                    <div class="title">${job.title || job.position || 'Untitled Job'}</div>
                    <div class="subtitle">${job.company || 'Unknown Company'}${job.location ? ` • ${job.location}` : ''}</div>
                </div>
            `).join('');
            
            // Add click handlers for job selection
            list.addEventListener('click', (e) => {
                console.log('AI Assistant Fixed: Job item clicked:', e.target);
                const item = e.target.closest('.selection-list-item');
                if (item) {
                    const jobId = item.dataset.jobId;
                    console.log('AI Assistant Fixed: Selected job ID:', jobId);
                    const job = jobs.find(j => j.id === jobId);
                    if (job) {
                        console.log('AI Assistant Fixed: Setting job in store:', job);
                        setState({ currentJob: job }, 'ai-assistant-fixed-job-selection');
                        this.hideJobSelectionModal();
                        // Force immediate update
                        setTimeout(() => this.updateFromStore(), 50);
                    }
                }
            });
        }
        
        console.log('AI Assistant Fixed: Showing job modal');
        modal.classList.add('show');
    }

    hideJobSelectionModal() {
        const modal = this.shadowRoot.getElementById('job-selection-modal');
        modal.classList.remove('show');
    }

    showResumeSelectionModal() {
        console.log('AI Assistant Fixed: showResumeSelectionModal called');
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        const list = this.shadowRoot.getElementById('resume-selection-list');
        
        const resumes = this.getAvailableResumes();
        console.log('AI Assistant Fixed: Available resumes for modal:', resumes);
        
        if (resumes.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resumes available. Create resumes first.</div>';
        } else {
            list.innerHTML = resumes.map(resume => `
                <div class="selection-list-item ${this._currentResume?.id === resume.id ? 'selected' : ''}" 
                     data-resume-id="${resume.id}">
                    <div class="title">${resume.name || 'Untitled Resume'}</div>
                    <div class="subtitle">${resume.data?.basics?.name || 'No name set'}${resume.lastModified ? ` • Updated ${new Date(resume.lastModified).toLocaleDateString()}` : ''}</div>
                </div>
            `).join('');
            
            // Add click handlers for resume selection
            list.addEventListener('click', (e) => {
                console.log('AI Assistant Fixed: Resume item clicked:', e.target);
                const item = e.target.closest('.selection-list-item');
                if (item) {
                    const resumeId = item.dataset.resumeId;
                    console.log('AI Assistant Fixed: Selected resume ID:', resumeId);
                    const resume = resumes.find(r => r.id === resumeId);
                    if (resume) {
                        console.log('AI Assistant Fixed: Setting resume in store:', resume);
                        setState({ currentResume: resume }, 'ai-assistant-fixed-resume-selection');
                        this.hideResumeSelectionModal();
                        // Force immediate update
                        setTimeout(() => this.updateFromStore(), 50);
                    }
                }
            });
        }
        
        console.log('AI Assistant Fixed: Showing resume modal');
        modal.classList.add('show');
    }

    hideResumeSelectionModal() {
        const modal = this.shadowRoot.getElementById('resume-selection-modal');
        modal.classList.remove('show');
    }

    handleProgress(message) {
        this._currentProgress = message;
        this.render();
    }
}

customElements.define('ai-assistant-fixed', AIAssistantFixed);

export { AIAssistantFixed };