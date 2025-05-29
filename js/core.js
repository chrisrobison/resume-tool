// core.js - Core application functionality
import * as utils from './utils.js';
import * as config from './config.js';
import * as ui from './ui.js';
import * as storage from './storage.js';
import * as modals from './modals.js';
import * as preview from './preview.js';
import * as importExport from './import-export.js';
import * as jobs from './jobs.js';
import * as logs from './logs.js';

// Import web components
import '../components/job-manager.js';
import '../components/resume-viewer.js';

// Main application object
export const app = {
    data: { ...config.defaultResumeData },
    state: {
        loaded: false,
        currentEditIndex: -1,
        currentEditJob: null,
        currentStatusJob: null,
        currentSection: null,
        touchEndX: 0,
        touchStartX: 0
    },
    
    // Initialize the application
    init() {
        storage.initLocalStorage();
        this.setupEventListeners();
        this.setupSaveLoadEventListeners();
        this.setupJobEventListeners();
        this.loadSavedResume();
        this.state.loaded = true;
        
        // Set current date in lastModified field
        utils.$('#lastModified').value = new Date().toISOString().split('T')[0];
        
        // If no resume was loaded, initialize empty data structures for sections
        if (!this.data.education) {
            this.data.education = [];
        }
        if (!this.data.skills) {
            this.data.skills = [];
        }
        if (!this.data.projects) {
            this.data.projects = [];
        }
        
        // Render all sections to ensure they display properly
        modals.renderEducation(this);
        modals.renderSkills(this);
        modals.renderProjects(this);
        
        // Initialize view handlers after DOM is loaded
        const sidebarItems = utils.$$('.sidebar-nav-item');
        if (sidebarItems.length > 0) {
            sidebarItems.forEach(item => {
                item.addEventListener('click', () => {
                    const viewId = item.dataset.view;
                    if (viewId) {
                        ui.switchView(viewId);
                        
                        // Additional actions when switching views
                        if (viewId === 'jobs') {
                            jobs.renderJobs(this);
                        } else if (viewId === 'history') {
                            logs.renderLogs(utils.$('#logs-container'));
                        }
                    }
                });
            });
        }
    },
    
    // Initialize job management event listeners
    setupJobEventListeners() {
        jobs.setupJobEventListeners(this);
        
        // Add job button
        utils.$('#add-job-button')?.addEventListener('click', () => {
            // Create a new job
            const newJob = jobs.createDefaultJob();
            this.state.currentEditJob = newJob.id;
            
            // Clear form fields
            const form = utils.$('#job-edit-form');
            if (form) form.reset();
            
            // Show edit modal
            modals.showModal('job-edit-modal');
        });
        
        // Save job button in edit modal
        utils.$('#save-job-edit')?.addEventListener('click', () => {
            this.saveJobFromForm();
        });
        
        // Update job status button
        utils.$('#update-job-status')?.addEventListener('click', () => {
            this.updateJobStatus();
        });
        
        // Log filters
        logs.setupLogFilters(utils.$('#logs-container'), utils.$('#log-filters-form'));
    },
    
    // Setup event listeners
    setupEventListeners() {
        ui.setupUIEventListeners(this);
        preview.setupPreviewEventListeners(this);
        modals.setupModals(this);
        importExport.setupImportFunctionality(this);
        importExport.setupExportFunctionality(this);
        
        // Add event listeners for preview panel
        if (utils.$('.tab[data-tab="preview"]')) {
            utils.$('.tab[data-tab="preview"]').addEventListener('click', () => {
                preview.renderPreview(this.data);
            });
        }
        
        // Copy button functionality
        utils.$('#copy-button')?.addEventListener('click', () => {
            this.copyResume();
        });
    },
    
    // Setup save and load event listeners
    setupSaveLoadEventListeners() {
        // Save button functionality
        utils.$('#save-button')?.addEventListener('click', () => {
            // Show save modal
            this.showSaveModal();
        });
        
        // Load button functionality
        utils.$('#load-button')?.addEventListener('click', () => {
            // Show load modal
            this.showLoadModal();
        });
    },
    
    // Show save modal
    showSaveModal() {
        const modal = utils.$('#save-modal');
        const saveName = utils.$('#save-name');
        const saveExistingSection = utils.$('#save-existing-section');
        const saveResumeBtn = utils.$('#save-resume');
        
        if (!modal || !saveName || !saveExistingSection || !saveResumeBtn) return;
        
        // Default name based on the person's name or "My Resume"
        saveName.value = this.data.basics.name ? `${this.data.basics.name}'s Resume` : 'My Resume';
        
        // Check if resume with this name already exists
        const savedResumes = storage.loadSavedResumesList();
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
                utils.showToast('Please enter a name for your resume', 'error');
                return;
            }
            
            storage.saveNamedResume(this.data, name);
            this.hideModal('save-modal');
        };
        
        modal.classList.remove('hidden');
    },
    
    // Show load modal
    showLoadModal() {
        const modal = utils.$('#load-modal');
        const savedResumesList = utils.$('#saved-resumes-list');
        
        if (!modal || !savedResumesList) return;
        
        // Clear existing list
        savedResumesList.innerHTML = '';
        
        // Get saved resumes
        const savedResumes = storage.loadSavedResumesList();
        
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
                    <div class="resume-list-name">${utils.escapeHtml(name)}</div>
                    <div class="resume-list-date">Last modified: ${formattedDate}</div>
                </div>
                <div class="resume-list-actions">
                    <button class="small-button load-resume" data-name="${utils.escapeHtml(name)}">
                        <i class="fa-solid fa-folder-open"></i> Load
                    </button>
                    <button class="small-button delete-resume" data-name="${utils.escapeHtml(name)}">
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
                const resumeData = storage.loadNamedResume(name);
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
                    storage.deleteNamedResume(name);
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
            utils.showToast(success ? 'Resume copied to clipboard' : 'Failed to copy resume', success ? 'success' : 'error');
        } catch (err) {
            console.error('Error copying to clipboard:', err);
            utils.showToast('Failed to copy resume', 'error');
        } finally {
            document.body.removeChild(textarea);
        }
    },
    
    // Save named resume to localStorage
    saveNamedResume(name) {
        this.updateMetaLastModified();
        storage.saveResumeToStorage(this.data);
        const resumeId = storage.saveNamedResume(this.data, name);
        return resumeId;
    },
    
    // Hide a modal by id
    hideModal(modalId) {
        // Use the imported hideModal function from modals.js
        modals.hideModal(modalId);
    },
    
    // Update meta.lastModified field
    updateMetaLastModified() {
        if (!this.state.loaded) return;
        this.data.meta.lastModified = new Date().toISOString();
        utils.$('#lastModified').value = this.data.meta.lastModified.split('T')[0];
    },
    
    // Load saved resume from localStorage
    loadSavedResume() {
        const savedResume = storage.loadResumeFromStorage();
        if (savedResume) {
            this.data = savedResume;
            this.updateAllFields();
            return true;
        }
        return false;
    },
    
    // Update all form fields from data
    updateAllFields() {
        if (!this.state.loaded) return;
        
        // Update basic fields
        const basicFields = ['name', 'label', 'email', 'phone', 'website', 'summary'];
        basicFields.forEach(field => {
            const element = utils.$(`#${field}`);
            if (element) {
                element.value = this.data.basics[field] || '';
            }
        });
        
        // Update picture
        const pictureInput = utils.$('#picture');
        const pictureImg = utils.$('#pictureImg');
        
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
            const element = utils.$(`#${field}`);
            if (element) {
                element.value = this.data.basics.location[field] || '';
            }
        });
        
        // Update meta fields
        const metaFields = ['theme', 'language'];
        metaFields.forEach(field => {
            const element = utils.$(`#${field}`);
            if (element) {
                element.value = this.data.meta[field] || '';
            }
        });
        
        // Update lastModified
        utils.$('#lastModified').value = new Date(this.data.meta.lastModified).toISOString().split('T')[0];
        
        // Render all section lists
        modals.renderProfiles(this);
        modals.renderWork(this);
        modals.renderEducation(this);
        modals.renderSkills(this);
        modals.renderProjects(this);
    },
    
    // Save job from edit form
    saveJobFromForm() {
        // Get form fields
        const title = utils.$('#edit-job-title').value.trim();
        const company = utils.$('#edit-job-company').value.trim();
        const location = utils.$('#edit-job-location').value.trim();
        const url = utils.$('#edit-job-url').value.trim();
        const contactName = utils.$('#edit-job-contact-name').value.trim();
        const contactEmail = utils.$('#edit-job-contact-email').value.trim();
        const contactPhone = utils.$('#edit-job-contact-phone').value.trim();
        const description = utils.$('#edit-job-description').value.trim();
        const notes = utils.$('#edit-job-notes').value.trim();
        const status = utils.$('#edit-job-status').value;
        
        // Validation
        if (!title || !company) {
            utils.showToast('Job title and company are required', 'error');
            return;
        }
        
        // Get all jobs
        const allJobs = jobs.loadJobs();
        let job;
        
        // Check if we're editing or creating
        if (this.state.currentEditJob && allJobs[this.state.currentEditJob]) {
            // Editing existing job
            job = allJobs[this.state.currentEditJob];
            const oldStatus = job.status;
            
            // Update fields
            job.title = title;
            job.company = company;
            job.location = location;
            job.url = url;
            job.contactName = contactName;
            job.contactEmail = contactEmail;
            job.contactPhone = contactPhone;
            job.description = description;
            job.notes = notes;
            job.dateUpdated = new Date().toISOString();
            
            // If status changed, add to history
            if (status !== oldStatus) {
                job.status = status;
                job.statusHistory.push({
                    from: oldStatus,
                    to: status,
                    date: new Date().toISOString(),
                    notes: 'Status updated while editing job details'
                });
                
                // Set dateApplied if changing to applied
                if (status === 'applied' && !job.dateApplied) {
                    job.dateApplied = new Date().toISOString();
                }
            }
            
            // Log action
            logs.logJobAction('update_job', job.id, {
                title: job.title,
                company: job.company
            });
        } else {
            // Creating new job
            job = jobs.createDefaultJob();
            job.title = title;
            job.company = company;
            job.location = location;
            job.url = url;
            job.contactName = contactName;
            job.contactEmail = contactEmail;
            job.contactPhone = contactPhone;
            job.description = description;
            job.notes = notes;
            job.status = status;
            
            // If status is not default, add to history
            if (status !== 'saved') {
                job.statusHistory.push({
                    from: 'saved',
                    to: status,
                    date: new Date().toISOString(),
                    notes: 'Initial status when creating job'
                });
                
                // Set dateApplied if status is applied
                if (status === 'applied') {
                    job.dateApplied = new Date().toISOString();
                }
            }
            
            // Log action
            logs.logJobAction('create_job', job.id, {
                title: job.title,
                company: job.company
            });
        }
        
        // Save the job
        jobs.saveJob(job);
        
        // Reset state
        this.state.currentEditJob = null;
        
        // Close modal
        modals.hideModal('job-edit-modal');
        
        // Refresh jobs list
        jobs.renderJobs(this);
        
        // Show success message
        utils.showToast('Job saved successfully', 'success');
    },
    
    // Update job status
    updateJobStatus() {
        if (!this.state.currentStatusJob) {
            utils.showToast('No job selected', 'error');
            return;
        }
        
        const status = utils.$('#job-status-update').value;
        const statusNotes = utils.$('#job-status-notes').value.trim();
        
        // Get all jobs
        const allJobs = jobs.loadJobs();
        
        // Check if job exists
        if (!allJobs[this.state.currentStatusJob]) {
            utils.showToast('Job not found', 'error');
            return;
        }
        
        // Get the job
        const job = allJobs[this.state.currentStatusJob];
        const oldStatus = job.status;
        
        // Update status
        job.status = status;
        job.dateUpdated = new Date().toISOString();
        
        // Add to history
        job.statusHistory.push({
            from: oldStatus,
            to: status,
            date: new Date().toISOString(),
            notes: statusNotes
        });
        
        // Set dateApplied if changing to applied
        if (status === 'applied' && !job.dateApplied) {
            job.dateApplied = new Date().toISOString();
        }
        
        // Save the job
        jobs.saveJob(job);
        
        // Log action
        logs.logJobAction('update_job_status', job.id, {
            title: job.title,
            company: job.company,
            oldStatus,
            newStatus: status
        });
        
        // Reset state
        this.state.currentStatusJob = null;
        
        // Close modal
        modals.hideModal('job-status-modal');
        
        // Refresh jobs list
        jobs.renderJobs(this);
        
        // Show success message
        utils.showToast(`Job status updated to: ${status}`, 'success');
    },
    
    // Load named resume by ID
    loadNamedResume(resumeId) {
        const savedResumes = storage.loadSavedResumesList();
        if (!savedResumes) return false;
        
        console.log("Loading resume with ID:", resumeId);
        console.log("Available resumes:", savedResumes);
        
        // Find the resume with the given ID
        for (const [name, resumeData] of Object.entries(savedResumes)) {
            console.log("Checking resume:", name, resumeData.id);
            if (resumeData.id === resumeId) {
                console.log("Found matching resume:", name);
                this.data = resumeData.data;
                this.updateAllFields();
                utils.showToast(`Loaded tailored resume for job`, 'success');
                
                // Import required modules (they are already imported at the top)
                // Switch to resume view if not already there
                const resumeViewItem = utils.$('.sidebar-nav-item[data-view="resume"]');
                if (resumeViewItem) {
                    resumeViewItem.click();
                }
                
                // Switch to preview tab
                const previewTab = utils.$('.tab[data-tab="preview"]');
                if (previewTab) {
                    previewTab.click();
                }
                
                return true;
            }
        }
        
        console.error("Resume not found with ID:", resumeId);
        utils.showToast('Resume not found', 'error');
        return false;
    }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});