/**
 * SkillsPanel component - Panel for editing skills information
 */
import { bindForm } from '../../utils/reactive-state.js';
import { renderList, createElement, textToList, listToText } from '../../utils/helpers.js';

export class SkillsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._skillsContainer = null;
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
        
        .skill-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .skill-badge {
          background-color: var(--section-bg, #f8f9fa);
          border-radius: 1rem;
          padding: 0.25rem 0.75rem;
          font-size: 0.9rem;
        }
        
        .skill-level {
          color: var(--secondary-color, #6c757d);
          font-style: italic;
          margin-left: 0.5rem;
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
          <div class="resume-section-title">Skills</div>
          <button id="add-skill" class="small-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Skill
          </button>
        </div>
        <div id="skills-container"></div>
      </div>
      
      <!-- Skill Modal -->
      <div id="skill-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add Skill</h3>
            <button class="modal-close">&times;</button>
          </div>
          <form id="skill-form">
            <div class="form-grid">
              <div class="input-group">
                <label for="skill-name">Skill Name</label>
                <input type="text" id="skill-name" name="name" placeholder="JavaScript, Project Management, etc." required>
              </div>
              <div class="input-group">
                <label for="skill-level">Level</label>
                <input type="text" id="skill-level" name="level" placeholder="Beginner, Intermediate, Advanced, Master">
              </div>
            </div>
            <div class="input-group">
              <label for="skill-keywords">Keywords (one per line)</label>
              <textarea id="skill-keywords" name="keywords" placeholder="React, Redux, Node.js"></textarea>
              <span class="help-text">Enter each keyword on a new line</span>
            </div>
            <div class="button-group">
              <button id="save-skill" type="submit" class="primary">Save</button>
              <button type="button" class="modal-cancel secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    this._skillsContainer = this.shadowRoot.querySelector('#skills-container');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Render skills list
    this.renderSkills();
  }
  
  setupEventListeners() {
    // Add skill button
    const addSkillBtn = this.shadowRoot.querySelector('#add-skill');
    if (addSkillBtn) {
      addSkillBtn.addEventListener('click', () => this.openSkillModal());
    }
    
    // Skill modal setup
    const skillModal = this.shadowRoot.querySelector('#skill-modal');
    const closeButtons = skillModal.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        skillModal.classList.remove('show');
      });
    });
    
    // Skill form submission
    const skillForm = this.shadowRoot.querySelector('#skill-form');
    skillForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSkill();
    });
  }
  
  renderSkills() {
    if (!this._store || !this._skillsContainer) return;
    
    const skills = this._store.state.skills || [];
    
    renderList(
      skills,
      (skill, index) => this.renderSkillItem(skill, index),
      this._skillsContainer,
      {
        emptyMessage: `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            <p>No skills added yet. Click the "Add Skill" button to add your professional skills.</p>
          </div>
        `,
        emptyClass: 'empty-state'
      }
    );
  }
  
  renderSkillItem(skill, index) {
    const item = createElement('div', { className: 'resume-item' }, [
      createElement('div', { className: 'resume-item-header' }, [
        createElement('strong', {}, [
          skill.name,
          skill.level && createElement('span', { className: 'skill-level' }, `(\${skill.level})`)
        ]),
        createElement('div', { className: 'resume-item-actions' }, [
          createElement('button', { 
            className: 'icon-button',
            dataset: { index },
            onClick: () => this.editSkill(index)
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
            onClick: () => this.deleteSkill(index)
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
      skill.keywords && skill.keywords.length > 0 && createElement('div', {}, [
        createElement('div', { className: 'skill-badges' },
          skill.keywords.map(keyword => 
            createElement('span', { className: 'skill-badge' }, keyword)
          )
        )
      ])
    ]);
    
    return item;
  }
  
  openSkillModal(index = -1) {
    const modal = this.shadowRoot.querySelector('#skill-modal');
    const title = modal.querySelector('.modal-title');
    const form = modal.querySelector('#skill-form');
    
    // Reset form
    form.reset();
    
    if (index >= 0) {
      // Editing existing skill
      const skill = this._store.state.skills[index];
      title.textContent = 'Edit Skill';
      
      // Fill form with skill data
      form.elements.name.value = skill.name || '';
      form.elements.level.value = skill.level || '';
      
      // Convert keywords array to text
      form.elements.keywords.value = listToText(skill.keywords || []);
      
      // Store index for later use
      this._currentEditIndex = index;
    } else {
      // Adding new skill
      title.textContent = 'Add Skill';
      this._currentEditIndex = -1;
    }
    
    // Show modal
    modal.classList.add('show');
  }
  
  saveSkill() {
    const form = this.shadowRoot.querySelector('#skill-form');
    
    // Get form data
    const name = form.elements.name.value.trim();
    const level = form.elements.level.value.trim();
    const keywords = textToList(form.elements.keywords.value);
    
    // Validate required fields
    if (!name) {
      alert('Skill name is required');
      return;
    }
    
    // Create skill object
    const newSkill = { name, level, keywords };
    
    // Update store
    if (this._currentEditIndex >= 0) {
      // Update existing skill
      this._store.state.skills[this._currentEditIndex] = newSkill;
    } else {
      // Add new skill
      if (!Array.isArray(this._store.state.skills)) {
        this._store.state.skills = [];
      }
      this._store.state.skills.push(newSkill);
    }
    
    // Hide modal
    const modal = this.shadowRoot.querySelector('#skill-modal');
    modal.classList.remove('show');
    
    // Re-render skills list
    this.renderSkills();
  }
  
  editSkill(index) {
    this.openSkillModal(index);
  }
  
  deleteSkill(index) {
    if (confirm('Are you sure you want to delete this skill?')) {
      this._store.state.skills.splice(index, 1);
      this.renderSkills();
    }
  }
  
  handleStateChange(state, change) {
    // Update skills list if skills has changed
    if (change && 
        (change.property === 'skills' || 
         change.property.startsWith('skills.') ||
         (change.reset && state.skills))) {
      this.renderSkills();
    }
  }
}

// Define the custom element
customElements.define('skills-panel', SkillsPanel);
