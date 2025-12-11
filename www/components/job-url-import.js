// job-url-import.js - URL-based job import component
// Allows users to import jobs from LinkedIn, Indeed, and Glassdoor URLs

/**
 * Job URL Import Component
 * Web component for importing jobs from job board URLs
 */
class JobUrlImport extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // State
        this.url = '';
        this.extractedJob = null;
        this.isExtracting = false;
        this.error = null;
        this.platform = null;

        // Service instances
        this.extractor = null;
    }

    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    connectedCallback() {
        this.render();
        this.initializeServices();
        this.attachEventListeners();
    }

    /**
     * Initialize services
     */
    initializeServices() {
        this.extractor = new JobExtractorService();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const shadow = this.shadowRoot;

        // URL input
        const urlInput = shadow.querySelector('#job-url');
        if (urlInput) {
            urlInput.addEventListener('input', (e) => {
                this.url = e.target.value;
                this.error = null;
                this.detectPlatform();
            });

            urlInput.addEventListener('paste', () => {
                setTimeout(() => this.detectPlatform(), 100);
            });
        }

        // Import button
        const importBtn = shadow.querySelector('#import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.extractJob());
        }

        // Cancel button
        const cancelBtn = shadow.querySelector('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }

        // Save button
        const saveBtn = shadow.querySelector('#save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveJob());
        }

        // Edit button
        const editBtn = shadow.querySelector('#edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.editJob());
        }

        // Try another URL button
        const retryBtn = shadow.querySelector('#retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.reset());
        }
    }

    /**
     * Detect platform from URL
     */
    detectPlatform() {
        try {
            this.platform = this.extractor.detectPlatform(this.url);
            this.render();
        } catch (error) {
            this.platform = null;
        }
    }

    /**
     * Extract job from URL
     */
    async extractJob() {
        if (!this.url || !this.url.trim()) {
            this.error = 'Please enter a job URL';
            this.render();
            return;
        }

        this.isExtracting = true;
        this.error = null;
        this.render();

        try {
            // Show loading overlay
            const overlay = this.shadowRoot.querySelector('#loading-overlay');
            if (overlay) overlay.style.display = 'flex';

            // Extract job details
            const result = await this.extractor.extractFromUrl(this.url);

            if (result.success) {
                this.extractedJob = result.job;
                this.platform = result.platform;

                // Dispatch success event
                this.dispatchEvent(new CustomEvent('job-extracted', {
                    bubbles: true,
                    composed: true,
                    detail: { job: this.extractedJob, platform: this.platform }
                }));

            } else {
                this.error = result.error || 'Failed to extract job details. The URL may not be supported, or the page structure may have changed.';
            }

        } catch (error) {
            console.error('Extraction error:', error);
            this.error = error.message || 'An unexpected error occurred. Please try again or enter job details manually.';
        } finally {
            this.isExtracting = false;
            this.render();
        }
    }

    /**
     * Save extracted job
     */
    saveJob() {
        if (!this.extractedJob) return;

        // Dispatch save event
        this.dispatchEvent(new CustomEvent('job-save', {
            bubbles: true,
            composed: true,
            detail: { job: this.extractedJob, platform: this.platform }
        }));

        // Reset component
        this.reset();
    }

    /**
     * Edit extracted job
     */
    editJob() {
        if (!this.extractedJob) return;

        // Dispatch edit event (parent will open job form with pre-filled data)
        this.dispatchEvent(new CustomEvent('job-edit', {
            bubbles: true,
            composed: true,
            detail: { job: this.extractedJob, platform: this.platform }
        }));

        // Reset component
        this.reset();
    }

    /**
     * Cancel import
     */
    cancel() {
        this.dispatchEvent(new CustomEvent('import-cancel', {
            bubbles: true,
            composed: true
        }));

        this.reset();
    }

    /**
     * Reset component
     */
    reset() {
        this.url = '';
        this.extractedJob = null;
        this.error = null;
        this.platform = null;
        this.isExtracting = false;
        this.render();
    }

    /**
     * Get platform info
     */
    getPlatformInfo(platform) {
        const platforms = {
            'linkedin': {
                name: 'LinkedIn',
                icon: '💼',
                color: '#0077B5'
            },
            'indeed': {
                name: 'Indeed',
                icon: '🔍',
                color: '#2557A7'
            },
            'glassdoor': {
                name: 'Glassdoor',
                icon: '🏢',
                color: '#0CAA41'
            },
            'generic': {
                name: 'Generic Job Site',
                icon: '🌐',
                color: '#6c757d'
            }
        };

        return platforms[platform] || platforms['generic'];
    }

    /**
     * Render component
     */
    render() {
        const platformInfo = this.platform ? this.getPlatformInfo(this.platform) : null;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                .import-container {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .header {
                    margin-bottom: 20px;
                }

                .header h2 {
                    font-size: 1.25rem;
                    color: #2c3e50;
                    margin-bottom: 8px;
                }

                .header p {
                    font-size: 0.9rem;
                    color: #6c757d;
                }

                .supported-platforms {
                    display: flex;
                    gap: 12px;
                    margin-top: 12px;
                }

                .platform-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    color: #495057;
                }

                .url-input-section {
                    margin-bottom: 20px;
                }

                .input-group {
                    position: relative;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }

                label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #495057;
                    margin-bottom: 8px;
                }

                input[type="url"] {
                    flex: 1;
                    padding: 12px 16px;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                input[type="url"]:focus {
                    outline: none;
                    border-color: #3498db;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                }

                input[type="url"].has-error {
                    border-color: #e74c3c;
                }

                .platform-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: ${platformInfo?.color || '#f8f9fa'};
                    color: white;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .platform-indicator.generic {
                    background: #6c757d;
                }

                button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background: #3498db;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #2980b9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
                }

                .btn-secondary {
                    background: #e9ecef;
                    color: #495057;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #dee2e6;
                }

                .btn-success {
                    background: #27ae60;
                    color: white;
                }

                .btn-success:hover:not(:disabled) {
                    background: #229954;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
                }

                .error-message {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px 16px;
                    background: #fee;
                    border: 1px solid #fcc;
                    border-radius: 8px;
                    color: #c33;
                    font-size: 0.9rem;
                    margin-top: 12px;
                }

                .error-icon {
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }

                .loading-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.95);
                    z-index: 1000;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 20px;
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(52, 152, 219, 0.2);
                    border-top-color: #3498db;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .loading-text {
                    font-size: 1.1rem;
                    color: #2c3e50;
                    font-weight: 500;
                }

                .loading-subtext {
                    font-size: 0.9rem;
                    color: #6c757d;
                }

                .preview-section {
                    margin-top: 24px;
                    padding-top: 24px;
                    border-top: 2px solid #e9ecef;
                }

                .preview-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .preview-header h3 {
                    font-size: 1.1rem;
                    color: #2c3e50;
                }

                .preview-badge {
                    padding: 4px 12px;
                    background: #d4edda;
                    color: #155724;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .preview-content {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .preview-field {
                    margin-bottom: 16px;
                }

                .preview-field:last-child {
                    margin-bottom: 0;
                }

                .preview-field label {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #6c757d;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }

                .preview-field-value {
                    font-size: 0.95rem;
                    color: #2c3e50;
                    line-height: 1.5;
                }

                .preview-field-value.multiline {
                    white-space: pre-wrap;
                    max-height: 200px;
                    overflow-y: auto;
                }

                .preview-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .help-text {
                    font-size: 0.85rem;
                    color: #6c757d;
                    margin-top: 8px;
                    font-style: italic;
                }

                @media (max-width: 768px) {
                    .import-container {
                        padding: 16px;
                    }

                    .input-group {
                        flex-direction: column;
                    }

                    .platform-indicator {
                        width: 100%;
                        justify-content: center;
                    }

                    .supported-platforms {
                        flex-wrap: wrap;
                    }

                    .preview-actions {
                        flex-direction: column-reverse;
                    }

                    button {
                        width: 100%;
                    }
                }
            </style>

            <div class="import-container">
                ${this.extractedJob ? this.renderPreview() : this.renderInput()}
            </div>

            <div id="loading-overlay" class="loading-overlay">
                <div class="spinner"></div>
                <div class="loading-text">Extracting job details...</div>
                <div class="loading-subtext">This may take a few seconds</div>
            </div>
        `;

        // Re-attach event listeners after render
        setTimeout(() => this.attachEventListeners(), 0);
    }

    /**
     * Render URL input form
     */
    renderInput() {
        const platformInfo = this.platform ? this.getPlatformInfo(this.platform) : null;

        return `
            <div class="header">
                <h2>📥 Import Job from URL</h2>
                <p>Paste a job URL from LinkedIn, Indeed, or Glassdoor to automatically extract job details</p>

                <div class="supported-platforms">
                    <span class="platform-badge">💼 LinkedIn</span>
                    <span class="platform-badge">🔍 Indeed</span>
                    <span class="platform-badge">🏢 Glassdoor</span>
                </div>
            </div>

            <div class="url-input-section">
                <label for="job-url">Job URL</label>
                <div class="input-group">
                    <input
                        type="url"
                        id="job-url"
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        value="${this.escapeHtml(this.url)}"
                        ${this.isExtracting ? 'disabled' : ''}
                        class="${this.error ? 'has-error' : ''}"
                    />

                    ${platformInfo ? `
                        <div class="platform-indicator ${this.platform}">
                            <span>${platformInfo.icon}</span>
                            <span>${platformInfo.name}</span>
                        </div>
                    ` : ''}

                    <button
                        id="import-btn"
                        class="btn-primary"
                        ${!this.url || this.isExtracting ? 'disabled' : ''}
                    >
                        ${this.isExtracting ? 'Importing...' : 'Import Job'}
                    </button>
                </div>

                ${this.error ? `
                    <div class="error-message">
                        <span class="error-icon">⚠️</span>
                        <div>
                            <strong>Import Failed</strong><br>
                            ${this.escapeHtml(this.error)}
                        </div>
                    </div>
                ` : ''}

                <p class="help-text">
                    💡 Tip: Open the job posting in your browser, copy the URL from the address bar, and paste it here
                </p>
            </div>
        `;
    }

    /**
     * Render job preview
     */
    renderPreview() {
        const job = this.extractedJob;
        const platformInfo = this.getPlatformInfo(this.platform);

        return `
            <div class="preview-section">
                <div class="preview-header">
                    <h3>✅ Job Details Extracted</h3>
                    <span class="preview-badge">From ${platformInfo.name}</span>
                </div>

                <div class="preview-content">
                    ${job.title ? `
                        <div class="preview-field">
                            <label>Job Title</label>
                            <div class="preview-field-value">${this.escapeHtml(job.title)}</div>
                        </div>
                    ` : ''}

                    ${job.company ? `
                        <div class="preview-field">
                            <label>Company</label>
                            <div class="preview-field-value">${this.escapeHtml(job.company)}</div>
                        </div>
                    ` : ''}

                    ${job.location ? `
                        <div class="preview-field">
                            <label>Location</label>
                            <div class="preview-field-value">${this.escapeHtml(job.location)}</div>
                        </div>
                    ` : ''}

                    ${job.salary ? `
                        <div class="preview-field">
                            <label>Salary</label>
                            <div class="preview-field-value">${this.escapeHtml(job.salary)}</div>
                        </div>
                    ` : ''}

                    ${job.employmentType ? `
                        <div class="preview-field">
                            <label>Employment Type</label>
                            <div class="preview-field-value">${this.escapeHtml(job.employmentType)}</div>
                        </div>
                    ` : ''}

                    ${job.posted ? `
                        <div class="preview-field">
                            <label>Posted Date</label>
                            <div class="preview-field-value">${this.escapeHtml(job.posted)}</div>
                        </div>
                    ` : ''}

                    ${job.description ? `
                        <div class="preview-field">
                            <label>Description (Preview)</label>
                            <div class="preview-field-value multiline">${this.escapeHtml(job.description.substring(0, 500))}${job.description.length > 500 ? '...' : ''}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="preview-actions">
                    <button id="retry-btn" class="btn-secondary">
                        Try Another URL
                    </button>
                    <button id="edit-btn" class="btn-secondary">
                        ✏️ Edit Before Saving
                    </button>
                    <button id="save-btn" class="btn-success">
                        💾 Save Job
                    </button>
                </div>

                <p class="help-text">
                    Review the extracted details. Click "Edit Before Saving" to modify any fields, or "Save Job" to add it directly.
                </p>
            </div>
        `;
    }
}

// Register custom element
customElements.define('job-url-import', JobUrlImport);

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobUrlImport;
}

// Make available globally
window.JobUrlImport = JobUrlImport;
