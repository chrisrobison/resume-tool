// modals.js - Modal dialog functionality
import { $, $$, showToast } from './utils.js';
import { createSectionItem } from './ui.js';

// Initialize all modal event handlers
export function setupModals(app) {
    setupModalCloseHandlers();
    setupProfileModal(app);
    setupWorkModal(app);
    setupEducationModal(app);
    setupSkillsModal(app);
    setupProjectsModal(app);
    setupImportModal(app);
    setupExportModal(app);
    setupSaveLoadModals(app);
    setupJobsModal(app);
    setupSettingsModal(app);
}

// Set up general modal close handlers
function setupModalCloseHandlers() {
    // Modal close buttons
    $$('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-backdrop').classList.add('hidden');
        });
    });
    
    // Modal cancel buttons
    $$('.modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-backdrop').classList.add('hidden');
        });
    });
    
    // Close modal when clicking outside
    $$('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

// Show modal by ID
export function showModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.remove('hidden');
        
        // Focus the first input field if present
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

// Hide modal by ID
export function hideModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Clear modal form fields
export function clearModalFields(modalId) {
    const modal = $(`#${modalId}`);
    if (!modal) return;
    
    modal.querySelectorAll('input, textarea').forEach(input => {
        input.value = '';
    });
}

// Profile modal functionality
function setupProfileModal(app) {
    const addProfileBtn = $('#add-profile');
    const saveProfileBtn = $('#save-profile');
    
    // Add profile button
    if (addProfileBtn) {
        addProfileBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('profile-modal');
            showModal('profile-modal');
        });
    }
    
    // Save profile button
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const network = $('#profile-network').value.trim();
            const username = $('#profile-username').value.trim();
            const url = $('#profile-url').value.trim();
            
            if (!network) {
                showToast('Network name is required', 'error');
                return;
            }
            
            const profileData = {
                network,
                username,
                url
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing profile
                app.data.basics.profiles[app.state.currentEditIndex] = profileData;
            } else {
                // Add new profile
                app.data.basics.profiles.push(profileData);
            }
            
            renderProfiles(app);
            hideModal('profile-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit profile button event delegation
    $('#profiles-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.basics.profiles.length) return;
            
            const profile = app.data.basics.profiles[index];
            
            $('#profile-network').value = profile.network || '';
            $('#profile-username').value = profile.username || '';
            $('#profile-url').value = profile.url || '';
            
            app.state.currentEditIndex = index;
            showModal('profile-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.basics.profiles.length) return;
            
            if (confirm('Are you sure you want to delete this profile?')) {
                app.data.basics.profiles.splice(index, 1);
                renderProfiles(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render profiles list
export function renderProfiles(app) {
    const container = $('#profiles-container');
    const emptyState = $('#profiles-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Show or hide empty state
    if (app.data.basics.profiles.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add profiles to the container
    app.data.basics.profiles.forEach((profile, index) => {
        const item = createSectionItem(profile, index, 'profiles');
        container.appendChild(item);
    });
}

// Work experience modal functionality
function setupWorkModal(app) {
    const addWorkBtn = $('#add-work');
    const saveWorkBtn = $('#save-work');
    
    // Add work button
    if (addWorkBtn) {
        addWorkBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('work-modal');
            showModal('work-modal');
        });
    }
    
    // Save work button
    if (saveWorkBtn) {
        saveWorkBtn.addEventListener('click', () => {
            const name = $('#work-name').value.trim();
            const position = $('#work-position').value.trim();
            const startDate = $('#work-startDate').value.trim();
            const endDate = $('#work-endDate').value.trim();
            const url = $('#work-url').value.trim();
            const location = $('#work-location').value.trim();
            const summary = $('#work-summary').value.trim();
            const highlightsText = $('#work-highlights').value.trim();
            
            if (!name || !position) {
                showToast('Company name and position are required', 'error');
                return;
            }
            
            // Process highlights as array of strings
            const highlights = highlightsText 
                ? highlightsText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                    .map(h => h.startsWith('• ') ? h.substring(2) : h)
                : [];
            
            const workData = {
                name,
                position,
                startDate,
                endDate,
                url,
                location,
                summary,
                highlights
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing work
                app.data.work[app.state.currentEditIndex] = workData;
            } else {
                // Add new work
                app.data.work.push(workData);
            }
            
            renderWork(app);
            hideModal('work-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit/delete work event delegation
    $('#work-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.work.length) return;
            
            const work = app.data.work[index];
            
            $('#work-name').value = work.name || '';
            $('#work-position').value = work.position || '';
            $('#work-startDate').value = work.startDate || '';
            $('#work-endDate').value = work.endDate || '';
            $('#work-url').value = work.url || '';
            $('#work-location').value = work.location || '';
            $('#work-summary').value = work.summary || '';
            $('#work-highlights').value = work.highlights ? work.highlights.map(h => `• ${h}`).join('\n') : '';
            
            app.state.currentEditIndex = index;
            showModal('work-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.work.length) return;
            
            if (confirm('Are you sure you want to delete this work experience?')) {
                app.data.work.splice(index, 1);
                renderWork(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render work experience list
export function renderWork(app) {
    const container = $('#work-container');
    const emptyState = $('#work-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Show or hide empty state
    if (app.data.work.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add work experiences to the container
    app.data.work.forEach((work, index) => {
        const item = createSectionItem(work, index, 'work');
        container.appendChild(item);
    });
}

// Setup for other modals (education, skills, projects) follows the same pattern
// Similar functions for setupEducationModal, setupSkillsModal, setupProjectsModal, etc.
// Not included here for brevity, but would follow the same pattern

// Education modal functionality
function setupEducationModal(app) {
    const addEducationBtn = $('#add-education');
    const saveEducationBtn = $('#save-education');
    
    // Add education button
    if (addEducationBtn) {
        addEducationBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('education-modal');
            showModal('education-modal');
        });
    }
    
    // Save education button
    if (saveEducationBtn) {
        saveEducationBtn.addEventListener('click', () => {
            const institution = $('#education-institution').value.trim();
            const studyType = $('#education-studyType').value.trim();
            const area = $('#education-area').value.trim();
            const startDate = $('#education-startDate').value.trim();
            const endDate = $('#education-endDate').value.trim();
            const score = $('#education-score').value.trim();
            const url = $('#education-url').value.trim();
            const coursesText = $('#education-courses').value.trim();
            
            if (!institution || !studyType) {
                showToast('Institution and Study Type are required', 'error');
                return;
            }
            
            // Process courses as array of strings
            const courses = coursesText 
                ? coursesText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                    .map(h => h.startsWith('• ') ? h.substring(2) : h)
                : [];
            
            const educationData = {
                institution,
                studyType,
                area,
                startDate,
                endDate,
                score,
                url,
                courses
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing education
                app.data.education[app.state.currentEditIndex] = educationData;
            } else {
                // Add new education
                if (!app.data.education) {
                    app.data.education = [];
                }
                app.data.education.push(educationData);
            }
            
            renderEducation(app);
            hideModal('education-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit/delete education event delegation
    $('#education-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.education.length) return;
            
            const education = app.data.education[index];
            
            $('#education-institution').value = education.institution || '';
            $('#education-studyType').value = education.studyType || '';
            $('#education-area').value = education.area || '';
            $('#education-startDate').value = education.startDate || '';
            $('#education-endDate').value = education.endDate || '';
            $('#education-score').value = education.score || '';
            $('#education-url').value = education.url || '';
            $('#education-courses').value = education.courses ? education.courses.map(h => `• ${h}`).join('\n') : '';
            
            app.state.currentEditIndex = index;
            showModal('education-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.education.length) return;
            
            if (confirm('Are you sure you want to delete this education?')) {
                app.data.education.splice(index, 1);
                renderEducation(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render education list
export function renderEducation(app) {
    const container = $('#education-container');
    const emptyState = $('#education-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Initialize education array if it doesn't exist
    if (!app.data.education) {
        app.data.education = [];
    }
    
    // Show or hide empty state
    if (app.data.education.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add education entries to the container
    app.data.education.forEach((education, index) => {
        const item = createSectionItem(education, index, 'education');
        container.appendChild(item);
    });
}

// Skills modal functionality
function setupSkillsModal(app) {
    const addSkillBtn = $('#add-skill');
    const saveSkillBtn = $('#save-skill');
    
    // Add skill button
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('skills-modal');
            showModal('skills-modal');
        });
    }
    
    // Save skill button
    if (saveSkillBtn) {
        saveSkillBtn.addEventListener('click', () => {
            const name = $('#skill-name').value.trim();
            const level = $('#skill-level').value.trim();
            const keywordsText = $('#skill-keywords').value.trim();
            
            if (!name) {
                showToast('Skill name is required', 'error');
                return;
            }
            
            // Process keywords as array of strings
            const keywords = keywordsText 
                ? keywordsText.split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0)
                    .map(k => k.startsWith('• ') ? k.substring(2) : k)
                : [];
            
            const skillData = {
                name,
                level,
                keywords
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing skill
                app.data.skills[app.state.currentEditIndex] = skillData;
            } else {
                // Add new skill
                if (!app.data.skills) {
                    app.data.skills = [];
                }
                app.data.skills.push(skillData);
            }
            
            renderSkills(app);
            hideModal('skills-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit/delete skill event delegation
    $('#skills-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.skills.length) return;
            
            const skill = app.data.skills[index];
            
            $('#skill-name').value = skill.name || '';
            $('#skill-level').value = skill.level || '';
            $('#skill-keywords').value = skill.keywords ? skill.keywords.map(k => `• ${k}`).join('\n') : '';
            
            app.state.currentEditIndex = index;
            showModal('skills-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.skills.length) return;
            
            if (confirm('Are you sure you want to delete this skill?')) {
                app.data.skills.splice(index, 1);
                renderSkills(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render skills list
export function renderSkills(app) {
    const container = $('#skills-container');
    const emptyState = $('#skills-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Initialize skills array if it doesn't exist
    if (!app.data.skills) {
        app.data.skills = [];
    }
    
    // Show or hide empty state
    if (app.data.skills.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add skills to the container
    app.data.skills.forEach((skill, index) => {
        const item = createSectionItem(skill, index, 'skills');
        container.appendChild(item);
    });
}

// Projects modal functionality
function setupProjectsModal(app) {
    const addProjectBtn = $('#add-project');
    const saveProjectBtn = $('#save-project');
    
    // Add project button
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('projects-modal');
            showModal('projects-modal');
        });
    }
    
    // Save project button
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener('click', () => {
            const name = $('#project-name').value.trim();
            const description = $('#project-description').value.trim();
            const startDate = $('#project-startDate').value.trim();
            const endDate = $('#project-endDate').value.trim();
            const url = $('#project-url').value.trim();
            const highlightsText = $('#project-highlights').value.trim();
            
            if (!name) {
                showToast('Project name is required', 'error');
                return;
            }
            
            // Process highlights as array of strings
            const highlights = highlightsText 
                ? highlightsText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                    .map(h => h.startsWith('• ') ? h.substring(2) : h)
                : [];
            
            const projectData = {
                name,
                description,
                startDate,
                endDate,
                url,
                highlights
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing project
                app.data.projects[app.state.currentEditIndex] = projectData;
            } else {
                // Add new project
                if (!app.data.projects) {
                    app.data.projects = [];
                }
                app.data.projects.push(projectData);
            }
            
            renderProjects(app);
            hideModal('projects-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit/delete project event delegation
    $('#projects-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.projects.length) return;
            
            const project = app.data.projects[index];
            
            $('#project-name').value = project.name || '';
            $('#project-description').value = project.description || '';
            $('#project-startDate').value = project.startDate || '';
            $('#project-endDate').value = project.endDate || '';
            $('#project-url').value = project.url || '';
            $('#project-highlights').value = project.highlights ? project.highlights.map(h => `• ${h}`).join('\n') : '';
            
            app.state.currentEditIndex = index;
            showModal('projects-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.projects.length) return;
            
            if (confirm('Are you sure you want to delete this project?')) {
                app.data.projects.splice(index, 1);
                renderProjects(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render projects list
export function renderProjects(app) {
    const container = $('#projects-container');
    const emptyState = $('#projects-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Initialize projects array if it doesn't exist
    if (!app.data.projects) {
        app.data.projects = [];
    }
    
    // Show or hide empty state
    if (app.data.projects.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add projects to the container
    app.data.projects.forEach((project, index) => {
        const item = createSectionItem(project, index, 'projects');
        container.appendChild(item);
    });
}

function setupImportModal(app) {
    // Connect the import button to the import modal
    const importButton = $('#import-button');
    
    if (importButton) {
        importButton.addEventListener('click', () => {
            showModal('import-modal');
        });
    }
}

function setupExportModal(app) {
    // Export modal implementation is handled in import-export.js
}

function setupSaveLoadModals(app) {
    // The save-button functionality is handled in core.js
    
    // Connect the load button to the load modal
    const loadButton = $('#load-button');
    
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            // Show load modal - implementation is in the app object in core.js
            // This is correct since showLoadModal is a method of the app object
            app.showLoadModal();
        });
    }
    
    // Setup job detail edit button
    const jobDetailEditBtn = $('#job-detail-edit-btn');
    if (jobDetailEditBtn) {
        jobDetailEditBtn.addEventListener('click', () => {
            // Get the current job ID
            if (!app.state.currentEditJob) {
                console.error('No job selected for editing');
                return;
            }
            
            // Hide the job detail modal first
            hideModal('job-detail-modal');
            
            // Find the edit button in the jobs list
            const jobCard = $(`.job-card[data-job-id="${app.state.currentEditJob}"]`);
            if (jobCard) {
                const editButton = jobCard.querySelector('.edit-job');
                if (editButton) {
                    // Trigger a click on the edit button
                    editButton.click();
                }
            }
        });
    }
}

function setupJobsModal(app) {
    // Jobs view related modal setup
    const addJobButton = $('#add-job');
    
    if (addJobButton) {
        addJobButton.addEventListener('click', () => {
            showModal('jobs-modal');
            
            // Check if API settings are configured
            const apiKey = localStorage.getItem('api_key');
            const apiType = localStorage.getItem('api_type') || 'claude';
            
            if (!apiKey) {
                $('#job-api-required').classList.remove('hidden');
                $('#submit-job').setAttribute('disabled', 'disabled');
            } else {
                $('#job-api-required').classList.add('hidden');
                $('#submit-job').removeAttribute('disabled');
            }
        });
    }
    
    // Setup submit job button
    const submitJobButton = $('#submit-job');
    if (submitJobButton) {
        submitJobButton.addEventListener('click', async () => {
            const jobDescription = $('#job-description').value.trim();
            const jobTitle = $('#job-title').value.trim() || 'Tailored Resume';
            
            if (!jobDescription) {
                showToast('Please enter a job description', 'error');
                return;
            }
            
            // Start loading indicator
            submitJobButton.disabled = true;
            submitJobButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            
            try {
                // Get API configuration
                const apiKey = localStorage.getItem('api_key');
                const apiType = localStorage.getItem('api_type') || 'claude';
                const useDirectApi = localStorage.getItem('use_direct_api') === 'true';
                
                if (!apiKey) {
                    showToast('API key is required. Please configure it in Settings.', 'error');
                    return;
                }
                
                // Show processing message
                showToast('Processing your resume. This may take a minute...');
                
                let result;
                
                if (useDirectApi) {
                    // Direct API calls
                    if (apiType === 'claude') {
                        result = await callClaudeDirectly(app.data, jobDescription, apiKey);
                    } else if (apiType === 'chatgpt') {
                        result = await callOpenAIDirectly(app.data, jobDescription, apiKey);
                    } else {
                        throw new Error('Invalid API type selected');
                    }
                } else {
                    // Server API approach
                    const requestData = {
                        resume: app.data,
                        jobDescription: jobDescription,
                        apiKey: apiKey,
                        apiType: apiType
                    };
                    
                    // Determine endpoint based on hostname
                    const endpoint = `http://${window.location.hostname}:3000/api/tailor-resume`;
                    console.log(`Sending request to server: ${endpoint}`);
                    
                    // Make API request
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to tailor resume');
                    }
                    
                    result = await response.json();
                }
                
                if (!result || !result.resume || !result.coverLetter) {
                    throw new Error('Invalid response format from AI service');
                }
                
                // Process the tailored resume
                const timestamp = new Date().toISOString();
                
                // Create a copy of the tailored resume with job metadata
                const tailoredResume = {
                    ...result.resume,
                    meta: {
                        ...result.resume.meta,
                        lastModified: timestamp,
                        jobDescription: result.jobDescription || jobDescription,
                        originalJobDescription: jobDescription,
                        coverLetter: result.coverLetter
                    }
                };
                
                // Save the tailored resume with a unique name
                const resumeName = `${jobTitle} - ${new Date().toLocaleDateString()}`;
                
                // Save the tailored resume to localStorage
                const originalData = app.data;
                app.data = tailoredResume; // Temporarily replace the app data
                const savedResumeId = app.saveNamedResume(resumeName);
                app.data = originalData; // Restore original data
                
                try {
                    // Import job management functions
                    const { saveJob, createDefaultJob, associateResumeWithJob } = await import('./jobs.js');
                    const { logApiCall, logJobAction } = await import('./logs.js');
                    
                    // Create a job object
                    const job = createDefaultJob();
                    job.title = jobTitle;
                    job.company = jobTitle.split(' at ')[1] || '';
                    job.description = jobDescription;
                    job.dateCreated = timestamp;
                    job.dateUpdated = timestamp;
                    job.resumeId = savedResumeId;
                    
                    // Save the job
                    saveJob(job);
                    
                    // Log the API call in the main log system
                    logApiCall(apiType, 'tailored_resume', {
                        jobTitle,
                        company: job.company,
                        resumeId: savedResumeId,
                        jobId: job.id,
                        success: true
                    });
                    
                    logJobAction('create_tailored_resume', job.id, {
                        title: jobTitle,
                        resumeId: savedResumeId
                    });
                    
                    // Show success message and close modal
                    showToast(`Resume tailored for "${jobTitle}" and job entry created`, 'success');
                } catch (logError) {
                    console.error('Error creating job entry:', logError);
                    showToast(`Resume tailored for "${jobTitle}" and saved`, 'success');
                }
                
                hideModal('jobs-modal');
                
                // Reset job description field
                $('#job-description').value = '';
                $('#job-title').value = '';
                
            } catch (error) {
                console.error('Error tailoring resume:', error);
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                // Reset button
                submitJobButton.disabled = false;
                submitJobButton.innerHTML = '<i class="fa-solid fa-check"></i> Submit';
            }
        });
    }
    
    // Direct Anthropic Claude API call
    async function callClaudeDirectly(resume, jobDescription, apiKey) {
        console.log('Calling Claude API directly from browser');
        
        // Format the resume data as string
        const resumeStr = JSON.stringify(resume, null, 2);
        
        // Create a prompt for Claude to generate clean JSON
        const prompt = `
You must create a valid, properly escaped JSON object containing a tailored resume and cover letter for this job description:
\`\`\`
${jobDescription.substring(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}
\`\`\`

Based on this resume:
\`\`\`json
${resumeStr.substring(0, 4000)}${resumeStr.length > 4000 ? '...' : ''}
\`\`\`

IMPORTANT:
1. Your response MUST be ONLY a valid JSON object with NO explanation or additional text
2. The JSON must be properly escaped - all quotes within strings must be escaped, no unescaped newlines in strings
3. Use the EXACT structure shown below, with these three fields:
{
  "resume": {/* Tailored resume object */},
  "coverLetter": "Cover letter text",
  "jobDescription": "Original job description"
}
4. Make sure all strings are properly quoted and all JSON syntax is correct
5. Do not include any markdown formatting like \`\`\`json or \`\`\` in your response
6. CRITICAL: Include ALL work entries from the original resume in your response. Do not truncate or limit the number of job entries.
7. Preserve the original structure of each section including arrays lengths. Never drop any sections or entries.`;

        try {
            // Call Claude API with the special browser header
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-opus-4-20250514',
                    max_tokens: 4000,
                    temperature: 0.2, // Lower temperature for more consistent output
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    system: "You are an expert at creating valid, properly escaped JSON. Never include markdown code blocks or any text outside the JSON. Always produce syntactically valid JSON that would pass JSON.parse() without errors."
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Claude API response:', data);

            // Extract the text from Claude's response
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response structure from Claude API');
            }

            const assistantMessage = data.content[0].text;
            console.log('Assistant message:', assistantMessage);

            // Clean and parse the JSON response
            // First try to extract JSON if it's wrapped in code blocks
            const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/) || 
                             assistantMessage.match(/```\n([\s\S]*?)\n```/) ||
                             assistantMessage.match(/{[\s\S]*}/);
                             
            if (!jsonMatch) {
                throw new Error('Could not extract JSON from Claude response');
            }
            
            let jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
            
            try {
                // Try to parse the JSON directly first
                return JSON.parse(jsonString);
            } catch (parseError) {
                console.error('Initial Claude JSON parse error:', parseError);
                console.log('Problematic Claude JSON:', jsonString);
                
                // More aggressive cleaning if direct parsing fails
                try {
                    // Clean problematic control characters before parsing
                    jsonString = jsonString
                        // Replace single quotes with double quotes for property names
                        .replace(/(\s*)'([^']+)'(\s*):(\s*)/g, '$1"$2"$3:$4')
                        // Remove control characters
                        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                        // Normalize newlines
                        .replace(/\\r\\n|\\n|\\r/g, '\\n')
                        // Escape literal newlines
                        .replace(/\n/g, '\\n')
                        // Escape literal carriage returns
                        .replace(/\r/g, '\\r')
                        // Escape literal tabs
                        .replace(/\t/g, '\\t')
                        // Fix escaped single quotes
                        .replace(/\\'/g, "'")
                        // Fix double escaped slashes
                        .replace(/\\\\/g, '\\')
                        // Fix trailing commas in objects and arrays
                        .replace(/,(\s*[}\]])/g, '$1');
                    
                    return JSON.parse(jsonString);
                } catch (secondError) {
                    console.error('Advanced Claude JSON parse error:', secondError);
                    
                    // If all else fails, create a fallback response
                    console.log('Creating Claude fallback response structure');
                    return {
                        resume: { ...resume }, // Return original resume as fallback
                        coverLetter: "I apologize, but there was an error generating a tailored response. Please try again with Claude Opus for better results.",
                        jobDescription: jobDescription
                    };
                }
            }
            
        } catch (error) {
            console.error('Error calling Claude API directly:', error);
            throw new Error(`Claude API error: ${error.message}`);
        }
    }
    
    // Direct OpenAI API call
    async function callOpenAIDirectly(resume, jobDescription, apiKey) {
        console.log('Calling OpenAI API directly from browser');
        
        // Format the resume data as string
        const resumeStr = JSON.stringify(resume, null, 2);
        
        // Create a more explicit system message for OpenAI to ensure clean JSON
        const systemMessage = "You are an expert at creating valid, properly escaped JSON. You specialize in tailoring resumes and writing cover letters. " +
                             "Respond ONLY with a complete, syntactically valid JSON object. No markdown, no code blocks, no explanations. " +
                             "Ensure all quotes in strings are escaped properly and there are no unescaped newlines in string values. " +
                             "Your response must be parseable by JSON.parse() without any modifications. " +
                             "Always use double quotes for property names and string values, never single quotes. " +
                             "When formatting JSON: Escape all newlines as \\n, all quotes within strings as \\\", and use proper JSON syntax with no trailing commas.";
        
        // Create a more detailed user message with clear instructions
        const userMessage = `Create a tailored resume and cover letter for this job description:
\`\`\`
${jobDescription.substring(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}
\`\`\`

Based on this original resume:
\`\`\`json
${resumeStr.substring(0, 4000)}${resumeStr.length > 4000 ? '...' : ''}
\`\`\`

IMPORTANT REQUIREMENTS:
1. Return ONLY a valid JSON object with NO explanations or text outside the JSON
2. The JSON must be properly escaped - all quotes within strings must be escaped with backslash
3. All newlines within strings must be escaped as \\n
4. Your response must use this exact structure:
{
  "resume": {/* Tailored resume object */},
  "coverLetter": "Cover letter text",
  "jobDescription": "Original job description"
}
5. Do NOT wrap your response in \`\`\`json or any other markdown
6. CRITICAL: Include ALL work entries from the original resume in your response. Do not truncate or limit the number of job entries.
7. Preserve the original structure of each section including arrays lengths.`;

        try {
            // Call OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: systemMessage
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    temperature: 0.2 // Lower temperature for more predictable output
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('OpenAI API response:', data);

            // Extract message content from OpenAI response
            if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Invalid response structure from OpenAI API');
            }

            let messageContent = data.choices[0].message.content;
            console.log('Message content:', messageContent);
            messageContent = messageContent.replace(/\n/g, '');

            // Clean and parse the JSON
            let cleanedContent = messageContent.trim().replace(/^```json\n|^```\n|```$/g, '');
            
            try {
                // Try to parse the content directly first
                return JSON.parse(cleanedContent);
            } catch (parseError) {
                console.error('Initial JSON parse error:', parseError);
                console.log('Problematic JSON:', cleanedContent);
                
                // Try more aggressive cleaning if regular parsing fails
                try {
                    // Some common JSON formatting issues that might need fixing
                    cleanedContent = cleanedContent
                        // Replace single quotes with double quotes for property names
                        .replace(/(\s*)'([^']+)'(\s*):(\s*)/g, '$1"$2"$3:$4')
                        // Replace unescaped newlines in strings with escaped ones
                        .replace(/(?<=": ")(.+?)(?=",?\r?\n)/g, (match) => match.replace(/\n/g, '\\n'))
                        // Fix trailing commas in objects and arrays
                        .replace(/,(\s*[}\]])/g, '$1')
                        // Remove any control characters
                        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                        // Ensure proper spacing around colons in property definitions
                        .replace(/(["\w])\s*:\s*(["{[\w])/g, '$1: $2');
                    
                    return JSON.parse(cleanedContent);
                } catch (secondError) {
                    console.error('Advanced JSON parse error:', secondError);
                    
                    // If all else fails, try to build a fallback response
                    console.log('Creating fallback response structure');
                    return {
                        resume: { ...resume }, // Return original resume as fallback
                        coverLetter: "I apologize, but there was an error generating a tailored response. Please try again or use a different model.",
                        jobDescription: jobDescription
                    };
                }
            }
            
        } catch (error) {
            console.error('Error calling OpenAI API directly:', error);
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
}

function setupSettingsModal(app) {
    // Connect settings button to settings modal
    const settingsButton = $('#settings-button');
    
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showModal('settings-modal');
            
            // Pre-populate settings from localStorage
            const apiKey = localStorage.getItem('api_key') || '';
            const apiType = localStorage.getItem('api_type') || 'claude';
            const useDirectApi = localStorage.getItem('use_direct_api') === 'true';
            
            $('#api-key').value = apiKey;
            $('#api-type').value = apiType;
            $('#use-direct-api').checked = useDirectApi;
        });
    }
    
    // Save settings
    const saveSettingsButton = $('#save-settings');
    
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', () => {
            const apiKey = $('#api-key').value.trim();
            const apiType = $('#api-type').value;
            const useDirectApi = $('#use-direct-api').checked;
            
            // Save to localStorage
            localStorage.setItem('api_key', apiKey);
            localStorage.setItem('api_type', apiType);
            localStorage.setItem('use_direct_api', useDirectApi);
            
            hideModal('settings-modal');
            showToast('Settings saved', 'success');
        });
    }
}
