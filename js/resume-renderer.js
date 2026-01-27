/**
 * Resume Renderer Service
 * Handles resume preview generation and PDF export
 */

/**
 * Format date for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
}

/**
 * Get CSS class for skill level
 * @param {string} level - Skill level
 * @returns {string} CSS class name
 */
export function getLevelClass(level) {
    const levelMap = {
        'beginner': 'level-beginner',
        'intermediate': 'level-intermediate',
        'advanced': 'level-advanced',
        'expert': 'level-expert',
        'master': 'level-master'
    };
    return levelMap[level?.toLowerCase()] || 'level-intermediate';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate resume HTML with theme
 * @param {object} data - Resume data
 * @param {string} theme - Theme name (modern, classic, minimal)
 * @returns {string} HTML string
 */
export function generateResumeHTML(data, theme = 'modern') {
    const basics = data.basics || {};

    return `
        <div class="resume-preview ${theme}">
            ${renderHeader(basics)}
            ${renderSummary(basics)}
            ${renderWork(data.work)}
            ${renderEducation(data.education)}
            ${renderSkills(data.skills)}
            ${renderProjects(data.projects)}
            ${renderVolunteer(data.volunteer)}
        </div>
        <style>${getThemeStyles(theme)}</style>
    `;
}

/**
 * Render resume header
 */
function renderHeader(basics) {
    return `
        <header class="resume-header">
            <h1>${escapeHtml(basics.name || 'Your Name')}</h1>
            ${basics.label ? `<h2>${escapeHtml(basics.label)}</h2>` : ''}
            <div class="contact-info">
                ${basics.email ? `<span class="email">${escapeHtml(basics.email)}</span>` : ''}
                ${basics.phone ? `<span class="phone">${escapeHtml(basics.phone)}</span>` : ''}
                ${basics.url ? `<span class="website"><a href="${basics.url}" target="_blank">${escapeHtml(basics.url)}</a></span>` : ''}
            </div>
        </header>
    `;
}

/**
 * Render summary section
 */
function renderSummary(basics) {
    if (!basics.summary) return '';

    return `
        <section class="summary">
            <h3>Summary</h3>
            <p>${escapeHtml(basics.summary)}</p>
        </section>
    `;
}

/**
 * Render work experience section
 */
function renderWork(work) {
    if (!work || work.length === 0) return '';

    return `
        <section class="work">
            <h3>Work Experience</h3>
            ${work.map(job => `
                <div class="work-item">
                    <h4>${escapeHtml(job.position || 'Position')} at ${escapeHtml(job.name || 'Company')}</h4>
                    <div class="dates">${formatDate(job.startDate)} - ${job.endDate ? formatDate(job.endDate) : 'Present'}</div>
                    ${job.summary ? `<p>${escapeHtml(job.summary)}</p>` : ''}
                    ${job.highlights && job.highlights.length > 0 ? `
                        <ul>
                            ${job.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
    `;
}

/**
 * Render education section
 */
function renderEducation(education) {
    if (!education || education.length === 0) return '';

    return `
        <section class="education">
            <h3>Education</h3>
            ${education.map(edu => `
                <div class="education-item">
                    <h4>${escapeHtml(edu.studyType || 'Degree')} in ${escapeHtml(edu.area || 'Field')}</h4>
                    <div class="institution">${escapeHtml(edu.institution || 'Institution')}</div>
                    <div class="dates">${formatDate(edu.startDate)} - ${edu.endDate ? formatDate(edu.endDate) : 'Present'}</div>
                </div>
            `).join('')}
        </section>
    `;
}

/**
 * Render skills section
 */
function renderSkills(skills) {
    if (!skills || skills.length === 0) return '';

    return `
        <section class="skills">
            <h3>Skills</h3>
            ${skills.map(skill => `
                <div class="skill-item">
                    <strong>${escapeHtml(skill.name)}</strong>
                    ${skill.level ? `<span class="level ${getLevelClass(skill.level)}">(${escapeHtml(skill.level)})</span>` : ''}
                    ${skill.keywords && skill.keywords.length > 0 ? `
                        <div class="keywords">${skill.keywords.map(k => escapeHtml(k)).join(', ')}</div>
                    ` : ''}
                </div>
            `).join('')}
        </section>
    `;
}

/**
 * Render projects section
 */
function renderProjects(projects) {
    if (!projects || projects.length === 0) return '';

    return `
        <section class="projects">
            <h3>Projects</h3>
            ${projects.map(project => `
                <div class="project-item">
                    <h4>${escapeHtml(project.name || 'Project')}</h4>
                    ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
                    ${project.highlights && project.highlights.length > 0 ? `
                        <ul>
                            ${project.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${project.url ? `<a href="${project.url}" target="_blank">View Project</a>` : ''}
                </div>
            `).join('')}
        </section>
    `;
}

/**
 * Render volunteer section
 */
function renderVolunteer(volunteer) {
    if (!volunteer || volunteer.length === 0) return '';

    return `
        <section class="volunteer">
            <h3>Volunteer Work</h3>
            ${volunteer.map(vol => `
                <div class="volunteer-item">
                    <h4>${escapeHtml(vol.position || 'Position')} at ${escapeHtml(vol.organization || 'Organization')}</h4>
                    <div class="dates">${formatDate(vol.startDate)} - ${vol.endDate ? formatDate(vol.endDate) : 'Present'}</div>
                    ${vol.summary ? `<p>${escapeHtml(vol.summary)}</p>` : ''}
                </div>
            `).join('')}
        </section>
    `;
}

/**
 * Get theme-specific CSS styles
 */
function getThemeStyles(theme) {
    const baseStyles = `
        .resume-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .resume-header { text-align: center; padding-bottom: 20px; margin-bottom: 30px; }
        .resume-header h1 { margin: 0; font-size: 2.5em; }
        .resume-header h2 { margin: 5px 0; font-size: 1.2em; font-weight: normal; }
        .contact-info { margin-top: 10px; }
        .contact-info span { margin: 0 10px; }
        section { margin-bottom: 30px; }
        section h3 { padding-bottom: 5px; margin-bottom: 15px; }
        .work-item, .education-item, .project-item, .volunteer-item { margin-bottom: 20px; }
        .dates { font-size: 0.9em; margin-bottom: 5px; }
        ul { margin: 10px 0; padding-left: 20px; }
    `;

    const themeStyles = {
        modern: `
            .resume-header { border-bottom: 2px solid #007bff; }
            .resume-header h1 { color: #007bff; }
            section h3 { color: #007bff; border-bottom: 1px solid #ddd; }
        `,
        classic: `
            .resume-header { border-bottom: 3px double #333; }
            section h3 { border-bottom: 2px solid #333; }
        `,
        minimal: `
            .resume-preview { font-family: 'Arial', sans-serif; }
            section h3 { border-bottom: 1px solid #ccc; }
        `
    };

    return baseStyles + (themeStyles[theme] || themeStyles.modern);
}

/**
 * Generate PDF from resume HTML
 * @param {object} resumeData - Resume data
 * @param {string} theme - Theme name
 * @returns {Promise<Blob>} PDF blob
 */
export async function generatePDF(resumeData, theme = 'modern') {
    // This would integrate with a PDF library like jsPDF or html2pdf
    // For now, return a placeholder implementation
    throw new Error('PDF generation not yet implemented - requires jsPDF library');
}
