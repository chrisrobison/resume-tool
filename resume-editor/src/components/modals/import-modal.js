/**
 * ImportModal component - Modal for importing resume data
 */
import { showToast } from '../../utils/helpers.js';

export class ImportModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._currentTab = 'paste';
    this._isOpen = false;
    this._jsonFile = null;
  }
  
  /**
   * Set the data store
   */
  set store(store) {
    this._store = store;
  }
  
  get store() {
    return this._store;
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .modal-backdrop.show {
          display: flex;
          opacity: 1;
        }
        
        .modal {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          transform: translateY(20px);
          transition: transform 0.3s ease;
        }
        
        .modal-backdrop.show .modal {
          transform: translateY(0);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .modal-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color, #dee2e6);
          margin-bottom: 1rem;
        }
        
        .tab {
          padding: 0.5rem 1rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        
        .tab.active {
          border-color: var(--primary-color, #3a86ff);
          font-weight: 600;
        }
        
        .panel {
          display: none;
        }
        
        .panel.active {
          display: block;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
        }
        
        .input-group label {
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        input, textarea {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #dee2e6);
          border-radius: 0.25rem;
          font-family: inherit;
          font-size: 1rem;
        }
        
        textarea {
          min-height: 200px;
          resize: vertical;
          font-family: monospace;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        button {
          padding: 0.5rem 1rem;
          background-color: var(--primary-color, #3a86ff);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        button.secondary {
          background-color: var(--secondary-color, #6c757d);
        }
        
        button.success {
          background-color: var(--success-color, #28a745);
        }
        
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .drag-drop-area {
          border: 2px dashed var(--border-color, #dee2e6);
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .drag-drop-area:hover, .drag-drop-area.dragover {
          background-color: rgba(58, 134, 255, 0.1);
        }
        
        .help-text {
          font-size: 0.8rem;
          color: var(--secondary-color, #6c757d);
          margin-top: 0.25rem;
        }
        
        .file-name {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: var(--section-bg, #f8f9fa);
          border-radius: 0.25rem;
        }
      </style>
      
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Import Resume.json</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="tabs">
            <div class="tab active" data-tab="paste">Paste JSON</div>
            <div class="tab" data-tab="file">Upload File</div>
            <div class="tab" data-tab="url">From URL</div>
          </div>
          
          <div id="paste-panel" class="panel active">
            <div class="input-group">
              <label for="json-input">Paste JSON</label>
              <textarea id="json-input" placeholder="Paste your resume.json content here..."></textarea>
            </div>
            <div class="input-group">
              <label for="import-name">Resume Name (optional)</label>
              <input type="text" id="import-name-paste" placeholder="My Imported Resume">
              <span class="help-text">Name to identify this resume</span>
            </div>
            <div class="button-group">
              <button id="import-paste" class="success">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Import
              </button>
              <button class="modal-cancel secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </button>
            </div>
          </div>
          
          <div id="file-panel" class="panel">
            <div class="input-group">
              <label for="file-input">Upload JSON File</label>
              <div id="drag-drop-area" class="drag-drop-area">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Drag & drop your resume.json file here or click to browse</p>
                <input type="file" id="file-input" accept=".json" style="display: none;">
              </div>
              <div id="file-name" class="file-name" style="display: none;"></div>
            </div>
            <div class="input-group">
              <label for="import-name">Resume Name (optional)</label>
              <input type="text" id="import-name-file" placeholder="My Imported Resume">
              <span class="help-text">Name to identify this resume</span>
            </div>
            <div class="button-group">
              <button id="import-file" class="success" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Import
              </button>
              <button class="modal-cancel secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </button>
            </div>
          </div>
          
          <div id="url-panel" class="panel">
            <div class="input-group">
              <label for="url-input">JSON URL</label>
              <input type="url" id="url-input" placeholder="https://example.com/resume.json">
            </div>
            <div class="input-group">
              <label for="import-name">Resume Name (optional)</label>
              <input type="text" id="import-name-url" placeholder="My Imported Resume">
              <span class="help-text">Name to identify this resume</span>
            </div>
            <div class="button-group">
              <button id="import-url" class="success">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Import
              </button>
              <button class="modal-cancel secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Tab switching
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
    
    // Close buttons
    const closeButtons = this.shadowRoot.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.close();
      });
    });
    
    // Import from text
    const importPasteButton = this.shadowRoot.querySelector('#import-paste');
    importPasteButton.addEventListener('click', () => {
      this.importFromText();
    });
    
    // File input handling
    const fileInput = this.shadowRoot.querySelector('#file-input');
    const importFileButton = this.shadowRoot.querySelector('#import-file');
    
    fileInput.addEventListener('change', event => {
      const file = event.target.files[0];
      this.handleFileSelection(file);
    });
    
    importFileButton.addEventListener('click', () => {
      this.importFromFile();
    });
    
    // Drag and drop handling
    const dragDropArea = this.shadowRoot.querySelector('#drag-drop-area');
    dragDropArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dragDropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dragDropArea.addEventListener(eventName, () => {
        dragDropArea.classList.add('dragover');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dragDropArea.addEventListener(eventName, () => {
        dragDropArea.classList.remove('dragover');
      });
    });
    
    dragDropArea.addEventListener('drop', e => {
      const file = e.dataTransfer.files[0];
      if (file) {
        this.handleFileSelection(file);
      }
    });
    
    // Import from URL
    const importUrlButton = this.shadowRoot.querySelector('#import-url');
    importUrlButton.addEventListener('click', () => {
      this.importFromUrl();
    });
  }
  
  /**
   * Open the modal
   */
  open() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.add('show');
    this._isOpen = true;
    
    // Reset form values
    this.resetForms();
  }
  
  /**
   * Close the modal
   */
  close() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.remove('show');
    this._isOpen = false;
    
    // Reset form values
    this.resetForms();
  }
  
  /**
   * Reset all form values
   */
  resetForms() {
    // Reset paste form
    const jsonInput = this.shadowRoot.querySelector('#json-input');
    if (jsonInput) jsonInput.value = '';
    
    // Reset name fields
    const nameInputs = this.shadowRoot.querySelectorAll('[id^="import-name"]');
    nameInputs.forEach(input => {
      input.value = '';
    });
    
    // Reset file input
    const fileInput = this.shadowRoot.querySelector('#file-input');
    if (fileInput) fileInput.value = '';
    
    // Reset file name display
    const fileName = this.shadowRoot.querySelector('#file-name');
    if (fileName) {
      fileName.textContent = '';
      fileName.style.display = 'none';
    }
    
    // Reset import file button
    const importFileButton = this.shadowRoot.querySelector('#import-file');
    if (importFileButton) importFileButton.disabled = true;
    
    // Reset URL input
    const urlInput = this.shadowRoot.querySelector('#url-input');
    if (urlInput) urlInput.value = '';
    
    // Reset stored file
    this._jsonFile = null;
  }
  
  /**
   * Switch between import tabs
   * @param {String} tabId - ID of the tab to switch to
   */
  switchTab(tabId) {
    this._currentTab = tabId;
    
    // Update tabs
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update panels
    const panels = this.shadowRoot.querySelectorAll('.panel');
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `\${tabId}-panel`);
    });
  }
  
  /**
   * Handle file selection for import
   * @param {File} file - The selected file
   */
  handleFileSelection(file) {
    if (!file) return;
    
    // Check if file is JSON
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      showToast('Please select a valid JSON file', { type: 'error' });
      return;
    }
    
    // Store file for later use
    this._jsonFile = file;
    
    // Show file name
    const fileName = this.shadowRoot.querySelector('#file-name');
    fileName.textContent = `Selected file: \${file.name}`;
    fileName.style.display = 'block';
    
    // Enable import button
    const importFileButton = this.shadowRoot.querySelector('#import-file');
    importFileButton.disabled = false;
    
    // Pre-fill resume name from filename
    const nameInput = this.shadowRoot.querySelector('#import-name-file');
    if (nameInput && !nameInput.value) {
      // Extract name from filename without extension
      const baseName = file.name.replace(/\\.json$/i, '');
      nameInput.value = baseName || 'Imported Resume';
    }
  }
  
  /**
   * Import resume from pasted JSON text
   */
  importFromText() {
    const jsonInput = this.shadowRoot.querySelector('#json-input');
    const nameInput = this.shadowRoot.querySelector('#import-name-paste');
    const jsonText = jsonInput.value.trim();
    
    if (!jsonText) {
      showToast('Please paste JSON content', { type: 'error' });
      return;
    }
    
    try {
      // Parse JSON to validate format
      const resumeData = JSON.parse(jsonText);
      
      // Get resume name
      const name = nameInput.value.trim() || 'Imported Resume';
      
      // Dispatch import event
      this.dispatchEvent(new CustomEvent('import', {
        detail: { data: resumeData, name }
      }));
      
      // Close the modal
      this.close();
      
    } catch (error) {
      showToast(`Error parsing JSON: \${error.message}`, { type: 'error' });
    }
  }
  
  /**
   * Import resume from file
   */
  importFromFile() {
    if (!this._jsonFile) {
      showToast('Please select a file', { type: 'error' });
      return;
    }
    
    const nameInput = this.shadowRoot.querySelector('#import-name-file');
    const reader = new FileReader();
    
    reader.onload = e => {
      try {
        // Parse JSON to validate format
        const resumeData = JSON.parse(e.target.result);
        
        // Get resume name
        const name = nameInput.value.trim() || this._jsonFile.name.replace(/\\.json$/i, '') || 'Imported Resume';
        
        // Dispatch import event
        this.dispatchEvent(new CustomEvent('import', {
          detail: { data: resumeData, name }
        }));
        
        // Close the modal
        this.close();
        
      } catch (error) {
        showToast(`Error parsing JSON file: \${error.message}`, { type: 'error' });
      }
    };
    
    reader.onerror = () => {
      showToast('Error reading file', { type: 'error' });
    };
    
    reader.readAsText(this._jsonFile);
  }
  
  /**
   * Import resume from URL
   */
  importFromUrl() {
    const urlInput = this.shadowRoot.querySelector('#url-input');
    const nameInput = this.shadowRoot.querySelector('#import-name-url');
    const url = urlInput.value.trim();
    
    if (!url) {
      showToast('Please enter a valid URL', { type: 'error' });
      return;
    }
    
    // Show loading state
    const importUrlButton = this.shadowRoot.querySelector('#import-url');
    const originalText = importUrlButton.innerHTML;
    importUrlButton.disabled = true;
    importUrlButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
        <style>.spin { animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </svg>
      Loading...
    `;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: \${response.status}`);
        }
        return response.json();
      })
      .then(resumeData => {
        // Extract a name from the URL
        let defaultName = 'Imported Resume';
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];
          if (fileName && fileName.toLowerCase().endsWith('.json')) {
            defaultName = fileName.replace(/\\.json$/i, '');
          }
        } catch (e) {
          // URL parsing failed, use default name
        }
        
        // Get resume name
        const name = nameInput.value.trim() || defaultName;
        
        // Dispatch import event
        this.dispatchEvent(new CustomEvent('import', {
          detail: { data: resumeData, name }
        }));
        
        // Close the modal
        this.close();
      })
      .catch(error => {
        showToast(`Error fetching from URL: \${error.message}`, { type: 'error' });
      })
      .finally(() => {
        // Reset button state
        importUrlButton.disabled = false;
        importUrlButton.innerHTML = originalText;
      });
  }
}

// Define the custom element
customElements.define('import-modal', ImportModal);
