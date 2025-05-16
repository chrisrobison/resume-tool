/**
 * BasicsPanel component - Panel for editing basic resume information
 */
import { bindForm } from '../../utils/reactive-state.js';
import { renderList, createElement } from '../../utils/helpers.js';

export class BasicsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._store = null;
    this._profilesContainer = null;
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
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
      
      <div class="resume-section">
        <div class="resume-section-header">
          <div class="resume-section-title">Basic Information</div>
        </div>
        <form id="basics-form">
          <div class="form-grid">
            <div class="input-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name">
            </div>
            <div class="input-group">
              <label for="label">Job Title</label>
              <input type="text" id="label" name="label">
            </div>
            <div class="input-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email">
            </div>
            <div class="input-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone">
            </div>
            <div class="input-group">
              <label for="url">Website</label>
              <input type="url" id="url" name="url">
            </div>
            <div class="input-group">
              <label for="image">Image URL</label>
              <input type="url" id="image" name="image">
            </div>
          </div>
          <div class="input-group">
            <label for="summary">Summary</label>
            <textarea id="summary" name="summary"></textarea>
          </div>
        </form>
      </div>
      
      <div class="resume-section">
        <div class="resume-section-header">
          <div class="resume-section-title">Location</div>
        </div>
        <form id="location-form">
          <div class="form-grid">
            <div class="input-group">
              <label for="address">Address</label>
              <input type="text" id="address" name="address">
            </div>
            <div class="input-group">
              <label for="postalCode">Postal Code</label>
              <input type="text" id="postalCode" name="postalCode">
            </div>
            <div class="input-group">
              <label for="city">City</label>
              <input type="text" id="city" name="city">
            </div>
            <div class="input-group">
              <label for="region">Region/State</label>
              <input type="text" id="region" name="region">
            </div>
            <div class="input-group">
              <label for="countryCode">Country Code</label>
              <input type="text" id="countryCode" name="countryCode">
            </div>
          </div>
        </form>
      </div>
      
      <div class="resume-section">
        <div class="resume-section-header">
          <div class="resume-section-title">Profiles</div>
          <button id="add-profile" class="small-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Profile
          </button>
        </div>
        <div id="profiles-container"></div>
      </div>
      
      <!-- Profile Modal -->
      <div id="profile-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add Profile</h3>
            <button class="modal-close">&times;</button>
          </div>
          <form id="profile-form">
            <div class="form-grid">
              <div class="input-group">
                <label for="profile-network">Network</label>
                <input type="text" id="profile-network" name="network" placeholder="LinkedIn, Twitter, GitHub, etc.">
              </div>
              <div class="input-group">
                <label for="profile-username">Username</label>
                <input type="text" id="profile-username" name="username">
              </div>
              <div class="input-group">
                <label for="profile-url">URL</label>
                <input type="url" id="profile-url" name="url">
              </div>
            </div>
            <div class="button-group">
              <button id="save-profile" type="submit" class="primary">Save</button>
              <button type="button" class="modal-cancel secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    this._profilesContainer = this.shadowRoot.querySelector('#profiles-container');
    
    // Bind forms to store
    this.bindForms();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Render profiles list
    this.renderProfiles();
  }
  
  bindForms() {
    if (!this._store) return;
    
    // Bind basic info form
    const basicsForm = this.shadowRoot.querySelector('#basics-form');
    const basicsUpdateFn = bindForm(basicsForm, this._store.state.basics);
    
    // Bind location form
    const locationForm = this.shadowRoot.querySelector('#location-form');
    const locationUpdateFn = bindForm(locationForm, this._store.state.basics.location, 'location');
    
    // Store update functions for later use
    this._formUpdateFn = (state) => {
      basicsUpdateFn(state);
      locationUpdateFn(state);
    };
  }
  
  setupEventListeners() {
    // Add profile button
    const addProfileBtn = this.shadowRoot.querySelector('#add-profile');
    if (addProfileBtn) {
      addProfileBtn.addEventListener('click', () => this.openProfileModal());
    }
    
    // Profile modal setup
    const profileModal = this.shadowRoot.querySelector('#profile-modal');
    const closeButtons = profileModal.querySelectorAll('.modal-close, .modal-cancel');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
      });
    });
    
    // Profile form submission
    const profileForm = this.shadowRoot.querySelector('#profile-form');
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfile();
    });
  }
  
  renderProfiles() {
    if (!this._store || !this._profilesContainer) return;
    
    const profiles = this._store.state.basics.profiles || [];
    
    renderList(
      profiles,
      (profile, index) => this.renderProfileItem(profile, index),
      this._profilesContainer,
      {
        emptyMessage: `
          <div class="empty-state" id="profiles-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M15 7h2"></path>
              <path d="M9 7H7"></path>
            </svg>
            <p>No profiles added yet. Click the "Add Profile" button to add social media profiles.</p>
          </div>
        `,
        emptyClass: 'empty-state'
      }
    );
  }
  
  renderProfileItem(profile, index) {
    const item = createElement('div', { className: 'resume-item' }, [
      createElement('div', { className: 'resume-item-header' }, [
        createElement('strong', {}, profile.network || 'Profile'),
        createElement('div', { className: 'resume-item-actions' }, [
          createElement('button', { 
            className: 'icon-button',
            dataset: { index },
            onClick: () => this.editProfile(index)
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
            onClick: () => this.deleteProfile(index)
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
        profile.username && createElement('div', {}, `Username: \${profile.username}`),
        profile.url && createElement('div', {}, [
          'URL: ',
          createElement('a', { href: profile.url, target: '_blank' }, profile.url)
        ])
      ])
    ]);
    
    return item;
  }
  
  openProfileModal(index = -1) {
    const modal = this.shadowRoot.querySelector('#profile-modal');
    const title = modal.querySelector('.modal-title');
    const form = modal.querySelector('#profile-form');
    
    // Reset form
    form.reset();
    
    if (index >= 0) {
      // Editing existing profile
      const profile = this._store.state.basics.profiles[index];
      title.textContent = 'Edit Profile';
      
      // Fill form with profile data
      form.elements.network.value = profile.network || '';
      form.elements.username.value = profile.username || '';
      form.elements.url.value = profile.url || '';
      
      // Store index for later use
      form.dataset.index = index;
    } else {
      // Adding new profile
      title.textContent = 'Add Profile';
      delete form.dataset.index;
    }
    
    // Show modal
    modal.classList.remove('hidden');
  }
  
  saveProfile() {
    const form = this.shadowRoot.querySelector('#profile-form');
    const index = form.dataset.index !== undefined ? parseInt(form.dataset.index) : -1;
    
    // Get form data
    const network = form.elements.network.value.trim();
    const username = form.elements.username.value.trim();
    const url = form.elements.url.value.trim();
    
    // Validate
    if (!network) {
      alert('Network name is required');
      return;
    }
    
    // Create profile object
    const newProfile = { network, username, url };
    
    // Update store
    if (index >= 0) {
      // Update existing profile
      this._store.state.basics.profiles[index] = newProfile;
    } else {
      // Add new profile
      if (!Array.isArray(this._store.state.basics.profiles)) {
        this._store.state.basics.profiles = [];
      }
      this._store.state.basics.profiles.push(newProfile);
    }
    
    // Hide modal
    const modal = this.shadowRoot.querySelector('#profile-modal');
    modal.classList.add('hidden');
    
    // Re-render profiles
    this.renderProfiles();
  }
  
  editProfile(index) {
    this.openProfileModal(index);
  }
  
  deleteProfile(index) {
    if (confirm('Are you sure you want to delete this profile?')) {
      this._store.state.basics.profiles.splice(index, 1);
      this.renderProfiles();
    }
  }
  
  handleStateChange(state, change) {
    // Update forms when store changes
    if (this._formUpdateFn) {
      this._formUpdateFn(state);
    }
    
    // Update profiles list if profiles have changed
    if (change && 
        (change.property === 'basics.profiles' || 
         change.property.startsWith('basics.profiles.') ||
         (change.reset && state.basics && state.basics.profiles))) {
      this.renderProfiles();
    }
  }
}

// Define the custom element
customElements.define('basics-panel', BasicsPanel);
