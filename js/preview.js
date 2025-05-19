// preview.js - Resume preview functionality
import { $, escapeHtml, formatDate } from './utils.js';

// Setup preview related event listeners
export function setupPreviewEventListeners(app) {
    const previewRefreshBtn = $('#preview-refresh');
    const previewPrintBtn = $('#preview-print');
    const previewPdfBtn = $('#preview-pdf');
    const previewThemeSelect = $('#preview-theme');
    
    if (previewRefreshBtn) {
        previewRefreshBtn.addEventListener('click', () => {
            renderPreview(app.data);
        });
    }
    
    if (previewPrintBtn) {
        previewPrintBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    if (previewPdfBtn) {
        previewPdfBtn.addEventListener('click', () => {
            generatePdf(app.data);
        });
    }
    
    if (previewThemeSelect) {
        previewThemeSelect.addEventListener('change', () => {
            renderPreview(app.data);
        });
    }
}

// Render resume preview
export function renderPreview(resumeData) {
    const previewContainer = $('#preview-container');
    if (!previewContainer) return;
    
    const themeSelector = $('#preview-theme');
    const theme = themeSelector ? themeSelector.value : 'modern';
    
    try {
        // Start with loading message
        previewContainer.innerHTML = '<div class="preview-loading">Loading preview...</div>';
        
        // Defer rendering to ensure loading is displayed
        setTimeout(() => {
            let previewHtml = '';
            
            switch(theme) {
                case 'classic':
                    previewHtml = generateClassicTheme(resumeData);
                    break;
                case 'minimal':
                    previewHtml = generateMinimalTheme(resumeData);
                    break;
                case 'modern':
                default:
                    previewHtml = generateModernTheme(resumeData);
            }
            
            previewContainer.innerHTML = previewHtml;
        }, 50);
    } catch (error) {
        console.error('Error rendering preview:', error);
        previewContainer.innerHTML = '<div class="preview-error">Error rendering preview</div>';
    }
}

// Generate a PDF of the resume
export function generatePdf(resumeData) {
    const previewContainer = $('#preview-container');
    if (!previewContainer) return;
    
    try {
        // Get the current theme
        const themeSelector = $('#preview-theme');
        const theme = themeSelector ? themeSelector.value : 'modern';
        
        // Configure options for html2pdf
        const options = {
            margin: 10,
            filename: `${resumeData.basics.name || 'Resume'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Clone the preview container to avoid modifying the displayed content
        const clonedElement = previewContainer.cloneNode(true);
        
        // Apply additional PDF-specific styling
        clonedElement.style.margin = '0';
        clonedElement.style.padding = '20px';
        clonedElement.style.backgroundColor = 'white';
        clonedElement.style.width = '210mm';
        
        // Generate PDF using html2pdf library
        html2pdf()
            .set(options)
            .from(clonedElement)
            .save()
            .then(() => {
                console.log('PDF generated successfully');
            })
            .catch(error => {
                console.error('Error generating PDF:', error);
            });
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

// Generate modern theme HTML
function generateModernTheme(resumeData) {
    if (!resumeData || !resumeData.basics) {
        return '<div class="preview-error">Invalid resume data</div>';
    }
    
    const basics = resumeData.basics;
    
    let html = `
    <div class="preview modern-theme">
        <div class="preview-header">
            <h1>${escapeHtml(basics.name || '')}</h1>
            <h2>${escapeHtml(basics.label || '')}</h2>
            
            <div class="contact-info">
                ${basics.email ? `<div><i class="fa-solid fa-envelope"></i> ${escapeHtml(basics.email)}</div>` : ''}
                ${basics.phone ? `<div><i class="fa-solid fa-phone"></i> ${escapeHtml(basics.phone)}</div>` : ''}
                ${basics.website ? `<div><i class="fa-solid fa-globe"></i> ${escapeHtml(basics.website)}</div>` : ''}
            </div>
            
            <div class="location-info">
                ${basics.location && Object.values(basics.location).some(val => val) ? 
                    `<div><i class="fa-solid fa-location-dot"></i> 
                        ${[
                            basics.location.address, 
                            basics.location.city, 
                            basics.location.region, 
                            basics.location.postalCode, 
                            basics.location.countryCode
                        ].filter(Boolean).map(escapeHtml).join(', ')}</div>` 
                    : ''}
            </div>
        </div>
        
        ${basics.summary ? `
        <div class="preview-section">
            <h3>Summary</h3>
            <div class="summary">${escapeHtml(basics.summary)}</div>
        </div>` : ''}
        
        ${basics.profiles && basics.profiles.length > 0 ? `
        <div class="preview-section">
            <h3>Profiles</h3>
            <div class="profiles">
                ${basics.profiles.map(profile => `
                    <div class="profile">
                        <i class="fa-solid fa-user"></i>
                        <strong>${escapeHtml(profile.network || '')}</strong>
                        ${profile.url ? 
                            `<a href="${escapeHtml(profile.url)}" target="_blank">${escapeHtml(profile.username || profile.url)}</a>` : 
                            `<span>${escapeHtml(profile.username || '')}</span>`
                        }
                    </div>
                `).join('')}
            </div>
        </div>` : ''}
        
        ${resumeData.work && resumeData.work.length > 0 ? `
        <div class="preview-section">
            <h3>Work Experience</h3>
            ${resumeData.work.map(work => `
                <div class="work-item">
                    <div class="work-header">
                        <div class="work-title">
                            <h4>${escapeHtml(work.position || '')}</h4>
                            <div class="work-company">
                                ${escapeHtml(work.name || '')}
                                ${work.url ? `<a href="${escapeHtml(work.url)}" target="_blank"><i class="fa-solid fa-external-link"></i></a>` : ''}
                            </div>
                        </div>
                        <div class="work-date">
                            ${work.startDate ? escapeHtml(formatDate(work.startDate)) : ''} 
                            ${work.startDate && work.endDate ? ' - ' : ''}
                            ${work.endDate ? escapeHtml(formatDate(work.endDate)) : ''}
                        </div>
                    </div>
                    ${work.location ? `<div class="work-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(work.location)}</div>` : ''}
                    ${work.summary ? `<div class="work-summary">${escapeHtml(work.summary)}</div>` : ''}
                    ${work.highlights && work.highlights.length > 0 ? `
                        <ul class="work-highlights">
                            ${work.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>` : ''}
        
        ${resumeData.education && resumeData.education.length > 0 ? `
        <div class="preview-section">
            <h3>Education</h3>
            ${resumeData.education.map(edu => `
                <div class="education-item">
                    <div class="education-header">
                        <div class="education-title">
                            <h4>${escapeHtml(edu.studyType || '')}${edu.area ? ` in ${escapeHtml(edu.area)}` : ''}</h4>
                            <div class="education-institution">${escapeHtml(edu.institution || '')}</div>
                        </div>
                        <div class="education-date">
                            ${edu.startDate ? escapeHtml(formatDate(edu.startDate)) : ''} 
                            ${edu.startDate && edu.endDate ? ' - ' : ''}
                            ${edu.endDate ? escapeHtml(formatDate(edu.endDate)) : ''}
                        </div>
                    </div>
                    ${edu.gpa ? `<div class="education-gpa">GPA: ${escapeHtml(edu.gpa)}</div>` : ''}
                    ${edu.courses && edu.courses.length > 0 ? `
                        <div class="education-courses">
                            <h5>Courses</h5>
                            <ul>
                                ${edu.courses.map(course => `<li>${escapeHtml(course)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>` : ''}
        
        ${resumeData.skills && resumeData.skills.length > 0 ? `
        <div class="preview-section">
            <h3>Skills</h3>
            <div class="skills-container">
                ${resumeData.skills.map(skill => `
                    <div class="skill-item">
                        <div class="skill-name">
                            <strong>${escapeHtml(skill.name || '')}</strong>
                            ${skill.level ? `<span class="skill-level">(${escapeHtml(skill.level)})</span>` : ''}
                        </div>
                        ${skill.keywords && skill.keywords.length > 0 ? `
                            <div class="skill-keywords">
                                ${skill.keywords.map(keyword => `<span class="keyword">${escapeHtml(keyword)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>` : ''}
        
        ${resumeData.projects && resumeData.projects.length > 0 ? `
        <div class="preview-section">
            <h3>Projects</h3>
            ${resumeData.projects.map(project => `
                <div class="project-item">
                    <div class="project-header">
                        <div class="project-title">
                            <h4>${escapeHtml(project.name || '')}</h4>
                            ${project.url ? `<a href="${escapeHtml(project.url)}" target="_blank"><i class="fa-solid fa-external-link"></i></a>` : ''}
                        </div>
                        <div class="project-date">
                            ${project.startDate ? escapeHtml(formatDate(project.startDate)) : ''} 
                            ${project.startDate && project.endDate ? ' - ' : ''}
                            ${project.endDate ? escapeHtml(formatDate(project.endDate)) : ''}
                        </div>
                    </div>
                    ${project.description ? `<div class="project-description">${escapeHtml(project.description)}</div>` : ''}
                    ${project.highlights && project.highlights.length > 0 ? `
                        <ul class="project-highlights">
                            ${project.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${project.keywords && project.keywords.length > 0 ? `
                        <div class="project-keywords">
                            ${project.keywords.map(keyword => `<span class="keyword">${escapeHtml(keyword)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>` : ''}
        
        <div class="preview-footer">
            <div class="meta-info">
                ${resumeData.meta ? `
                    ${resumeData.meta.version ? `<div>Schema Version: ${escapeHtml(resumeData.meta.version)}</div>` : ''}
                    ${resumeData.meta.lastModified ? `<div>Last Updated: ${escapeHtml(formatDate(resumeData.meta.lastModified))}</div>` : ''}
                ` : ''}
            </div>
        </div>
    </div>`;
    
    return html;
}

// Generate classic theme HTML
function generateClassicTheme(resumeData) {
    // Similar structure to modern but with classic styling
    // Implementation not shown for brevity
    return `<div class="preview classic-theme">Classic theme preview not implemented yet</div>`;
}

// Generate minimal theme HTML
function generateMinimalTheme(resumeData) {
    // Similar structure to modern but with minimal styling
    // Implementation not shown for brevity
    return `<div class="preview minimal-theme">Minimal theme preview not implemented yet</div>`;
}