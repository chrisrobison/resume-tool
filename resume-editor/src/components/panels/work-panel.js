/**
 * WorkPanel component - Panel for editing work experience
 */
import { bindForm } from '../../utils/reactive-state.js';
import { renderList, createElement, textToList, listToText, formatDate } from '../../utils/helpers.js';

export class WorkPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._workContainer = null;
    this._currentEditIndex = -1;
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
        
        textarea {
          min-height: 100px;
          resize: vertical;
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
        
        button.small-button {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .resume-item {
          background-color: white;
          border: 1px solid var(--border-color, #dee2e6);
          border-radius: 0.25rem;
          padding: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .resume-item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .resume-item-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .icon-button {
          background: none;
          border: none;
          color: var(--text-color, #333);
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .icon-button:hover {
          color: var(--primary-color, #3a86ff);
        }
        
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--secondary-color, #6c757d);
        }
        
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        
        .modal.show {
          display: flex;
        }
        
        .modal-content {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
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
        
        .date-info {
          font-style: italic;
          color: var(--secondary-color, #6c757d);
        }
        
        ul {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .help-text {
          font-size: 0.8rem;
          color: var(--secondary-color, #6c757d);
          margin-top: 0.25rem;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
      
      <div class="resume-section">
        <div class="resume-section-header">
          <div class="resume-section-title">Work Experience</div>
          <button id="add-work" class="small-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Work Experience
          </button>
        </div>
        <div id="work-container"></div>
      </div>
      
      <!-- Work Modal -->
      <div id="work-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add Work Experience</h3>
            <button class="modal-close">&times;</button>
          </div>
          <form id="work-form">
            <div class="form-grid">
              <div class="input-group">
                <label for="work-name">Company</label>
                <input type="text" id="work-name" name="name" required>
              </div>
              <div class="input-group">
                <label for="work-position">Position</label>
                <input type="text" id="work-position" name="position" required>
              </div>
              <div class="input-group">
                <label for="work-startDate">Start Date</label>
                <input type="text" id="work-startDate" name="startDate" placeholder="YYYY-MM-DD">
                <span class="help-text">Use format YYYY-MM-DD</span>
              </div>
              <div class="input-group">
                <label for="work-endDate">End Date</label>
                <input type="text" id="work-endDate" name="endDate" placeholder="YYYY-MM-DD or 'Present'">
                <span class="help-text">Use format YYYY-MM-DD or 'Present'</span>
              </div>
              <div class="input-group">
                <label for="work-url">Company Website</label>
                <input type="url" id="work-url" name="url">
              </div>
              <div class="input-group">
                <label for="work-location">Location</label>
                <input type="text" id="work-location" name="location">
              </div>
            </div>
            <div class="input-group">
              <label for="work-summary">Summary</label>
              <textarea id="work-summary" name="summary"></textarea>
            </div>
            <div class="input-group">
              <label for="work-highlights">Highlights (one per line)</label>
              <textarea id="work-highlights" name="highlights" 
                placeholder="• Accomplished X by implementing Y which led to Z"></textarea>
              <span class="help-text">Enter each achievement on a new line</span>
            </div>
            <div class="button-group">
              <button id="save-work" type="submit" class="primary">Save</button>
              <button type="button" class="modal-cancel secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    this._workContainer = this.shadowRoot.querySelector('#work-container');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Render work experience list
    this.renderWorkExperience();
  }
  
  setupEventListeners() {
    // Add work button
    const addWorkBtn = this.shadowRoot.querySelector('#add-work');
    if (addWorkBtn) {
      addWorkBtn.addEventListener('click', () => this.openWorkModal());
    }
    
    // Work modal setup
    const workModal = this.shadowRoot.querySelector('#work-modal');
    const closeButtons = workModal.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        workModal.classList.remove('show');
      });
    });
    
    // Work form submission
    const workForm = this.shadowRoot.querySelector('#work-form');
    workForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveWorkExperience();
    });
  }
  
  renderWorkExperience() {
    if (!this._store || !this._workContainer) return;
    
    const work = this._store.state.work || [];
    
    renderList(
      work,
      (job, index) => this.renderWorkItem(job, index),
      this._workContainer,
      {
        emptyMessage: `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <p>No work experience added yet. Click the "Add Work Experience" button to add your professional history.</p>
          </div>
        `,
        emptyClass: 'empty-state'
      }
    );
  }
  
  renderWorkItem(job, index) {
    const item = createElement('div', { className: 'resume-item' }, [
      createElement('div', { className: 'resume-item-header' }, [
        createElement('strong', {}, `\${job.name} - \${job.position}`),
        createElement('div', { className: 'resume-item-actions' }, [
          createElement('button', { 
            className: 'icon-button',
            dataset: { index },
            onClick: () => this.editWorkExperience(index)
          }, [
            createElement('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '16',
              height: '16',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            }, [
              createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
              createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
            ])
          ]),
          createElement('button', { 
            className: 'icon-button',
            dataset: { index },
            onClick: () => this.deleteWorkExperience(index)
          }, [
            createElement('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '16',
              height: '16',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            }, [
              createElement('polyline', { points: '3 6 5 6 21 6' }),
              createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
              createElement('line', { x1: '10', y1: '11', x2: '10', y2: '17' }),
              createElement('line', { x1: '14', y1: '11', x2: '14', y2: '17' })
            ])
          ])
        ])
      ]),
      createElement('div', {}, [
        (job.startDate || job.endDate) && createElement('div', { className: 'date-info' }, [
          formatDate(job.startDate),
          ' - ',
          job.endDate ? (job.endDate.toLowerCase() === 'present' ? 'Present' : formatDate(job.endDate)) : ''
        ]),
        job.location && createElement('div', {}, `Location: \${job.location}`),
        job.url && createElement('div', {}, [
          'Website: ',
          createElement('a', { href: job.url, target: '_blank' }, job.url)
        ]),
        job.summary && createElement('div', {}, [
          createElement('strong', {}, 'Summary:'),
          ' ',
          job.summary
        ]),
        job.highlights && job.highlights.length > 0 && createElement('div', {}, [
          createElement('strong', {}, 'Highlights:'),
          createElement('ul', {}, 
            job.highlights.map(highlight => 
              createElement('li', {}, highlight)
            )
          )
        ])
      ])
    ]);
    
    return item;
  }
  
  openWorkModal(index = -1) {
    const modal = this.shadowRoot.querySelector('#work-modal');
    const title = modal.querySelector('.modal-title');
    const form = modal.querySelector('#work-form');
    
    // Reset form
    form.reset();
    
    if (index >= 0) {
      // Editing existing work experience
      const job = this._store.state.work[index];
      title.textContent = 'Edit Work Experience';
      
      // Fill form with work data
      form.elements.name.value = job.name || '';
      form.elements.position.value = job.position || '';
      form.elements.startDate.value = job.startDate || '';
      form.elements.endDate.value = job.endDate || '';
      form.elements.url.value = job.url || '';
      form.elements.location.value = job.location || '';
      form.elements.summary.value = job.summary || '';
      
      // Convert highlights array to text
      form.elements.highlights.value = listToText(job.highlights || []);
      
      // Store index for later use
      this._currentEditIndex = index;
    } else {
      // Adding new work experience
      title.textContent = 'Add Work Experience';
      this._currentEditIndex = -1;
    }
    
    // Show modal
    modal.classList.add('show');
  }
  
  saveWorkExperience() {
    const form = this.shadowRoot.querySelector('#work-form');
    
    // Get form data
    const name = form.elements.name.value.trim();
    const position = form.elements.position.value.trim();
    const startDate = form.elements.startDate.value.trim();
    const endDate = form.elements.endDate.value.trim();
    const url = form.elements.url.value.trim();
    const location = form.elements.location.value.trim();
    const summary = form.elements.summary.value.trim();
    const highlights = textToList(form.elements.highlights.value);
    
    // Validate required fields
    if (!name || !position) {
      alert('Company name and position are required');
      return;
    }
    
    // Create job object
    const newJob = { 
      name, 
      position, 
      startDate, 
      endDate, 
      url, 
      location, 
      summary, 
      highlights 
    };
    
    // Update store
    if (this._currentEditIndex >= 0) {
      // Update existing job
      this._store.state.work[this._currentEditIndex] = newJob;
    } else {
      // Add new job
      if (!Array.isArray(this._store.state.work)) {
        this._store.state.work = [];
      }
      this._store.state.work.push(newJob);
    }
    
    // Hide modal
    const modal = this.shadowRoot.querySelector('#work-modal');
    modal.classList.remove('show');
    
    // Re-render work experience
    this.renderWorkExperience();
  }
  
  editWorkExperience(index) {
    this.openWorkModal(index);
  }
  
  deleteWorkExperience(index) {
    if (confirm('Are you sure you want to delete this work experience?')) {
      this._store.state.work.splice(index, 1);
      this.renderWorkExperience();
    }
  }
  
  handleStateChange(state, change) {
    // Update work experience list if work has changed
    if (change && 
        (change.property === 'work' || 
         change.property.startsWith('work.') ||
         (change.reset && state.work))) {
      this.renderWorkExperience();
    }
  }
}

// Define the custom element
customElements.define('work-panel', WorkPanel);
