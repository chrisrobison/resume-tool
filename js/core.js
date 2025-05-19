// core.js - Core application functionality
import { $, $$, escapeHtml, showToast } from './utils.js';
import { defaultResumeData } from './config.js';
import { setupUIEventListeners, switchTab } from './ui.js';
import { initLocalStorage, saveResumeToStorage, loadResumeFromStorage, loadSavedResumesList, saveNamedResume, loadNamedResume, deleteNamedResume } from './storage.js';
import { setupModals, renderProfiles, renderWork } from './modals.js';
import { setupPreviewEventListeners, renderPreview } from './preview.js';
import { setupImportFunctionality, setupExportFunctionality } from './import-export.js';

// Main application object
export const app = {
    data: { ...defaultResumeData },
    state: {
        loaded: false,
        currentEditIndex: -1,
        currentSection: null,
        touchEndX: 0,
        touchStartX: 0
    },
    
    // Initialize the application
    init() {
        initLocalStorage();
        this.setupEventListeners();
        this.setupSaveLoadEventListeners();
        this.loadSavedResume();
        this.state.loaded = true;
        
        // Set current date in lastModified field
        $('#lastModified').value = new Date().toISOString().split('T')[0];
        
        // Initialize view handlers after DOM is loaded
        const sidebarItems = $$('.sidebar-nav-item');
        if (sidebarItems.length > 0) {
            sidebarItems.forEach(item => {
                item.addEventListener('click', () => {
                    const viewId = item.dataset.view;
                    if (viewId) {
                        app.switchView(viewId);
                    }
                });
            });
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        setupUIEventListeners(this);
        setupPreviewEventListeners(this);
        setupModals(this);
        setupImportFunctionality(this);
        setupExportFunctionality(this);
        
        // Add event listeners for preview panel
        if ($('.tab[data-tab="preview"]')) {
            $('.tab[data-tab="preview"]').addEventListener('click', () => {
                renderPreview(this.data);
            });
        }
        
        // Copy button functionality
        $('#copy-button')?.addEventListener('click', () => {
            this.copyResume();
        });
    },
    
    // Setup save and load event listeners
    setupSaveLoadEventListeners() {
        // Save button functionality
        $('#save-button')?.addEventListener('click', () => {
            // Show save modal
            this.showSaveModal();
        });
        
        // Load button functionality
        $('#load-button')?.addEventListener('click', () => {
            // Show load modal
            this.showLoadModal();
        });
    },
    
    // Show save modal
    showSaveModal() {
        const modal = $('#save-modal');
        const saveName = $('#save-name');
        const saveExistingSection = $('#save-existing-section');
        const saveResumeBtn = $('#save-resume');
        
        if (!modal || !saveName || !saveExistingSection || !saveResumeBtn) return;
        
        // Default name based on the person's name or "My Resume"
        saveName.value = this.data.basics.name ? `${this.data.basics.name}'s Resume` : 'My Resume';
        
        // Check if resume with this name already exists
        const savedResumes = loadSavedResumesList();
        if (savedResumes && savedResumes[saveName.value]) {
            saveExistingSection.classList.remove('hidden');
        } else {
            saveExistingSection.classList.add('hidden');
        }
        
        // Event for checking existing resume while typing
        saveName.oninput = function() {
            if (savedResumes && savedResumes[this.value]) {
                saveExistingSection.classList.remove('hidden');
            } else {
                saveExistingSection.classList.add('hidden');
            }
        };
        
        // Save button event
        saveResumeBtn.onclick = () => {
            const name = saveName.value.trim();
            if (!name) {
                showToast('Please enter a name for your resume', 'error');
                return;
            }
            
            saveNamedResume(this.data, name);
            this.hideModal('save-modal');
        };
        
        modal.classList.remove('hidden');
    },
    
    // Show load modal
    showLoadModal() {
        const modal = $('#load-modal');
        const savedResumesList = $('#saved-resumes-list');
        
        if (!modal || !savedResumesList) return;
        
        // Clear existing list
        savedResumesList.innerHTML = '';
        
        // Get saved resumes
        const savedResumes = loadSavedResumesList();
        
        if (!savedResumes || Object.keys(savedResumes).length === 0) {
            savedResumesList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open fa-2x"></i>
                    <p>No saved resumes found. Save a resume first to see it here.</p>
                </div>
            `;
            modal.classList.remove('hidden');
            return;
        }
        
        // Create list of saved resumes
        Object.entries(savedResumes).forEach(([name, data]) => {
            const item = document.createElement('div');
            item.className = 'resume-list-item';
            
            const timestamp = new Date(data.timestamp);
            const formattedDate = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
            
            item.innerHTML = `
                <div class="resume-list-info">
                    <div class="resume-list-name">${escapeHtml(name)}</div>
                    <div class="resume-list-date">Last modified: ${formattedDate}</div>
                </div>
                <div class="resume-list-actions">
                    <button class="small-button load-resume" data-name="${escapeHtml(name)}">
                        <i class="fa-solid fa-folder-open"></i> Load
                    </button>
                    <button class="small-button delete-resume" data-name="${escapeHtml(name)}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            
            savedResumesList.appendChild(item);
        });
        
        // Add event listeners for load and delete buttons
        savedResumesList.querySelectorAll('.load-resume').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const resumeData = loadNamedResume(name);
                if (resumeData) {
                    this.data = resumeData;
                    this.updateAllFields();
                }
                this.hideModal('load-modal');
            });
        });
        
        savedResumesList.querySelectorAll('.delete-resume').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                if (confirm(`Are you sure you want to delete the resume "${name}"?`)) {
                    deleteNamedResume(name);
                    btn.closest('.resume-list-item').remove();
                    
                    // If no resumes left, show empty state
                    if (savedResumesList.querySelectorAll('.resume-list-item').length === 0) {
                        savedResumesList.innerHTML = `
                            <div class="empty-state">
                                <i class="fa-solid fa-folder-open fa-2x"></i>
                                <p>No saved resumes found. Save a resume first to see it here.</p>
                            </div>
                        `;
                    }
                }
            });
        });
        
        modal.classList.remove('hidden');
    },
    
    // Copy resume to clipboard
    copyResume() {
        const jsonData = JSON.stringify(this.data, null, 2);
        
        // Create temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = jsonData;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        
        // Select and copy the text
        textarea.select();
        let success = false;
        
        try {
            success = document.execCommand('copy');
            showToast(success ? 'Resume copied to clipboard' : 'Failed to copy resume', success ? 'success' : 'error');
        } catch (err) {
            console.error('Error copying to clipboard:', err);
            showToast('Failed to copy resume', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    },
    
    // Save named resume to localStorage
    saveNamedResume(name) {
        this.updateMetaLastModified();
        saveResumeToStorage(this.data);
        return saveNamedResume(this.data, name);
    },
    
    // Hide a modal by id
    hideModal(modalId) {
        const modal = $(`#${modalId}`);
        if (modal) {
            modal.classList.add('hidden');
        }
    },
    
    // Update meta.lastModified field
    updateMetaLastModified() {
        if (!this.state.loaded) return;
        this.data.meta.lastModified = new Date().toISOString();
        $('#lastModified').value = this.data.meta.lastModified.split('T')[0];
    },
    
    // Update all form fields from data
    updateAllFields() {
        if (!this.state.loaded) return;
        
        // Update basic fields
        const basicFields = ['name', 'label', 'email', 'phone', 'website', 'summary'];
        basicFields.forEach(field => {
            const element = $(`#${field}`);
            if (element) {
                element.value = this.data.basics[field] || '';
            }
        });
        
        // Update picture
        const pictureInput = $('#picture');
        const pictureImg = $('#pictureImg');
        
        if (pictureInput && pictureImg) {
            pictureInput.value = this.data.basics.picture || '';
            
            if (this.data.basics.picture) {
                pictureImg.src = this.data.basics.picture;
                pictureImg.classList.remove('hidden');
            } else {
                pictureImg.classList.add('hidden');
            }
        }
        
        // Update location fields
        const locationFields = ['address', 'postalCode', 'city', 'countryCode', 'region'];
        locationFields.forEach(field => {
            const element = $(`#${field}`);
            if (element) {
                element.value = this.data.basics.location[field] || '';
            }
        });
        
        // Update meta fields
        const metaFields = ['theme', 'language'];
        metaFields.forEach(field => {
            const element = $(`#${field}`);
            if (element) {
                element.value = this.data.meta[field] || '';
            }
        });
        
        // Update lastModified
        $('#lastModified').value = new Date(this.data.meta.lastModified).toISOString().split('T')[0];
        
        // Render all section lists
        renderProfiles(this);
        renderWork(this);
        // Also add other render functions for education, skills, projects
    }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});