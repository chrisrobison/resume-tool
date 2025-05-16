/**
 * MetaPanel component - Panel for editing resume metadata
 */
import { bindForm } from '../../utils/reactive-state.js';

export class MetaPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._formUpdateFn = null;
  }
  
  /**
   * Set the data store and subscribe to changes
   */
  set store(store) {
    this._store = store;
    this.render();
    
    // Subscribe to store changes
    if (store) {
      this._unsubscribe = store.subscribe(this.handleStateChange.bind(this));
    }
  }
  
  get store() {
    return this._store;
  }
  
  connectedCallback() {
    if (this._store) {
      this.render();
    }
  }
  
  disconnectedCallback() {
    // Clean up subscription when element is removed
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .resume-section {
          margin-bottom: 1.5rem;
        }
        
        .resume-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid var(--border-color, #dee2e6);
        }
        
        .resume-section-title {
          font-weight: 600;
          font-size: 1.2rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
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
        
        input, textarea, select {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #dee2e6);
          border-radius: 0.25rem;
          font-family: inherit;
          font-size: 1rem;
        }
        
        input:disabled, select:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }
        
        .help-text {
          font-size: 0.8rem;
          color: var(--secondary-color, #6c757d);
          margin-top: 0.25rem;
        }
        
        .schema-info {
          margin-top: 2rem;
          padding: 1rem;
          background-color: var(--section-bg, #f8f9fa);
          border-radius: 0.5rem;
          border-left: 4px solid var(--primary-color, #3a86ff);
        }
        
        .schema-info h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        
        .schema-info p {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        
        .schema-info a {
          color: var(--primary-color, #3a86ff);
          text-decoration: none;
        }
        
        .schema-info a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
      
      <div class="resume-section">
        <div class="resume-section-header">
          <div class="resume-section-title">Meta Information</div>
        </div>
        <form id="meta-form">
          <div class="form-grid">
            <div class="input-group">
              <label for="resume-name">Resume Name</label>
              <input type="text" id="resume-name" name="resumeName">
              <span class="help-text">This name is only used for managing your resumes</span>
            </div>
            <div class="input-group">
              <label for="theme">Theme</label>
              <input type="text" id="theme" name="theme" placeholder="elegant, classic, modern, etc.">
              <span class="help-text">Used by themes that render your resume</span>
            </div>
            <div class="input-group">
              <label for="version">Schema Version</label>
              <input type="text" id="version" name="version" value="1.0.0" disabled>
              <span class="help-text">Based on JSON Resume schema</span>
            </div>
            <div class="input-group">
              <label for="language">Language</label>
              <input type="text" id="language" name="language" placeholder="en">
              <span class="help-text">Language code (ISO 639-1)</span>
            </div>
            <div class="input-group">
              <label for="lastModified">Last Modified</label>
              <input type="text" id="lastModified" name="lastModified" disabled>
              <span class="help-text">Automatically updated when you save</span>
            </div>
            <div class="input-group">
              <label for="created">Created</label>
              <input type="text" id="created" name="created" disabled>
            </div>
          </div>
        </form>
        
        <div class="schema-info">
          <h3>About JSON Resume</h3>
          <p>
            This editor uses the JSON Resume schema, an open standard for resume data.
            The schema helps ensure your resume data is portable and can be used with various themes and tools.
          </p>
          <p>
            <a href="https://jsonresume.org/schema/" target="_blank">Learn more about the JSON Resume schema</a>
          </p>
        </div>
      </div>
    `;
    
    // Bind form to store
    this.bindForm();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update the form with initial values
    this.updateFormValues();
  }
  
  bindForm() {
    if (!this._store) return;
    
    // Bind meta form fields
    const metaForm = this.shadowRoot.querySelector('#meta-form');
    const metaUpdateFn = bindForm(metaForm, this._store.state.meta, 'meta');
    
    // Store update function for later use
    this._formUpdateFn = metaUpdateFn;
  }
  
  setupEventListeners() {
    // Resume name field update
    const resumeNameInput = this.shadowRoot.querySelector('#resume-name');
    if (resumeNameInput && this._store) {
      resumeNameInput.addEventListener('change', () => {
        // Update the resume name in the metadata
        if (this._store.state._meta) {
          this._store.state._meta.name = resumeNameInput.value;
        }
      });
    }
  }
  
  updateFormValues() {
    if (!this._store) return;
    
    // Set values that are not directly bound to the store
    const resumeNameInput = this.shadowRoot.querySelector('#resume-name');
    const lastModifiedInput = this.shadowRoot.querySelector('#lastModified');
    const createdInput = this.shadowRoot.querySelector('#created');
    
    // Set resume name from metadata
    if (resumeNameInput && this._store.state._meta) {
      resumeNameInput.value = this._store.state._meta.name || '';
    }
    
    // Format dates for display
    if (lastModifiedInput && this._store.state.meta.lastModified) {
      lastModifiedInput.value = new Date(this._store.state.meta.lastModified)
        .toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
    
    if (createdInput && this._store.state._meta) {
      createdInput.value = new Date(this._store.state._meta.createdAt)
        .toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
    }
  }
  
  handleStateChange(state, change) {
    // Update form when store changes
    if (this._formUpdateFn) {
      this._formUpdateFn(state);
    }
    
    // Update other fields that aren't directly bound
    this.updateFormValues();
  }
}

// Define the custom element
customElements.define('meta-panel', MetaPanel);
