// Resume Viewer Component - Migrated to ComponentBase
// Displays resume data with various themes and templates

import { ComponentBase } from '../js/component-base.js';

class ResumeViewerMigrated extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component-specific properties
        this._template = 'basic';
        this._hostedTheme = null;
        this._jsonResumeThemes = [
            'ace', 'actual', 'autumn', 'cora', 'cv', 'professional', 'elegant', 'full', 
            'flat', 'el-santo', 'even', 'github', 'github2', 'jacrys', 'kards', 'kendall', 
            'lucide', 'macchiato', 'mantra', 'mocha-responsive', 'minyma', 'msresume', 
            'one', 'onepage', 'onepage-plus', 'onepageresume', 'orbit', 'paper', 'papirus', 
            'paper-plus-plus', 'pumpkin', 'relaxed', 'rocketspacer', 'simple-red', 
            'rickosborne', 'spartan', 'spartacus', 'standard', 'stackoverflow', 
            'standard-resume', 'tan-responsive', 'techlead'
        ];
        
        // Bind methods for external access
        this.setResumeData = this.setResumeData.bind(this);
        this.setTemplate = this.setTemplate.bind(this);
        this.getAvailableThemes = this.getAvailableThemes.bind(this);
        this.openInNewWindow = this.openInNewWindow.bind(this);
        this.loadDataFromUrl = this.loadDataFromUrl.bind(this);
        
        // Bind GitHub integration methods
        this.saveGithubCredentials = this.saveGithubCredentials.bind(this);
        this.showManualInstructions = this.showManualInstructions.bind(this);
        this.copyResumeJson = this.copyResumeJson.bind(this);
    }

    static get observedAttributes() {
        return ['template', 'data-url', 'hosted-theme'];
    }

    /**
     * Component initialization after dependencies are ready
     */
    async onInitialize() {
        console.log('ResumeViewerMigrated: Initializing resume viewer');
        
        // Load initial data if available from attributes
        const dataUrl = this.getAttribute('data-url');
        if (dataUrl) {
            await this.loadDataFromUrl(dataUrl);
        }
        
        // Set initial template from attribute
        const template = this.getAttribute('template');
        if (template) {
            this._template = template;
        }
        
        // Set initial hosted theme from attribute
        const hostedTheme = this.getAttribute('hosted-theme');
        if (hostedTheme) {
            this._hostedTheme = hostedTheme;
            this._template = null;
        }
        
        // Initial render
        this.render();
    }

    /**
     * Handle data changes
     * Called when setData() is used or resume data is updated
     */
    onDataChange(newData, previousData, source) {
        console.log('ResumeViewerMigrated: Resume data changed from', source);
        
        // Re-render when resume data changes
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Handle component refresh
     * Re-render with current data and settings
     */
    async onRefresh(force = false) {
        console.log('ResumeViewerMigrated: Refreshing resume viewer');
        
        // Re-render the component
        this.render();
    }

    /**
     * Component validation
     * Validate resume data structure and settings
     */
    onValidate() {
        const errors = [];
        const resumeData = this.getData();
        
        if (resumeData) {
            // Validate basic resume structure
            if (typeof resumeData !== 'object') {
                errors.push('Resume data must be an object');
            } else {
                // Check for required basic fields
                if (resumeData.basics) {
                    if (!resumeData.basics.name) {
                        errors.push('Resume basics.name is required');
                    }
                    if (resumeData.basics.email && !this.isValidEmail(resumeData.basics.email)) {
                        errors.push('Resume basics.email is not a valid email address');
                    }
                }
            }
        }
        
        // Validate template settings
        if (this._template && !this.getAvailableThemes().local.includes(this._template)) {
            errors.push(`Invalid local template: ${this._template}`);
        }
        
        if (this._hostedTheme && !this._jsonResumeThemes.includes(this._hostedTheme)) {
            errors.push(`Invalid hosted theme: ${this._hostedTheme}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Component cleanup
     */
    onCleanup() {
        console.log('ResumeViewerMigrated: Cleaning up resume viewer');
        
        // Clean up any async operations or event listeners
        // Shadow DOM event listeners are automatically cleaned up
    }

    /**
     * Handle attribute changes
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.isReady()) return;
        
        if (name === 'template') {
            this._template = newValue;
            this._hostedTheme = null; // Clear hosted theme when using local template
            this.render();
        } else if (name === 'data-url') {
            this.loadDataFromUrl(newValue);
        } else if (name === 'hosted-theme') {
            this._hostedTheme = newValue;
            this._template = null; // Clear local template when using hosted theme
            this.render();
        }
    }

    /**
     * Public API: Set resume data
     * @param {object} data - Resume data object
     */
    setResumeData(data) {
        this.setData(data, 'external-set');
    }

    /**
     * Public API: Get resume data
     * @returns {object} Resume data object
     */
    get resumeData() {
        return this.getData();
    }

    /**
     * Public API: Set resume data via property
     * @param {object} data - Resume data object
     */
    set resumeData(data) {
        this.setResumeData(data);
    }

    /**
     * Public API: Set template or hosted theme
     * @param {string} templateName - Template name (local or hosted)
     */
    setTemplate(templateName) {
        console.log('ResumeViewerMigrated.setTemplate called with:', templateName);
        
        try {
            // Check if this is a hosted JSON Resume theme
            if (this._jsonResumeThemes.includes(templateName)) {
                this._hostedTheme = templateName;
                this._template = null;
                this.setAttribute('hosted-theme', templateName);
                this.removeAttribute('template');
            } else {
                this._template = templateName;
                this._hostedTheme = null;
                this.setAttribute('template', templateName);
                this.removeAttribute('hosted-theme');
            }
            
            this.render();
            
        } catch (error) {
            this.handleError(error, 'Failed to set template');
        }
    }

    /**
     * Public API: Get available themes
     * @returns {object} Available local and hosted themes
     */
    getAvailableThemes() {
        return {
            local: ['basic', 'modern', 'compact', 'elegant'],
            hosted: this._jsonResumeThemes
        };
    }

    /**
     * Public API: Open resume in new window
     */
    openInNewWindow() {
        try {
            const resumeData = this.getData();
            if (!resumeData) {
                this.showToast('No resume data available to open in new window', 'warning');
                return;
            }

            // Handle hosted themes differently
            if (this._hostedTheme) {
                const githubUsername = localStorage.getItem('github_username');
                if (githubUsername) {
                    // Open the registry URL directly
                    const registryUrl = `https://registry.jsonresume.org/${githubUsername}?theme=${this._hostedTheme}`;
                    window.open(registryUrl, '_blank', 'width=800,height=1000,scrollbars=yes,resizable=yes');
                    return;
                } else {
                    this.showToast('GitHub username not configured for hosted themes. Please set up GitHub integration first.', 'error');
                    return;
                }
            }

            // Handle local templates
            const templateName = this._template || 'basic';
            const templateHtml = this.getTemplate(templateName);
            const processedHtml = this.processTemplate(templateHtml, resumeData);
            const styles = this.getStyles(templateName);
            
            const fullHtml = this.generateStandaloneHtml(resumeData, styles, processedHtml);
            
            const newWindow = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes,resizable=yes');
            if (newWindow) {
                newWindow.document.write(fullHtml);
                newWindow.document.close();
            } else {
                this.showToast('Failed to open new window. Please check your popup blocker settings.', 'error');
            }
            
        } catch (error) {
            this.handleError(error, 'Failed to open resume in new window');
        }
    }

    /**
     * Public API: Load resume data from URL
     * @param {string} url - URL to load resume data from
     */
    async loadDataFromUrl(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setData(data, 'url-load');
            
        } catch (error) {
            this.handleError(error, 'Failed to load resume data from URL');
        }
    }

    /**
     * Render the component
     */
    render() {
        if (!this.shadowRoot) return;
        
        const resumeData = this.getData();
        console.log('ResumeViewerMigrated.render called with template:', this._template, 'hosted theme:', this._hostedTheme);
        
        if (!resumeData) {
            this.shadowRoot.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No resume data to display</p>';
            return;
        }

        try {
            // Handle hosted JSON Resume themes
            if (this._hostedTheme) {
                this.renderHostedTheme();
                return;
            }

            // Handle local templates
            const templateHtml = this.getTemplate(this._template);
            const processedHtml = this.processTemplate(templateHtml, resumeData);
            
            this.shadowRoot.innerHTML = `
                <style>${this.getStyles(this._template)}</style>
                ${processedHtml}
            `;
            
            console.log('ResumeViewerMigrated.render completed for template:', this._template);
            
        } catch (error) {
            this.handleError(error, 'Failed to render resume');
            this.renderError('Failed to render resume');
        }
    }

    /**
     * Render hosted theme with GitHub integration
     */
    async renderHostedTheme() {
        console.log('Rendering hosted theme:', this._hostedTheme);
        
        // Show loading state
        this.shadowRoot.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #3498db;"></i>
                </div>
                <div>Loading ${this._hostedTheme} theme...</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                    Fetching from JSON Resume registry
                </div>
            </div>
        `;

        try {
            // Check if user has provided their GitHub username for gist access
            const githubUsername = localStorage.getItem('github_username');
            const githubToken = localStorage.getItem('github_token');
            
            if (githubUsername && githubToken) {
                // Try to update the user's resume.json gist and use the registry
                await this.renderWithGistUpdate(githubUsername, githubToken);
            } else {
                // Show fallback with GitHub setup instructions
                this.renderGithubSetupInstructions();
            }
            
        } catch (error) {
            this.handleError(error, 'Error loading hosted theme');
            this.renderError(error.message);
        }
    }

    /**
     * Render with GitHub gist update
     */
    async renderWithGistUpdate(username, token) {
        try {
            // First, try to find existing resume.json gist
            const gists = await this.fetchUserGists(username, token);
            let resumeGist = gists.find(gist => 
                gist.files && gist.files['resume.json']
            );

            // If no resume.json gist exists, create one
            if (!resumeGist) {
                resumeGist = await this.createResumeGist(token);
            }

            // Update the gist with current resume data
            await this.updateResumeGist(resumeGist.id, token);

            // Now render the iframe with the hosted theme
            this.renderHostedIframe(username);

        } catch (error) {
            this.handleError(error, 'Error updating gist');
            this.renderGithubSetupInstructions(error.message);
        }
    }

    /**
     * Fetch user's GitHub gists
     */
    async fetchUserGists(username, token) {
        const response = await fetch(`https://api.github.com/users/${username}/gists`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch gists: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Create new resume gist
     */
    async createResumeGist(token) {
        const resumeData = this.getData();
        
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: 'My Resume - JSON Resume format',
                public: true,
                files: {
                    'resume.json': {
                        content: JSON.stringify(resumeData, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create gist: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Update existing resume gist
     */
    async updateResumeGist(gistId, token) {
        const resumeData = this.getData();
        
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'resume.json': {
                        content: JSON.stringify(resumeData, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update gist: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Render hosted iframe
     */
    renderHostedIframe(username) {
        const registryUrl = `https://registry.jsonresume.org/${username}?theme=${this._hostedTheme}`;
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getHostedThemeStyles()}
            </style>
            <div class="hosted-container">
                <div class="hosted-header">
                    <div class="theme-info">
                        <i class="fas fa-palette" style="color: #6f42c1;"></i>
                        <span>JSON Resume Theme</span>
                        <span class="theme-badge">${this._hostedTheme}</span>
                    </div>
                    <div class="controls">
                        <button class="btn" onclick="this.getRootNode().host.openInNewWindow()">
                            <i class="fas fa-external-link-alt"></i> Open
                        </button>
                        <a href="${registryUrl}" target="_blank" class="btn btn-primary">
                            <i class="fas fa-globe"></i> View on Registry
                        </a>
                    </div>
                </div>
                <iframe class="hosted-iframe" src="${registryUrl}" 
                        title="Resume rendered with ${this._hostedTheme} theme">
                </iframe>
            </div>
        `;
    }

    /**
     * Render GitHub setup instructions
     */
    renderGithubSetupInstructions(errorMessage = null) {
        const resumeData = this.getData();
        const resumeJson = JSON.stringify(resumeData, null, 2);
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getGithubSetupStyles()}
            </style>
            <div class="setup-container">
                ${errorMessage ? `
                    <div class="error-message">
                        <strong>Error:</strong> ${errorMessage}
                    </div>
                ` : ''}
                
                <div class="setup-header">
                    <h3 style="margin: 0 0 10px 0; color: #1976d2;">
                        <i class="fab fa-github"></i> GitHub Setup Required
                    </h3>
                    <p style="margin: 0; color: #1565c0; font-size: 14px;">
                        To use hosted JSON Resume themes, we need to save your resume to a GitHub gist named 'resume.json'
                    </p>
                </div>
                
                <div class="form-group">
                    <label for="github-username">GitHub Username</label>
                    <input type="text" id="github-username" placeholder="your-username" 
                           value="${localStorage.getItem('github_username') || ''}">
                    <small>Your GitHub username (case-sensitive)</small>
                </div>
                
                <div class="form-group">
                    <label for="github-token">GitHub Personal Access Token</label>
                    <input type="password" id="github-token" placeholder="ghp_..." 
                           value="${localStorage.getItem('github_token') || ''}">
                    <small>
                        Create a token at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> 
                        with 'gist' scope
                    </small>
                </div>
                
                <div style="margin: 20px 0;">
                    <button class="btn btn-primary" onclick="this.getRootNode().host.saveGithubCredentials()">
                        <i class="fas fa-save"></i> Save & Render Theme
                    </button>
                    <button class="btn btn-secondary" onclick="this.getRootNode().host.showManualInstructions()">
                        Manual Setup
                    </button>
                </div>
                
                <div style="margin-top: 20px;">
                    <a href="https://registry.jsonresume.org/thomasdavis?theme=${this._hostedTheme}" 
                       target="_blank" class="preview-link">
                        <i class="fas fa-eye"></i> Preview ${this._hostedTheme} Theme
                    </a>
                </div>
                
                <div id="manual-instructions" style="display: none; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
                    <h4>Manual Setup Instructions:</h4>
                    <ol>
                        <li>Go to <a href="https://gist.github.com" target="_blank">gist.github.com</a></li>
                        <li>Create a new gist named <code>resume.json</code></li>
                        <li>Copy and paste your resume JSON below:</li>
                    </ol>
                    <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; border: 1px solid #ced4da; border-radius: 4px; padding: 10px; margin: 10px 0;">${resumeJson}</textarea>
                    <p>
                        <button class="btn btn-secondary" onclick="this.getRootNode().host.copyResumeJson()">
                            <i class="fas fa-copy"></i> Copy Resume JSON
                        </button>
                    </p>
                    <p>4. After saving the gist, visit: <code>https://registry.jsonresume.org/YOUR_USERNAME?theme=${this._hostedTheme}</code></p>
                </div>
            </div>
        `;
    }

    /**
     * Render error message
     */
    renderError(message) {
        this.shadowRoot.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                <div style="margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                </div>
                <div>Failed to load hosted theme: ${this._hostedTheme}</div>
                <div style="font-size: 12px; margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    // GitHub integration methods
    saveGithubCredentials() {
        const username = this.shadowRoot.getElementById('github-username').value.trim();
        const token = this.shadowRoot.getElementById('github-token').value.trim();
        
        if (!username || !token) {
            this.showToast('Please enter both username and token', 'warning');
            return;
        }
        
        localStorage.setItem('github_username', username);
        localStorage.setItem('github_token', token);
        
        // Re-render with the new credentials
        this.renderHostedTheme();
    }

    showManualInstructions() {
        const instructions = this.shadowRoot.getElementById('manual-instructions');
        if (instructions) {
            instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
        }
    }

    copyResumeJson() {
        const textarea = this.shadowRoot.querySelector('textarea');
        if (textarea) {
            textarea.select();
            document.execCommand('copy');
            
            // Show feedback
            const button = this.shadowRoot.querySelector('button[onclick*="copyResumeJson"]');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            }
        }
    }

    // Template processing methods
    processTemplate(template, data) {
        // Simple template processing - replace placeholders with data
        let html = template;
        
        // Process basics
        if (data.basics) {
            html = html.replace('{{name}}', data.basics.name || '');
            html = html.replace('{{label}}', data.basics.label || '');
            html = html.replace('{{email}}', data.basics.email || '');
            html = html.replace('{{phone}}', data.basics.phone || '');
            html = html.replace('{{summary}}', data.basics.summary || '');
            html = html.replace('{{location}}', data.basics.location ? 
                `${data.basics.location.city}, ${data.basics.location.region}` : '');
            
            // Process profiles
            if (data.basics.profiles && data.basics.profiles.length > 0) {
                const profilesHtml = data.basics.profiles.map(p => 
                    `<a href="${p.url}" target="_blank">${p.network}</a>`
                ).join(' | ');
                html = html.replace('{{profiles}}', profilesHtml);
            } else {
                html = html.replace('{{profiles}}', '');
            }
        } else {
            // Replace all basic placeholders with empty strings
            html = html.replace(/\{\{(name|label|email|phone|summary|location|profiles)\}\}/g, '');
        }
        
        // Process work experience
        if (data.work && data.work.length > 0) {
            const workHtml = data.work.map(job => `
                <div class="work-item">
                    <h3>${job.position} at ${job.name}</h3>
                    <div class="date">${this.formatDate(job.startDate)} - ${job.endDate ? this.formatDate(job.endDate) : 'Present'}</div>
                    <p>${job.summary || ''}</p>
                    ${job.highlights ? `<ul>${job.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('');
            html = html.replace('{{work}}', workHtml);
        } else {
            // Hide the entire work section if no work experience
            html = this.hideSectionIfEmpty(html, 'work');
        }
        
        // Process volunteer experience
        if (data.volunteer && data.volunteer.length > 0) {
            const volunteerHtml = data.volunteer.map(vol => `
                <div class="volunteer-item">
                    <h3>${vol.position} at ${vol.organization}</h3>
                    <div class="date">${this.formatDate(vol.startDate)} - ${vol.endDate ? this.formatDate(vol.endDate) : 'Present'}</div>
                    <p>${vol.summary || ''}</p>
                    ${vol.highlights ? `<ul>${vol.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('');
            html = html.replace('{{volunteer}}', volunteerHtml);
        } else {
            // Hide the entire volunteer section if no volunteer experience
            html = this.hideSectionIfEmpty(html, 'volunteer');
        }
        
        // Process education
        if (data.education && data.education.length > 0) {
            const educationHtml = data.education.map(edu => `
                <div class="education-item">
                    <h3>${edu.studyType} in ${edu.area}</h3>
                    <div class="institution">${edu.institution}</div>
                    <div class="date">${this.formatDate(edu.startDate)} - ${this.formatDate(edu.endDate)}</div>
                </div>
            `).join('');
            html = html.replace('{{education}}', educationHtml);
        } else {
            // Hide the entire education section if no education
            html = this.hideSectionIfEmpty(html, 'education');
        }
        
        // Process skills
        if (data.skills && data.skills.length > 0) {
            const skillsHtml = data.skills.map(skill => `
                <div class="skill-group">
                    <h4>${skill.name}</h4>
                    <div class="keywords">${skill.keywords ? skill.keywords.join(', ') : ''}</div>
                </div>
            `).join('');
            html = html.replace('{{skills}}', skillsHtml);
        } else {
            // Hide the entire skills section if no skills
            html = this.hideSectionIfEmpty(html, 'skills');
        }
        
        // Process projects
        if (data.projects && data.projects.length > 0) {
            const projectsHtml = data.projects.map(project => `
                <div class="project-item">
                    <h3>${project.name}</h3>
                    <p>${project.description || ''}</p>
                    ${project.highlights ? `<ul>${project.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                    <div class="keywords">${project.keywords ? project.keywords.join(', ') : ''}</div>
                </div>
            `).join('');
            html = html.replace('{{projects}}', projectsHtml);
        } else {
            // Hide the entire projects section if no projects
            html = this.hideSectionIfEmpty(html, 'projects');
        }
        
        return html;
    }

    hideSectionIfEmpty(html, sectionName) {
        // Remove the entire section element containing the placeholder
        const sectionRegex = new RegExp(`<section[^>]*class="[^"]*${sectionName}[^"]*"[^>]*>.*?<\\/section>`, 'gs');
        return html.replace(sectionRegex, '').replace(`{{${sectionName}}}`, '');
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Template generation methods
    generateStandaloneHtml(resumeData, styles, processedHtml) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${resumeData.basics?.name || 'Resume'}</title>
    <style>
        ${styles}
        
        /* Additional styles for standalone window */
        body {
            margin: 0;
            padding: 20px;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .print-controls button {
            margin: 0 5px;
            padding: 8px 16px;
            background: #2980b9;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .print-controls button:hover {
            background: #3498db;
        }
        
        @media print {
            .print-controls {
                display: none;
            }
            
            body {
                padding: 0;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="print-controls">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
    </div>
    
    ${processedHtml}
    
    <script>
        // Auto-focus for keyboard shortcuts
        window.focus();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'p') {
                    e.preventDefault();
                    window.print();
                } else if (e.key === 'w') {
                    e.preventDefault();
                    window.close();
                }
            }
        });
    </script>
</body>
</html>`;
    }

    getTemplate(templateName) {
        const templates = {
            basic: `
                <div class="resume-basic">
                    <header>
                        <h1>{{name}}</h1>
                        <h2>{{label}}</h2>
                        <div class="contact">
                            {{email}} | {{phone}} | {{location}}
                        </div>
                        <div class="profiles">{{profiles}}</div>
                    </header>
                    
                    <section class="summary">
                        <h2>Summary</h2>
                        <p>{{summary}}</p>
                    </section>
                    
                    <section class="work">
                        <h2>Experience</h2>
                        {{work}}
                    </section>
                    
                    <section class="volunteer">
                        <h2>Volunteer Work</h2>
                        {{volunteer}}
                    </section>
                    
                    <section class="education">
                        <h2>Education</h2>
                        {{education}}
                    </section>
                    
                    <section class="skills">
                        <h2>Skills</h2>
                        {{skills}}
                    </section>
                    
                    <section class="projects">
                        <h2>Projects</h2>
                        {{projects}}
                    </section>
                </div>
            `,
            modern: `
                <div class="resume-modern">
                    <aside class="sidebar">
                        <h1>{{name}}</h1>
                        <h3>{{label}}</h3>
                        <div class="contact-info">
                            <div>{{email}}</div>
                            <div>{{phone}}</div>
                            <div>{{location}}</div>
                        </div>
                        <div class="profiles">{{profiles}}</div>
                        
                        <section class="skills">
                            <h2>Skills</h2>
                            {{skills}}
                        </section>
                    </aside>
                    
                    <main class="main-content">
                        <section class="summary">
                            <h2>About Me</h2>
                            <p>{{summary}}</p>
                        </section>
                        
                        <section class="work">
                            <h2>Experience</h2>
                            {{work}}
                        </section>
                        
                        <section class="volunteer">
                            <h2>Volunteer Work</h2>
                            {{volunteer}}
                        </section>
                        
                        <section class="education">
                            <h2>Education</h2>
                            {{education}}
                        </section>
                        
                        <section class="projects">
                            <h2>Projects</h2>
                            {{projects}}
                        </section>
                    </main>
                </div>
            `,
            compact: `
                <div class="resume-compact">
                    <header>
                        <h1>{{name}}</h1>
                        <div class="subtitle">{{label}} | {{email}} | {{phone}}</div>
                    </header>
                    
                    <section class="summary">
                        <p>{{summary}}</p>
                    </section>
                    
                    <div class="two-column">
                        <div class="left-column">
                            <section class="work">
                                <h2>Experience</h2>
                                {{work}}
                            </section>
                            
                            <section class="volunteer">
                                <h2>Volunteer Work</h2>
                                {{volunteer}}
                            </section>
                        </div>
                        
                        <div class="right-column">
                            <section class="skills">
                                <h2>Skills</h2>
                                {{skills}}
                            </section>
                            
                            <section class="education">
                                <h2>Education</h2>
                                {{education}}
                            </section>
                        </div>
                    </div>
                </div>
            `,
            elegant: `
                <div class="resume-elegant">
                    <header class="elegant-header">
                        <div class="name-section">
                            <h1>{{name}}</h1>
                            <h2>{{label}}</h2>
                        </div>
                        <div class="contact-section">
                            <div>{{email}}</div>
                            <div>{{phone}}</div>
                            <div>{{location}}</div>
                            <div class="profiles">{{profiles}}</div>
                        </div>
                    </header>
                    
                    <section class="summary elegant-section">
                        <p>{{summary}}</p>
                    </section>
                    
                    <section class="work elegant-section">
                        <h2>Professional Experience</h2>
                        {{work}}
                    </section>
                    
                    <section class="volunteer elegant-section">
                        <h2>Volunteer Experience</h2>
                        {{volunteer}}
                    </section>
                    
                    <section class="education elegant-section">
                        <h2>Education</h2>
                        {{education}}
                    </section>
                    
                    <section class="skills elegant-section">
                        <h2>Technical Skills</h2>
                        {{skills}}
                    </section>
                    
                    <section class="projects elegant-section">
                        <h2>Notable Projects</h2>
                        {{projects}}
                    </section>
                </div>
            `
        };
        
        return templates[templateName] || templates.basic;
    }

    getStyles(templateName) {
        const baseStyles = `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            h1, h2, h3, h4 {
                margin-bottom: 0.5em;
            }
            
            section {
                margin-bottom: 2em;
            }
            
            ul {
                margin-left: 20px;
            }
            
            a {
                color: #0066cc;
                text-decoration: none;
            }
            
            a:hover {
                text-decoration: underline;
            }
        `;

        const templateStyles = {
            basic: `
                ${baseStyles}
                
                .resume-basic {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                }
                
                header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e0e0e0;
                }
                
                h1 {
                    font-size: 2.5em;
                    margin-bottom: 0.2em;
                }
                
                h2 {
                    font-size: 1.5em;
                    color: #555;
                    font-weight: normal;
                }
                
                section h2 {
                    color: #333;
                    border-bottom: 1px solid #e0e0e0;
                    padding-bottom: 5px;
                    margin-bottom: 15px;
                }
                
                .contact {
                    margin: 10px 0;
                    color: #666;
                }
                
                .work-item, .education-item, .project-item {
                    margin-bottom: 20px;
                }
                
                .date {
                    color: #666;
                    font-style: italic;
                }
                
                .skill-group {
                    margin-bottom: 15px;
                }
                
                .skill-group h4 {
                    color: #444;
                    margin-bottom: 5px;
                }
                
                .keywords {
                    color: #666;
                }
            `,
            modern: `
                ${baseStyles}
                
                .resume-modern {
                    display: flex;
                    min-height: 100vh;
                }
                
                .sidebar {
                    background: #2c3e50;
                    color: white;
                    padding: 40px 30px;
                    width: 300px;
                }
                
                .sidebar h1 {
                    font-size: 2em;
                    margin-bottom: 0.3em;
                }
                
                .sidebar h2 {
                    font-size: 1.2em;
                    margin-top: 30px;
                    margin-bottom: 15px;
                    color: #ecf0f1;
                }
                
                .sidebar h3 {
                    font-size: 1.1em;
                    font-weight: normal;
                    color: #bdc3c7;
                    margin-bottom: 20px;
                }
                
                .contact-info {
                    margin: 20px 0;
                }
                
                .contact-info div {
                    margin: 5px 0;
                    font-size: 0.9em;
                }
                
                .profiles a {
                    color: #3498db;
                    display: block;
                    margin: 5px 0;
                }
                
                .main-content {
                    flex: 1;
                    padding: 40px;
                }
                
                .main-content h2 {
                    color: #2c3e50;
                    font-size: 1.8em;
                    margin-bottom: 20px;
                }
                
                .work-item, .education-item, .project-item {
                    margin-bottom: 25px;
                }
                
                .work-item h3, .project-item h3 {
                    color: #34495e;
                    margin-bottom: 5px;
                }
                
                .date {
                    color: #7f8c8d;
                    font-size: 0.9em;
                }
                
                .skill-group {
                    margin-bottom: 15px;
                }
                
                .skill-group h4 {
                    font-size: 1em;
                    margin-bottom: 5px;
                    color: #ecf0f1;
                }
                
                .keywords {
                    font-size: 0.9em;
                    color: #bdc3c7;
                }
            `,
            compact: `
                ${baseStyles}
                
                .resume-compact {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 30px;
                }
                
                header {
                    margin-bottom: 20px;
                }
                
                h1 {
                    font-size: 2em;
                    margin-bottom: 5px;
                }
                
                .subtitle {
                    color: #666;
                    margin-bottom: 10px;
                }
                
                .summary {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .two-column {
                    display: flex;
                    gap: 30px;
                }
                
                .left-column {
                    flex: 2;
                }
                
                .right-column {
                    flex: 1;
                }
                
                h2 {
                    font-size: 1.3em;
                    color: #333;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #e0e0e0;
                    padding-bottom: 5px;
                }
                
                .work-item, .education-item {
                    margin-bottom: 15px;
                }
                
                .work-item h3 {
                    font-size: 1.1em;
                    margin-bottom: 3px;
                }
                
                .date {
                    font-size: 0.9em;
                    color: #666;
                }
                
                ul {
                    font-size: 0.95em;
                }
                
                .skill-group {
                    margin-bottom: 10px;
                }
                
                .skill-group h4 {
                    font-size: 1em;
                    margin-bottom: 3px;
                }
                
                .keywords {
                    font-size: 0.9em;
                    color: #666;
                }
            `,
            elegant: `
                ${baseStyles}
                
                .resume-elegant {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 50px;
                }
                
                .elegant-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    margin-bottom: 40px;
                    padding-bottom: 30px;
                    border-bottom: 3px solid #2c3e50;
                }
                
                .name-section h1 {
                    font-size: 3em;
                    font-weight: 300;
                    letter-spacing: -1px;
                    margin-bottom: 0.2em;
                }
                
                .name-section h2 {
                    font-size: 1.5em;
                    font-weight: 300;
                    color: #666;
                }
                
                .contact-section {
                    text-align: right;
                    font-size: 0.95em;
                    color: #666;
                }
                
                .contact-section div {
                    margin: 3px 0;
                }
                
                .elegant-section {
                    margin-bottom: 35px;
                }
                
                .elegant-section h2 {
                    font-size: 1.8em;
                    font-weight: 300;
                    color: #2c3e50;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .summary {
                    font-size: 1.1em;
                    line-height: 1.8;
                    color: #444;
                }
                
                .work-item, .education-item, .project-item {
                    margin-bottom: 25px;
                }
                
                .work-item h3, .project-item h3 {
                    font-size: 1.3em;
                    color: #333;
                    margin-bottom: 5px;
                }
                
                .education-item h3 {
                    font-size: 1.2em;
                    color: #333;
                    margin-bottom: 3px;
                }
                
                .institution {
                    font-weight: 600;
                    color: #555;
                }
                
                .date {
                    color: #888;
                    font-size: 0.95em;
                    font-style: italic;
                }
                
                .skill-group {
                    display: inline-block;
                    margin-right: 30px;
                    margin-bottom: 15px;
                }
                
                .skill-group h4 {
                    font-size: 1.1em;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .keywords {
                    color: #666;
                    font-size: 0.95em;
                }
                
                ul {
                    margin-top: 10px;
                }
                
                li {
                    margin-bottom: 5px;
                }
            `
        };
        
        return templateStyles[templateName] || templateStyles.basic;
    }

    getHostedThemeStyles() {
        return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .hosted-container {
                position: relative;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .hosted-header {
                background: #f8f9fa;
                padding: 15px 20px;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .theme-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .theme-badge {
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            .hosted-iframe {
                width: 100%;
                height: 800px;
                border: none;
                background: white;
            }
            .controls {
                display: flex;
                gap: 10px;
            }
            .btn {
                padding: 6px 12px;
                border: 1px solid #dee2e6;
                background: white;
                color: #495057;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .btn:hover {
                background: #e9ecef;
            }
            .btn-primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            .btn-primary:hover {
                background: #0056b3;
            }
        `;
    }

    getGithubSetupStyles() {
        return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .setup-container {
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .setup-header {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .error-message {
                background: #ffebee;
                border: 1px solid #ffcdd2;
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 20px;
                color: #c62828;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #333;
            }
            .form-group input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }
            .form-group small {
                color: #666;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }
            .btn {
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-right: 10px;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            .preview-link {
                background: #28a745;
                color: white;
                text-decoration: none;
                padding: 10px 15px;
                border-radius: 4px;
                display: inline-block;
            }
        `;
    }
}

// Register the migrated component
customElements.define('resume-viewer-migrated', ResumeViewerMigrated);

export { ResumeViewerMigrated };