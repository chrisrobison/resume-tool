/**
 * ResumeEditor component - The main web component that wraps the entire editor
 */
import { createStore } from '../utils/reactive-state.js';
import { showToast } from '../utils/helpers.js';
import { ResumeStorage } from '../utils/storage.js';

// Import panel components
import './panels/basics-panel.js';
import './panels/work-panel.js';
import './panels/education-panel.js';
import './panels/skills-panel.js';
import './panels/projects-panel.js';
import './panels/meta-panel.js';

// Import modals
import './modals/import-modal.js';
import './modals/export-modal.js';
import './modals/resume-modal.js';
import './modals/confirmation-modal.js';

export class ResumeEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initialize the resume store
    const initialData = ResumeStorage.init();
    this.store = createStore(initialData);
    
    // Track current tab
    this.currentTab = 'basics';
    
    // Create autosave debounce
    this.autoSaveTimeout = null;
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Subscribe to state changes for autosave
    this.store.subscribe(this.handleStateChange.bind(this));
  }
  
  disconnectedCallback() {
    // Clean up any event listeners or subscriptions
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: "Lexend", "Helvetica Neue", "Helvetica", sans-serif;
          --background-color: #fff;
          --text-color: #333;
          --header-background: #3a86ff;
          --header-color: #fff;
          --section-bg: #f8f9fa;
          --border-color: #dee2e6;
          --primary-color: #3a86ff;
          --secondary-color: #6c757d;
          --success-color: #28a745;
          --danger-color: #dc3545;
          --highlight-color: #ffbe0b;
          box-sizing: border-box;
          font-size: 16px;
        }
        
        * {
          box-sizing: border-box;
        }
        
        header, footer {
          background-color: var(--header-background);
          color: var(--header-color);
          padding: 1rem;
          text-align: center;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        header h1 {
          margin: 0;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        main {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }
        
        footer {
          margin-top: auto;
          font-size: 0.8rem;
        }
        
        .container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        
        .card {
          background-color: var(--section-bg);
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1rem;
          overflow-x: auto;
        }
        
        .tab {
          padding: 0.5rem 1rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }
        
        .tab.active {
          border-color: var(--primary-color);
          font-weight: 600;
        }
        
        .panel {
          display: none;
        }
        
        .panel.active {
          display: block;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        
        button {
          padding: 0.5rem 1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: background-color 0.2s;
        }
        
        button:hover {
          background-color: #2a75e0;
        }
        
        button.secondary {
          background-color: var(--secondary-color);
        }
        
        button.secondary:hover {
          background-color: #5a6268;
        }
        
        button.success {
          background-color: var(--success-color);
        }
        
        button.success:hover {
          background-color: #218838;
        }
        
        button.danger {
          background-color: var(--danger-color);
        }
        
        button.danger:hover {
          background-color: #c82333;
        }
        
        .resume-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
        }
        
        .resume-selector select {
          padding: 0.25rem;
          font-family: inherit;
          border: 1px solid transparent;
          border-radius: 0.25rem;
          background-color: transparent;
          color: white;
          cursor: pointer;
        }
        
        .resume-selector select:focus {
          outline: none;
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .resume-selector select option {
          background-color: var(--header-background);
          color: var(--header-color);
        }
        
        .resume-actions {
          display: flex;
          gap: 0.25rem;
        }
        
        .resume-action-button {
          background: none;
          border: none;
          color: white;
          font-size: 1rem;
          padding: 0.25rem;
          cursor: pointer;
          border-radius: 0.25rem;
        }
        
        .resume-action-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        @media (max-width: 768px) {
          header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .button-group {
            justify-content: center;
          }
        }
      </style>
      
      <header>
        <h1>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Resume.json Editor
        </h1>
        
        <div class="resume-selector">
          <select id="resume-select"></select>
          <div class="resume-actions">
            <button class="resume-action-button" id="rename-resume" title="Rename Resume">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="resume-action-button" id="duplicate-resume" title="Duplicate Resume">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="resume-action-button" id="delete-resume" title="Delete Resume">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
            <button class="resume-action-button" id="new-resume" title="New Resume">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="button-group">
          <button id="import-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Import
          </button>
          <button id="export-button" class="success">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
        </div>
      </header>
      
      <main>
        <div class="container">
          <div class="card">
            <div class="tabs">
              <div class="tab active" data-tab="basics">Basics</div>
              <div class="tab" data-tab="work">Work</div>
              <div class="tab" data-tab="education">Education</div>
              <div class="tab" data-tab="skills">Skills</div>
              <div class="tab" data-tab="projects">Projects</div>
              <div class="tab" data-tab="meta">Meta</div>
            </div>
            
            <div id="basics-panel" class="panel active">
              <basics-panel></basics-panel>
            </div>
            
            <div id="work-panel" class="panel">
              <work-panel></work-panel>
            </div>
            
            <div id="education-panel" class="panel">
              <education-panel></education-panel>
            </div>
            
            <div id="skills-panel" class="panel">
              <skills-panel></skills-panel>
            </div>
            
            <div id="projects-panel" class="panel">
              <projects-panel></projects-panel>
            </div>
            
            <div id="meta-panel" class="panel">
              <meta-panel></meta-panel>
            </div>
          </div>
        </div>
      </main>
      
      <footer>
        <p>Resume.json Editor | Based on <a href="https://jsonresume.org/schema/" target="_blank">JSON Resume Schema</a></p>
      </footer>
      
      <!-- Modals -->
      <import-modal id="import-modal"></import-modal>
      <export-modal id="export-modal"></export-modal>
      <resume-modal id="resume-modal"></resume-modal>
      <confirmation-modal id="confirmation-modal"></confirmation-modal>
    `;
    
    // Initialize the resume selector
    this.updateResumeSelector();
    
    // Pass the store to child components
    this.setupChildComponents();
  }
  
  setupChildComponents() {
    // Get panels and pass store to them
    const panels = [
      this.shadowRoot.querySelector('basics-panel'),
      this.shadowRoot.querySelector('work-panel'),
      this.shadowRoot.querySelector('education-panel'),
      this.shadowRoot.querySelector('skills-panel'),
      this.shadowRoot.querySelector('projects-panel'),
      this.shadowRoot.querySelector('meta-panel')
    ];
    
    // Initialize all panels with the store
    panels.forEach(panel => {
      if (panel) {
        panel.store = this.store;
      }
    });
    
    // Initialize modals
    const importModal = this.shadowRoot.querySelector('#import-modal');
    const exportModal = this.shadowRoot.querySelector('#export-modal');
    const resumeModal = this.shadowRoot.querySelector('#resume-modal');
    const confirmationModal = this.shadowRoot.querySelector('#confirmation-modal');
    
    if (importModal) importModal.store = this.store;
    if (exportModal) exportModal.store = this.store;
    if (resumeModal) resumeModal.store = this.store;
  }
  
  setupEventListeners() {
    // Tab navigation
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
    
    // Import/Export buttons
    const importButton = this.shadowRoot.querySelector('#import-button');
    const exportButton = this.shadowRoot.querySelector('#export-button');
    const importModal = this.shadowRoot.querySelector('#import-modal');
    const exportModal = this.shadowRoot.querySelector('#export-modal');
    
    if (importButton && importModal) {
      importButton.addEventListener('click', () => {
        importModal.open();
      });
    }
    
    if (exportButton && exportModal) {
      exportButton.addEventListener('click', () => {
        exportModal.open();
      });
    }
    
    // Resume selector
    const resumeSelect = this.shadowRoot.querySelector('#resume-select');
    if (resumeSelect) {
      resumeSelect.addEventListener('change', () => {
        this.loadResume(resumeSelect.value);
      });
    }
    
    // Resume actions
    const newResumeBtn = this.shadowRoot.querySelector('#new-resume');
    const renameResumeBtn = this.shadowRoot.querySelector('#rename-resume');
    const duplicateResumeBtn = this.shadowRoot.querySelector('#duplicate-resume');
    const deleteResumeBtn = this.shadowRoot.querySelector('#delete-resume');
    const resumeModal = this.shadowRoot.querySelector('#resume-modal');
    const confirmationModal = this.shadowRoot.querySelector('#confirmation-modal');
    
    if (newResumeBtn && resumeModal) {
      newResumeBtn.addEventListener('click', () => {
        resumeModal.mode = 'create';
        resumeModal.open();
      });
    }
    
    if (renameResumeBtn && resumeModal) {
      renameResumeBtn.addEventListener('click', () => {
        const currentId = ResumeStorage.getCurrentResumeId();
        const resumeList = ResumeStorage.getResumeList();
        const currentResume = resumeList.find(r => r.id === currentId);
        
        resumeModal.mode = 'rename';
        resumeModal.resumeId = currentId;
        resumeModal.defaultName = currentResume?.name || '';
        resumeModal.open();
      });
    }
    
    if (duplicateResumeBtn && resumeModal) {
      duplicateResumeBtn.addEventListener('click', () => {
        const currentId = ResumeStorage.getCurrentResumeId();
        const resumeList = ResumeStorage.getResumeList();
        const currentResume = resumeList.find(r => r.id === currentId);
        
        resumeModal.mode = 'duplicate';
        resumeModal.resumeId = currentId;
        resumeModal.defaultName = `\${currentResume?.name || 'Resume'} (Copy)`;
        resumeModal.open();
      });
    }
    
    if (deleteResumeBtn && confirmationModal) {
      deleteResumeBtn.addEventListener('click', () => {
        const resumeList = ResumeStorage.getResumeList();
        
        // Can't delete if there's only one resume
        if (resumeList.length <= 1) {
          showToast('Cannot delete the only resume. Create a new one first.', { type: 'error' });
          return;
        }
        
        const currentId = ResumeStorage.getCurrentResumeId();
        const currentResume = resumeList.find(r => r.id === currentId);
        
        confirmationModal.title = 'Delete Resume';
        confirmationModal.message = `Are you sure you want to delete "\${currentResume?.name || 'this resume'}"? This action cannot be undone.`;
        confirmationModal.confirmLabel = 'Delete';
        confirmationModal.confirmClass = 'danger';
        confirmationModal.onConfirm = () => {
          if (ResumeStorage.deleteResume(currentId)) {
            // Load the new current resume
            const newCurrentId = ResumeStorage.getCurrentResumeId();
            this.loadResume(newCurrentId);
            showToast('Resume deleted successfully');
          } else {
            showToast('Failed to delete resume', { type: 'error' });
          }
        };
        
        confirmationModal.open();
      });
    }
    
    // Handle resume modal events
    if (resumeModal) {
      resumeModal.addEventListener('save', (e) => {
        const { mode, resumeId, name } = e.detail;
        
        if (mode === 'create') {
          const newResume = ResumeStorage.createResume(name);
          if (newResume) {
            this.store.reset(newResume);
            this.updateResumeSelector();
            showToast('New resume created successfully');
          }
        }
        else if (mode === 'rename') {
          if (ResumeStorage.renameResume(resumeId, name)) {
            this.updateResumeSelector();
            showToast('Resume renamed successfully');
          }
        }
        else if (mode === 'duplicate') {
          const duplicatedResume = ResumeStorage.duplicateResume(resumeId, name);
          if (duplicatedResume) {
            this.store.reset(duplicatedResume);
            this.updateResumeSelector();
            showToast('Resume duplicated successfully');
          }
        }
      });
    }
    
    // Handle import modal events
    if (importModal) {
      importModal.addEventListener('import', (e) => {
        const { data, name } = e.detail;
        
        if (data) {
          const importedResume = ResumeStorage.importResume(data, name);
          if (importedResume) {
            this.store.reset(importedResume);
            this.updateResumeSelector();
            showToast('Resume imported successfully');
          } else {
            showToast('Failed to import resume', { type: 'error' });
          }
        }
      });
    }
    
    // Handle export modal events
    if (exportModal) {
      exportModal.addEventListener('export', (e) => {
        const { type } = e.detail;
        
        if (type === 'file') {
          ResumeStorage.exportResumeFile();
          showToast('Resume exported as file');
        }
      });
    }
  }
  
  switchTab(tabId) {
    // Update current tab
    this.currentTab = tabId;
    
    // Update tabs
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update panels
    const panels = this.shadowRoot.querySelectorAll('.panel');
    panels.forEach(panel => {
      const panelId = `\${tabId}-panel`;
      panel.classList.toggle('active', panel.id === panelId);
    });
  }
  
  updateResumeSelector() {
    const resumeSelect = this.shadowRoot.querySelector('#resume-select');
    if (!resumeSelect) return;
    
    // Get current resume list and ID
    const resumeList = ResumeStorage.getResumeList();
    const currentId = ResumeStorage.getCurrentResumeId();
    
    // Clear existing options
    resumeSelect.innerHTML = '';
    
    // Add options for each resume
    resumeList.forEach(resume => {
      const option = document.createElement('option');
      option.value = resume.id;
      option.textContent = resume.name;
      option.selected = resume.id === currentId;
      resumeSelect.appendChild(option);
    });
  }
  
  handleStateChange(state, change) {
    // Don't autosave for initialization or reset
    if (change && change.reset) return;
    
    // Debounce autosave
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.saveResume();
    }, 1000);
  }
  
  saveResume() {
    const snapshot = this.store.getSnapshot();
    const currentId = ResumeStorage.getCurrentResumeId();
    
    if (currentId && snapshot) {
      // Remove _meta field which is not part of the resume schema
      const resumeData = { ...snapshot };
      delete resumeData._meta;
      
      if (ResumeStorage.saveResume(currentId, resumeData)) {
        // Update metadata
        const resumeList = ResumeStorage.getResumeList();
        const resumeMeta = resumeList.find(r => r.id === currentId);
        this.store.state._meta = resumeMeta;
      }
    }
  }
  
  loadResume(resumeId) {
    const resumeData = ResumeStorage.getResumeById(resumeId);
    const resumeList = ResumeStorage.getResumeList();
    const resumeMeta = resumeList.find(r => r.id === resumeId);
    
    // Set the current resume ID
    ResumeStorage.setCurrentResume(resumeId);
    
    // Update the store
    this.store.reset({ ...resumeData, _meta: resumeMeta });
    
    // Update the selector
    this.updateResumeSelector();
  }
  
  // Public API methods
  
  /**
   * Load JSON resume data
   * @param {Object|String} json - Resume data object or JSON string
   * @returns {Boolean} - Success status
   */
  loadJson(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const importedResume = ResumeStorage.importResume(data);
      
      if (importedResume) {
        this.store.reset(importedResume);
        this.updateResumeSelector();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading JSON:', error);
      return false;
    }
  }
  
  /**
   * Get current resume JSON
   * @returns {Object} - Resume data object
   */
  getJson() {
    const snapshot = this.store.getSnapshot();
    
    // Remove _meta field which is not part of the resume schema
    const resumeData = { ...snapshot };
    delete resumeData._meta;
    
    return resumeData;
  }
  
  /**
   * Get current resume JSON as a string
   * @param {Boolean} pretty - Whether to pretty-print the JSON
   * @returns {String} - JSON string
   */
  getJsonString(pretty = true) {
    const data = this.getJson();
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }
}

// Define the custom element
customElements.define('resume-editor', ResumeEditor);
