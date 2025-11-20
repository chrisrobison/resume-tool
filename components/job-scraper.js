// job-scraper.js - Job board scraping interface
// Web Component for triggering and managing job scraping operations

import { getScraperService } from '../js/scraper-service.js';
import { getDataService } from '../js/data-service.js';

class JobScraper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.scraperService = null;
    this.currentJobId = null;
    this.scrapedJobs = [];
    this.selectedJobs = new Set();
    this.unsubscribe = null;
  }

  async connectedCallback() {
    this.scraperService = await getScraperService();
    this.render();
    this.setupEventListeners();
    this.subscribeToScraperEvents();
    await this.loadSources();
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.scraperService) {
      this.scraperService.stopAllPolling();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .scraper-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 24px;
        }

        h2 {
          margin: 0 0 24px 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }

        .section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #34495e;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
          font-size: 14px;
        }

        input[type="text"],
        input[type="number"],
        select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #3498db;
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn:disabled {
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
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .btn-success {
          background: #27ae60;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #229954;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c0392b;
        }

        .status-container {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 16px;
          margin-top: 16px;
          display: none;
        }

        .status-container.visible {
          display: block;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-queued {
          background: #f39c12;
          color: white;
        }

        .status-running {
          background: #3498db;
          color: white;
        }

        .status-completed {
          background: #27ae60;
          color: white;
        }

        .status-failed {
          background: #e74c3c;
          color: white;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3498db, #2ecc71);
          transition: width 0.3s ease;
        }

        .status-text {
          font-size: 14px;
          color: #555;
        }

        .results-container {
          margin-top: 24px;
          display: none;
        }

        .results-container.visible {
          display: block;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .results-stats {
          font-size: 14px;
          color: #555;
        }

        .results-actions {
          display: flex;
          gap: 8px;
        }

        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
        }

        .jobs-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #555;
          border-bottom: 2px solid #e0e0e0;
        }

        .jobs-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }

        .jobs-table tr:last-child td {
          border-bottom: none;
        }

        .jobs-table tr:hover {
          background: #f8f9fa;
        }

        .job-title {
          font-weight: 600;
          color: #2c3e50;
        }

        .job-company {
          color: #7f8c8d;
          font-size: 13px;
        }

        .job-location {
          color: #95a5a6;
          font-size: 13px;
        }

        .checkbox-cell {
          width: 40px;
          text-align: center;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .select-all-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #95a5a6;
        }

        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-top: 12px;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .help-text {
          font-size: 13px;
          color: #7f8c8d;
          margin-top: 4px;
        }

        .source-info {
          background: #e8f4fd;
          border-left: 4px solid #3498db;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #2c3e50;
        }
      </style>

      <div class="scraper-container">
        <h2>Job Board Scraper</h2>

        <!-- Configuration Section -->
        <div class="section">
          <div class="section-title">
            <span>⚙️</span>
            <span>Scraper Configuration</span>
          </div>

          <div class="source-info" id="sourceInfo">
            Loading available sources...
          </div>

          <div class="form-group">
            <label for="sourceSelect">Source</label>
            <select id="sourceSelect">
              <option value="">Select a source...</option>
            </select>
          </div>

          <div class="form-group">
            <label for="urlInput">
              Search URL
            </label>
            <input
              type="text"
              id="urlInput"
              placeholder="https://hiring.cafe/?searchState=..."
            />
            <div class="help-text">
              Go to hiring.cafe, perform your search, then copy the full URL from your browser
            </div>
          </div>

          <div class="options-grid">
            <div class="form-group">
              <label for="waitTime">Wait Time (ms)</label>
              <input
                type="number"
                id="waitTime"
                value="5000"
                min="1000"
                step="1000"
              />
              <div class="help-text">Time to wait for page to load</div>
            </div>

            <div class="form-group">
              <label for="maxScrolls">Max Scrolls</label>
              <input
                type="number"
                id="maxScrolls"
                value="5"
                min="1"
                max="20"
              />
              <div class="help-text">Number of times to scroll page</div>
            </div>
          </div>

          <button class="btn btn-primary" id="startBtn">
            <span>🚀</span>
            <span>Start Scraping</span>
          </button>
        </div>

        <!-- Status Section -->
        <div class="status-container" id="statusContainer">
          <div class="status-header">
            <span class="status-badge" id="statusBadge">Queued</span>
            <span id="statusMessage">Initializing scraper...</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="status-text" id="statusText">Waiting to start...</div>
        </div>

        <!-- Results Section -->
        <div class="results-container" id="resultsContainer">
          <div class="section-title">
            <span>📋</span>
            <span>Scraping Results</span>
          </div>

          <div class="results-header">
            <div class="results-stats" id="resultsStats">
              0 jobs found
            </div>
            <div class="results-actions">
              <button class="btn btn-success" id="importBtn" disabled>
                <span>📥</span>
                <span>Import Selected (<span id="selectedCount">0</span>)</span>
              </button>
              <button class="btn btn-danger" id="clearBtn">
                <span>🗑️</span>
                <span>Clear Results</span>
              </button>
            </div>
          </div>

          <div class="select-all-container">
            <input type="checkbox" id="selectAllCheckbox" />
            <label for="selectAllCheckbox" style="margin: 0; cursor: pointer;">
              Select All
            </label>
          </div>

          <div id="jobsTableContainer"></div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const startBtn = this.shadowRoot.getElementById('startBtn');
    const importBtn = this.shadowRoot.getElementById('importBtn');
    const clearBtn = this.shadowRoot.getElementById('clearBtn');
    const selectAllCheckbox = this.shadowRoot.getElementById('selectAllCheckbox');

    startBtn.addEventListener('click', () => this.handleStartScraping());
    importBtn.addEventListener('click', () => this.handleImportJobs());
    clearBtn.addEventListener('click', () => this.handleClearResults());
    selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
  }

  subscribeToScraperEvents() {
    this.unsubscribe = this.scraperService.addEventListener((event) => {
      this.handleScraperEvent(event);
    });
  }

  async loadSources() {
    try {
      const sources = await this.scraperService.getSources();
      const sourceSelect = this.shadowRoot.getElementById('sourceSelect');
      const sourceInfo = this.shadowRoot.getElementById('sourceInfo');

      sourceSelect.innerHTML = '<option value="">Select a source...</option>';

      sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        sourceSelect.appendChild(option);
      });

      // Select first source by default
      if (sources.length > 0) {
        sourceSelect.value = sources[0].id;
        sourceInfo.innerHTML = `
          <strong>${sources[0].name}</strong> - ${sources[0].description}<br>
          <small>Example: ${sources[0].urlExample}</small>
        `;
      }

      // Update source info on change
      sourceSelect.addEventListener('change', (e) => {
        const source = sources.find(s => s.id === e.target.value);
        if (source) {
          sourceInfo.innerHTML = `
            <strong>${source.name}</strong> - ${source.description}<br>
            <small>Example: ${source.urlExample}</small>
          `;
        }
      });

    } catch (error) {
      console.error('Failed to load sources:', error);
      const sourceInfo = this.shadowRoot.getElementById('sourceInfo');
      sourceInfo.innerHTML = `<span style="color: #e74c3c;">Failed to load sources: ${error.message}</span>`;
    }
  }

  async handleStartScraping() {
    const sourceSelect = this.shadowRoot.getElementById('sourceSelect');
    const urlInput = this.shadowRoot.getElementById('urlInput');
    const waitTime = this.shadowRoot.getElementById('waitTime');
    const maxScrolls = this.shadowRoot.getElementById('maxScrolls');
    const startBtn = this.shadowRoot.getElementById('startBtn');

    const source = sourceSelect.value;
    const url = urlInput.value.trim();

    if (!source) {
      alert('Please select a source');
      return;
    }

    if (!url) {
      alert('Please enter a URL');
      return;
    }

    try {
      startBtn.disabled = true;
      this.showStatus();

      const options = {
        waitTime: parseInt(waitTime.value, 10),
        maxScrolls: parseInt(maxScrolls.value, 10)
      };

      const result = await this.scraperService.startScraping(source, url, options);
      this.currentJobId = result.jobId;

      this.updateStatus('queued', 'Scraping job started', 0);

    } catch (error) {
      console.error('Failed to start scraping:', error);
      this.showError(error.message);
      startBtn.disabled = false;
    }
  }

  handleScraperEvent(event) {
    const { event: eventType, jobId, status, progress, jobs, stats, error } = event;

    if (jobId && jobId !== this.currentJobId) {
      return; // Ignore events for other jobs
    }

    switch (eventType) {
      case 'started':
        this.updateStatus('running', 'Scraping in progress...', 10);
        break;

      case 'statusUpdate':
        this.updateStatus(status, 'Scraping jobs...', progress || 50);
        break;

      case 'completed':
        this.updateStatus('completed', `Found ${jobs.length} jobs`, 100);
        this.scrapedJobs = jobs;
        this.showResults(jobs, stats);
        this.enableStartButton();
        break;

      case 'failed':
        this.updateStatus('failed', `Scraping failed: ${error}`, 0);
        this.showError(error);
        this.enableStartButton();
        break;

      case 'imported':
        this.showImportSuccess(event);
        break;
    }
  }

  showStatus() {
    const statusContainer = this.shadowRoot.getElementById('statusContainer');
    statusContainer.classList.add('visible');
  }

  updateStatus(status, message, progress) {
    const statusBadge = this.shadowRoot.getElementById('statusBadge');
    const statusMessage = this.shadowRoot.getElementById('statusMessage');
    const progressFill = this.shadowRoot.getElementById('progressFill');
    const statusText = this.shadowRoot.getElementById('statusText');

    statusBadge.textContent = status;
    statusBadge.className = `status-badge status-${status}`;
    statusMessage.textContent = message;
    progressFill.style.width = `${progress}%`;
    statusText.textContent = `Progress: ${progress}%`;
  }

  showResults(jobs, stats) {
    const resultsContainer = this.shadowRoot.getElementById('resultsContainer');
    const resultsStats = this.shadowRoot.getElementById('resultsStats');
    const jobsTableContainer = this.shadowRoot.getElementById('jobsTableContainer');

    resultsContainer.classList.add('visible');
    resultsStats.textContent = `${jobs.length} jobs found`;

    if (jobs.length === 0) {
      jobsTableContainer.innerHTML = `
        <div class="empty-state">
          <div>📭</div>
          <div>No jobs found</div>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.className = 'jobs-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th class="checkbox-cell"></th>
          <th>Job Title</th>
          <th>Company</th>
          <th>Location</th>
          <th>Posted</th>
        </tr>
      </thead>
      <tbody id="jobsTableBody"></tbody>
    `;

    const tbody = table.querySelector('#jobsTableBody');

    jobs.forEach((job, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="checkbox-cell">
          <input type="checkbox" data-index="${index}" />
        </td>
        <td>
          <div class="job-title">${this.escapeHtml(job.title)}</div>
        </td>
        <td class="job-company">${this.escapeHtml(job.company || 'N/A')}</td>
        <td class="job-location">${this.escapeHtml(job.location || 'N/A')}</td>
        <td>${job.datePosted || 'N/A'}</td>
      `;

      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedJobs.add(index);
        } else {
          this.selectedJobs.delete(index);
        }
        this.updateSelectedCount();
      });

      tbody.appendChild(row);
    });

    jobsTableContainer.innerHTML = '';
    jobsTableContainer.appendChild(table);

    // Select all by default
    this.handleSelectAll(true);
  }

  handleSelectAll(checked) {
    const checkboxes = this.shadowRoot.querySelectorAll('#jobsTableBody input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      const index = parseInt(checkbox.dataset.index, 10);
      if (checked) {
        this.selectedJobs.add(index);
      } else {
        this.selectedJobs.delete(index);
      }
    });

    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const selectedCount = this.shadowRoot.getElementById('selectedCount');
    const importBtn = this.shadowRoot.getElementById('importBtn');
    const selectAllCheckbox = this.shadowRoot.getElementById('selectAllCheckbox');

    selectedCount.textContent = this.selectedJobs.size;
    importBtn.disabled = this.selectedJobs.size === 0;

    // Update select all checkbox
    const allCheckboxes = this.shadowRoot.querySelectorAll('#jobsTableBody input[type="checkbox"]');
    const allChecked = allCheckboxes.length > 0 &&
                       Array.from(allCheckboxes).every(cb => cb.checked);
    selectAllCheckbox.checked = allChecked;
  }

  async handleImportJobs() {
    const importBtn = this.shadowRoot.getElementById('importBtn');

    if (this.selectedJobs.size === 0) {
      alert('Please select at least one job to import');
      return;
    }

    try {
      importBtn.disabled = true;
      const originalText = importBtn.innerHTML;
      importBtn.innerHTML = `
        <span class="spinner"></span>
        <span>Importing...</span>
      `;

      const selectedJobsArray = Array.from(this.selectedJobs).map(index => this.scrapedJobs[index]);

      const result = await this.scraperService.importJobs(this.currentJobId, selectedJobsArray);

      importBtn.innerHTML = originalText;

      // Show success message
      const message = `
        Successfully imported ${result.imported.length} jobs!
        ${result.skipped.length > 0 ? `\nSkipped ${result.skipped.length} duplicates` : ''}
        ${result.errors.length > 0 ? `\nFailed ${result.errors.length} jobs` : ''}
      `;

      alert(message);

      // Dispatch event for parent components
      this.dispatchEvent(new CustomEvent('jobs-imported', {
        detail: result,
        bubbles: true,
        composed: true
      }));

      // Clear results after import
      this.handleClearResults();

    } catch (error) {
      console.error('Import failed:', error);
      alert(`Failed to import jobs: ${error.message}`);
      importBtn.disabled = false;
    }
  }

  handleClearResults() {
    this.scrapedJobs = [];
    this.selectedJobs.clear();
    this.currentJobId = null;

    const resultsContainer = this.shadowRoot.getElementById('resultsContainer');
    const statusContainer = this.shadowRoot.getElementById('statusContainer');

    resultsContainer.classList.remove('visible');
    statusContainer.classList.remove('visible');

    this.enableStartButton();
  }

  enableStartButton() {
    const startBtn = this.shadowRoot.getElementById('startBtn');
    startBtn.disabled = false;
  }

  showError(message) {
    const statusText = this.shadowRoot.getElementById('statusText');
    statusText.innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${this.escapeHtml(message)}
      </div>
    `;
  }

  showImportSuccess(event) {
    const { imported, skipped, errors } = event;
    console.log('Import completed:', { imported, skipped, errors });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('job-scraper', JobScraper);

export default JobScraper;
