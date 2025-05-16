(function() {
    const $ = str => document.querySelector(str);
    const $$ = str => document.querySelectorAll(str);

    const app = {
        data: {
            basics: {
                name: "",
                label: "",
                email: "",
                phone: "",
                website: "",
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
        },
        state: {
            loaded: false,
            currentEditIndex: -1,
            currentSection: null,
            touchEndX: 0,
            touchStartX: 0
        },
        init() {
            app.initLocalStorage();
            app.setupEventListeners();
            app.setupSaveLoadEventListeners();
            app.state.loaded = true;
            
            // Set current date in lastModified field
            $('#lastModified').value = new Date().toISOString().split('T')[0];
       },
        setupEventListeners() {
            // Tab navigation
            $$('.tab')?.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    if (tabId) {
                        app.switchTab(tabId);
                        // On mobile, scroll to the top of the panel when switching tabs
                        if (window.innerWidth <= 768) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    } else if (tab.dataset.modalTab) {
                        app.switchModalTab(tab.dataset.modalTab);
                    }
                });
            });

            // Modal close buttons
            $$('.modal-close, .modal-cancel').forEach(btn => {
                btn.addEventListener('click', app.closeAllModals);
            });
            
            // Improve touch experience on mobile devices
            // Add touch events to handle swipe between tabs
            const tabsContainer = $('.tabs');
            app.state.touchStartX = 0;
            app.state.touchEndX = 0;
            
            document.addEventListener('touchstart', e => {
                app.state.touchStartX = e.changedTouches[0].screenX;
            }, false);
            
            document.addEventListener('touchend', e => {
                app.state.touchEndX = e.changedTouches[0].screenX;
                app.handleSwipe();
            }, false);
            
            // Handle resize events to adjust UI for different screen sizes
            window.addEventListener('resize', app.handleResize);

            // Import/Export/Copy buttons
            $('#import-button').addEventListener('click', () => app.openModal('import-modal'));
            $('#export-button').addEventListener('click', app.exportResume);
            $('#copy-button').addEventListener('click', app.copyResume);

            // Import methods
            $('#import-paste').addEventListener('click', app.importFromText);
            $('#import-file').addEventListener('click', app.importFromFile);
            $('#import-url').addEventListener('click', app.importFromUrl);

            // File input handling
            $('#file-input').addEventListener('change', event => {
                const fileName = event.target.files[0]?.name || '';
                if (fileName) {
                    $('#file-name').textContent = `Selected file: ${fileName}`;
                    $('#file-name').classList.remove('hidden');
                    $('#import-file').disabled = false;
                }
            });

            // Drag and drop handling
            const dragDropArea = $('#drag-drop-area');
            dragDropArea.addEventListener('click', () => $('#file-input').click());
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dragDropArea.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dragDropArea.addEventListener(eventName, () => {
                    dragDropArea.classList.add('dragover');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dragDropArea.addEventListener(eventName, () => {
                    dragDropArea.classList.remove('dragover');
                });
            });
            
            dragDropArea.addEventListener('drop', e => {
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/json') {
                    const fileInput = $('#file-input');
                    fileInput.files = e.dataTransfer.files;
                    $('#file-name').textContent = `Selected file: ${file.name}`;
                    $('#file-name').classList.remove('hidden');
                    $('#import-file').disabled = false;
                } else {
                    app.showToast('Please drop a valid JSON file.', 'error');
                }
            });

            // Export actions
            $('#copy-json').addEventListener('click', app.copyToClipboard);
            $('#download-json').addEventListener('click', app.downloadJson);

            // Add item buttons
            $('#add-profile').addEventListener('click', () => app.openAddModal('profile'));
            $('#add-work').addEventListener('click', () => app.openAddModal('work'));
            $('#add-education').addEventListener('click', () => app.openAddModal('education'));
            $('#add-skill').addEventListener('click', () => app.openAddModal('skills'));
            $('#add-project').addEventListener('click', () => app.openAddModal('projects'));

            // Save item buttons
            $('#save-profile').addEventListener('click', () => app.saveItem('profile'));
            $('#save-work').addEventListener('click', () => app.saveItem('work'));
            $('#save-education').addEventListener('click', () => app.saveItem('education'));
            $('#save-skill').addEventListener('click', () => app.saveItem('skill'));
            $('#save-project').addEventListener('click', () => app.saveItem('project'));

            // Basic info fields
            const basicFields = ['name', 'label', 'email', 'phone', 'website', 'picture', 'summary'];
            basicFields.forEach(field => {
                $(`#${field}`).addEventListener('change', e => {
                    app.data.basics[field] = e.target.value;
                });
            });

            // Location fields
            const locationFields = ['address', 'postalCode', 'city', 'region', 'countryCode'];
            locationFields.forEach(field => {
                $(`#${field}`).addEventListener('change', e => {
                    app.data.basics.location[field] = e.target.value;
                });
            });

            // Meta fields
            $('#theme').addEventListener('change', e => {
                app.data.meta.theme = e.target.value;
            });
            
            $('#language').addEventListener('change', e => {
                app.data.meta.language = e.target.value;
            });

            // Theme selector for preview
            $('#preview-theme').addEventListener('change', () => {
                app.renderPreview();
            });
            
            // Refresh button
            $('#preview-refresh').addEventListener('click', () => {
                app.renderPreview();
            });
            
            // Print button
            $('#preview-print').addEventListener('click', () => {
                window.print();
            });
            
            // PDF button
            $('#preview-pdf').addEventListener('click', app.makePdf);
            
 
        },
        
        formatDate(dateStr) {
            if (!dateStr) return '';
            
            // Handle 'Present' text
            if (dateStr.toLowerCase() === 'present') {
                return 'Present';
            }
            
            // Try to parse and format the date
            try {
                // Check if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    const parts = dateStr.split('-');
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
                }
                
                // Try as a Date object
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${months[date.getMonth()]} ${date.getFullYear()}`;
                }
            } catch (e) {
                // If there's an error, just return the original string
                console.log("Date parse error:", e);
            }
            
            return dateStr;
        },

        // HTML escaping function for security
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
                
        renderPreview() {
            const container = $('#preview-container');
            const theme = $('#preview-theme').value || 'modern';
            
            // Create the preview HTML structure based on selected theme
            let html = `<div class="preview-${theme}">`;
            
            // Header section
            html += `<div class="preview-header">
                <h1 class="preview-name">${app.escapeHtml(app.data.basics.name || 'Your Name')}</h1>
                <p class="preview-title">${app.escapeHtml(app.data.basics.label || 'Your Job Title')}</p>
                <div class="preview-contact">`;
            
            // Contact information
            if (app.data.basics.email) {
                html += `<div class="preview-contact-item">
                    <i class="fa-solid fa-envelope"></i>
                    <span>${app.escapeHtml(app.data.basics.email)}</span>
                </div>`;
            }
            
            if (app.data.basics.phone) {
                html += `<div class="preview-contact-item">
                    <i class="fa-solid fa-phone"></i>
                    <span>${app.escapeHtml(app.data.basics.phone)}</span>
                </div>`;
            }
            
            if (app.data.basics.website) {
                html += `<div class="preview-contact-item">
                    <i class="fa-solid fa-globe"></i>
                    <span>${app.escapeHtml(app.data.basics.website)}</span>
                </div>`;
            }
            
            if (app.data.basics.location) {
                const location = app.data.basics.location;
                const locationParts = [];
                
                if (location.city) locationParts.push(location.city);
                if (location.region) locationParts.push(location.region);
                if (location.countryCode) locationParts.push(location.countryCode);
                
                if (locationParts.length > 0) {
                    html += `<div class="preview-contact-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${app.escapeHtml(locationParts.join(', '))}</span>
                    </div>`;
                }
            }
            
            // Social profiles
            if (app.data.basics.profiles && app.data.basics.profiles.length > 0) {
                app.data.basics.profiles.forEach(profile => {
                    let icon = 'fa-globe';
                    
                    // Set appropriate icon based on network
                    if (profile.network) {
                        const network = profile.network.toLowerCase();
                        if (network.includes('linkedin')) icon = 'fa-linkedin';
                        else if (network.includes('github')) icon = 'fa-github';
                        else if (network.includes('twitter')) icon = 'fa-twitter';
                        else if (network.includes('facebook')) icon = 'fa-facebook';
                        else if (network.includes('instagram')) icon = 'fa-instagram';
                    }
                    
                    html += `<div class="preview-contact-item">
                        <i class="fa-brands ${icon}"></i>
                        <span>${profile.url ? `<a href="${app.escapeHtml(profile.url)}" target="_blank">${app.escapeHtml(profile.username || profile.network)}</a>` : app.escapeHtml(profile.username || profile.network)}</span>
                    </div>`;
                });
            }
            
            html += `</div></div>`; // Close header
            
            // Body content
            html += `<div class="preview-body">`;
            
            // Summary section
            if (app.data.basics.summary) {
                html += `<div class="preview-section">
                    <h2 class="preview-section-title">Summary</h2>
                    <div class="preview-summary">${app.escapeHtml(app.data.basics.summary)}</div>
                </div>`;
            }
            
            // Work Experience section
            if (app.data.work && app.data.work.length > 0) {
                html += `<div class="preview-section">
                    <h2 class="preview-section-title">Work Experience</h2>`;
                
                app.data.work.forEach(job => {
                    html += `<div class="preview-item">
                        <div class="preview-item-title">${app.escapeHtml(job.name || '')}</div>
                        <div class="preview-item-subtitle">${app.escapeHtml(job.position || '')}</div>`;
                    
                    // Date range
                    if (job.startDate || job.endDate) {
                        html += `<div class="preview-item-date">
                            ${app.escapeHtml(app.formatDate(job.startDate) || '')}
                            ${job.startDate && job.endDate ? ' - ' : ''}
                            ${app.escapeHtml(app.formatDate(job.endDate) || '')}
                        </div>`;
                    }
                    
                    // Location
                    if (job.location) {
                        html += `<div class="preview-item-location">${app.escapeHtml(job.location)}</div>`;
                    }
                    
                    // Summary
                    if (job.summary) {
                        html += `<div class="preview-summary">${job.summary}</div>`;
                    }
                    
                    // Highlights
                    if (job.highlights && job.highlights.length > 0) {
                        html += `<div class="preview-highlights">
                            <div class="preview-highlights-title">Key Achievements</div>
                            <ul class="preview-highlights-list">`;
                        
                        job.highlights.forEach(highlight => {
                            html += `<li>${app.escapeHtml(highlight)}</li>`;
                        });
                        
                        html += `</ul></div>`;
                    }
                    
                    html += `</div>`; // Close preview-item
                });
                
                html += `</div>`; // Close preview-section
            }
            
            // Education section
            if (app.data.education && app.data.education.length > 0) {
                html += `<div class="preview-section">
                    <h2 class="preview-section-title">Education</h2>`;
                
                app.data.education.forEach(edu => {
                    html += `<div class="preview-item">
                        <div class="preview-item-title">${app.escapeHtml(edu.institution || '')}</div>`;
                    
                    if (edu.studyType || edu.area) {
                        html += `<div class="preview-item-subtitle">
                            ${app.escapeHtml(edu.studyType || '')}
                            ${edu.studyType && edu.area ? ' in ' : ''}
                            ${app.escapeHtml(edu.area || '')}
                        </div>`;
                    }
                    
                    // Date range
                    if (edu.startDate || edu.endDate) {
                        html += `<div class="preview-item-date">
                            ${app.escapeHtml(app.formatDate(edu.startDate) || '')}
                            ${edu.startDate && edu.endDate ? ' - ' : ''}
                            ${app.escapeHtml(app.formatDate(edu.endDate) || '')}
                        </div>`;
                    }
                    
                    // GPA
                    if (edu.gpa) {
                        html += `<div class="preview-summary">GPA: ${app.escapeHtml(edu.gpa)}</div>`;
                    }
                    
                    // Courses
                    if (edu.courses && edu.courses.length > 0) {
                        html += `<div class="preview-highlights">
                            <div class="preview-highlights-title">Relevant Courses</div>
                            <ul class="preview-highlights-list">`;
                        
                        edu.courses.forEach(course => {
                            html += `<li>${app.escapeHtml(course)}</li>`;
                        });
                        
                        html += `</ul></div>`;
                    }
                    
                    html += `</div>`; // Close preview-item
                });
                
                html += `</div>`; // Close preview-section
            }
            
            // Skills section
            if (app.data.skills && app.data.skills.length > 0) {
                html += `<div class="preview-section">
                    <h2 class="preview-section-title">Skills</h2>`;
                
                app.data.skills.forEach(skill => {
                    html += `<div class="preview-item">
                        <div class="preview-item-title">${app.escapeHtml(skill.name || '')}</div>`;
                    
                    if (skill.level) {
                        html += `<div class="preview-item-subtitle">Level: ${app.escapeHtml(skill.level)}</div>`;
                    }
                    
                    // Keywords
                    if (skill.keywords && skill.keywords.length > 0) {
                        html += `<div class="preview-skills-list">`;
                        
                        skill.keywords.forEach(keyword => {
                            let skillClass = "";
                            if (skill.level) {
                                const level = skill.level.toLowerCase();
                                if (level.includes('expert') || level.includes('master')) {
                                    skillClass = "expert";
                                } else if (level.includes('advanced') || level.includes('proficient')) {
                                    skillClass = "advanced";
                                } else if (level.includes('intermediate')) {
                                    skillClass = "intermediate";
                                }
                            }
                            
                            html += `<span class="preview-skill ${skillClass}">${app.escapeHtml(keyword)}</span>`;
                        });
                        
                        html += `</div>`;
                    }
                    
                    html += `</div>`; // Close preview-item
                });
                
                html += `</div>`; // Close preview-section
            }
            
            // Projects section
            if (app.data.projects && app.data.projects.length > 0) {
                html += `<div class="preview-section">
                    <h2 class="preview-section-title">Projects</h2>`;
                
                app.data.projects.forEach(project => {
                    html += `<div class="preview-item">
                        <div class="preview-item-title">
                            ${project.url ? `<a href="${app.escapeHtml(project.url)}" target="_blank">${app.escapeHtml(project.name || '')}</a>` : app.escapeHtml(project.name || '')}
                        </div>`;
                    
                    // Date range
                    if (project.startDate || project.endDate) {
                        html += `<div class="preview-item-date">
                            ${app.escapeHtml(app.formatDate(project.startDate) || '')}
                            ${project.startDate && project.endDate ? ' - ' : ''}
                            ${app.escapeHtml(app.formatDate(project.endDate) || '')}
                        </div>`;
                    }
                    
                    // Description
                    if (project.description) {
                        html += `<div class="preview-summary">${app.escapeHtml(project.description)}</div>`;
                    }
                    
                    // Highlights
                    if (project.highlights && project.highlights.length > 0) {
                        html += `<div class="preview-highlights">
                            <div class="preview-highlights-title">Highlights</div>
                            <ul class="preview-highlights-list">`;
                        
                        project.highlights.forEach(highlight => {
                            html += `<li>${app.escapeHtml(highlight)}</li>`;
                        });
                        
                        html += `</ul></div>`;
                    }
                    
                    // Keywords
                    if (project.keywords && project.keywords.length > 0) {
                        html += `<div class="preview-skills-list">`;
                        
                        project.keywords.forEach(keyword => {
                            html += `<span class="preview-skill">${app.escapeHtml(keyword)}</span>`;
                        });
                        
                        html += `</div>`;
                    }
                    
                    html += `</div>`; // Close preview-item
                });
                
                html += `</div>`; // Close preview-section
            }
            
            html += `</div>`; // Close preview-body
            html += `</div>`; // Close preview-theme container
            
            // Update the container with the generated HTML
            container.innerHTML = html;
        },


        switchTab(tabId) {
            // Deactivate all tabs and panels
            $$('.tab').forEach(t => t.classList.remove('active'));
            $$('.panel').forEach(p => p.classList.remove('active'));
            
            // Activate selected tab and panel
            $(`[data-tab="${tabId}"]`).classList.add('active');
            $(`#${tabId}-panel`).classList.add('active');
            
            // If switching to preview tab, render the preview
            if (tabId === 'preview') {
                app.renderPreview();
            }
        },
        
        switchModalTab(tabId) {
            // For modal tabs
            const modalTabs = $$('[data-modal-tab]');
            const modalPanels = $$('#import-modal .panel');
            
            modalTabs.forEach(t => t.classList.remove('active'));
            modalPanels.forEach(p => p.classList.remove('active'));
            
            $(`[data-modal-tab="${tabId}"]`).classList.add('active');
            $(`#${tabId}-panel`).classList.add('active');
        },
        
        openModal(modalId) {
            $(`#${modalId}`).classList.remove('hidden');
            
            if (modalId === 'export-modal') {
                app.data.meta.lastModified = new Date().toISOString();
                $('#json-output').value = JSON.stringify(app.data, null, 2);
            }
        },
        
        closeAllModals() {
            $$('.modal-backdrop').forEach(modal => {
                modal.classList.add('hidden');
            });
            
            // Reset current edit state
            app.state.currentEditIndex = -1;
            app.state.currentSection = null;
        },
        
        importFromText() {
            const jsonText = $('#json-input').value.trim();
            try {
                if (!jsonText) {
                    throw new Error('No JSON content provided');
                }
                
                const resumeData = JSON.parse(jsonText);
                app.loadResumeData(resumeData);
                app.closeAllModals();
                app.showToast('Resume data imported successfully!');
            } catch (error) {
                app.showToast(`Error importing JSON: ${error.message}`, 'error');
            }
        },
        
        importFromFile() {
            const fileInput = $('#file-input');
            if (!fileInput.files || !fileInput.files[0]) {
                app.showToast('Please select a file first', 'error');
                return;
            }
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = e => {
                try {
                    const resumeData = JSON.parse(e.target.result);
                    app.loadResumeData(resumeData);
                    app.closeAllModals();
                    app.showToast('Resume data imported from file successfully!');
                } catch (error) {
                    app.showToast(`Error parsing JSON file: ${error.message}`, 'error');
                }
            };
            
            reader.onerror = () => {
                app.showToast('Error reading file', 'error');
            };
            
            reader.readAsText(file);
        },
        
        importFromUrl() {
            const url = $('#url-input').value.trim();
            if (!url) {
                app.showToast('Please enter a valid URL', 'error');
                return;
            }
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(resumeData => {
                    app.loadResumeData(resumeData);
                    app.closeAllModals();
                    app.showToast('Resume data imported from URL successfully!');
                })
                .catch(error => {
                    app.showToast(`Error fetching from URL: ${error.message}`, 'error');
                });
        },
        
        loadResumeData(resumeData) {
            // Merge with default structure to ensure all fields exist
            app.data = {
                basics: {
                    ...app.data.basics,
                    ...resumeData.basics,
                    location: {
                        ...app.data.basics.location,
                        ...(resumeData.basics?.location || {})
                    },
                    profiles: resumeData.basics?.profiles || []
                },
                work: resumeData.work || [],
                education: resumeData.education || [],
                skills: resumeData.skills || [],
                projects: resumeData.projects || [],
                meta: {
                    ...app.data.meta,
                    ...(resumeData.meta || {})
                }
            };
            
            // Update form fields
            app.updateFormFields();
            
            // Update item containers
            app.renderProfiles();
            app.renderWork();
            app.renderEducation();
            app.renderSkills();
            app.renderProjects();
        },
        
        updateFormFields() {
            // Update basic fields
            const basics = app.data.basics;
            ['name', 'label', 'email', 'phone', 'website', 'picture', 'summary'].forEach(field => {
                if (basics[field]) {
                    $(`#${field}`).value = basics[field];
                }
            });
            
            $("#pictureImg").src = basics.picture;

            // Update location fields
            const location = basics.location;
            ['address', 'postalCode', 'city', 'region', 'countryCode'].forEach(field => {
                if (location[field]) {
                    $(`#${field}`).value = location[field];
                }
            });
            
            // Update meta fields
            const meta = app.data.meta;
            if (meta.theme) $('#theme').value = meta.theme;
            if (meta.language) $('#language').value = meta.language;
            $('#lastModified').value = new Date(meta.lastModified || new Date()).toISOString().split('T')[0];
        },
        
        exportResume() {
            // Update lastModified timestamp
            app.data.meta.lastModified = new Date().toISOString();
            
            // Format the JSON with proper indentation
            const jsonOutput = JSON.stringify(app.data, null, 2);
            $('#json-output').value = jsonOutput;
            
            app.openModal('export-modal');
        },
        
        copyToClipboard() {
            const jsonOutput = $('#json-output');
            jsonOutput.select();
            document.execCommand('copy');
            
            app.showToast('JSON copied to clipboard!');
        },
        
        downloadJson() {
            const jsonOutput = $('#json-output').value;
            const blob = new Blob([jsonOutput], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `resume_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            app.showToast('JSON file downloaded!');
        },
        
        openAddModal(type) {
            app.state.currentSection = type;
            app.state.currentEditIndex = -1;
            
            // Clear the form fields
            $$(`#${type}-modal input, #${type}-modal textarea`).forEach(input => {
                input.value = '';
            });
            
            // Change modal title based on action
            $(`#${type}-modal .modal-title`).textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            
            // Open the modal
            $(`#${type}-modal`).classList.remove('hidden');
        },
        
        openEditModal(type, index) {
            app.state.currentSection = type;
            app.state.currentEditIndex = index;
            
            const item = app.data[type][index];
            
            // Change modal title based on action
            $(`#${type}-modal .modal-title`).textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            
            // Fill form fields with item data
            if (type === 'profile') {
                $('#profile-network').value = item.network || '';
                $('#profile-username').value = item.username || '';
                $('#profile-url').value = item.url || '';
            } else if (type === 'work') {
                $('#work-name').value = item.name || '';
                $('#work-position').value = item.position || '';
                $('#work-startDate').value = item.startDate || '';
                $('#work-endDate').value = item.endDate || '';
                $('#work-url').value = item.url || '';
                $('#work-location').value = item.location || '';
                $('#work-summary').value = item.summary || '';
                $('#work-highlights').value = (item.highlights || []).join('\n');
            } else if (type === 'education') {
                $('#education-institution').value = item.institution || '';
                $('#education-area').value = item.area || '';
                $('#education-studyType').value = item.studyType || '';
                $('#education-startDate').value = item.startDate || '';
                $('#education-endDate').value = item.endDate || '';
                $('#education-gpa').value = item.gpa || '';
                $('#education-courses').value = (item.courses || []).join('\n');
            } else if (type === 'skills') {
                $('#skill-name').value = item.name || '';
                $('#skill-level').value = item.level || '';
                $('#skill-keywords').value = (item.keywords || []).join('\n');
            } else if (type === 'projects') {
                $('#project-name').value = item.name || '';
                $('#project-startDate').value = item.startDate || '';
                $('#project-endDate').value = item.endDate || '';
                $('#project-url').value = item.url || '';
                $('#project-description').value = item.description || '';
                $('#project-highlights').value = (item.highlights || []).join('\n');
                $('#project-keywords').value = (item.keywords || []).join('\n');
            }
            
            // Open the modal
            $(`#${type}-modal`).classList.remove('hidden');
        },
        
        saveItem(type) {
            const isEditing = app.state.currentEditIndex !== -1;
            let newItem;
            
            if (type === 'profile') {
                // Get values from form
                const network = $('#profile-network').value.trim();
                const username = $('#profile-username').value.trim();
                const url = $('#profile-url').value.trim();
                
                if (!network) {
                    app.showToast('Network name is required', 'error');
                    return;
                }
                
                newItem = { network, username, url };
                
                if (isEditing) {
                    app.data.basics.profiles[app.state.currentEditIndex] = newItem;
                } else {
                    app.data.basics.profiles.push(newItem);
                }
                
                app.renderProfiles();
            } else if (type === 'work') {
                const name = $('#work-name').value.trim();
                const position = $('#work-position').value.trim();
                const startDate = $('#work-startDate').value.trim();
                const endDate = $('#work-endDate').value.trim();
                const url = $('#work-url').value.trim();
                const location = $('#work-location').value.trim();
                const summary = $('#work-summary').value.trim();
                const highlights = $('#work-highlights').value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => item.trim());
                
                if (!name || !position) {
                    app.showToast('Company name and position are required', 'error');
                    return;
                }
                
                newItem = { 
                    name, position, startDate, endDate, url, location, summary, 
                    highlights 
                };
                
                if (isEditing) {
                    app.data.work[app.state.currentEditIndex] = newItem;
                } else {
                    app.data.work.push(newItem);
                }
                
                app.renderWork();
            } else if (type === 'education') {
                const institution = $('#education-institution').value.trim();
                const area = $('#education-area').value.trim();
                const studyType = $('#education-studyType').value.trim();
                const startDate = $('#education-startDate').value.trim();
                const endDate = $('#education-endDate').value.trim();
                const gpa = $('#education-gpa').value.trim();
                const courses = $('#education-courses').value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => item.trim());
                
                if (!institution) {
                    app.showToast('Institution name is required', 'error');
                    return;
                }
                
                newItem = { 
                    institution, area, studyType, startDate, endDate, gpa, courses 
                };
                
                if (isEditing) {
                    app.data.education[app.state.currentEditIndex] = newItem;
                } else {
                    app.data.education.push(newItem);
                }
                
                app.renderEducation();
            } else if (type === 'skill') {
                const name = $('#skill-name').value.trim();
                const level = $('#skill-level').value.trim();
                const keywords = $('#skill-keywords').value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => item.trim());
                
                if (!name) {
                    app.showToast('Skill name is required', 'error');
                    return;
                }
                
                newItem = { name, level, keywords };
                
                if (isEditing) {
                    app.data.skills[app.state.currentEditIndex] = newItem;
                } else {
                    app.data.skills.push(newItem);
                }
                
                app.renderSkills();
            } else if (type === 'project') {
                const name = $('#project-name').value.trim();
                const startDate = $('#project-startDate').value.trim();
                const endDate = $('#project-endDate').value.trim();
                const url = $('#project-url').value.trim();
                const description = $('#project-description').value.trim();
                const highlights = $('#project-highlights').value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => item.trim());
                const keywords = $('#project-keywords').value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => item.trim());
                
                if (!name) {
                    app.showToast('Project name is required', 'error');
                    return;
                }
                
                newItem = { 
                    name, startDate, endDate, url, description, highlights, keywords 
                };
                
                if (isEditing) {
                    app.data.projects[app.state.currentEditIndex] = newItem;
                } else {
                    app.data.projects.push(newItem);
                }
                
                app.renderProjects();
            }
            
            app.closeAllModals();
            app.showToast(`${isEditing ? 'Updated' : 'Added'} ${type} successfully!`);
        },
        
        renderProfiles() {
            const container = $('#profiles-container');
            const profiles = app.data.basics.profiles;
            
            if (profiles.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="profiles-empty">
                        <i class="fa-solid fa-user-plus fa-2x"></i>
                        <p>No profiles added yet. Click the "Add Profile" button to add social media profiles.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            profiles.forEach((profile, index) => {
                html += `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <strong>${profile.network}</strong>
                            <div class="resume-item-actions">
                                <button class="icon-button edit-profile" data-index="${index}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="icon-button delete-profile" data-index="${index}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            ${profile.username ? `<div>Username: ${profile.username}</div>` : ''}
                            ${profile.url ? `<div>URL: <a href="${profile.url}" target="_blank">${profile.url}</a></div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners for edit/delete buttons
            $$('.edit-profile').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    app.openEditModal('profile', index);
                });
            });
            
            $$('.delete-profile').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    if (confirm('Are you sure you want to delete this profile?')) {
                        app.data.basics.profiles.splice(index, 1);
                        app.renderProfiles();
                        app.showToast('Profile deleted successfully!');
                    }
                });
            });
        },
        
        renderWork() {
            const container = $('#work-container');
            const work = app.data.work;
            
            if (work.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="work-empty">
                        <i class="fa-solid fa-briefcase fa-2x"></i>
                        <p>No work experience added yet. Click the "Add Work Experience" button to add your professional history.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            work.forEach((job, index) => {
                html += `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <strong>${job.name} - ${job.position}</strong>
                            <div class="resume-item-actions">
                                <button class="icon-button edit-work" data-index="${index}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="icon-button delete-work" data-index="${index}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            ${job.startDate || job.endDate ? 
                              `<div>${job.startDate || ''} ${job.startDate && job.endDate ? ' - ' : ''} ${job.endDate || ''}</div>` : ''}
                            ${job.location ? `<div>Location: ${job.location}</div>` : ''}
                            ${job.url ? `<div>Website: <a href="${job.url}" target="_blank">${job.url}</a></div>` : ''}
                            ${job.summary ? `<div>Summary: ${job.summary}</div>` : ''}
                            ${job.highlights && job.highlights.length > 0 ? 
                              `<div>
                                <strong>Highlights:</strong>
                                <ul>${job.highlights.map(highlight => `<li>${highlight}</li>`).join('')}</ul>
                              </div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners for edit/delete buttons
            $$('.edit-work').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    app.openEditModal('work', index);
                });
            });
            
            $$('.delete-work').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    if (confirm('Are you sure you want to delete this work experience?')) {
                        app.data.work.splice(index, 1);
                        app.renderWork();
                        app.showToast('Work experience deleted successfully!');
                    }
                });
            });
        },
        
        renderEducation() {
            const container = $('#education-container');
            const education = app.data.education;
            
            if (education.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="education-empty">
                        <i class="fa-solid fa-graduation-cap fa-2x"></i>
                        <p>No education added yet. Click the "Add Education" button to add your educational background.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            education.forEach((edu, index) => {
                html += `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <strong>${edu.institution} ${edu.studyType && edu.area ? `- ${edu.studyType} in ${edu.area}` : 
                              edu.studyType ? `- ${edu.studyType}` : edu.area ? `- ${edu.area}` : ''}</strong>
                            <div class="resume-item-actions">
                                <button class="icon-button edit-education" data-index="${index}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="icon-button delete-education" data-index="${index}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            ${edu.startDate || edu.endDate ? 
                              `<div>${edu.startDate || ''} ${edu.startDate && edu.endDate ? ' - ' : ''} ${edu.endDate || ''}</div>` : ''}
                            ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ''}
                            ${edu.courses && edu.courses.length > 0 ? 
                              `<div>
                                <strong>Courses:</strong>
                                <ul>${edu.courses.map(course => `<li>${course}</li>`).join('')}</ul>
                              </div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners for edit/delete buttons
            $$('.edit-education').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    app.openEditModal('education', index);
                });
            });
            
            $$('.delete-education').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    if (confirm('Are you sure you want to delete this education entry?')) {
                        app.data.education.splice(index, 1);
                        app.renderEducation();
                        app.showToast('Education entry deleted successfully!');
                    }
                });
            });
        },
        
        renderSkills() {
            const container = $('#skills-container');
            const skills = app.data.skills;
            
            if (skills.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="skills-empty">
                        <i class="fa-solid fa-code fa-2x"></i>
                        <p>No skills added yet. Click the "Add Skill" button to add your professional skills.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            skills.forEach((skill, index) => {
                html += `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <strong>${skill.name}${skill.level ? ` - ${skill.level}` : ''}</strong>
                            <div class="resume-item-actions">
                                <button class="icon-button edit-skill" data-index="${index}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="icon-button delete-skill" data-index="${index}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            ${skill.keywords && skill.keywords.length > 0 ? 
                              `<div>Keywords: ${skill.keywords.join(', ')}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners for edit/delete buttons
            $$('.edit-skill').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    app.openEditModal('skills', index);
                });
            });
            
            $$('.delete-skill').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    if (confirm('Are you sure you want to delete this skill?')) {
                        app.data.skills.splice(index, 1);
                        app.renderSkills();
                        app.showToast('Skill deleted successfully!');
                    }
                });
            });
        },
        
        renderProjects() {
            const container = $('#projects-container');
            const projects = app.data.projects;
            
            if (projects.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="projects-empty">
                        <i class="fa-solid fa-diagram-project fa-2x"></i>
                        <p>No projects added yet. Click the "Add Project" button to add your notable projects.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            projects.forEach((project, index) => {
                html += `
                    <div class="resume-item">
                        <div class="resume-item-header">
                            <strong>${project.name}</strong>
                            <div class="resume-item-actions">
                                <button class="icon-button edit-project" data-index="${index}">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="icon-button delete-project" data-index="${index}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            ${project.startDate || project.endDate ? 
                              `<div>${project.startDate || ''} ${project.startDate && project.endDate ? ' - ' : ''} ${project.endDate || ''}</div>` : ''}
                            ${project.url ? `<div>URL: <a href="${project.url}" target="_blank">${project.url}</a></div>` : ''}
                            ${project.description ? `<div>Description: ${project.description}</div>` : ''}
                            ${project.highlights && project.highlights.length > 0 ? 
                              `<div>
                                <strong>Highlights:</strong>
                                <ul>${project.highlights.map(highlight => `<li>${highlight}</li>`).join('')}</ul>
                              </div>` : ''}
                            ${project.keywords && project.keywords.length > 0 ? 
                              `<div>Keywords: ${project.keywords.join(', ')}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners for edit/delete buttons
            $$('.edit-project').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    app.openEditModal('projects', index);
                });
            });
            
            $$('.delete-project').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    if (confirm('Are you sure you want to delete this project?')) {
                        app.data.projects.splice(index, 1);
                        app.renderProjects();
                        app.showToast('Project deleted successfully!');
                    }
                });
            });
        },
        
        showToast(message, type = 'success') {
            const toast = $('#toast');
            toast.textContent = message;
            toast.className = 'toast';
            
            if (type === 'error') {
                toast.classList.add('error');
            }
            
            // Show the toast
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // Hide the toast after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        },
        
        // Initialize localStorage management
        initLocalStorage() {
            // Check if localStorage is available
            if (!app.isLocalStorageAvailable()) {
                console.warn('localStorage is not available. Resume saving functionality will be disabled.');
                $('#save-button').disabled = true;
                $('#load-button').disabled = true;
                return;
            }
            
            // Initialize the saved resumes registry if it doesn't exist
            if (!localStorage.getItem('resumeRegistry')) {
                localStorage.setItem('resumeRegistry', JSON.stringify([]));
            }
        },

        // Check if localStorage is available
        isLocalStorageAvailable() {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },
        
        // Create a copy of the current resume with a new ID
        copyResume() {
            if (!app.isLocalStorageAvailable()) {
                app.showToast('localStorage is not available. Cannot copy resume.', 'error');
                return false;
            }
            
            try {
                // Generate a new unique ID
                const newResumeId = `resume_${Date.now()}`;
                
                // Create a deep copy of the current resume data
                const resumeCopy = JSON.parse(JSON.stringify(app.data));
                
                // Update the metadata
                resumeCopy.meta.id = newResumeId;
                resumeCopy.meta.name = resumeCopy.meta.name ? `${resumeCopy.meta.name} (Copy)` : 'Copy of Resume';
                resumeCopy.meta.lastModified = new Date().toISOString();
                
                // Save to localStorage
                const registry = app.getSavedResumes();
                
                // Add to registry
                registry.push({
                    id: newResumeId,
                    name: resumeCopy.meta.name,
                    savedDate: resumeCopy.meta.lastModified,
                    basics: {
                        name: resumeCopy.basics.name || 'Unnamed',
                        label: resumeCopy.basics.label || ''
                    }
                });
                
                // Update registry
                localStorage.setItem('resumeRegistry', JSON.stringify(registry));
                
                // Save the new resume data
                localStorage.setItem(`resume_${newResumeId}`, JSON.stringify(resumeCopy));
                
                // Load the copied resume
                app.data = resumeCopy;
                
                // Update UI
                app.updateFormFields();
                app.renderProfiles();
                app.renderWork();
                app.renderEducation();
                app.renderSkills();
                app.renderProjects();
                
                app.showToast('Resume copied successfully!');
                return true;
            } catch (e) {
                console.error('Error copying resume:', e);
                app.showToast('Error copying resume. Please try again.', 'error');
                return false;
            }
        },

        // Get saved resumes registry
        getSavedResumes() {
            if (!app.isLocalStorageAvailable()) return [];
            
            try {
                return JSON.parse(localStorage.getItem('resumeRegistry') || '[]');
            } catch (e) {
                console.error('Error parsing resume registry:', e);
                return [];
            }
        },

        // Save resume to localStorage
        saveResumeToStorage(name) {
            if (!app.isLocalStorageAvailable()) {
                app.showToast('localStorage is not available. Cannot save resume.', 'error');
                return false;
            }
            
            try {
                const registry = app.getSavedResumes();
                const saveDate = new Date().toISOString();
                
                // Update metadata
                app.data.meta.lastModified = saveDate;
                app.data.meta.name = name;
                
                // Generate a unique ID if it doesn't exist
                const resumeId = app.data.meta.id || `resume_${Date.now()}`;
                app.data.meta.id = resumeId;
                
                // Check if this resume already exists in registry
                const existingIndex = registry.findIndex(r => r.id === resumeId);
                
                if (existingIndex >= 0) {
                    // Update existing entry
                    registry[existingIndex] = {
                        id: resumeId,
                        name: name,
                        savedDate: saveDate,
                        basics: {
                            name: app.data.basics.name || 'Unnamed',
                            label: app.data.basics.label || ''
                        }
                    };
                } else {
                    // Add new entry
                    registry.push({
                        id: resumeId,
                        name: name,
                        savedDate: saveDate,
                        basics: {
                            name: app.data.basics.name || 'Unnamed',
                            label: app.data.basics.label || ''
                        }
                    });
                }
                
                // Save updated registry
                localStorage.setItem('resumeRegistry', JSON.stringify(registry));
                
                // Save the actual resume data
                localStorage.setItem(`resume_${resumeId}`, JSON.stringify(app.data));
                
                return true;
            } catch (e) {
                console.error('Error saving resume:', e);
                app.showToast('Error saving resume. Please try again.', 'error');
                return false;
            }
        },

        // Load resume from localStorage
        loadResumeFromStorage(resumeId) {
            if (!app.isLocalStorageAvailable()) {
                app.showToast('localStorage is not available. Cannot load resume.', 'error');
                return false;
            }
            
            try {
                const resumeData = localStorage.getItem(`resume_${resumeId}`);
                
                if (!resumeData) {
                    app.showToast('Resume not found.', 'error');
                    return false;
                }
                
                const parsedData = JSON.parse(resumeData);
                app.loadResumeData(parsedData);
                
                app.showToast('Resume loaded successfully!');
                return true;
            } catch (e) {
                console.error('Error loading resume:', e);
                app.showToast('Error loading resume. Please try again.', 'error');
                return false;
            }
        },

        // Delete resume from localStorage
        deleteResumeFromStorage(resumeId) {
            if (!app.isLocalStorageAvailable()) {
                app.showToast('localStorage is not available. Cannot delete resume.', 'error');
                return false;
            }
            
            try {
                // Remove from registry
                const registry = app.getSavedResumes();
                const updatedRegistry = registry.filter(r => r.id !== resumeId);
                localStorage.setItem('resumeRegistry', JSON.stringify(updatedRegistry));
                
                // Remove the actual resume data
                localStorage.removeItem(`resume_${resumeId}`);
                
                return true;
            } catch (e) {
                console.error('Error deleting resume:', e);
                app.showToast('Error deleting resume. Please try again.', 'error');
                return false;
            }
        },

        // Rename resume in localStorage
        renameResumeInStorage(resumeId, newName) {
            if (!app.isLocalStorageAvailable()) {
                app.showToast('localStorage is not available. Cannot rename resume.', 'error');
                return false;
            }
            
            try {
                // Update registry
                const registry = app.getSavedResumes();
                const resumeIndex = registry.findIndex(r => r.id === resumeId);
                
                if (resumeIndex === -1) {
                    app.showToast('Resume not found.', 'error');
                    return false;
                }
                
                registry[resumeIndex].name = newName;
                localStorage.setItem('resumeRegistry', JSON.stringify(registry));
                
                // Update the resume data if it's the current one
                if (app.data.meta.id === resumeId) {
                    app.data.meta.name = newName;
                    app.saveResumeToStorage(newName);
                } else {
                    // Otherwise, load, update, and save back
                    const resumeData = JSON.parse(localStorage.getItem(`resume_${resumeId}`));
                    if (resumeData) {
                        resumeData.meta.name = newName;
                        localStorage.setItem(`resume_${resumeId}`, JSON.stringify(resumeData));
                    }
                }
                
                return true;
            } catch (e) {
                console.error('Error renaming resume:', e);
                app.showToast('Error renaming resume. Please try again.', 'error');
                return false;
            }
        },

        // Open save modal
        openSaveModal() {
            const modal = $('#save-modal');
            const nameInput = $('#save-name');
            const warningSection = $('#save-existing-section');
            
            // Set default name from current resume if available, otherwise use basics name
            nameInput.value = app.data.meta.name || (app.data.basics.name ? `${app.data.basics.name}'s Resume` : 'My Resume');
            
            // Check if this name already exists
            const registry = app.getSavedResumes();
            const existingResume = registry.find(r => r.name === nameInput.value && r.id !== app.data.meta.id);
            
            warningSection.classList.toggle('hidden', !existingResume);
            
            // Add event listener for name input changes
            nameInput.oninput = function() {
                const newName = nameInput.value.trim();
                const existingResume = registry.find(r => r.name === newName && r.id !== app.data.meta.id);
                warningSection.classList.toggle('hidden', !existingResume);
            };
            
            modal.classList.remove('hidden');
        },

        // Open load modal
        openLoadModal() {
            const modal = $('#load-modal');
            app.renderSavedResumesList();
            modal.classList.remove('hidden');
        },

        // Render the list of saved resumes
        renderSavedResumesList() {
            const container = $('#saved-resumes-list');
            const resumes = app.getSavedResumes();
            
            if (resumes.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-folder-open fa-2x"></i>
                        <p>No saved resumes found. Save a resume first to see it here.</p>
                    </div>
                `;
                return;
            }
            
            // Sort resumes by date (newest first)
            resumes.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
            
            let html = '';
            resumes.forEach(resume => {
                const savedDate = new Date(resume.savedDate);
                const formattedDate = savedDate.toLocaleDateString() + ' ' + savedDate.toLocaleTimeString();
                
                html += `
                    <div class="resume-item-card" data-id="${resume.id}">
                        <div class="resume-info">
                            <div class="resume-name">${app.escapeHtml(resume.name)}</div>
                            <div class="resume-date">
                                <strong>${app.escapeHtml(resume.basics.name || 'Unnamed')}</strong>
                                ${resume.basics.label ? ` - ${app.escapeHtml(resume.basics.label)}` : ''}
                                <div>Last saved: ${formattedDate}</div>
                            </div>
                            <div class="edit-name-form hidden" data-id="${resume.id}">
                                <input type="text" class="rename-input" value="${app.escapeHtml(resume.name)}">
                                <button class="small-button save-rename" data-id="${resume.id}">
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="small-button cancel-rename">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                        <div class="resume-item-actions">
                            <button class="icon-button load-resume" data-id="${resume.id}" title="Load this resume">
                                <i class="fa-solid fa-folder-open"></i>
                            </button>
                            <button class="icon-button rename-resume" data-id="${resume.id}" title="Rename">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="icon-button delete-resume" data-id="${resume.id}" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners
            $$('.load-resume').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resumeId = btn.dataset.id;
                    if (app.loadResumeFromStorage(resumeId)) {
                        app.closeAllModals();
                    }
                });
            });
            
            $$('.rename-resume').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resumeId = btn.dataset.id;
                    const card = btn.closest('.resume-item-card');
                    const nameDisplay = card.querySelector('.resume-name');
                    const editForm = card.querySelector('.edit-name-form');
                    
                    nameDisplay.classList.add('hidden');
                    editForm.classList.remove('hidden');
                    editForm.querySelector('input').focus();
                });
            });
            
            $$('.save-rename').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resumeId = btn.dataset.id;
                    const card = btn.closest('.resume-item-card');
                    const newName = card.querySelector('.rename-input').value.trim();
                    
                    if (!newName) {
                        app.showToast('Resume name cannot be empty', 'error');
                        return;
                    }
                    
                    if (app.renameResumeInStorage(resumeId, newName)) {
                        app.showToast('Resume renamed successfully!');
                        app.renderSavedResumesList();
                    }
                });
            });
            
            $$('.cancel-rename').forEach(btn => {
                btn.addEventListener('click', () => {
                    const card = btn.closest('.resume-item-card');
                    const nameDisplay = card.querySelector('.resume-name');
                    const editForm = card.querySelector('.edit-name-form');
                    
                    nameDisplay.classList.remove('hidden');
                    editForm.classList.add('hidden');
                });
            });
            
            $$('.delete-resume').forEach(btn => {
                btn.addEventListener('click', () => {
                    const resumeId = btn.dataset.id;
                    
                    if (confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
                        if (app.deleteResumeFromStorage(resumeId)) {
                            app.showToast('Resume deleted successfully!');
                            app.renderSavedResumesList();
                        }
                    }
                });
            });
        },

        // Add event listeners for save/load functionality
        setupSaveLoadEventListeners() {
            // Open save modal
            $('#save-button').addEventListener('click', app.openSaveModal);
            
            // Open load modal
            $('#load-button').addEventListener('click', app.openLoadModal);
            
            // Save button in modal
            $('#save-resume').addEventListener('click', () => {
                const name = $('#save-name').value.trim();
                
                if (!name) {
                    app.showToast('Please enter a name for your resume', 'error');
                    return;
                }
                
                if (app.saveResumeToStorage(name)) {
                    app.showToast('Resume saved successfully!');
                    app.closeAllModals();
                }
            });
        },


        // Handle swipe gestures for mobile navigation
        handleSwipe() {
            const SWIPE_THRESHOLD = 50; // Minimum distance required for a swipe
            const currentTab = $('.tab.active');
            const tabs = Array.from($$('.tab:not([data-modal-tab])'));
            const currentIndex = tabs.indexOf(currentTab);
            
            if (currentIndex === -1) return; // Not on a main tab
            
            // Left swipe (next tab)
            if (app.state.touchEndX + SWIPE_THRESHOLD < app.state.touchStartX) {
                const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
                if (nextIndex !== currentIndex) {
                    const nextTab = tabs[nextIndex];
                    const tabId = nextTab.dataset.tab;
                    if (tabId) app.switchTab(tabId);
                }
            }
            // Right swipe (previous tab)
            else if (app.state.touchEndX > app.state.touchStartX + SWIPE_THRESHOLD) {
                const prevIndex = Math.max(currentIndex - 1, 0);
                if (prevIndex !== currentIndex) {
                    const prevTab = tabs[prevIndex];
                    const tabId = prevTab.dataset.tab;
                    if (tabId) app.switchTab(tabId);
                }
            }
        },
        
        // Handle window resize
        handleResize() {
            // Adjust UI based on screen size
            const isMobile = window.innerWidth <= 768;
            
            // Adjust preview container height on mobile
            if (isMobile) {
                const previewContainer = $('#preview-container');
                if (previewContainer) {
                    previewContainer.style.maxHeight = '70vh';
                    previewContainer.style.overflowY = 'auto';
                }
            }
        },
        
        // Generate PDF from the preview container
        makePdf() {
            const previewContainer = $('#preview-container');
            const themeClass = $('.preview-modern, .preview-classic, .preview-minimal', previewContainer);
            const fileName = `${app.data.basics.name || 'resume'}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            // Show toast to indicate PDF generation is starting
            app.showToast('Generating PDF...');
            
            // Clone the preview container to avoid modifying the original
            const element = previewContainer.cloneNode(true);
            
            // Configure PDF options
            const options = {
                margin: [10, 10, 10, 10],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    logging: false
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait' 
                }
            };
            
            // Generate PDF
            html2pdf().from(element).set(options).save()
                .then(() => {
                    app.showToast('PDF generated successfully!');
                })
                .catch(error => {
                    console.error('Error generating PDF:', error);
                    app.showToast('Error generating PDF. Please try again.', 'error');
                });
        },
    
    // Utility function for loading test data
        loadSampleData() {
            const sampleData = {
                "basics": {
                    "name": "John Doe",
                    "label": "Full Stack Developer",
                    "picture": "",
                    "email": "john.doe@example.com",
                    "phone": "(123) 456-7890",
                    "website": "https://johndoe.com",
                    "summary": "Experienced full stack developer with a passion for creating responsive and user-friendly web applications. Over 5 years of industry experience.",
                    "location": {
                        "address": "123 Main St",
                        "postalCode": "12345",
                        "city": "San Francisco",
                        "countryCode": "US",
                        "region": "California"
                    },
                    "profiles": [
                        {
                            "network": "LinkedIn",
                            "username": "johndoe",
                            "url": "https://linkedin.com/in/johndoe"
                        },
                        {
                            "network": "GitHub",
                            "username": "johndoe",
                            "url": "https://github.com/johndoe"
                        }
                    ]
                },
                "work": [
                    {
                        "name": "Tech Solutions Inc.",
                        "position": "Senior Developer",
                        "url": "https://techsolutions.example.com",
                        "startDate": "2020-01-01",
                        "endDate": "Present",
                        "summary": "Lead developer for the company's main product.",
                        "highlights": [
                            "Implemented new features that increased user engagement by 25%",
                            "Mentored junior developers",
                            "Refactored legacy code, improving performance by 40%"
                        ],
                        "location": "San Francisco, CA"
                    },
                    {
                        "name": "WebDev Co",
                        "position": "Frontend Developer",
                        "url": "https://webdevco.example.com",
                        "startDate": "2018-03-01",
                        "endDate": "2019-12-31",
                        "summary": "Specialized in building responsive UI components.",
                        "highlights": [
                            "Developed a component library used across multiple projects",
                            "Collaborated with UX team to improve user experience"
                        ],
                        "location": "Remote"
                    }
                ],
                "education": [
                    {
                        "institution": "University of California",
                        "area": "Computer Science",
                        "studyType": "Bachelor",
                        "startDate": "2014-09-01",
                        "endDate": "2018-05-31",
                        "gpa": "3.8",
                        "courses": [
                            "Data Structures",
                            "Algorithms",
                            "Web Development",
                            "Database Systems"
                        ]
                    }
                ],
                "skills": [
                    {
                        "name": "Frontend Development",
                        "level": "Expert",
                        "keywords": [
                            "HTML",
                            "CSS",
                            "JavaScript",
                            "React",
                            "Vue"
                        ]
                    },
                    {
                        "name": "Backend Development",
                        "level": "Advanced",
                        "keywords": [
                            "Node.js",
                            "Express",
                            "Python",
                            "Django"
                        ]
                    }
                ],
                "projects": [
                    {
                        "name": "E-commerce Platform",
                        "description": "Built a scalable e-commerce platform with React and Node.js",
                        "highlights": [
                            "Implemented secure payment processing",
                            "Created an admin dashboard for inventory management"
                        ],
                        "keywords": [
                            "React",
                            "Node.js",
                            "MongoDB",
                            "Redux"
                        ],
                        "startDate": "2019-06-01",
                        "endDate": "2019-12-31",
                        "url": "https://github.com/johndoe/ecommerce"
                    }
                ],
                "meta": {
                    "theme": "elegant",
                    "version": "1.0.0",
                    "language": "en",
                    "lastModified": "2023-05-01T12:00:00Z"
                }
            };
            
            app.loadResumeData(sampleData);
            app.showToast('Sample data loaded successfully!');
        }
    }
    
    // Initialize the application
    window.app = app;
    document.addEventListener('DOMContentLoaded', app.init.bind(app));
})();

