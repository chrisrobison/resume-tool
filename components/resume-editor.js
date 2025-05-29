class ResumeEditor extends HTMLElement {
    constructor() {
        super();
        this.data = this.getDefaultResumeData();
        this.state = {
            currentTab: 'basics',
            currentEditIndex: -1,
            loaded: false,
            touchStartX: 0,
            touchEndX: 0
        };
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadResumeData();
        this.state.loaded = true;
    }

    getDefaultResumeData() {
        return {
            basics: {
                name: "",
                label: "",
                email: "",
                phone: "",
                website: "",
                picture: "",
                summary: "",
                location: {
                    address: "",
                    postalCode: "",
                    city: "",
                    countryCode: "",
                    region: ""
                },
                profiles: []
            },
            work: [],
            education: [],
            skills: [],
            projects: [],
            meta: {
                theme: "",
                version: "1.0.0",
                language: "en",
                lastModified: new Date().toISOString()
            }
        };
    }

    render() {
        this.innerHTML = `
            <div class="resume-editor">
                <div class="tabs" role="tablist">
                    <div class="tab active" data-tab="basics" role="tab" aria-selected="true">Basics</div>
                    <div class="tab" data-tab="work" role="tab">Work</div>
                    <div class="tab" data-tab="education" role="tab">Education</div>
                    <div class="tab" data-tab="skills" role="tab">Skills</div>
                    <div class="tab" data-tab="projects" role="tab">Projects</div>
                    <div class="tab" data-tab="meta" role="tab">Meta</div>
                    <div class="tab" data-tab="preview" role="tab">Preview</div>
                </div>

                <div id="basics-panel" class="panel active" role="tabpanel" aria-labelledby="basics-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Basic Information</div>
                        </div>
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
                                <label for="website">Website</label>
                                <input type="url" id="website" name="website">
                            </div>
                            <div class="input-group">
                                <label for="picture">Image URL</label>
                                <input type="url" id="picture" name="picture">
                                <img id="pictureImg" width="100" style="display: none;">
                            </div>
                        </div>
                        <div class="input-group">
                            <label for="summary">Summary</label>
                            <textarea id="summary" name="summary"></textarea>
                        </div>
                    </div>
                    
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Location</div>
                        </div>
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
                    </div>
                    
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Profiles</div>
                            <button id="add-profile" class="small-button"><i class="fa-solid fa-plus"></i> Add Profile</button>
                        </div>
                        <div id="profiles-container">
                            <div class="empty-state" id="profiles-empty">
                                <i class="fa-solid fa-user-plus fa-2x"></i>
                                <p>No profiles added yet. Click the "Add Profile" button to add social media profiles.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="work-panel" class="panel" role="tabpanel" aria-labelledby="work-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Work Experience</div>
                            <button id="add-work" class="small-button"><i class="fa-solid fa-plus"></i> Add Work Experience</button>
                        </div>
                        <div id="work-container">
                            <div class="empty-state" id="work-empty">
                                <i class="fa-solid fa-briefcase fa-2x"></i>
                                <p>No work experience added yet. Click the "Add Work Experience" button to add your professional history.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="education-panel" class="panel" role="tabpanel" aria-labelledby="education-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Education</div>
                            <button id="add-education" class="small-button"><i class="fa-solid fa-plus"></i> Add Education</button>
                        </div>
                        <div id="education-container">
                            <div class="empty-state" id="education-empty">
                                <i class="fa-solid fa-graduation-cap fa-2x"></i>
                                <p>No education added yet. Click the "Add Education" button to add your educational background.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="skills-panel" class="panel" role="tabpanel" aria-labelledby="skills-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Skills</div>
                            <button id="add-skill" class="small-button"><i class="fa-solid fa-plus"></i> Add Skill</button>
                        </div>
                        <div id="skills-container">
                            <div class="empty-state" id="skills-empty">
                                <i class="fa-solid fa-code fa-2x"></i>
                                <p>No skills added yet. Click the "Add Skill" button to add your professional skills.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="projects-panel" class="panel" role="tabpanel" aria-labelledby="projects-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Projects</div>
                            <button id="add-project" class="small-button"><i class="fa-solid fa-plus"></i> Add Project</button>
                        </div>
                        <div id="projects-container">
                            <div class="empty-state" id="projects-empty">
                                <i class="fa-solid fa-diagram-project fa-2x"></i>
                                <p>No projects added yet. Click the "Add Project" button to add your notable projects.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="meta-panel" class="panel" role="tabpanel" aria-labelledby="meta-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Meta Information</div>
                        </div>
                        <div class="form-grid">
                            <div class="input-group">
                                <label for="theme">Theme</label>
                                <input type="text" id="theme" name="theme">
                            </div>
                            <div class="input-group">
                                <label for="version">Schema Version</label>
                                <input type="text" id="version" name="version" value="1.0.0" disabled>
                                <span class="help-text">Based on JSON Resume schema</span>
                            </div>
                            <div class="input-group">
                                <label for="language">Language</label>
                                <input type="text" id="language" name="language" placeholder="en">
                            </div>
                            <div class="input-group">
                                <label for="lastModified">Last Modified</label>
                                <input type="text" id="lastModified" name="lastModified" disabled>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="preview-panel" class="panel" role="tabpanel" aria-labelledby="preview-tab">
                    <div class="resume-section">
                        <div class="resume-section-header">
                            <div class="resume-section-title">Resume Preview</div>
                            <div class="button-group">
                                <button id="preview-refresh" class="small-button"><i class="fa-solid fa-sync"></i> Refresh</button>
                                <button id="preview-pdf" class="small-button"><i class="fa-solid fa-file-pdf"></i> Make PDF</button>
                                <button id="preview-print" class="small-button success"><i class="fa-solid fa-print"></i> Print</button>
                            </div>
                        </div>
                        <div id="preview-theme-selector" class="input-group" style="max-width: 200px; margin-bottom: 1rem;">
                            <label for="preview-theme">Theme</label>
                            <select id="preview-theme">
                                <option value="modern">Modern</option>
                                <option value="classic">Classic</option>
                                <option value="minimal">Minimal</option>
                            </select>
                        </div>
                        <div id="preview-container" class="card">
                            <div class="preview-loading">Loading preview...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Profile Modal -->
            <div id="profile-modal" class="modal-backdrop hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Profile</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <label for="profile-network">Network</label>
                            <input type="text" id="profile-network" placeholder="LinkedIn, Twitter, GitHub, etc.">
                        </div>
                        <div class="input-group">
                            <label for="profile-username">Username</label>
                            <input type="text" id="profile-username">
                        </div>
                        <div class="input-group">
                            <label for="profile-url">URL</label>
                            <input type="url" id="profile-url">
                        </div>
                    </div>
                    <div class="button-group">
                        <button id="save-profile" class="success"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="modal-cancel secondary"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Work Modal -->
            <div id="work-modal" class="modal-backdrop hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Work Experience</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <label for="work-name">Company</label>
                            <input type="text" id="work-name">
                        </div>
                        <div class="input-group">
                            <label for="work-position">Position</label>
                            <input type="text" id="work-position">
                        </div>
                        <div class="input-group">
                            <label for="work-startDate">Start Date</label>
                            <input type="text" id="work-startDate" placeholder="YYYY-MM-DD">
                        </div>
                        <div class="input-group">
                            <label for="work-endDate">End Date</label>
                            <input type="text" id="work-endDate" placeholder="YYYY-MM-DD or 'Present'">
                        </div>
                        <div class="input-group">
                            <label for="work-url">Company Website</label>
                            <input type="url" id="work-url">
                        </div>
                        <div class="input-group">
                            <label for="work-location">Location</label>
                            <input type="text" id="work-location">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="work-summary">Summary</label>
                        <textarea id="work-summary"></textarea>
                    </div>
                    <div class="input-group">
                        <label for="work-highlights">Highlights (one per line)</label>
                        <textarea id="work-highlights" placeholder="• Accomplished X by implementing Y which led to Z"></textarea>
                    </div>
                    <div class="button-group">
                        <button id="save-work" class="success"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="modal-cancel secondary"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Education Modal -->
            <div id="education-modal" class="modal-backdrop hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Education</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <label for="education-institution">Institution</label>
                            <input type="text" id="education-institution">
                        </div>
                        <div class="input-group">
                            <label for="education-area">Area of Study</label>
                            <input type="text" id="education-area">
                        </div>
                        <div class="input-group">
                            <label for="education-studyType">Degree Type</label>
                            <input type="text" id="education-studyType" placeholder="Bachelor's, Master's, Ph.D.">
                        </div>
                        <div class="input-group">
                            <label for="education-startDate">Start Date</label>
                            <input type="text" id="education-startDate" placeholder="YYYY-MM-DD">
                        </div>
                        <div class="input-group">
                            <label for="education-endDate">End Date</label>
                            <input type="text" id="education-endDate" placeholder="YYYY-MM-DD or 'Present'">
                        </div>
                        <div class="input-group">
                            <label for="education-gpa">GPA</label>
                            <input type="text" id="education-gpa">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="education-courses">Courses (one per line)</label>
                        <textarea id="education-courses"></textarea>
                    </div>
                    <div class="button-group">
                        <button id="save-education" class="success"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="modal-cancel secondary"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Skill Modal -->
            <div id="skills-modal" class="modal-backdrop hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Skill</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <label for="skill-name">Skill Name</label>
                            <input type="text" id="skill-name" placeholder="JavaScript, Project Management, etc.">
                        </div>
                        <div class="input-group">
                            <label for="skill-level">Level</label>
                            <input type="text" id="skill-level" placeholder="Beginner, Intermediate, Advanced, Master">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="skill-keywords">Keywords (one per line)</label>
                        <textarea id="skill-keywords" placeholder="React, Redux, Node.js"></textarea>
                    </div>
                    <div class="button-group">
                        <button id="save-skill" class="success"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="modal-cancel secondary"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Project Modal -->
            <div id="projects-modal" class="modal-backdrop hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Project</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="input-group">
                            <label for="project-name">Project Name</label>
                            <input type="text" id="project-name">
                        </div>
                        <div class="input-group">
                            <label for="project-startDate">Start Date</label>
                            <input type="text" id="project-startDate" placeholder="YYYY-MM-DD">
                        </div>
                        <div class="input-group">
                            <label for="project-endDate">End Date</label>
                            <input type="text" id="project-endDate" placeholder="YYYY-MM-DD or 'Present'">
                        </div>
                        <div class="input-group">
                            <label for="project-url">URL</label>
                            <input type="url" id="project-url">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="project-description">Description</label>
                        <textarea id="project-description"></textarea>
                    </div>
                    <div class="input-group">
                        <label for="project-highlights">Highlights (one per line)</label>
                        <textarea id="project-highlights"></textarea>
                    </div>
                    <div class="input-group">
                        <label for="project-keywords">Keywords (one per line)</label>
                        <textarea id="project-keywords"></textarea>
                    </div>
                    <div class="button-group">
                        <button id="save-project" class="success"><i class="fa-solid fa-check"></i> Save</button>
                        <button class="modal-cancel secondary"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab navigation
        this.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (tabId) {
                    this.switchTab(tabId);
                }
            });
        });

        // Basic form inputs
        this.setupBasicFormListeners();
        
        // Modals
        this.setupModals();
        
        // Section management
        this.setupSectionManagement();
        
        // Touch swipe navigation
        this.setupSwipeNavigation();
    }

    switchTab(tabId) {
        // Hide all panels
        this.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
        
        // Show selected panel
        const targetPanel = this.querySelector(`#${tabId}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // Update tab active state
        this.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });
        
        this.state.currentTab = tabId;
        
        // Special handling for preview tab
        if (tabId === 'preview') {
            this.renderPreview();
        }
    }

    setupBasicFormListeners() {
        // Basic information fields
        const basicFields = ['name', 'label', 'email', 'phone', 'website', 'summary'];
        
        basicFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', e => {
                    this.data.basics[field] = e.target.value;
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                });
            }
        });
        
        // Location fields
        const locationFields = ['address', 'postalCode', 'city', 'countryCode', 'region'];
        
        locationFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', e => {
                    this.data.basics.location[field] = e.target.value;
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                });
            }
        });
        
        // Meta fields
        const metaFields = ['theme', 'language'];
        
        metaFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', e => {
                    this.data.meta[field] = e.target.value;
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                });
            }
        });
        
        // Picture preview
        const pictureInput = this.querySelector('#picture');
        const pictureImg = this.querySelector('#pictureImg');
        
        if (pictureInput && pictureImg) {
            pictureInput.addEventListener('input', e => {
                this.data.basics.picture = e.target.value;
                
                if (e.target.value) {
                    pictureImg.src = e.target.value;
                    pictureImg.style.display = 'block';
                    
                    pictureImg.onerror = () => {
                        pictureImg.style.display = 'none';
                    };
                } else {
                    pictureImg.style.display = 'none';
                }
                
                this.updateMetaLastModified();
                this.saveToLocalStorage();
            });
        }
    }

    setupModals() {
        // Modal close handlers
        this.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-backdrop').classList.add('hidden');
            });
        });
        
        // Close modal when clicking outside
        this.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
        
        // Profile modal
        this.setupProfileModal();
        this.setupWorkModal();
        this.setupEducationModal();
        this.setupSkillsModal();
        this.setupProjectsModal();
    }

    setupProfileModal() {
        const addBtn = this.querySelector('#add-profile');
        const saveBtn = this.querySelector('#save-profile');
        
        addBtn?.addEventListener('click', () => {
            this.state.currentEditIndex = -1;
            this.clearModalFields('profile-modal');
            this.showModal('profile-modal');
        });
        
        saveBtn?.addEventListener('click', () => {
            const network = this.querySelector('#profile-network').value.trim();
            const username = this.querySelector('#profile-username').value.trim();
            const url = this.querySelector('#profile-url').value.trim();
            
            if (!network) {
                this.showToast('Network name is required', 'error');
                return;
            }
            
            const profileData = { network, username, url };
            
            if (this.state.currentEditIndex >= 0) {
                this.data.basics.profiles[this.state.currentEditIndex] = profileData;
            } else {
                this.data.basics.profiles.push(profileData);
            }
            
            this.renderProfiles();
            this.hideModal('profile-modal');
            this.updateMetaLastModified();
            this.saveToLocalStorage();
        });
        
        // Edit/delete profile events
        this.querySelector('#profiles-container').addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const button = e.target.closest('.edit-item');
                const index = parseInt(button.dataset.index);
                const profile = this.data.basics.profiles[index];
                
                this.querySelector('#profile-network').value = profile.network || '';
                this.querySelector('#profile-username').value = profile.username || '';
                this.querySelector('#profile-url').value = profile.url || '';
                
                this.state.currentEditIndex = index;
                this.showModal('profile-modal');
            } else if (e.target.closest('.delete-item')) {
                const button = e.target.closest('.delete-item');
                const index = parseInt(button.dataset.index);
                
                if (confirm('Are you sure you want to delete this profile?')) {
                    this.data.basics.profiles.splice(index, 1);
                    this.renderProfiles();
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                }
            }
        });
    }

    setupWorkModal() {
        const addBtn = this.querySelector('#add-work');
        const saveBtn = this.querySelector('#save-work');
        
        addBtn?.addEventListener('click', () => {
            this.state.currentEditIndex = -1;
            this.clearModalFields('work-modal');
            this.showModal('work-modal');
        });
        
        saveBtn?.addEventListener('click', () => {
            const name = this.querySelector('#work-name').value.trim();
            const position = this.querySelector('#work-position').value.trim();
            const startDate = this.querySelector('#work-startDate').value.trim();
            const endDate = this.querySelector('#work-endDate').value.trim();
            const url = this.querySelector('#work-url').value.trim();
            const location = this.querySelector('#work-location').value.trim();
            const summary = this.querySelector('#work-summary').value.trim();
            const highlightsText = this.querySelector('#work-highlights').value.trim();
            
            if (!name || !position) {
                this.showToast('Company name and position are required', 'error');
                return;
            }
            
            const highlights = highlightsText 
                ? highlightsText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                    .map(h => h.startsWith('• ') ? h.substring(2) : h)
                : [];
            
            const workData = {
                name, position, startDate, endDate, url, location, summary, highlights
            };
            
            if (this.state.currentEditIndex >= 0) {
                this.data.work[this.state.currentEditIndex] = workData;
            } else {
                this.data.work.push(workData);
            }
            
            this.renderWork();
            this.hideModal('work-modal');
            this.updateMetaLastModified();
            this.saveToLocalStorage();
        });
        
        // Edit/delete work events
        this.querySelector('#work-container').addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const button = e.target.closest('.edit-item');
                const index = parseInt(button.dataset.index);
                const work = this.data.work[index];
                
                this.querySelector('#work-name').value = work.name || '';
                this.querySelector('#work-position').value = work.position || '';
                this.querySelector('#work-startDate').value = work.startDate || '';
                this.querySelector('#work-endDate').value = work.endDate || '';
                this.querySelector('#work-url').value = work.url || '';
                this.querySelector('#work-location').value = work.location || '';
                this.querySelector('#work-summary').value = work.summary || '';
                this.querySelector('#work-highlights').value = work.highlights ? work.highlights.map(h => `• ${h}`).join('\n') : '';
                
                this.state.currentEditIndex = index;
                this.showModal('work-modal');
            } else if (e.target.closest('.delete-item')) {
                const button = e.target.closest('.delete-item');
                const index = parseInt(button.dataset.index);
                
                if (confirm('Are you sure you want to delete this work experience?')) {
                    this.data.work.splice(index, 1);
                    this.renderWork();
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                }
            }
        });
    }

    setupEducationModal() {
        const addBtn = this.querySelector('#add-education');
        const saveBtn = this.querySelector('#save-education');
        
        addBtn?.addEventListener('click', () => {
            this.state.currentEditIndex = -1;
            this.clearModalFields('education-modal');
            this.showModal('education-modal');
        });
        
        saveBtn?.addEventListener('click', () => {
            const institution = this.querySelector('#education-institution').value.trim();
            const studyType = this.querySelector('#education-studyType').value.trim();
            const area = this.querySelector('#education-area').value.trim();
            const startDate = this.querySelector('#education-startDate').value.trim();
            const endDate = this.querySelector('#education-endDate').value.trim();
            const gpa = this.querySelector('#education-gpa').value.trim();
            const coursesText = this.querySelector('#education-courses').value.trim();
            
            if (!institution || !studyType) {
                this.showToast('Institution and Study Type are required', 'error');
                return;
            }
            
            const courses = coursesText 
                ? coursesText.split('\n')
                    .map(c => c.trim())
                    .filter(c => c.length > 0)
                : [];
            
            const educationData = {
                institution, studyType, area, startDate, endDate, gpa, courses
            };
            
            if (this.state.currentEditIndex >= 0) {
                this.data.education[this.state.currentEditIndex] = educationData;
            } else {
                this.data.education.push(educationData);
            }
            
            this.renderEducation();
            this.hideModal('education-modal');
            this.updateMetaLastModified();
            this.saveToLocalStorage();
        });
        
        // Edit/delete education events
        this.querySelector('#education-container').addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const button = e.target.closest('.edit-item');
                const index = parseInt(button.dataset.index);
                const education = this.data.education[index];
                
                this.querySelector('#education-institution').value = education.institution || '';
                this.querySelector('#education-studyType').value = education.studyType || '';
                this.querySelector('#education-area').value = education.area || '';
                this.querySelector('#education-startDate').value = education.startDate || '';
                this.querySelector('#education-endDate').value = education.endDate || '';
                this.querySelector('#education-gpa').value = education.gpa || '';
                this.querySelector('#education-courses').value = education.courses ? education.courses.join('\n') : '';
                
                this.state.currentEditIndex = index;
                this.showModal('education-modal');
            } else if (e.target.closest('.delete-item')) {
                const button = e.target.closest('.delete-item');
                const index = parseInt(button.dataset.index);
                
                if (confirm('Are you sure you want to delete this education?')) {
                    this.data.education.splice(index, 1);
                    this.renderEducation();
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                }
            }
        });
    }

    setupSkillsModal() {
        const addBtn = this.querySelector('#add-skill');
        const saveBtn = this.querySelector('#save-skill');
        
        addBtn?.addEventListener('click', () => {
            this.state.currentEditIndex = -1;
            this.clearModalFields('skills-modal');
            this.showModal('skills-modal');
        });
        
        saveBtn?.addEventListener('click', () => {
            const name = this.querySelector('#skill-name').value.trim();
            const level = this.querySelector('#skill-level').value.trim();
            const keywordsText = this.querySelector('#skill-keywords').value.trim();
            
            if (!name) {
                this.showToast('Skill name is required', 'error');
                return;
            }
            
            const keywords = keywordsText 
                ? keywordsText.split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0)
                : [];
            
            const skillData = { name, level, keywords };
            
            if (this.state.currentEditIndex >= 0) {
                this.data.skills[this.state.currentEditIndex] = skillData;
            } else {
                this.data.skills.push(skillData);
            }
            
            this.renderSkills();
            this.hideModal('skills-modal');
            this.updateMetaLastModified();
            this.saveToLocalStorage();
        });
        
        // Edit/delete skills events
        this.querySelector('#skills-container').addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const button = e.target.closest('.edit-item');
                const index = parseInt(button.dataset.index);
                const skill = this.data.skills[index];
                
                this.querySelector('#skill-name').value = skill.name || '';
                this.querySelector('#skill-level').value = skill.level || '';
                this.querySelector('#skill-keywords').value = skill.keywords ? skill.keywords.join('\n') : '';
                
                this.state.currentEditIndex = index;
                this.showModal('skills-modal');
            } else if (e.target.closest('.delete-item')) {
                const button = e.target.closest('.delete-item');
                const index = parseInt(button.dataset.index);
                
                if (confirm('Are you sure you want to delete this skill?')) {
                    this.data.skills.splice(index, 1);
                    this.renderSkills();
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                }
            }
        });
    }

    setupProjectsModal() {
        const addBtn = this.querySelector('#add-project');
        const saveBtn = this.querySelector('#save-project');
        
        addBtn?.addEventListener('click', () => {
            this.state.currentEditIndex = -1;
            this.clearModalFields('projects-modal');
            this.showModal('projects-modal');
        });
        
        saveBtn?.addEventListener('click', () => {
            const name = this.querySelector('#project-name').value.trim();
            const description = this.querySelector('#project-description').value.trim();
            const startDate = this.querySelector('#project-startDate').value.trim();
            const endDate = this.querySelector('#project-endDate').value.trim();
            const url = this.querySelector('#project-url').value.trim();
            const highlightsText = this.querySelector('#project-highlights').value.trim();
            const keywordsText = this.querySelector('#project-keywords').value.trim();
            
            if (!name) {
                this.showToast('Project name is required', 'error');
                return;
            }
            
            const highlights = highlightsText 
                ? highlightsText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                : [];
                
            const keywords = keywordsText 
                ? keywordsText.split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0)
                : [];
            
            const projectData = {
                name, description, startDate, endDate, url, highlights, keywords
            };
            
            if (this.state.currentEditIndex >= 0) {
                this.data.projects[this.state.currentEditIndex] = projectData;
            } else {
                this.data.projects.push(projectData);
            }
            
            this.renderProjects();
            this.hideModal('projects-modal');
            this.updateMetaLastModified();
            this.saveToLocalStorage();
        });
        
        // Edit/delete projects events
        this.querySelector('#projects-container').addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const button = e.target.closest('.edit-item');
                const index = parseInt(button.dataset.index);
                const project = this.data.projects[index];
                
                this.querySelector('#project-name').value = project.name || '';
                this.querySelector('#project-description').value = project.description || '';
                this.querySelector('#project-startDate').value = project.startDate || '';
                this.querySelector('#project-endDate').value = project.endDate || '';
                this.querySelector('#project-url').value = project.url || '';
                this.querySelector('#project-highlights').value = project.highlights ? project.highlights.join('\n') : '';
                this.querySelector('#project-keywords').value = project.keywords ? project.keywords.join('\n') : '';
                
                this.state.currentEditIndex = index;
                this.showModal('projects-modal');
            } else if (e.target.closest('.delete-item')) {
                const button = e.target.closest('.delete-item');
                const index = parseInt(button.dataset.index);
                
                if (confirm('Are you sure you want to delete this project?')) {
                    this.data.projects.splice(index, 1);
                    this.renderProjects();
                    this.updateMetaLastModified();
                    this.saveToLocalStorage();
                }
            }
        });
    }

    setupSectionManagement() {
        // Preview buttons
        this.querySelector('#preview-refresh')?.addEventListener('click', () => {
            this.renderPreview();
        });
        
        this.querySelector('#preview-pdf')?.addEventListener('click', () => {
            this.generatePDF();
        });
        
        this.querySelector('#preview-print')?.addEventListener('click', () => {
            this.printPreview();
        });
    }

    setupSwipeNavigation() {
        const container = this.querySelector('.tabs');
        if (!container) return;
        
        container.addEventListener('touchstart', e => {
            this.state.touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        container.addEventListener('touchend', e => {
            if (!this.state.touchStartX) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const difference = this.state.touchStartX - touchEndX;
            const minSwipeDistance = 50;
            
            if (Math.abs(difference) < minSwipeDistance) return;
            
            const activeTab = this.querySelector('.tab.active');
            const tabs = Array.from(this.querySelectorAll('.tab'));
            const currentIndex = tabs.indexOf(activeTab);
            
            if (difference > 0) {
                // Swipe left, go to next tab
                const nextTab = tabs[currentIndex + 1];
                if (nextTab) {
                    this.switchTab(nextTab.dataset.tab);
                }
            } else {
                // Swipe right, go to previous tab
                const prevTab = tabs[currentIndex - 1];
                if (prevTab) {
                    this.switchTab(prevTab.dataset.tab);
                }
            }
            
            this.state.touchStartX = 0;
        }, { passive: true });
    }

    showModal(modalId) {
        const modal = this.querySelector(`#${modalId}`);
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                const firstInput = modal.querySelector('input, textarea, select');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    }

    hideModal(modalId) {
        const modal = this.querySelector(`#${modalId}`);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    clearModalFields(modalId) {
        const modal = this.querySelector(`#${modalId}`);
        if (!modal) return;
        
        modal.querySelectorAll('input, textarea').forEach(input => {
            input.value = '';
        });
    }

    createSectionItem(data, index, type) {
        const item = document.createElement('div');
        item.className = 'resume-item';
        
        let title, subtitle;
        
        switch (type) {
            case 'work':
                title = data.position || 'Untitled Position';
                subtitle = data.name || 'Unnamed Company';
                break;
            case 'education':
                title = data.studyType || 'Untitled Degree';
                subtitle = data.institution || 'Unnamed Institution';
                break;
            case 'skills':
                title = data.name || 'Unnamed Skill';
                subtitle = data.level || '';
                break;
            case 'projects':
                title = data.name || 'Untitled Project';
                subtitle = data.description ? data.description.substring(0, 40) + '...' : '';
                break;
            case 'profiles':
                title = data.network || 'Unnamed Network';
                subtitle = data.username || '';
                break;
        }
        
        item.innerHTML = `
            <div class="resume-item-header">
                <div class="resume-item-title">${this.escapeHtml(title)}</div>
                <div class="resume-item-subtitle">${this.escapeHtml(subtitle)}</div>
                <div class="resume-item-buttons">
                    <button class="icon-button edit-item" title="Edit" data-index="${index}" data-type="${type}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="icon-button delete-item" title="Delete" data-index="${index}" data-type="${type}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        
        return item;
    }

    renderProfiles() {
        const container = this.querySelector('#profiles-container');
        const emptyState = this.querySelector('#profiles-empty');
        
        if (!container) return;
        
        // Clear existing items except empty state
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) {
                container.removeChild(child);
            }
        });
        
        if (this.data.basics.profiles.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
        
        this.data.basics.profiles.forEach((profile, index) => {
            const item = this.createSectionItem(profile, index, 'profiles');
            container.appendChild(item);
        });
    }

    renderWork() {
        const container = this.querySelector('#work-container');
        const emptyState = this.querySelector('#work-empty');
        
        if (!container) return;
        
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) {
                container.removeChild(child);
            }
        });
        
        if (this.data.work.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
        
        this.data.work.forEach((work, index) => {
            const item = this.createSectionItem(work, index, 'work');
            container.appendChild(item);
        });
    }

    renderEducation() {
        const container = this.querySelector('#education-container');
        const emptyState = this.querySelector('#education-empty');
        
        if (!container) return;
        
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) {
                container.removeChild(child);
            }
        });
        
        if (this.data.education.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
        
        this.data.education.forEach((education, index) => {
            const item = this.createSectionItem(education, index, 'education');
            container.appendChild(item);
        });
    }

    renderSkills() {
        const container = this.querySelector('#skills-container');
        const emptyState = this.querySelector('#skills-empty');
        
        if (!container) return;
        
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) {
                container.removeChild(child);
            }
        });
        
        if (this.data.skills.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
        
        this.data.skills.forEach((skill, index) => {
            const item = this.createSectionItem(skill, index, 'skills');
            container.appendChild(item);
        });
    }

    renderProjects() {
        const container = this.querySelector('#projects-container');
        const emptyState = this.querySelector('#projects-empty');
        
        if (!container) return;
        
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) {
                container.removeChild(child);
            }
        });
        
        if (this.data.projects.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
        
        this.data.projects.forEach((project, index) => {
            const item = this.createSectionItem(project, index, 'projects');
            container.appendChild(item);
        });
    }

    renderPreview() {
        const container = this.querySelector('#preview-container');
        const theme = this.querySelector('#preview-theme').value;
        
        if (!container) return;
        
        container.innerHTML = this.generateResumeHTML(theme);
    }

    generateResumeHTML(theme = 'modern') {
        const { basics, work, education, skills, projects } = this.data;
        
        let html = `
            <div class="resume-preview ${theme}">
                <div class="resume-header">
                    <h1>${this.escapeHtml(basics.name || 'Your Name')}</h1>
                    <h2>${this.escapeHtml(basics.label || 'Job Title')}</h2>
                    <div class="contact-info">
                        ${basics.email ? `<span>${this.escapeHtml(basics.email)}</span>` : ''}
                        ${basics.phone ? `<span>${this.escapeHtml(basics.phone)}</span>` : ''}
                        ${basics.website ? `<span><a href="${basics.website}" target="_blank">${this.escapeHtml(basics.website)}</a></span>` : ''}
                    </div>
                </div>
        `;
        
        if (basics.summary) {
            html += `
                <div class="resume-section">
                    <h3>Summary</h3>
                    <p>${this.escapeHtml(basics.summary)}</p>
                </div>
            `;
        }
        
        if (work.length > 0) {
            html += `
                <div class="resume-section">
                    <h3>Work Experience</h3>
                    ${work.map(job => `
                        <div class="work-item">
                            <h4>${this.escapeHtml(job.position || 'Position')}</h4>
                            <h5>${this.escapeHtml(job.name || 'Company')} ${job.startDate || job.endDate ? `(${job.startDate || ''} - ${job.endDate || 'Present'})` : ''}</h5>
                            ${job.summary ? `<p>${this.escapeHtml(job.summary)}</p>` : ''}
                            ${job.highlights && job.highlights.length > 0 ? `
                                <ul>
                                    ${job.highlights.map(highlight => `<li>${this.escapeHtml(highlight)}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (education.length > 0) {
            html += `
                <div class="resume-section">
                    <h3>Education</h3>
                    ${education.map(edu => `
                        <div class="education-item">
                            <h4>${this.escapeHtml(edu.studyType || 'Degree')} ${edu.area ? `in ${this.escapeHtml(edu.area)}` : ''}</h4>
                            <h5>${this.escapeHtml(edu.institution || 'Institution')} ${edu.startDate || edu.endDate ? `(${edu.startDate || ''} - ${edu.endDate || 'Present'})` : ''}</h5>
                            ${edu.gpa ? `<p>GPA: ${this.escapeHtml(edu.gpa)}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (skills.length > 0) {
            html += `
                <div class="resume-section">
                    <h3>Skills</h3>
                    <div class="skills-list">
                        ${skills.map(skill => `
                            <div class="skill-item">
                                <strong>${this.escapeHtml(skill.name || 'Skill')}</strong>
                                ${skill.level ? ` - ${this.escapeHtml(skill.level)}` : ''}
                                ${skill.keywords && skill.keywords.length > 0 ? `<br><span class="keywords">${skill.keywords.map(k => this.escapeHtml(k)).join(', ')}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (projects.length > 0) {
            html += `
                <div class="resume-section">
                    <h3>Projects</h3>
                    ${projects.map(project => `
                        <div class="project-item">
                            <h4>${this.escapeHtml(project.name || 'Project Name')}</h4>
                            ${project.description ? `<p>${this.escapeHtml(project.description)}</p>` : ''}
                            ${project.highlights && project.highlights.length > 0 ? `
                                <ul>
                                    ${project.highlights.map(highlight => `<li>${this.escapeHtml(highlight)}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    generatePDF() {
        const element = this.querySelector('#preview-container');
        if (!element) return;
        
        const opt = {
            margin: 1,
            filename: `${this.data.basics.name || 'resume'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(element).save();
        } else {
            this.showToast('PDF generation library not loaded', 'error');
        }
    }

    printPreview() {
        const printWindow = window.open('', '_blank');
        const previewContent = this.querySelector('#preview-container').innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume - ${this.data.basics.name || 'Print'}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .resume-preview { max-width: 800px; margin: 0 auto; }
                    .resume-header h1 { margin: 0; font-size: 2em; }
                    .resume-header h2 { margin: 0; color: #666; font-size: 1.2em; }
                    .contact-info { margin: 10px 0; }
                    .contact-info span { margin-right: 15px; }
                    .resume-section { margin: 20px 0; }
                    .resume-section h3 { border-bottom: 2px solid #333; padding-bottom: 5px; }
                    .work-item, .education-item, .project-item { margin: 15px 0; }
                    .work-item h4, .education-item h4, .project-item h4 { margin: 0; }
                    .work-item h5, .education-item h5 { margin: 5px 0; color: #666; }
                    ul { margin: 10px 0; padding-left: 20px; }
                    .skills-list { display: flex; flex-wrap: wrap; gap: 10px; }
                    .skill-item { background: #f0f0f0; padding: 5px 10px; border-radius: 3px; }
                    .keywords { font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                ${previewContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    updateAllFields() {
        if (!this.state.loaded) return;
        
        // Update basic fields
        const basicFields = ['name', 'label', 'email', 'phone', 'website', 'summary'];
        basicFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.value = this.data.basics[field] || '';
            }
        });
        
        // Update picture
        const pictureInput = this.querySelector('#picture');
        const pictureImg = this.querySelector('#pictureImg');
        
        if (pictureInput && pictureImg) {
            pictureInput.value = this.data.basics.picture || '';
            
            if (this.data.basics.picture) {
                pictureImg.src = this.data.basics.picture;
                pictureImg.style.display = 'block';
            } else {
                pictureImg.style.display = 'none';
            }
        }
        
        // Update location fields
        const locationFields = ['address', 'postalCode', 'city', 'countryCode', 'region'];
        locationFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.value = this.data.basics.location[field] || '';
            }
        });
        
        // Update meta fields
        const metaFields = ['theme', 'language'];
        metaFields.forEach(field => {
            const element = this.querySelector(`#${field}`);
            if (element) {
                element.value = this.data.meta[field] || '';
            }
        });
        
        // Update lastModified
        const lastModifiedEl = this.querySelector('#lastModified');
        if (lastModifiedEl) {
            lastModifiedEl.value = new Date(this.data.meta.lastModified).toISOString().split('T')[0];
        }
        
        // Render all section lists
        this.renderProfiles();
        this.renderWork();
        this.renderEducation();
        this.renderSkills();
        this.renderProjects();
    }

    updateMetaLastModified() {
        if (!this.state.loaded) return;
        this.data.meta.lastModified = new Date().toISOString();
        const lastModifiedEl = this.querySelector('#lastModified');
        if (lastModifiedEl) {
            lastModifiedEl.value = this.data.meta.lastModified.split('T')[0];
        }
    }

    loadResumeData() {
        const saved = localStorage.getItem('resumeJson');
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                this.updateAllFields();
            } catch (e) {
                console.error('Error loading resume data:', e);
            }
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('resumeJson', JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving resume data:', e);
        }
    }

    // Public API methods
    getResumeData() {
        return this.data;
    }

    setResumeData(data) {
        this.data = { ...this.getDefaultResumeData(), ...data };
        this.updateAllFields();
        this.saveToLocalStorage();
    }

    exportJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.setResumeData(data);
            this.showToast('Resume imported successfully', 'success');
        } catch (e) {
            this.showToast('Invalid JSON format', 'error');
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    showToast(message, type = 'info') {
        // Create toast if it doesn't exist
        let toast = document.querySelector('#toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Register the custom element
customElements.define('resume-editor', ResumeEditor);

export default ResumeEditor;