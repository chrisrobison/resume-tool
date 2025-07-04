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
        setupEventListeners() {
            // Sidebar navigation
            $$('.sidebar-nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const viewId = item.dataset.view;
                    if (viewId) {
                        app.switchView(viewId);
                    }
                });
            });
            
            // Hamburger menu toggle
            $('.hamburger-menu').addEventListener('click', () => {
                $('.sidebar').classList.toggle('active');
                $('.menu-backdrop').classList.toggle('active');
            });
            
            // Menu backdrop click to close sidebar on mobile
            $('.menu-backdrop').addEventListener('click', () => {
                $('.sidebar').classList.remove('active');
                $('.menu-backdrop').classList.remove('active');
            });
            
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

            // Import/Export/Copy/Settings buttons
            $('#import-button').addEventListener('click', () => app.openModal('import-modal'));
            $('#export-button').addEventListener('click', app.exportResume);
            $('#copy-button').addEventListener('click', app.copyResume);
            $('#settings-button').addEventListener('click', () => app.openModal('settings-modal'));
            
            // Add job button
            $('#add-job').addEventListener('click', app.openJobsModal);

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
        
        // Balance JSON brackets and braces
        balanceJsonBrackets(jsonString) {
            try {
                let openBraces = 0;
                let openBrackets = 0;
                let inString = false;
                let escaped = false;
                
                // First pass - count unbalanced brackets
                for (let i = 0; i < jsonString.length; i++) {
                    const char = jsonString[i];
                    
                    // Handle string literals correctly
                    if (char === '"' && !escaped) {
                        inString = !inString;
                    }
                    
                    // Only count brackets outside of strings
                    if (!inString) {
                        if (char === '{') openBraces++;
                        if (char === '}') openBraces--;
                        if (char === '[') openBrackets++;
                        if (char === ']') openBrackets--;
                    }
                    
                    // Track escaped characters
                    escaped = char === '\\' && !escaped;
                }
                
                // Add any missing closing braces or brackets
                let balanced = jsonString;
                
                // Add missing closing brackets
                for (let i = 0; i < openBrackets; i++) {
                    balanced += ']';
                }
                
                // Add missing closing braces
                for (let i = 0; i < openBraces; i++) {
                    balanced += '}';
                }
                
                // Fix any negative balance (too many closing brackets/braces)
                if (openBraces < 0 || openBrackets < 0) {
                    // This is harder to fix - try to just take the first valid object
                    const match = jsonString.match(/^\s*\{.*?\}\s*[,;]?/s);
                    if (match) {
                        balanced = match[0].replace(/[,;]\s*$/, '');
                    }
                }
                
                return balanced;
            } catch (error) {
                console.warn("Error balancing JSON brackets:", error);
                return jsonString; // Return original if we can't fix it
            }
        },
        
        // Try to fix JSON at specific error position
        fixJsonAtPosition(jsonString, errorPosition) {
            try {
                // Get a window around the error
                const start = Math.max(0, errorPosition - 20);
                const end = Math.min(jsonString.length, errorPosition + 20);
                const errorContext = jsonString.substring(start, end);
                
                console.log(`JSON error around position ${errorPosition}:`, errorContext);
                
                // Look for common patterns that can cause issues
                let fixed = jsonString;
                
                // Check for unclosed string (missing quotation mark)
                const unclosedStringMatch = errorContext.match(/"([^"\\]*(\\.[^"\\]*)*)$/);
                if (unclosedStringMatch) {
                    // Fix by adding closing quote
                    fixed = jsonString.substring(0, errorPosition) + '"' + jsonString.substring(errorPosition);
                    return fixed;
                }
                
                // Check for trailing comma in an object or array
                if (errorContext.includes(',}') || errorContext.includes(',]')) {
                    fixed = jsonString.replace(/,\s*([}\]])/g, '$1');
                    return fixed;
                }
                
                // Check for missing comma between object properties
                const missingCommaMatch = errorContext.match(/"[^"]*"\s*:\s*("[^"]*"|[0-9]+|true|false|null)\s*"/);
                if (missingCommaMatch) {
                    // Fix by adding a comma before the next property
                    const insertPos = start + missingCommaMatch[0].length - 1;
                    fixed = jsonString.substring(0, insertPos) + ', ' + jsonString.substring(insertPos);
                    return fixed;
                }
                
                // If we can't identify the specific issue, just truncate at the error position
                return jsonString.substring(0, errorPosition) + '}}';
            } catch (error) {
                console.warn("Error fixing JSON:", error);
                return jsonString; // Return original if fix fails
            }
        },
        
        // Safe JSON parsing with error handling and cleanup
        safeParseJson(jsonString) {
            if (!jsonString) return null;
            
            try {
                // First, see if it's already valid JSON
                try {
                    return JSON.parse(jsonString);
                } catch (initialError) {
                    // Continue with cleanup if direct parsing fails
                    console.log("Initial JSON parse failed, attempting cleanup");
                }
                
                // Look for JSON content within a larger string
                let extractedJson = jsonString;
                const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/) || 
                                 jsonString.match(/```\n([\s\S]*?)\n```/) ||
                                 jsonString.match(/\{[\s\S]*\}/);
                                  
                if (jsonMatch) {
                    // Extract the JSON from code blocks or from the first { to last }
                    extractedJson = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
                }
                
                // Check for data that might be appended after valid JSON 
                // (often happens with LocalStorage corruption)
                let truncatedJson = extractedJson;
                try {
                    // Try to find the minimal valid JSON by cutting at the last valid brace
                    const lastBraceIndex = extractedJson.lastIndexOf('}');
                    if (lastBraceIndex > 0) {
                        truncatedJson = extractedJson.substring(0, lastBraceIndex + 1);
                        // Test if this is valid
                        JSON.parse(truncatedJson);
                        // If we get here, we found valid JSON by truncating
                        return JSON.parse(truncatedJson); 
                    }
                } catch (error) {
                    // Continue with other cleanup methods
                }
                
                // Clean up the JSON string:
                // 1. Replace literal newlines in strings with escaped newlines
                // This regex approach can sometimes fail, so we wrap it in try/catch
                let cleanedJson = extractedJson;
                try {
                    cleanedJson = extractedJson.replace(/"([^"]*)"/g, (match, p1) => {
                        // Replace literal newlines with escaped newlines in JSON string values
                        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
                    });
                } catch (regexError) {
                    console.warn("Regex cleanup failed, continuing with other methods");
                }
                
                // 2. Fix other common issues
                let fixedJson = cleanedJson;
                try {
                    fixedJson = cleanedJson
                        // Remove any non-standard JSON control characters
                        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                        // Fix unescaped backslashes
                        .replace(/([^\\])\\([^"\\/bfnrtu])/g, '$1\\\\$2')
                        // Fix trailing commas in arrays/objects
                        .replace(/,\s*([\]}])/g, '$1');
                } catch (cleanupError) {
                    console.warn("JSON cleanup steps failed, using original");
                    fixedJson = extractedJson;
                }
                
                // 3. Try more aggressive fixes if standard cleanup didn't work
                try {
                    // First attempt with our cleaned JSON
                    return JSON.parse(fixedJson);
                } catch (parseError) {
                    console.log("Standard cleanup failed, trying more aggressive approaches");
                    
                    // Log more specific error information
                    console.log("Parse error details:", parseError.message);
                    
                    try {
                        // Check for missing closing brackets or braces
                        const balancedJson = app.balanceJsonBrackets(fixedJson);
                        return JSON.parse(balancedJson);
                    } catch (bracketError) {
                        // Try removing or fixing problem areas indicated in error messages
                        const errorPos = parseError.message.match(/position (\d+)/);
                        if (errorPos && errorPos[1]) {
                            const position = parseInt(errorPos[1]);
                            
                            // Create a fixed version by analyzing the context around the error
                            let contextFixedJson = app.fixJsonAtPosition(fixedJson, position);
                            try {
                                return JSON.parse(contextFixedJson);
                            } catch (contextFixError) {
                                // Last resort - remove problem area completely
                                const truncatedJson = fixedJson.substring(0, Math.max(0, position - 10)) + "}";
                                try {
                                    return JSON.parse(truncatedJson);
                                } catch (truncateError) {
                                    // Give up and return an empty object
                                    console.error("All JSON parsing attempts failed");
                                    return null;
                                }
                            }
                        } else {
                            // Remove all non-ASCII characters as a last resort
                            const asciiOnly = extractedJson.replace(/[^\x20-\x7E]/g, '');
                            try {
                                return JSON.parse(asciiOnly);
                            } catch (asciiError) {
                                console.error("ASCII-only parsing failed");
                                return null;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                // Log a portion of the problematic JSON
                if (jsonString && typeof jsonString === 'string') {
                    const preview = jsonString.length > 100 ? 
                        jsonString.substring(0, 100) + '...' : jsonString;
                    console.error('Problematic JSON preview:', preview);
                } else {
                    console.error('Invalid JSON input (not a string):', typeof jsonString);
                }
                
                // Return an empty object instead of null to avoid errors when accessing properties
                return null;
            }
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
        
        switchView(viewId) {
            console.log(`Switching to view: ${viewId}`);
            
            // Make sure the elements exist
            const sidebarItem = $(`[data-view="${viewId}"]`);
            const viewContainer = $(`#${viewId}-view`);
            
            if (!sidebarItem || !viewContainer) {
                console.error(`View elements not found for: ${viewId}`);
                return;
            }
            
            // Deactivate all sidebar items and view containers
            $$('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
            $$('.view-container').forEach(view => view.classList.remove('active'));
            
            // Activate selected sidebar item and view container
            sidebarItem.classList.add('active');
            viewContainer.classList.add('active');
            
            // Close the sidebar on mobile after selecting a view
            if (window.innerWidth <= 768) {
                $('.sidebar').classList.remove('active');
                $('.menu-backdrop').classList.remove('active');
            }
            
            // If we're switching to the jobs view, refresh the jobs list
            if (viewId === 'jobs') {
                setTimeout(() => app.renderJobsList(), 0);
            }
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
                
                const resumeData = app.safeParseJson(jsonText);
                if (!resumeData) {
                    throw new Error('Invalid JSON format');
                }
                
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
                    const resumeData = app.safeParseJson(e.target.result);
                    if (!resumeData) {
                        throw new Error('Invalid JSON format in file');
                    }
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
            
            // Update job info section if available
            if (meta.jobDescription) {
                $('#job-info-section').classList.remove('hidden');
                $('#meta-job-description').value = meta.jobDescription;
                
                // Add event listener for cover letter button
                $('#view-cover-letter').addEventListener('click', () => {
                    if (meta.coverLetter) {
                        $('#cover-letter-content').textContent = meta.coverLetter;
                        app.openModal('cover-letter-modal');
                    } else {
                        app.showToast('No cover letter available', 'error');
                    }
                });
            } else {
                $('#job-info-section').classList.add('hidden');
            }
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
            
            if (!education || education.length === 0) {
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
            
            // Initialize or repair registries if needed
            try {
                // Check if resumeRegistry exists and can be parsed
                const resumeRegistry = localStorage.getItem('resumeRegistry');
                if (!resumeRegistry) {
                    localStorage.setItem('resumeRegistry', JSON.stringify([]));
                } else {
                    // Try to parse it to make sure it's valid
                    try {
                        JSON.parse(resumeRegistry);
                    } catch (e) {
                        console.warn('Resume registry corrupted, resetting');
                        localStorage.setItem('resumeRegistry', JSON.stringify([]));
                    }
                }
                
                // Check if savedJobs exists and can be parsed
                const savedJobs = localStorage.getItem('savedJobs');
                if (!savedJobs) {
                    localStorage.setItem('savedJobs', JSON.stringify([]));
                } else {
                    // Try to parse it to make sure it's valid
                    try {
                        JSON.parse(savedJobs);
                    } catch (e) {
                        console.warn('Jobs registry corrupted, resetting');
                        localStorage.setItem('savedJobs', JSON.stringify([]));
                    }
                }
            } catch (error) {
                console.error('Error initializing localStorage:', error);
                // Attempt to reset both registries
                try {
                    localStorage.setItem('resumeRegistry', JSON.stringify([]));
                    localStorage.setItem('savedJobs', JSON.stringify([]));
                } catch (resetError) {
                    console.error('Failed to reset localStorage registries:', resetError);
                }
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
                const registryData = localStorage.getItem('resumeRegistry') || '[]';
                const parsedData = app.safeParseJson(registryData);
                return parsedData || [];
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
                
                const parsedData = app.safeParseJson(resumeData);
                if (!parsedData) {
                    app.showToast('Error parsing resume data.', 'error');
                    return false;
                }
                
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
            
            // API Settings
            $('#save-settings').addEventListener('click', app.saveApiSettings);
            
            // Job submission
            $('#submit-job').addEventListener('click', app.submitJob);
            
            // Load API settings when the settings modal is opened
            $('#settings-button').addEventListener('click', app.loadApiSettings);
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
    
    // API settings management
        saveApiSettings() {
            const apiType = $('#api-type').value;
            const apiKey = $('#api-key').value;
            
            if (!apiKey) {
                app.showToast('Please enter an API key', 'error');
                return;
            }
            
            // Save API settings to localStorage
            const useDirect = $('#use-direct-api').checked;
            localStorage.setItem('resume_api_type', apiType);
            localStorage.setItem('resume_api_key', apiKey);
            localStorage.setItem('resume_use_direct_api', useDirect ? 'true' : 'false');
            
            app.closeAllModals();
            app.showToast('API settings saved successfully!');
        },
        
        // Load API settings from localStorage
        loadApiSettings() {
            const apiType = localStorage.getItem('resume_api_type');
            const apiKey = localStorage.getItem('resume_api_key');
            const useDirect = localStorage.getItem('resume_use_direct_api') === 'true';
            
            if (apiType) {
                $('#api-type').value = apiType;
            }
            
            if (apiKey) {
                $('#api-key').value = apiKey;
            }
            
            $('#use-direct-api').checked = useDirect;
            
            return { apiType, apiKey, useDirect };
        },
        
        // Open the jobs modal and check for API settings
        openJobsModal() {
            const { apiType, apiKey } = app.loadApiSettings();
            
            // Check if API settings are configured
            if (!apiKey) {
                $('#job-api-required').classList.remove('hidden');
            } else {
                $('#job-api-required').classList.add('hidden');
            }
            
            app.openModal('jobs-modal');
        },
        
        // Submit job for resume tailoring
        submitJob() {
            const jobDescription = $('#job-description').value.trim();
            const { apiType, apiKey, useDirect } = app.loadApiSettings();
            
            if (!jobDescription) {
                app.showToast('Please enter a job description', 'error');
                return;
            }
            
            if (!apiKey) {
                app.showToast('Please configure your API settings first', 'error');
                $('#job-api-required').classList.remove('hidden');
                return;
            }
            
            // Show processing message
            app.showToast('Processing your resume. This may take a minute...');
            
            // Determine if we're using browser-direct API or server API
            console.log(`Using direct API: ${useDirect}`);
            
            if (useDirect) {
                // Use direct browser API call
                if (apiType === 'claude') {
                    app.callClaudeDirectly(app.data, jobDescription, apiKey);
                } else if (apiType === 'chatgpt') {
                    app.callOpenAIDirectly(app.data, jobDescription, apiKey);
                } else {
                    app.showToast('Invalid API type selected', 'error');
                }
            } else {
                // Use server API approach
                // Create payload for API request
                const payload = {
                    resume: app.data,
                    jobDescription: jobDescription,
                    apiType: apiType,
                    apiKey: apiKey
                };
                
                let apiurl = '/api/tailor-resume';
                console.log(`api url: ${apiurl}`);

                // Call the server API
                fetch(apiurl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Handle successful response
                    app.processTailoredResume(data);
                    app.closeAllModals();
                    app.showToast('Resume tailored successfully!');
                })
                .catch(error => {
                    console.error('Error tailoring resume:', error);
                    app.showToast(`Error tailoring resume: ${error.message}`, 'error');
                });
            }
        },
        
        // Direct Anthropic Claude API call
        callClaudeDirectly(resume, jobDescription, apiKey) {
            console.log('Calling Claude API directly from browser');
            
            // Format the resume data as string
            const resumeStr = JSON.stringify(resume, null, 2);
            
            // Create a more explicit prompt for Claude to get cleaner JSON
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
5. Do not include any markdown formatting like \`\`\`json or \`\`\` in your response`;

            // Call Claude API with the special browser header
            fetch('https://api.anthropic.com/v1/messages', {
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
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.content || !data.content[0] || !data.content[0].text) {
                    throw new Error('Invalid response from Claude API');
                }
                
                // Extract the JSON from Claude's response
                const responseText = data.content[0].text;
                
                // Use our safe JSON parsing function
                const jsonResult = app.safeParseJson(responseText);
                
                if (!jsonResult) {
                    app.showToast('Error parsing response from Claude API. Invalid JSON format.', 'error');
                    return;
                }
                
                // Check if the response has the expected structure
                if (!jsonResult.resume || !jsonResult.coverLetter || !jsonResult.jobDescription) {
                    console.error('Invalid response structure:', jsonResult);
                    app.showToast('Invalid response structure from Claude API', 'error');
                    return;
                }
                
                // Process the tailored resume
                app.processTailoredResume(jsonResult);
                app.closeAllModals();
                app.showToast('Resume tailored successfully!');
            })
            .catch(error => {
                console.error('Error calling Claude API directly:', error);
                app.showToast(`Error calling Claude API: ${error.message}`, 'error');
            });
        },
        
        // Direct OpenAI API call
        callOpenAIDirectly(resume, jobDescription, apiKey) {
            console.log('Calling OpenAI API directly from browser');
            
            // Format the resume data as string
            const resumeStr = JSON.stringify(resume, null, 2);
            
            // Create a more explicit system message for OpenAI to ensure clean JSON
            const systemMessage = "You are an expert at creating valid, properly escaped JSON. You specialize in tailoring resumes and writing cover letters. " +
                                 "Respond ONLY with a complete, syntactically valid JSON object. No markdown, no code blocks, no explanations. " +
                                 "Ensure all quotes in strings are escaped properly and there are no unescaped newlines in string values. " +
                                 "Your response must be parseable by JSON.parse() without any modifications.";
            
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
5. Do NOT wrap your response in \`\`\`json or any other markdown`;

            // Call OpenAI API with reduced temperature for more predictable output
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
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
                    temperature: 0.2, // Lower temperature for more consistent output
                    max_tokens: 4000,
                    response_format: { type: "json_object" } // Request JSON format explicitly if available
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                    throw new Error('Invalid response from OpenAI API');
                }
                
                // Extract the response content
                const responseText = data.choices[0].message.content;
                
                // Use our safe JSON parsing function
                const jsonResult = app.safeParseJson(responseText);
                
                if (!jsonResult) {
                    app.showToast('Error parsing response from OpenAI API. Invalid JSON format.', 'error');
                    return;
                }
                
                // Check if the response has the expected structure
                if (!jsonResult.resume || !jsonResult.coverLetter || !jsonResult.jobDescription) {
                    console.error('Invalid response structure:', jsonResult);
                    app.showToast('Invalid response structure from OpenAI API', 'error');
                    return;
                }
                
                // Process the tailored resume
                app.processTailoredResume(jsonResult);
                app.closeAllModals();
                app.showToast('Resume tailored successfully!');
            })
            .catch(error => {
                console.error('Error calling OpenAI API directly:', error);
                app.showToast(`Error calling OpenAI API: ${error.message}`, 'error');
            });
        },
        
        // Process the tailored resume received from the API
        processTailoredResume(data) {
            if (!data || !data.resume) {
                app.showToast('Invalid response from server', 'error');
                return;
            }
            
            // Generate a new unique ID for the tailored resume
            const newResumeId = `resume_${Date.now()}`;
            
            // Create a resume copy with the tailored data
            const tailoredResume = data.resume;
            
            // Set metadata
            tailoredResume.meta = tailoredResume.meta || {};
            tailoredResume.meta.id = newResumeId;
            tailoredResume.meta.name = tailoredResume.meta.name ? 
                `${tailoredResume.meta.name} (Tailored)` : 
                'Tailored Resume';
            tailoredResume.meta.lastModified = new Date().toISOString();
            tailoredResume.meta.jobDescription = data.jobDescription;
            tailoredResume.meta.coverLetter = data.coverLetter;
            
            // Save the job information
            const jobInfo = {
                id: `job_${Date.now()}`,
                title: app.extractJobTitle(data.jobDescription) || 'Untitled Job',
                company: app.extractCompanyName(data.jobDescription) || 'Unknown Company',
                description: data.jobDescription,
                coverLetter: data.coverLetter,
                resumeId: newResumeId,
                date: new Date().toISOString(),
                status: 'Applied'
            };
            
            // Save to localStorage
            const registry = app.getSavedResumes();
            const jobs = app.getSavedJobs();
            
            // Add to registry
            registry.push({
                id: newResumeId,
                name: tailoredResume.meta.name,
                savedDate: tailoredResume.meta.lastModified,
                basics: {
                    name: tailoredResume.basics.name || 'Unnamed',
                    label: tailoredResume.basics.label || ''
                },
                jobId: jobInfo.id
            });
            
            // Add to jobs
            jobs.push(jobInfo);
            
            // Update registry and jobs
            localStorage.setItem('resumeRegistry', JSON.stringify(registry));
            localStorage.setItem('savedJobs', JSON.stringify(jobs));
            
            // Save the tailored resume data
            localStorage.setItem(`resume_${newResumeId}`, JSON.stringify(tailoredResume));
            
            // Load the tailored resume
            app.data = tailoredResume;
            
            // Update UI
            app.updateFormFields();
            app.renderProfiles();
            app.renderWork();
            app.renderEducation();
            app.renderSkills();
            app.renderProjects();
            
            // Update the jobs list if we're on that view
            app.renderJobsList();
            
            // Show cover letter in a modal
            if (data.coverLetter) {
                // Display the cover letter in the modal
                $('#cover-letter-content').textContent = data.coverLetter;
                app.openModal('cover-letter-modal');
                
                // Add copy to clipboard functionality
                $('#copy-cover-letter').addEventListener('click', () => {
                    const coverLetterText = data.coverLetter;
                    navigator.clipboard.writeText(coverLetterText)
                        .then(() => {
                            app.showToast('Cover letter copied to clipboard!');
                        })
                        .catch(err => {
                            console.error('Error copying to clipboard:', err);
                            app.showToast('Error copying to clipboard.', 'error');
                        });
                });
            }
        },
        
        // Get saved jobs
        getSavedJobs() {
            if (!app.isLocalStorageAvailable()) return [];
            
            try {
                const jobsData = localStorage.getItem('savedJobs') || '[]';
                const parsedData = app.safeParseJson(jobsData);
                return parsedData || [];
            } catch (e) {
                console.error('Error parsing saved jobs:', e);
                return [];
            }
        },
        
        // Extract job title from description
        extractJobTitle(description) {
            if (!description) return '';
            
            // Simple extraction - look for common patterns
            const patterns = [
                /job title:?\s*([^,\n\.]+)/i,
                /title:?\s*([^,\n\.]+)/i,
                /position:?\s*([^,\n\.]+)/i,
                /^([^,\n\.]+)\s+job/i
            ];
            
            for (const pattern of patterns) {
                const match = description.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            // Fallback: use the first line or first X characters
            const firstLine = description.split('\n')[0];
            return firstLine.substring(0, 50).trim();
        },
        
        // Extract company name from description
        extractCompanyName(description) {
            if (!description) return '';
            
            // Simple extraction - look for common patterns
            const patterns = [
                /company:?\s*([^,\n\.]+)/i,
                /organization:?\s*([^,\n\.]+)/i,
                /employer:?\s*([^,\n\.]+)/i,
                /at\s+([^,\n\.]+)/i,
                /with\s+([^,\n\.]+)/i
            ];
            
            for (const pattern of patterns) {
                const match = description.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return 'Unknown Company';
        },
        
        // Render the jobs list
        renderJobsList() {
            const container = $('#jobs-container');
            
            // Exit if the container doesn't exist yet
            if (!container) {
                console.log('Jobs container not found');
                return;
            }
            
            const jobs = app.getSavedJobs();
            
            if (jobs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" id="jobs-empty">
                        <i class="fa-solid fa-briefcase fa-2x"></i>
                        <p>No jobs saved yet. Click "Add Job" to add a job posting and generate customized resumes.</p>
                    </div>
                `;
                return;
            }
            
            // Sort jobs by date (newest first)
            jobs.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let html = '';
            jobs.forEach(job => {
                const date = new Date(job.date);
                const formattedDate = date.toLocaleDateString();
                
                // Determine status color
                let statusColor = '#6c757d'; // Default gray
                if (job.status === 'Applied') statusColor = '#28a745'; // Green
                if (job.status === 'Interview') statusColor = '#3a86ff'; // Blue
                if (job.status === 'Rejected') statusColor = '#dc3545'; // Red
                if (job.status === 'Offer') statusColor = '#ffbe0b'; // Yellow
                
                html += `
                    <div class="resume-item-card" data-id="${job.id}">
                        <div class="resume-info">
                            <div class="resume-name">${app.escapeHtml(job.title)}</div>
                            <div class="resume-date">
                                <strong>${app.escapeHtml(job.company)}</strong>
                                <div>Added: ${formattedDate}</div>
                                <div class="job-status" style="color: ${statusColor}">
                                    <i class="fa-solid fa-circle" style="font-size: 0.8em;"></i>
                                    ${job.status}
                                </div>
                            </div>
                        </div>
                        <div class="resume-item-actions">
                            <button class="icon-button view-job" data-id="${job.id}" title="View job details">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="icon-button edit-job-status" data-id="${job.id}" title="Update status">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button class="icon-button delete-job" data-id="${job.id}" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Add event listeners
            $$('.view-job').forEach(btn => {
                btn.addEventListener('click', () => {
                    const jobId = btn.dataset.id;
                    app.viewJobDetails(jobId);
                });
            });
            
            $$('.edit-job-status').forEach(btn => {
                btn.addEventListener('click', () => {
                    const jobId = btn.dataset.id;
                    app.editJobStatus(jobId);
                });
            });
            
            $$('.delete-job').forEach(btn => {
                btn.addEventListener('click', () => {
                    const jobId = btn.dataset.id;
                    if (confirm('Are you sure you want to delete this job? This will not delete the associated resume.')) {
                        app.deleteJob(jobId);
                    }
                });
            });
        },
        
        // View job details
        viewJobDetails(jobId) {
            const jobs = app.getSavedJobs();
            const job = jobs.find(j => j.id === jobId);
            
            if (!job) {
                app.showToast('Job not found', 'error');
                return;
            }
            
            // We'll implement a job details modal in the future
            // For now, just load the associated resume
            if (job.resumeId) {
                if (app.loadResumeFromStorage(job.resumeId)) {
                    // Switch to resume view
                    app.switchView('resume');
                }
            } else {
                app.showToast('No resume associated with this job', 'error');
            }
        },
        
        // Edit job status
        editJobStatus(jobId) {
            const jobs = app.getSavedJobs();
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            
            if (jobIndex === -1) {
                app.showToast('Job not found', 'error');
                return;
            }
            
            // Simple status rotation for now
            const statusOptions = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
            const currentStatus = jobs[jobIndex].status || 'Saved';
            const currentIndex = statusOptions.indexOf(currentStatus);
            const newIndex = (currentIndex + 1) % statusOptions.length;
            jobs[jobIndex].status = statusOptions[newIndex];
            
            // Save to localStorage
            localStorage.setItem('savedJobs', JSON.stringify(jobs));
            
            // Update UI
            app.renderJobsList();
            app.showToast(`Status updated to "${statusOptions[newIndex]}"`);
        },
        
        // Delete job
        deleteJob(jobId) {
            const jobs = app.getSavedJobs();
            const updatedJobs = jobs.filter(j => j.id !== jobId);
            
            // Save to localStorage
            localStorage.setItem('savedJobs', JSON.stringify(updatedJobs));
            
            // Update UI
            app.renderJobsList();
            app.showToast('Job deleted successfully');
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

