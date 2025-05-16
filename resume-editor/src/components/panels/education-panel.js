/**
 * EducationPanel component - Panel for editing education information
 */
import { bindForm } from '../../utils/reactive-state.js';
import { renderList, createElement, textToList, listToText, formatDate } from '../../utils/helpers.js';

export class EducationPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._educationContainer = null;
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
          <div class="resume-section-title">Education</div>
          <button id="add-education" class="small-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Education
          </button>
        </div>
        <div id="education-container"></div>
      </div>
      
      <!-- Education Modal -->
      <div id="education-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add Education</h3>
            <button class="modal-close">&times;</button>
          </div>
          <form id="education-form">
            <div class="form-grid">
              <div class="input-group">
                <label for="education-institution">Institution</label>
                <input type="text" id="education-institution" name="institution" required>
              </div>
              <div class="input-group">
                <label for="education-area">Area of Study</label>
                <input type="text" id="education-area" name="area">
              </div>
              <div class="input-group">
                <label for="education-studyType">Degree Type</label>
                <input type="text" id="education-studyType" name="studyType" placeholder="Bachelor's, Master's, Ph.D.">
              </div>
              <div class="input-group">
                <label for="education-startDate">Start Date</label>
                <input type="text" id="education-startDate" name="startDate" placeholder="YYYY-MM-DD">
                <span class="help-text">Use format YYYY-MM-DD</span>
              </div>
              <div class="input-group">
                <label for="education-endDate">End Date</label>
                <input type="text" id="education-endDate" name="endDate" placeholder="YYYY-MM-DD or 'Present'">
                <span class="help-text">Use format YYYY-MM-DD or 'Present'</span>
              </div>
              <div class="input-group">
                <label for="education-gpa">GPA</label>
                <input type="text" id="education-gpa" name="gpa">
              </div>
            </div>
            <div class="input-group">
              <label for="education-courses">Courses (one per line)</label>
              <textarea id="education-courses" name="courses"></textarea>
              <span class="help-text">Enter each course on a new line</span>
            </div>
            <div class="button-group">
              <button id="save-education" type="submit" class="primary">Save</button>
              <button type="button" class="modal-cancel secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    this._educationContainer = this.shadowRoot.querySelector('#education-container');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Render education list
    this.renderEducation();
  }
  
  setupEventListeners() {
    // Add education button
    const addEducationBtn = this.shadowRoot.querySelector('#add-education');
    if (addEducationBtn) {
      addEducationBtn.addEventListener('click', () => this.openEducationModal());
    }
    
    // Education modal setup
    const educationModal = this.shadowRoot.querySelector('#education-modal');
    const closeButtons = educationModal.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        educationModal.classList.remove('show');
      });
    });
    
    // Education form submission
    const educationForm = this.shadowRoot.querySelector('#education-form');
    educationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEducation();
    });
  }
  
  renderEducation() {
    if (!this._store || !this._educationContainer) return;
    
    const education = this._store.state.education || [];
    
    renderList(
      education,
      (edu, index) => this.renderEducationItem(edu, index),
      this._educationContainer,
      {
        emptyMessage: `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
            </svg>
            <p>No education added yet. Click the "Add Education" button to add your educational background.</p>
          </div>
        `,
        emptyClass: 'empty-state'
      }
    );
  }
  
  renderEducationItem(edu, index) {
    const degreeDisplay = edu.studyType && edu.area 
      ? `\${edu.studyType} in \${edu.area}` 
      : edu.studyType || edu.area || '';
    
    const item = createElement('div', { className: 'resume-item' }, [
      createElement('div', { className: 'resume-item-header' }, [
        createElement('strong', {}, [
          edu.institution,
          degreeDisplay && createElement('span', {}, ` - \${degreeDisplay}`)
        ]),
        createElement('div', { className: 'resume-item-actions' }, [
          createElement('button', { 
            className: 'icon-button',
            dataset: { index },
            onClick: () => this.editEducation(index)
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
            onClick: () => this.deleteEducation(index)
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
        (edu.startDate || edu.endDate) && createElement('div', { className: 'date-info' }, [
          formatDate(edu.startDate),
          ' - ',
          edu.endDate ? (edu.endDate.toLowerCase() === 'present' ? 'Present' : formatDate(edu.endDate)) : ''
        ]),
        edu.gpa && createElement('div', {}, `GPA: \${edu.gpa}`),
        edu.courses && edu.courses.length > 0 && createElement('div', {}, [
          createElement('strong', {}, 'Courses:'),
          createElement('ul', {}, 
            edu.courses.map(course => 
              createElement('li', {}, course)
            )
          )
        ])
      ])
    ]);
    
    return item;
  }
  
  openEducationModal(index = -1) {
    const modal = this.shadowRoot.querySelector('#education-modal');
    const title = modal.querySelector('.modal-title');
    const form = modal.querySelector('#education-form');
    
    // Reset form
    form.reset();
    
    if (index >= 0) {
      // Editing existing education
      const edu = this._store.state.education[index];
      title.textContent = 'Edit Education';
      
      // Fill form with education data
      form.elements.institution.value = edu.institution || '';
      form.elements.area.value = edu.area || '';
      form.elements.studyType.value = edu.studyType || '';
      form.elements.startDate.value = edu.startDate || '';
      form.elements.endDate.value = edu.endDate || '';
      form.elements.gpa.value = edu.gpa || '';
      
      // Convert courses array to text
      form.elements.courses.value = listToText(edu.courses || []);
      
      // Store index for later use
      this._currentEditIndex = index;
    } else {
      // Adding new education
      title.textContent = 'Add Education';
      this._currentEditIndex = -1;
    }
    
    // Show modal
    modal.classList.add('show');
  }
  
  saveEducation() {
    const form = this.shadowRoot.querySelector('#education-form');
    
    // Get form data
    const institution = form.elements.institution.value.trim();
    const area = form.elements.area.value.trim();
    const studyType = form.elements.studyType.value.trim();
    const startDate = form.elements.startDate.value.trim();
    const endDate = form.elements.endDate.value.trim();
    const gpa = form.elements.gpa.value.trim();
    const courses = textToList(form.elements.courses.value);
    
    // Validate required fields
    if (!institution) {
      alert('Institution name is required');
      return;
    }
    
    // Create education object
    const newEducation = { 
      institution, 
      area, 
      studyType, 
      startDate, 
      endDate, 
      gpa, 
      courses 
    };
    
    // Update store
    if (this._currentEditIndex >= 0) {
      // Update existing education
      this._store.state.education[this._currentEditIndex] = newEducation;
    } else {
      // Add new education
      if (!Array.isArray(this._store.state.education)) {
        this._store.state.education = [];
      }
      this._store.state.education.push(newEducation);
    }
    
    // Hide modal
    const modal = this.shadowRoot.querySelector('#education-modal');
    modal.classList.remove('show');
    
    // Re-render education list
    this.renderEducation();
  }
  
  editEducation(index) {
    this.openEducationModal(index);
  }
  
  deleteEducation(index) {
    if (confirm('Are you sure you want to delete this education entry?')) {
      this._store.state.education.splice(index, 1);
      this.renderEducation();
    }
  }
  
  handleStateChange(state, change) {
    // Update education list if education has changed
    if (change && 
        (change.property === 'education' || 
         change.property.startsWith('education.') ||
         (change.reset && state.education))) {
      this.renderEducation();
    }
  }
}

// Define the custom element
customElements.define('education-panel', EducationPanel);
