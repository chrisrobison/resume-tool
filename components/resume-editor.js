// Resume Editor Web Component
class ResumeEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._resumeData = {
            basics: {
                name: '',
                label: '',
                email: '',
                phone: '',
                url: '',
                summary: '',
                location: {
                    address: '',
                    postalCode: '',
                    city: '',
                    countryCode: '',
                    region: ''
                },
                profiles: []
            },
            work: [],
            education: [],
            skills: [],
            languages: [],
            projects: []
        };
        this._activeSection = 'basics';
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    set resumeData(data) {
        this._resumeData = data;
        this.render();
    }

    get resumeData() {
        return this._resumeData;
    }

    render() {
        const styles = `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #333;
            }
            
            * {
                box-sizing: border-box;
            }
            
            .editor-container {
                display: grid;
                grid-template-columns: 250px 1fr;
                gap: 20px;
                height: 100%;
            }
            
            .sidebar {
                background: #f8f9fa;
                padding: 20px;
                border-right: 1px solid #dee2e6;
            }
            
            .main-content {
                display: grid;
                grid-template-columns: 1fr 300px;
                gap: 20px;
                padding: 20px;
                height: 100%;
                overflow: auto;
            }
            
            .editor-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .analytics-panel {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                height: fit-content;
            }
            
            .toggle-analytics {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .toggle-analytics:hover {
                background: #0056b3;
            }
            
            @media (max-width: 1200px) {
                .main-content {
                    grid-template-columns: 1fr;
                }
                
                .analytics-panel {
                    display: none;
                }
                
                .analytics-panel.visible {
                    display: block;
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    max-width: 400px;
                    z-index: 1000;
                    overflow-y: auto;
                }
            }
            
            .sidebar-item {
                padding: 12px 20px;
                cursor: pointer;
                border-bottom: 1px solid #e0e0e0;
                transition: background-color 0.2s;
            }
            
            .sidebar-item:hover {
                background: #e9ecef;
            }
            
            .sidebar-item.active {
                background: #007bff;
                color: white;
            }
            
            .content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            
            .section {
                display: none;
            }
            
            .section.active {
                display: block;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #495057;
            }
            
            input, textarea, select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.15s;
            }
            
            input:focus, textarea:focus, select:focus {
                outline: none;
                border-color: #80bdff;
                box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
            }
            
            textarea {
                min-height: 100px;
                resize: vertical;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #545b62;
            }
            
            .btn-danger {
                background: #dc3545;
                color: white;
            }
            
            .btn-danger:hover {
                background: #c82333;
            }
            
            .btn-sm {
                padding: 4px 8px;
                font-size: 12px;
            }
            
            .item-card {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .item-title {
                font-weight: 600;
                color: #212529;
            }
            
            .item-subtitle {
                color: #6c757d;
                font-size: 14px;
            }
            
            .btn-group {
                display: flex;
                gap: 5px;
            }
            
            .add-button {
                margin-bottom: 20px;
            }
            
            .highlight-item {
                background: #e9ecef;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .skill-keywords {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 10px;
            }
            
            .keyword-tag {
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            
            .keyword-tag button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                font-size: 16px;
                line-height: 1;
            }
            
            .section-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 20px;
                color: #212529;
            }
            
            .actions-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid #dee2e6;
            }
            
            .json-actions {
                display: flex;
                gap: 10px;
            }
            
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
            }
            
            .modal.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .modal-title {
                font-size: 20px;
                font-weight: 600;
            }
            
            .close-button {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
            }
            
            .json-textarea {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                min-height: 400px;
            }
        `;

        const html = `
            <div class="editor-container">
                <div class="sidebar">
                    <h2>Resume Editor</h2>
                    <nav>
                        <ul>
                            <li><a href="#basics" class="active">Basic Information</a></li>
                            <li><a href="#work">Work Experience</a></li>
                            <li><a href="#education">Education</a></li>
                            <li><a href="#skills">Skills</a></li>
                            <li><a href="#projects">Projects</a></li>
                            <li><a href="#languages">Languages</a></li>
                        </ul>
                    </nav>
                    <div class="actions">
                        <button id="saveJson">Save as JSON</button>
                        <button id="loadJson">Load JSON</button>
                        <button id="clearData">Clear Data</button>
                    </div>
                </div>
                <div class="main-content">
                    <div class="editor-section">
                        <div id="basics-section"></div>
                        <div id="work-section"></div>
                        <div id="education-section"></div>
                        <div id="skills-section"></div>
                        <div id="projects-section"></div>
                        <div id="languages-section"></div>
                    </div>
                    <div class="analytics-panel">
                        <resume-analytics></resume-analytics>
                    </div>
                </div>
            </div>
            <button class="toggle-analytics" title="Toggle Analytics">
                <i class="fa-solid fa-chart-line"></i>
            </button>
        `;

        this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
        this.setupEventListeners();
    }

    getSectionTitle() {
        const titles = {
            basics: 'Basic Information',
            work: 'Work Experience',
            education: 'Education',
            skills: 'Skills',
            projects: 'Projects',
            languages: 'Languages'
        };
        return titles[this._activeSection] || this._activeSection;
    }

    renderSection() {
        switch (this._activeSection) {
            case 'basics':
                return this.renderBasicsSection();
            case 'work':
                return this.renderWorkSection();
            case 'education':
                return this.renderEducationSection();
            case 'skills':
                return this.renderSkillsSection();
            case 'projects':
                return this.renderProjectsSection();
            case 'languages':
                return this.renderLanguagesSection();
            default:
                return '<p>Select a section to edit</p>';
        }
    }

    renderBasicsSection() {
        const basics = this._resumeData.basics || {};
        const location = basics.location || {};
        const profiles = basics.profiles || [];

        return `
            <div class="section active" id="basics-section">
                <div class="form-row">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="basics-name" value="${basics.name || ''}" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Title/Label</label>
                        <input type="text" id="basics-label" value="${basics.label || ''}" placeholder="Full Stack Developer">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="basics-email" value="${basics.email || ''}" placeholder="john@example.com">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="basics-phone" value="${basics.phone || ''}" placeholder="(555) 123-4567">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Website</label>
                    <input type="url" id="basics-url" value="${basics.url || ''}" placeholder="https://johndoe.com">
                </div>
                
                <div class="form-group">
                    <label>Summary</label>
                    <textarea id="basics-summary" placeholder="A brief description about yourself...">${basics.summary || ''}</textarea>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">Location</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>City</label>
                        <input type="text" id="location-city" value="${location.city || ''}" placeholder="San Francisco">
                    </div>
                    <div class="form-group">
                        <label>Region/State</label>
                        <input type="text" id="location-region" value="${location.region || ''}" placeholder="California">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Postal Code</label>
                        <input type="text" id="location-postalCode" value="${location.postalCode || ''}" placeholder="94105">
                    </div>
                    <div class="form-group">
                        <label>Country Code</label>
                        <input type="text" id="location-countryCode" value="${location.countryCode || ''}" placeholder="US">
                    </div>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">Social Profiles</h3>
                <button class="btn btn-primary add-button" data-click="handleAddProfile">Add Profile</button>
                <div id="profiles-list">
                    ${profiles.map((profile, index) => `
                        <div class="item-card">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Network</label>
                                    <input type="text" id="profile-network-${index}" value="${profile.network || ''}" placeholder="LinkedIn">
                                </div>
                                <div class="form-group">
                                    <label>Username</label>
                                    <input type="text" id="profile-username-${index}" value="${profile.username || ''}" placeholder="johndoe">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>URL</label>
                                <input type="url" id="profile-url-${index}" value="${profile.url || ''}" placeholder="https://linkedin.com/in/johndoe">
                            </div>
                            <button class="btn btn-danger btn-sm" data-click="handleRemoveProfile" data-index="${index}">Remove</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderWorkSection() {
        const work = this._resumeData.work || [];
        
        return `
            <div class="section active" id="work-section">
                <button class="btn btn-primary add-button" data-click="handleAddWork">Add Work Experience</button>
                <div id="work-list">
                    ${work.map((job, index) => `
                        <div class="item-card">
                            <div class="item-header">
                                <div>
                                    <div class="item-title">${job.position || 'Position'} at ${job.name || 'Company'}</div>
                                    <div class="item-subtitle">${this.formatDateRange(job.startDate, job.endDate)}</div>
                                </div>
                                <button class="btn btn-danger btn-sm" data-click="handleRemoveWork" data-index="${index}">Remove</button>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Company Name</label>
                                    <input type="text" id="work-name-${index}" value="${job.name || ''}" placeholder="Tech Corp">
                                </div>
                                <div class="form-group">
                                    <label>Position</label>
                                    <input type="text" id="work-position-${index}" value="${job.position || ''}" placeholder="Senior Developer">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" id="work-startDate-${index}" value="${job.startDate || ''}">
                                </div>
                                <div class="form-group">
                                    <label>End Date (leave empty for current)</label>
                                    <input type="date" id="work-endDate-${index}" value="${job.endDate || ''}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Website</label>
                                <input type="url" id="work-url-${index}" value="${job.url || ''}" placeholder="https://company.com">
                            </div>
                            
                            <div class="form-group">
                                <label>Summary</label>
                                <textarea id="work-summary-${index}" placeholder="Describe your role and responsibilities...">${job.summary || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>Highlights</label>
                                <button class="btn btn-secondary btn-sm" data-click="handleAddWorkHighlight" data-index="${index}" style="margin-bottom: 10px;">Add Highlight</button>
                                <div id="work-highlights-${index}">
                                    ${(job.highlights || []).map((highlight, hIndex) => `
                                        <div class="highlight-item">
                                            <input type="text" value="${highlight}" id="work-highlight-${index}-${hIndex}" style="flex: 1; margin-right: 10px;">
                                            <button class="btn btn-danger btn-sm" data-click="handleRemoveWorkHighlight" data-index="${index}" data-highlight-index="${hIndex}">Remove</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderEducationSection() {
        const education = this._resumeData.education || [];
        
        return `
            <div class="section active" id="education-section">
                <button class="btn btn-primary add-button" data-click="handleAddEducation">Add Education</button>
                <div id="education-list">
                    ${education.map((edu, index) => `
                        <div class="item-card">
                            <div class="item-header">
                                <div>
                                    <div class="item-title">${edu.studyType || 'Degree'} in ${edu.area || 'Field'}</div>
                                    <div class="item-subtitle">${edu.institution || 'Institution'}</div>
                                </div>
                                <button class="btn btn-danger btn-sm" data-click="handleRemoveEducation" data-index="${index}">Remove</button>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Institution</label>
                                    <input type="text" id="education-institution-${index}" value="${edu.institution || ''}" placeholder="University of Technology">
                                </div>
                                <div class="form-group">
                                    <label>Degree Type</label>
                                    <input type="text" id="education-studyType-${index}" value="${edu.studyType || ''}" placeholder="Bachelor">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Area/Major</label>
                                    <input type="text" id="education-area-${index}" value="${edu.area || ''}" placeholder="Computer Science">
                                </div>
                                <div class="form-group">
                                    <label>GPA/Score</label>
                                    <input type="text" id="education-score-${index}" value="${edu.score || ''}" placeholder="3.8">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" id="education-startDate-${index}" value="${edu.startDate || ''}">
                                </div>
                                <div class="form-group">
                                    <label>End Date</label>
                                    <input type="date" id="education-endDate-${index}" value="${edu.endDate || ''}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Website</label>
                                <input type="url" id="education-url-${index}" value="${edu.url || ''}" placeholder="https://university.edu">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSkillsSection() {
        const skills = this._resumeData.skills || [];
        
        return `
            <div class="section active" id="skills-section">
                <button class="btn btn-primary add-button" data-click="handleAddSkill">Add Skill Category</button>
                <div id="skills-list">
                    ${skills.map((skill, index) => `
                        <div class="item-card">
                            <div class="item-header">
                                <div>
                                    <div class="item-title">${skill.name || 'Skill Category'}</div>
                                    <div class="item-subtitle">Level: ${skill.level || 'Not specified'}</div>
                                </div>
                                <button class="btn btn-danger btn-sm" data-click="handleRemoveSkill" data-index="${index}">Remove</button>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Category Name</label>
                                    <input type="text" id="skill-name-${index}" value="${skill.name || ''}" placeholder="Frontend Development">
                                </div>
                                <div class="form-group">
                                    <label>Level</label>
                                    <select id="skill-level-${index}">
                                        <option value="" ${skill.level === '' ? 'selected' : ''}>Select Level</option>
                                        <option value="Beginner" ${skill.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                                        <option value="Intermediate" ${skill.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                                        <option value="Advanced" ${skill.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                                        <option value="Expert" ${skill.level === 'Expert' ? 'selected' : ''}>Expert</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Keywords/Technologies</label>
                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <input type="text" id="skill-keyword-input-${index}" placeholder="Add a skill...">
                                    <button class="btn btn-secondary" data-click="handleAddSkillKeyword" data-index="${index}">Add</button>
                                </div>
                                <div class="skill-keywords" id="skill-keywords-${index}">
                                    ${(skill.keywords || []).map((keyword, kIndex) => `
                                        <span class="keyword-tag">
                                            ${keyword}
                                            <button data-click="handleRemoveSkillKeyword" data-index="${index}" data-keyword-index="${kIndex}">&times;</button>
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderProjectsSection() {
        const projects = this._resumeData.projects || [];
        
        return `
            <div class="section active" id="projects-section">
                <button class="btn btn-primary add-button" data-click="handleAddProject">Add Project</button>
                <div id="projects-list">
                    ${projects.map((project, index) => `
                        <div class="item-card">
                            <div class="item-header">
                                <div>
                                    <div class="item-title">${project.name || 'Project Name'}</div>
                                    <div class="item-subtitle">${project.type || 'Project'}</div>
                                </div>
                                <button class="btn btn-danger btn-sm" data-click="handleRemoveProject" data-index="${index}">Remove</button>
                            </div>
                            
                            <div class="form-group">
                                <label>Project Name</label>
                                <input type="text" id="project-name-${index}" value="${project.name || ''}" placeholder="Awesome Project">
                            </div>
                            
                            <div class="form-group">
                                <label>Description</label>
                                <textarea id="project-description-${index}" placeholder="Describe your project...">${project.description || ''}</textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" id="project-startDate-${index}" value="${project.startDate || ''}">
                                </div>
                                <div class="form-group">
                                    <label>End Date</label>
                                    <input type="date" id="project-endDate-${index}" value="${project.endDate || ''}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Project URL</label>
                                <input type="url" id="project-url-${index}" value="${project.url || ''}" placeholder="https://github.com/username/project">
                            </div>
                            
                            <div class="form-group">
                                <label>Highlights</label>
                                <button class="btn btn-secondary btn-sm" data-click="handleAddProjectHighlight" data-index="${index}" style="margin-bottom: 10px;">Add Highlight</button>
                                <div id="project-highlights-${index}">
                                    ${(project.highlights || []).map((highlight, hIndex) => `
                                        <div class="highlight-item">
                                            <input type="text" value="${highlight}" id="project-highlight-${index}-${hIndex}" style="flex: 1; margin-right: 10px;">
                                            <button class="btn btn-danger btn-sm" data-click="handleRemoveProjectHighlight" data-index="${index}" data-highlight-index="${hIndex}">Remove</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderLanguagesSection() {
        const languages = this._resumeData.languages || [];
        
        return `
            <div class="section active" id="languages-section">
                <button class="btn btn-primary add-button" data-click="handleAddLanguage">Add Language</button>
                <div id="languages-list">
                    ${languages.map((lang, index) => `
                        <div class="item-card">
                            <div class="item-header">
                                <div>
                                    <div class="item-title">${lang.language || 'Language'}</div>
                                    <div class="item-subtitle">${lang.fluency || 'Fluency'}</div>
                                </div>
                                <button class="btn btn-danger btn-sm" data-click="handleRemoveLanguage" data-index="${index}">Remove</button>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Language</label>
                                    <input type="text" id="language-language-${index}" value="${lang.language || ''}" placeholder="English">
                                </div>
                                <div class="form-group">
                                    <label>Fluency</label>
                                    <select id="language-fluency-${index}">
                                        <option value="" ${lang.fluency === '' ? 'selected' : ''}>Select Fluency</option>
                                        <option value="Native speaker" ${lang.fluency === 'Native speaker' ? 'selected' : ''}>Native speaker</option>
                                        <option value="Fluent" ${lang.fluency === 'Fluent' ? 'selected' : ''}>Fluent</option>
                                        <option value="Professional" ${lang.fluency === 'Professional' ? 'selected' : ''}>Professional</option>
                                        <option value="Intermediate" ${lang.fluency === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                                        <option value="Basic" ${lang.fluency === 'Basic' ? 'selected' : ''}>Basic</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    formatDateRange(start, end) {
        if (!start) return 'Date not specified';
        const startDate = new Date(start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const endDate = end ? new Date(end).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present';
        return `${startDate} - ${endDate}`;
    }

    setupEventListeners() {
        // Single click handler for all interactions
        this.shadowRoot.addEventListener('click', (e) => {
            const tgt = e.target;
            if (tgt.dataset.click) {
                const result = this[tgt.dataset.click](e);
                if (result !== false) { // Only re-render if the handler doesn't return false
                    this.render();
                    this.setupEventListeners();
                }
            }
        });

        // Auto-save on input changes
        this.shadowRoot.addEventListener('input', (e) => {
            this.saveCurrentSection();
        });

        // Add analytics toggle
        const toggleButton = this.shadowRoot.querySelector('.toggle-analytics');
        const analyticsPanel = this.shadowRoot.querySelector('.analytics-panel');
        
        toggleButton.addEventListener('click', () => {
            analyticsPanel.classList.toggle('visible');
        });

        // Update analytics when resume data changes
        const analytics = this.shadowRoot.querySelector('resume-analytics');
        analytics.resumeData = this._resumeData;
    }

    // Navigation handler
    handleNavigation(e) {
        const section = e.target.dataset.section;
        if (section) {
            this._activeSection = section;
            return true;
        }
        return false;
    }

    // Export handler
    handleExport() {
        this.saveCurrentSection();
        const modal = this.shadowRoot.getElementById('json-modal');
        const textarea = this.shadowRoot.getElementById('json-textarea');
        textarea.value = JSON.stringify(this._resumeData, null, 2);
        modal.classList.add('active');
        textarea.select();
        return false; // Don't re-render
    }

    // Import handler
    handleImport() {
        const modal = this.shadowRoot.getElementById('json-modal');
        const textarea = this.shadowRoot.getElementById('json-textarea');
        textarea.value = '';
        textarea.placeholder = 'Paste your JSON Resume data here...';
        modal.classList.add('active');
        return false; // Don't re-render
    }

    // Modal handlers
    handleCloseModal() {
        const modal = this.shadowRoot.getElementById('json-modal');
        modal.classList.remove('active');
        return false; // Don't re-render
    }

    handleSaveJson() {
        const textarea = this.shadowRoot.getElementById('json-textarea');
        try {
            const data = JSON.parse(textarea.value);
            this._resumeData = data;
            this.closeModal();
            
            // Emit change event
            this.dispatchEvent(new CustomEvent('resume-change', {
                detail: { resumeData: this._resumeData },
                bubbles: true
            }));

            // Update analytics
            const analytics = this.shadowRoot.querySelector('resume-analytics');
            if (analytics) {
                analytics.resumeData = this._resumeData;
            }
            return true;
        } catch (error) {
            alert('Invalid JSON format. Please check your data and try again.');
            return false;
        }
    }

    // Add/Remove handlers
    handleAddProfile() {
        if (!this._resumeData.basics.profiles) {
            this._resumeData.basics.profiles = [];
        }
        this._resumeData.basics.profiles.push({
            network: '',
            username: '',
            url: ''
        });
        return true;
    }

    handleRemoveProfile(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.basics.profiles.splice(index, 1);
        return true;
    }

    handleAddWork() {
        if (!this._resumeData.work) {
            this._resumeData.work = [];
        }
        this._resumeData.work.push({
            name: '',
            position: '',
            url: '',
            startDate: '',
            endDate: '',
            summary: '',
            highlights: []
        });
        return true;
    }

    handleRemoveWork(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.work.splice(index, 1);
        return true;
    }

    handleAddWorkHighlight(e) {
        const index = parseInt(e.target.dataset.index);
        if (!this._resumeData.work[index].highlights) {
            this._resumeData.work[index].highlights = [];
        }
        this._resumeData.work[index].highlights.push('');
        return true;
    }

    handleRemoveWorkHighlight(e) {
        const index = parseInt(e.target.dataset.index);
        const highlightIndex = parseInt(e.target.dataset.highlightIndex);
        this._resumeData.work[index].highlights.splice(highlightIndex, 1);
        return true;
    }

    handleAddEducation() {
        if (!this._resumeData.education) {
            this._resumeData.education = [];
        }
        this._resumeData.education.push({
            institution: '',
            studyType: '',
            area: '',
            score: '',
            startDate: '',
            endDate: '',
            url: ''
        });
        return true;
    }

    handleRemoveEducation(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.education.splice(index, 1);
        return true;
    }

    handleAddSkill() {
        if (!this._resumeData.skills) {
            this._resumeData.skills = [];
        }
        this._resumeData.skills.push({
            name: '',
            level: '',
            keywords: []
        });
        return true;
    }

    handleRemoveSkill(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.skills.splice(index, 1);
        return true;
    }

    handleAddSkillKeyword(e) {
        const index = parseInt(e.target.dataset.index);
        const input = this.shadowRoot.getElementById(`skill-keyword-input-${index}`);
        if (input.value.trim()) {
            if (!this._resumeData.skills[index].keywords) {
                this._resumeData.skills[index].keywords = [];
            }
            this._resumeData.skills[index].keywords.push(input.value.trim());
            input.value = '';
            return true;
        }
        return false;
    }

    handleRemoveSkillKeyword(e) {
        const index = parseInt(e.target.dataset.index);
        const keywordIndex = parseInt(e.target.dataset.keywordIndex);
        this._resumeData.skills[index].keywords.splice(keywordIndex, 1);
        return true;
    }

    handleAddProject() {
        if (!this._resumeData.projects) {
            this._resumeData.projects = [];
        }
        this._resumeData.projects.push({
            name: '',
            description: '',
            startDate: '',
            endDate: '',
            url: '',
            highlights: []
        });
        return true;
    }

    handleRemoveProject(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.projects.splice(index, 1);
        return true;
    }

    handleAddProjectHighlight(e) {
        const index = parseInt(e.target.dataset.index);
        if (!this._resumeData.projects[index].highlights) {
            this._resumeData.projects[index].highlights = [];
        }
        this._resumeData.projects[index].highlights.push('');
        return true;
    }

    handleRemoveProjectHighlight(e) {
        const index = parseInt(e.target.dataset.index);
        const highlightIndex = parseInt(e.target.dataset.highlightIndex);
        this._resumeData.projects[index].highlights.splice(highlightIndex, 1);
        return true;
    }

    handleAddLanguage() {
        if (!this._resumeData.languages) {
            this._resumeData.languages = [];
        }
        this._resumeData.languages.push({
            language: '',
            fluency: ''
        });
        return true;
    }

    handleRemoveLanguage(e) {
        const index = parseInt(e.target.dataset.index);
        this._resumeData.languages.splice(index, 1);
        return true;
    }

    saveCurrentSection() {
        switch (this._activeSection) {
            case 'basics':
                this.saveBasics();
                break;
            case 'work':
                this.saveWork();
                break;
            case 'education':
                this.saveEducation();
                break;
            case 'skills':
                this.saveSkills();
                break;
            case 'projects':
                this.saveProjects();
                break;
            case 'languages':
                this.saveLanguages();
                break;
        }
        
        // Emit change event
        this.dispatchEvent(new CustomEvent('resume-change', {
            detail: { resumeData: this._resumeData },
            bubbles: true
        }));

        // Update analytics
        const analytics = this.shadowRoot.querySelector('resume-analytics');
        if (analytics) {
            analytics.resumeData = this._resumeData;
        }
    }

    saveBasics() {
        const basics = this._resumeData.basics || {};
        
        basics.name = this.shadowRoot.getElementById('basics-name').value;
        basics.label = this.shadowRoot.getElementById('basics-label').value;
        basics.email = this.shadowRoot.getElementById('basics-email').value;
        basics.phone = this.shadowRoot.getElementById('basics-phone').value;
        basics.url = this.shadowRoot.getElementById('basics-url').value;
        basics.summary = this.shadowRoot.getElementById('basics-summary').value;
        
        basics.location = {
            city: this.shadowRoot.getElementById('location-city').value,
            region: this.shadowRoot.getElementById('location-region').value,
            postalCode: this.shadowRoot.getElementById('location-postalCode').value,
            countryCode: this.shadowRoot.getElementById('location-countryCode').value
        };
        
        // Save profiles
        const profiles = [];
        const profileCount = basics.profiles ? basics.profiles.length : 0;
        for (let i = 0; i < profileCount; i++) {
            const network = this.shadowRoot.getElementById(`profile-network-${i}`);
            if (network) {
                profiles.push({
                    network: network.value,
                    username: this.shadowRoot.getElementById(`profile-username-${i}`).value,
                    url: this.shadowRoot.getElementById(`profile-url-${i}`).value
                });
            }
        }
        basics.profiles = profiles;
        
        this._resumeData.basics = basics;
    }

    saveWork() {
        const work = [];
        const workCount = this._resumeData.work ? this._resumeData.work.length : 0;
        
        for (let i = 0; i < workCount; i++) {
            const name = this.shadowRoot.getElementById(`work-name-${i}`);
            if (name) {
                const highlights = [];
                const highlightCount = this._resumeData.work[i].highlights ? this._resumeData.work[i].highlights.length : 0;
                
                for (let h = 0; h < highlightCount; h++) {
                    const highlight = this.shadowRoot.getElementById(`work-highlight-${i}-${h}`);
                    if (highlight && highlight.value) {
                        highlights.push(highlight.value);
                    }
                }
                
                work.push({
                    name: name.value,
                    position: this.shadowRoot.getElementById(`work-position-${i}`).value,
                    url: this.shadowRoot.getElementById(`work-url-${i}`).value,
                    startDate: this.shadowRoot.getElementById(`work-startDate-${i}`).value,
                    endDate: this.shadowRoot.getElementById(`work-endDate-${i}`).value,
                    summary: this.shadowRoot.getElementById(`work-summary-${i}`).value,
                    highlights: highlights
                });
            }
        }
        
        this._resumeData.work = work;
    }

    saveEducation() {
        const education = [];
        const eduCount = this._resumeData.education ? this._resumeData.education.length : 0;
        
        for (let i = 0; i < eduCount; i++) {
            const institution = this.shadowRoot.getElementById(`education-institution-${i}`);
            if (institution) {
                education.push({
                    institution: institution.value,
                    studyType: this.shadowRoot.getElementById(`education-studyType-${i}`).value,
                    area: this.shadowRoot.getElementById(`education-area-${i}`).value,
                    score: this.shadowRoot.getElementById(`education-score-${i}`).value,
                    startDate: this.shadowRoot.getElementById(`education-startDate-${i}`).value,
                    endDate: this.shadowRoot.getElementById(`education-endDate-${i}`).value,
                    url: this.shadowRoot.getElementById(`education-url-${i}`).value
                });
            }
        }
        
        this._resumeData.education = education;
    }

    saveSkills() {
        const skills = [];
        const skillCount = this._resumeData.skills ? this._resumeData.skills.length : 0;
        
        for (let i = 0; i < skillCount; i++) {
            const name = this.shadowRoot.getElementById(`skill-name-${i}`);
            if (name) {
                skills.push({
                    name: name.value,
                    level: this.shadowRoot.getElementById(`skill-level-${i}`).value,
                    keywords: this._resumeData.skills[i].keywords || []
                });
            }
        }
        
        this._resumeData.skills = skills;
    }

    saveProjects() {
        const projects = [];
        const projectCount = this._resumeData.projects ? this._resumeData.projects.length : 0;
        
        for (let i = 0; i < projectCount; i++) {
            const name = this.shadowRoot.getElementById(`project-name-${i}`);
            if (name) {
                const highlights = [];
                const highlightCount = this._resumeData.projects[i].highlights ? this._resumeData.projects[i].highlights.length : 0;
                
                for (let h = 0; h < highlightCount; h++) {
                    const highlight = this.shadowRoot.getElementById(`project-highlight-${i}-${h}`);
                    if (highlight && highlight.value) {
                        highlights.push(highlight.value);
                    }
                }
                
                projects.push({
                    name: name.value,
                    description: this.shadowRoot.getElementById(`project-description-${i}`).value,
                    startDate: this.shadowRoot.getElementById(`project-startDate-${i}`).value,
                    endDate: this.shadowRoot.getElementById(`project-endDate-${i}`).value,
                    url: this.shadowRoot.getElementById(`project-url-${i}`).value,
                    highlights: highlights
                });
            }
        }
        
        this._resumeData.projects = projects;
    }

    saveLanguages() {
        const languages = [];
        const langCount = this._resumeData.languages ? this._resumeData.languages.length : 0;
        
        for (let i = 0; i < langCount; i++) {
            const language = this.shadowRoot.getElementById(`language-language-${i}`);
            if (language) {
                languages.push({
                    language: language.value,
                    fluency: this.shadowRoot.getElementById(`language-fluency-${i}`).value
                });
            }
        }
        
        this._resumeData.languages = languages;
    }
}

// Register the web component
customElements.define('resume-editor', ResumeEditor);
