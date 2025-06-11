// Resume Display Web Component
class ResumeViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._resumeData = null;
        this._template = 'basic';
    }

    static get observedAttributes() {
        return ['template', 'data-url'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'template') {
            this._template = newValue;
            this.render();
        } else if (name === 'data-url') {
            this.loadDataFromUrl(newValue);
        }
    }

    set resumeData(data) {
        this._resumeData = data;
        this.render();
    }

    get resumeData() {
        return this._resumeData;
    }

    setResumeData(data) {
        this.resumeData = data;
    }

    setTemplate(templateName) {
        this._template = templateName;
        this.render();
    }

    async loadDataFromUrl(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.resumeData = data;
        } catch (error) {
            console.error('Error loading resume data:', error);
        }
    }

    render() {
        if (!this._resumeData) {
            this.shadowRoot.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No resume data to display</p>';
            return;
        }

        const templateHtml = this.getTemplate(this._template);
        const processedHtml = this.processTemplate(templateHtml, this._resumeData);
        
        this.shadowRoot.innerHTML = `
            <style>${this.getStyles(this._template)}</style>
            ${processedHtml}
        `;
    }

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
}

// Register the web component
customElements.define('resume-viewer', ResumeViewer);
