// job-search.js - Job Search Component
// Search and import jobs from various feed sources

import { ComponentBase } from '../js/component-base.js';
import { getFeedManager, convertToInternalJob } from '../js/job-feeds.js';
import { createHNJobsAdapter } from '../js/feed-adapters/hn-jobs.js';

class JobSearch extends ComponentBase {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        // Component state
        this._feedManager = null;
        this._selectedFeed = 'hn-jobs';
        this._searchParams = {};
        this._results = [];
        this._selectedJobs = new Set();
        this._isLoading = false;
        this._error = null;
        this._showResumeDialog = false;
        this._extractingKeywords = false;

        // Bind methods
        this.handleFeedChange = this.handleFeedChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleToggleJob = this.handleToggleJob.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.handleImportSelected = this.handleImportSelected.bind(this);
        this.handleClearResults = this.handleClearResults.bind(this);
        this.handleOpenResumeDialog = this.handleOpenResumeDialog.bind(this);
        this.handleCloseResumeDialog = this.handleCloseResumeDialog.bind(this);
        this.handleExtractKeywords = this.handleExtractKeywords.bind(this);
    }

    async onInitialize() {
        console.log('JobSearch: Initializing Job Search component');

        // Initialize feed manager
        this._feedManager = getFeedManager();

        // Register HN Jobs adapter
        const hnAdapter = createHNJobsAdapter();
        this._feedManager.registerAdapter('hn-jobs', hnAdapter);

        console.log('JobSearch: Registered adapters:', this._feedManager.getAllAdapters());

        // Render component (this will also setup event listeners)
        this.render();
    }

    onCleanup() {
        // Clear any pending operations
        this._selectedJobs.clear();
        this._results = [];
    }

    setupEventListeners() {
        console.log('JobSearch: Setting up event listeners');
        const root = this.shadowRoot;

        // Feed selector
        const feedSelect = root.querySelector('#feed-selector');
        if (feedSelect) {
            feedSelect.addEventListener('change', this.handleFeedChange);
        }

        // Search button
        const searchBtn = root.querySelector('#search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', this.handleSearch);
        }

        // Clear results button
        const clearBtn = root.querySelector('#clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.handleClearResults);
        }

        // Select all checkbox
        const selectAllCheckbox = root.querySelector('#select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', this.handleSelectAll);
        }

        // Import button
        const importBtn = root.querySelector('#import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', this.handleImportSelected);
        }

        // Resume keyword extraction button
        const extractBtn = root.querySelector('#extract-keywords-btn');
        if (extractBtn) {
            extractBtn.addEventListener('click', this.handleOpenResumeDialog);
        }

        // Resume dialog buttons
        const closeDialogBtn = root.querySelector('#close-resume-dialog');
        if (closeDialogBtn) {
            console.log('JobSearch: Attaching close dialog listener');
            closeDialogBtn.addEventListener('click', this.handleCloseResumeDialog);
        }

        const extractDialogBtn = root.querySelector('#extract-dialog-btn');
        if (extractDialogBtn) {
            console.log('JobSearch: Attaching extract dialog listener');
            extractDialogBtn.addEventListener('click', this.handleExtractKeywords);
        } else {
            console.log('JobSearch: Extract dialog button not found in DOM');
        }

        // Job checkboxes (delegated)
        const resultsContainer = root.querySelector('#results-container');
        if (resultsContainer) {
            resultsContainer.addEventListener('change', (e) => {
                if (e.target.matches('.job-checkbox')) {
                    this.handleToggleJob(e);
                }
            });
        }
    }

    handleFeedChange(e) {
        this._selectedFeed = e.target.value;
        this.render();
    }

    async handleSearch() {
        const root = this.shadowRoot;

        // Collect search parameters
        this._searchParams = {
            keywords: root.querySelector('#keywords')?.value || '',
            location: root.querySelector('#location')?.value || '',
            limit: parseInt(root.querySelector('#limit')?.value || '50', 10)
        };

        console.log('JobSearch: Searching with params:', this._searchParams);

        // Set loading state
        this._isLoading = true;
        this._error = null;
        this._results = [];
        this._selectedJobs.clear();
        this.render();

        try {
            // Fetch jobs
            const result = await this._feedManager.fetchJobs(this._selectedFeed, this._searchParams);

            if (result.success) {
                this._results = result.data;
                console.log(`JobSearch: Found ${this._results.length} jobs`);

                if (this._appManager?.showToast) {
                    this._appManager.showToast(
                        `Found ${this._results.length} jobs${result.cached ? ' (cached)' : ''}`,
                        'success'
                    );
                }
            } else {
                this._error = result.error;
                console.error('JobSearch: Search failed:', result.error);

                if (this._appManager?.showToast) {
                    this._appManager.showToast(`Search failed: ${result.error}`, 'error');
                }
            }

        } catch (error) {
            this._error = error.message;
            console.error('JobSearch: Unexpected error:', error);

            if (this._appManager?.showToast) {
                this._appManager.showToast('Search failed: ' + error.message, 'error');
            }
        }

        // Clear loading state
        this._isLoading = false;
        this.render();
    }

    handleToggleJob(e) {
        const jobId = e.target.dataset.jobId;

        if (e.target.checked) {
            this._selectedJobs.add(jobId);
        } else {
            this._selectedJobs.delete(jobId);
        }

        this.updateImportButton();
    }

    handleSelectAll(e) {
        const checked = e.target.checked;

        if (checked) {
            this._results.forEach(job => this._selectedJobs.add(job.id));
        } else {
            this._selectedJobs.clear();
        }

        this.render();
    }

    handleClearResults() {
        this._results = [];
        this._selectedJobs.clear();
        this._error = null;
        this.render();
    }

    handleOpenResumeDialog() {
        console.log('JobSearch: Opening resume dialog');
        this._showResumeDialog = true;
        this.render();
    }

    handleCloseResumeDialog() {
        console.log('JobSearch: Closing resume dialog');
        this._showResumeDialog = false;
        this.render();
    }

    async handleExtractKeywords() {
        console.log('JobSearch: handleExtractKeywords called');

        const root = this.shadowRoot;
        const resumeSelect = root.querySelector('#resume-select');

        console.log('JobSearch: Resume select element:', resumeSelect);
        console.log('JobSearch: Selected resume ID:', resumeSelect?.value);

        if (!resumeSelect || !resumeSelect.value) {
            if (this._appManager?.showToast) {
                this._appManager.showToast('Please select a resume', 'error');
            }
            return;
        }

        const resumeId = resumeSelect.value;

        // Get resume data from app manager
        const resumes = this._appManager?.data?.resumes || [];
        const resume = resumes.find(r => r.id === resumeId);

        if (!resume) {
            if (this._appManager?.showToast) {
                this._appManager.showToast('Resume not found', 'error');
            }
            return;
        }

        // Check if AI is configured
        const apiKeys = this.getApiKeys();
        if (!apiKeys || !apiKeys.key || !apiKeys.type) {
            if (this._appManager?.showToast) {
                this._appManager.showToast('Please configure your API key in Settings first', 'error');
            }
            return;
        }

        // Set loading state
        this._extractingKeywords = true;
        this.render();

        try {
            // Build prompt for keyword extraction
            const prompt = this.buildKeywordExtractionPrompt(resume);

            // Call AI API directly (similar to import-export-manager.js)
            const aiResult = await this.callAIForKeywords(prompt, apiKeys);

            if (aiResult.success) {
                const keywords = aiResult.keywords;

                // Update search fields
                this._searchParams = {
                    keywords: keywords.skills.join(' '),
                    location: keywords.location || '',
                    limit: 50
                };

                // Close dialog
                this._showResumeDialog = false;

                // Show success message
                if (this._appManager?.showToast) {
                    this._appManager.showToast(
                        `Extracted keywords from resume: ${keywords.skills.slice(0, 5).join(', ')}...`,
                        'success'
                    );
                }

                // Re-render with updated search params
                this.render();

            } else {
                throw new Error(aiResult.error || 'Failed to extract keywords');
            }

        } catch (error) {
            console.error('JobSearch: Keyword extraction failed:', error);

            if (this._appManager?.showToast) {
                this._appManager.showToast('Failed to extract keywords: ' + error.message, 'error');
            }
        }

        // Clear loading state
        this._extractingKeywords = false;
        this.render();
    }

    buildKeywordExtractionPrompt(resume) {
        const resumeText = JSON.stringify(resume, null, 2);

        return `Analyze this resume and extract relevant job search keywords.

Resume:
${resumeText}

Extract and return ONLY a JSON object with this exact format:
{
  "skills": ["keyword1", "keyword2", "keyword3"],
  "jobTitles": ["title1", "title2"],
  "location": "preferred location or empty string"
}

Focus on:
1. Technical skills and technologies
2. Job titles and roles
3. Location preferences (if mentioned)

Return 5-10 most relevant keywords for job searching. Be specific and use terms that would appear in job postings.`;
    }

    async callAIForKeywords(prompt, apiKeys) {
        const { type, key } = apiKeys;

        try {
            if (type === 'claude') {
                return await this.callClaudeAPI(prompt, key);
            } else if (type === 'chatgpt') {
                return await this.callOpenAIAPI(prompt, key);
            } else {
                throw new Error('Unsupported AI type: ' + type);
            }
        } catch (error) {
            console.error('JobSearch: AI API call failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async callClaudeAPI(prompt, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content[0].text;

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const keywords = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            keywords
        };
    }

    getApiKeys() {
        try {
            const apiKeysJson = localStorage.getItem('resumeApiKeys');
            if (!apiKeysJson) return null;

            const apiKeys = JSON.parse(apiKeysJson);
            return {
                type: apiKeys.type,
                key: apiKeys.key
            };
        } catch (error) {
            console.error('JobSearch: Failed to load API keys:', error);
            return null;
        }
    }

    async callOpenAIAPI(prompt, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const keywords = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            keywords
        };
    }

    async handleImportSelected() {
        if (this._selectedJobs.size === 0) {
            return;
        }

        const jobsToImport = this._results.filter(job => this._selectedJobs.has(job.id));

        console.log('JobSearch: Importing', jobsToImport.length, 'jobs');

        try {
            // Convert to internal job format
            const internalJobs = jobsToImport.map(job => convertToInternalJob(job));

            // Get existing jobs from app manager
            const appData = this._appManager?.data;
            if (!appData) {
                throw new Error('App data not available');
            }

            // Get existing jobs as array
            const existingJobsArray = Array.isArray(appData.jobs) ? appData.jobs : [];
            const existingJobIds = new Set(existingJobsArray.map(j => j.id));

            // Add new jobs (avoid duplicates)
            let imported = 0;
            internalJobs.forEach(job => {
                if (!existingJobIds.has(job.id)) {
                    existingJobsArray.push(job);
                    imported++;
                }
            });

            // Save to storage
            appData.jobs = existingJobsArray;
            this._appManager.saveData();

            // Update global state
            this.updateGlobalState({
                jobs: existingJobsArray
            }, 'job-search-import');

            // Show success message
            if (this._appManager?.showToast) {
                this._appManager.showToast(
                    `Successfully imported ${imported} new job${imported !== 1 ? 's' : ''}`,
                    'success'
                );
            }

            // Clear selection
            this._selectedJobs.clear();
            this.render();

        } catch (error) {
            console.error('JobSearch: Import failed:', error);

            if (this._appManager?.showToast) {
                this._appManager.showToast('Import failed: ' + error.message, 'error');
            }
        }
    }

    updateImportButton() {
        const root = this.shadowRoot;
        const importBtn = root.querySelector('#import-btn');
        if (importBtn) {
            importBtn.disabled = this._selectedJobs.size === 0;
            importBtn.textContent = this._selectedJobs.size > 0
                ? `Import ${this._selectedJobs.size} Selected`
                : 'Import Selected';
        }
    }

    render() {
        // Don't render if feed manager is not initialized yet
        if (!this._feedManager) {
            console.log('JobSearch: Skipping render - feed manager not initialized');
            return;
        }

        const adapters = this._feedManager.getAllAdapters() || [];
        const selectedAdapter = this._feedManager.getAdapter(this._selectedFeed);
        const searchParams = selectedAdapter?.getSearchParams() || {};

        // Get resumes for dropdown from app manager data
        const resumes = this._appManager?.data?.resumes || [];

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                .job-search-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .search-header {
                    background: #fff;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 24px;
                }

                .search-header h2 {
                    margin: 0 0 20px 0;
                    color: #2c3e50;
                    font-size: 24px;
                }

                .form-group {
                    margin-bottom: 16px;
                }

                .form-label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 600;
                    color: #34495e;
                    font-size: 14px;
                }

                .form-input, .form-select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    box-sizing: border-box;
                }

                .form-input:focus, .form-select:focus {
                    outline: none;
                    border-color: #3498db;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                }

                .form-help {
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-top: 4px;
                }

                .search-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: #3498db;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #2980b9;
                }

                .btn-secondary {
                    background: #95a5a6;
                    color: white;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #7f8c8d;
                }

                .btn-success {
                    background: #27ae60;
                    color: white;
                }

                .btn-success:hover:not(:disabled) {
                    background: #229954;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .results-container {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e1e4e8;
                }

                .results-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: #2c3e50;
                }

                .results-actions {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .select-all {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                }

                .results-list {
                    max-height: 600px;
                    overflow-y: auto;
                }

                .job-item {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e1e4e8;
                    transition: background 0.2s;
                }

                .job-item:hover {
                    background: #f8f9fa;
                }

                .job-item:last-child {
                    border-bottom: none;
                }

                .job-header {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .job-checkbox {
                    margin-top: 4px;
                    cursor: pointer;
                }

                .job-info {
                    flex: 1;
                }

                .job-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 0 0 4px 0;
                }

                .job-company {
                    font-size: 14px;
                    color: #7f8c8d;
                    margin: 0 0 4px 0;
                }

                .job-meta {
                    display: flex;
                    gap: 16px;
                    font-size: 13px;
                    color: #95a5a6;
                }

                .job-description {
                    margin-top: 8px;
                    font-size: 13px;
                    color: #34495e;
                    line-height: 1.5;
                    max-height: 60px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .job-tags {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-top: 8px;
                }

                .tag {
                    padding: 2px 8px;
                    background: #e3f2fd;
                    color: #1976d2;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .empty-state {
                    padding: 60px 24px;
                    text-align: center;
                    color: #7f8c8d;
                }

                .empty-state i {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.3;
                }

                .loading-state {
                    padding: 60px 24px;
                    text-align: center;
                }

                .spinner {
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .error-state {
                    padding: 24px;
                    background: #fee;
                    border: 1px solid #fcc;
                    border-radius: 6px;
                    color: #c33;
                    margin: 16px 24px;
                }

                .resume-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .resume-dialog {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
                }

                .resume-dialog h3 {
                    margin: 0 0 16px 0;
                    color: #2c3e50;
                    font-size: 20px;
                }

                .resume-dialog p {
                    margin: 0 0 16px 0;
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .dialog-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }

                .btn-text {
                    background: none;
                    border: none;
                    padding: 10px 20px;
                    color: #7f8c8d;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                }

                .btn-text:hover {
                    color: #2c3e50;
                }

                .ai-icon {
                    margin-right: 6px;
                }
            </style>

            <div class="job-search-container">
                <div class="search-header">
                    <h2>🔍 Job Search</h2>

                    <div class="form-group">
                        <label class="form-label">Job Feed Source</label>
                        <select class="form-select" id="feed-selector">
                            ${adapters.map(a => `
                                <option value="${a.name}" ${a.name === this._selectedFeed ? 'selected' : ''}>
                                    ${a.displayName}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    ${Object.entries(searchParams).map(([key, def]) => `
                        <div class="form-group">
                            <label class="form-label">${def.label}</label>
                            ${def.type === 'text' ? `
                                <input
                                    type="text"
                                    class="form-input"
                                    id="${key}"
                                    placeholder="${def.placeholder || ''}"
                                    value="${this._searchParams[key] || ''}"
                                />
                            ` : def.type === 'number' ? `
                                <input
                                    type="number"
                                    class="form-input"
                                    id="${key}"
                                    min="${def.min || 0}"
                                    max="${def.max || 999}"
                                    value="${this._searchParams[key] || def.default || ''}"
                                />
                            ` : ''}
                            ${def.help ? `<div class="form-help">${def.help}</div>` : ''}
                        </div>
                    `).join('')}

                    <div class="search-actions">
                        <button class="btn btn-success" id="extract-keywords-btn" ${this._extractingKeywords ? 'disabled' : ''}>
                            <span class="ai-icon">🤖</span>
                            ${this._extractingKeywords ? 'Analyzing...' : 'Extract from Resume'}
                        </button>
                        <button class="btn btn-primary" id="search-btn" ${this._isLoading ? 'disabled' : ''}>
                            ${this._isLoading ? 'Searching...' : '🔍 Search Jobs'}
                        </button>
                        ${this._results.length > 0 ? `
                            <button class="btn btn-secondary" id="clear-btn">Clear Results</button>
                        ` : ''}
                    </div>
                </div>

                ${this._showResumeDialog ? `
                    <div class="resume-dialog-overlay">
                        <div class="resume-dialog">
                            <h3>🤖 AI Keyword Extraction</h3>
                            <p>Select a resume to analyze. AI will extract relevant keywords, skills, and preferences to help you find matching jobs.</p>

                            <div class="form-group">
                                <label class="form-label">Select Resume</label>
                                <select class="form-select" id="resume-select">
                                    <option value="">Choose a resume...</option>
                                    ${resumes.map(r => `
                                        <option value="${r.id}">${r.name || 'Untitled Resume'}</option>
                                    `).join('')}
                                </select>
                            </div>

                            ${resumes.length === 0 ? `
                                <div style="padding: 12px; background: #fff3cd; border-radius: 6px; margin-top: 12px; font-size: 14px;">
                                    ⚠️ No resumes found. Create a resume first in the Resumes tab.
                                </div>
                            ` : ''}

                            <div class="dialog-actions">
                                <button class="btn-text" id="close-resume-dialog">Cancel</button>
                                <button class="btn btn-primary" id="extract-dialog-btn" ${resumes.length === 0 ? 'disabled' : ''}>
                                    Extract Keywords
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}

                ${this._error ? `
                    <div class="error-state">
                        <strong>Error:</strong> ${this._error}
                    </div>
                ` : ''}

                ${this._isLoading ? `
                    <div class="results-container">
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Searching for jobs...</p>
                        </div>
                    </div>
                ` : this._results.length > 0 ? `
                    <div class="results-container">
                        <div class="results-header">
                            <h3>${this._results.length} Job${this._results.length !== 1 ? 's' : ''} Found</h3>
                            <div class="results-actions">
                                <label class="select-all">
                                    <input type="checkbox" id="select-all" ${this._selectedJobs.size === this._results.length ? 'checked' : ''}>
                                    Select All
                                </label>
                                <button class="btn btn-success" id="import-btn" ${this._selectedJobs.size === 0 ? 'disabled' : ''}>
                                    Import ${this._selectedJobs.size > 0 ? this._selectedJobs.size : ''} Selected
                                </button>
                            </div>
                        </div>
                        <div class="results-list" id="results-container">
                            ${this._results.map(job => `
                                <div class="job-item">
                                    <div class="job-header">
                                        <input
                                            type="checkbox"
                                            class="job-checkbox"
                                            data-job-id="${job.id}"
                                            ${this._selectedJobs.has(job.id) ? 'checked' : ''}
                                        />
                                        <div class="job-info">
                                            <h4 class="job-title">${this.escapeHtml(job.title)}</h4>
                                            <p class="job-company">${this.escapeHtml(job.company)}</p>
                                            <div class="job-meta">
                                                <span>📍 ${this.escapeHtml(job.location)}</span>
                                                <span>🗓️ ${this.formatDate(job.datePosted)}</span>
                                                <span>🔗 ${this.escapeHtml(job.source)}</span>
                                                ${job.remote ? '<span>💼 Remote</span>' : ''}
                                            </div>
                                            ${job.description ? `
                                                <div class="job-description">${this.escapeHtml(job.description.substring(0, 200))}...</div>
                                            ` : ''}
                                            ${job.tags && job.tags.length > 0 ? `
                                                <div class="job-tags">
                                                    ${job.tags.slice(0, 10).map(tag => `
                                                        <span class="tag">${this.escapeHtml(tag)}</span>
                                                    `).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Re-attach event listeners after render
        this.setupEventListeners();
        this.updateImportButton();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

            return date.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }
}

customElements.define('job-search', JobSearch);
