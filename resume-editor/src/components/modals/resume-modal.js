/**
 * ResumeModal component - Modal for creating, renaming, and duplicating resumes
 */
import { showToast } from '../../utils/helpers.js';

export class ResumeModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._isOpen = false;
    this._mode = 'create'; // create, rename, duplicate
    this._resumeId = null;
    this._defaultName = '';
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
  
  /**
   * Set the mode (create, rename, duplicate)
   */
  set mode(mode) {
    this._mode = mode;
    this.updateModalTitle();
  }
  
  get mode() {
    return this._mode;
  }
  
  /**
   * Set the resume ID (for rename and duplicate)
   */
  set resumeId(id) {
    this._resumeId = id;
  }
  
  get resumeId() {
    return this._resumeId;
  }
  
  /**
   * Set the default name (for rename and duplicate)
   */
  set defaultName(name) {
    this._defaultName = name;
  }
  
  get defaultName() {
    return this._defaultName;
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
          max-width: 500px;
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
        
        input {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #dee2e6);
          border-radius: 0.25rem;
          font-family: inherit;
          font-size: 1rem;
        }
        
        .help-text {
          font-size: 0.8rem;
          color: var(--secondary-color, #6c757d);
          margin-top: 0.25rem;
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
      </style>
      
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">New Resume</h3>
            <button class="modal-close">&times;</button>
          </div>
          <form id="resume-form">
            <div class="input-group">
              <label for="resume-name">Resume Name</label>
              <input type="text" id="resume-name" name="name" placeholder="My Resume" required>
              <span class="help-text">This name is used to identify your resume in the editor</span>
            </div>
            <div class="button-group">
              <button type="submit" id="save-resume" class="success">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Save
              </button>
              <button type="button" class="modal-cancel secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </button>
            </div>
          </form>
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
    
    // Form submission
    const form = this.shadowRoot.querySelector('#resume-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveResume();
    });
  }
  
  /**
   * Update the modal title based on the current mode
   */
  updateModalTitle() {
    const titleEl = this.shadowRoot.querySelector('.modal-title');
    if (!titleEl) return;
    
    switch (this._mode) {
      case 'create':
        titleEl.textContent = 'New Resume';
        break;
      case 'rename':
        titleEl.textContent = 'Rename Resume';
        break;
      case 'duplicate':
        titleEl.textContent = 'Duplicate Resume';
        break;
    }
  }
  
  /**
   * Open the modal
   */
  open() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.add('show');
    this._isOpen = true;
    
    // Update the modal title
    this.updateModalTitle();
    
    // Set the input value
    const nameInput = this.shadowRoot.querySelector('#resume-name');
    nameInput.value = this._defaultName || '';
    nameInput.focus();
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
   * Save the resume based on the current mode
   */
  saveResume() {
    const nameInput = this.shadowRoot.querySelector('#resume-name');
    const name = nameInput.value.trim();
    
    if (!name) {
      showToast('Resume name is required', { type: 'error' });
      return;
    }
    
    // Dispatch save event with mode, name, and resumeId
    this.dispatchEvent(new CustomEvent('save', {
      detail: {
        mode: this._mode,
        name,
        resumeId: this._resumeId
      }
    }));
    
    // Close the modal
    this.close();
  }
}

// Define the custom element
customElements.define('resume-modal', ResumeModal);
