/**
 * ExportModal component - Modal for exporting resume data
 */
import { showToast } from '../../utils/helpers.js';

export class ExportModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._isOpen = false;
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
        
        .input-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
        }
        
        .input-group label {
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        textarea {
          min-height: 300px;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #dee2e6);
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.9rem;
          resize: vertical;
          white-space: pre;
          overflow: auto;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
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
      </style>
      
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Export Resume.json</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="input-group">
            <label for="json-output">Resume JSON</label>
            <textarea id="json-output" readonly></textarea>
          </div>
          <div class="button-group">
            <button id="copy-json" class="secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy to Clipboard
            </button>
            <button id="download-json" class="success">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download JSON
            </button>
            <button class="modal-cancel secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Close buttons
    const closeButtons = this.shadowRoot.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.close();
      });
    });
    
    // Copy to clipboard button
    const copyButton = this.shadowRoot.querySelector('#copy-json');
    copyButton.addEventListener('click', () => {
      this.copyToClipboard();
    });
    
    // Download button
    const downloadButton = this.shadowRoot.querySelector('#download-json');
    downloadButton.addEventListener('click', () => {
      this.downloadJson();
    });
  }
  
  /**
   * Open the modal
   */
  open() {
    if (!this._store) return;
    
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.add('show');
    this._isOpen = true;
    
    // Update the JSON in the textarea
    this.updateJsonOutput();
  }
  
  /**
   * Close the modal
   */
  close() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.remove('show');
    this._isOpen = false;
  }
  
  /**
   * Update the JSON in the output textarea
   */
  updateJsonOutput() {
    if (!this._store) return;
    
    // Get a clean copy of the resume data (without _meta)
    const resumeData = {...this._store.getSnapshot()};
    delete resumeData._meta;
    
    // Update the lastModified timestamp
    if (resumeData.meta) {
      resumeData.meta.lastModified = new Date().toISOString();
    }
    
    // Format JSON with indentation
    const jsonOutput = JSON.stringify(resumeData, null, 2);
    
    // Set the value of the textarea
    const textarea = this.shadowRoot.querySelector('#json-output');
    if (textarea) {
      textarea.value = jsonOutput;
    }
  }
  
  /**
   * Copy JSON to clipboard
   */
  copyToClipboard() {
    const textarea = this.shadowRoot.querySelector('#json-output');
    
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      navigator.clipboard.writeText(textarea.value)
        .then(() => {
          showToast('JSON copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          this.fallbackCopyToClipboard(textarea);
        });
    } else {
      // Use fallback
      this.fallbackCopyToClipboard(textarea);
    }
  }
  
  /**
   * Fallback method for copying to clipboard
   * @param {HTMLElement} textarea - The textarea element
   */
  fallbackCopyToClipboard(textarea) {
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showToast('JSON copied to clipboard!');
      } else {
        showToast('Failed to copy to clipboard', { type: 'error' });
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      showToast('Failed to copy to clipboard', { type: 'error' });
    }
  }
  
  /**
   * Download JSON as a file
   */
  downloadJson() {
    if (!this._store) return;
    
    // Dispatch an export event with type 'file'
    this.dispatchEvent(new CustomEvent('export', {
      detail: { type: 'file' }
    }));
  }
}

// Define the custom element
customElements.define('export-modal', ExportModal);
