#!/usr/bin/env node
/**
 * YAML Resume to PDF Converter
 *
 * Converts a resume.yaml file into a nicely formatted PDF using
 * the existing theme system (Modern, Classic, or Minimal).
 *
 * Usage:
 *   node yaml-to-pdf.js resume.yaml [output.pdf] [theme]
 *
 * Arguments:
 *   resume.yaml  - Input YAML file (required)
 *   output.pdf   - Output PDF filename (default: [name]-resume.pdf)
 *   theme        - Theme to use: modern, classic, minimal (default: modern)
 *
 * Examples:
 *   node yaml-to-pdf.js resume.yaml
 *   node yaml-to-pdf.js resume.yaml my-resume.pdf
 *   node yaml-to-pdf.js resume.yaml my-resume.pdf classic
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Simple YAML parser (handles basic YAML structures used in JSON Resume format)
function parseYAML(yamlString) {
    const lines = yamlString.split('\n');
    const result = {};
    const stack = [{ obj: result, indent: -1, key: null }];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) continue;

        const indent = line.search(/\S/);
        const trimmed = line.trim();

        // Pop stack to appropriate level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];

        // Handle array items
        if (trimmed.startsWith('- ')) {
            const value = trimmed.substring(2).trim();

            // Ensure parent has an array for the current key
            if (parent.key && !Array.isArray(parent.obj[parent.key])) {
                parent.obj[parent.key] = [];
            }

            const targetArray = parent.key ? parent.obj[parent.key] : parent.obj;

            if (value.includes(':')) {
                // Object in array
                const newObj = {};
                targetArray.push(newObj);
                stack.push({ obj: newObj, indent, key: null });

                const colonIndex = value.indexOf(':');
                const k = value.substring(0, colonIndex).trim();
                const v = value.substring(colonIndex + 1).trim();

                if (v) {
                    newObj[k] = parseValue(v);
                } else {
                    // Key without value - will be filled by subsequent lines
                    stack[stack.length - 1].key = k;
                }
            } else {
                // Simple value in array
                targetArray.push(parseValue(value));
            }
            continue;
        }

        // Handle key-value pairs
        if (trimmed.includes(':')) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();

            if (value) {
                // Key with immediate value
                parent.obj[key] = parseValue(value);
            } else {
                // Key without value - check next line for array or object
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.trim().startsWith('- ')) {
                    // Next line is array item, so this key will contain an array
                    parent.obj[key] = [];
                    stack.push({ obj: parent.obj, indent, key });
                } else {
                    // Next line is object property
                    const newObj = {};
                    parent.obj[key] = newObj;
                    stack.push({ obj: newObj, indent, key: null });
                }
            }
        }
    }

    return result;
}

function parseValue(value) {
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    // Parse numbers
    if (!isNaN(value) && value !== '') {
        return Number(value);
    }

    // Parse booleans
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    return value;
}

// Escape HTML special characters
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format date for display
function formatDate(dateString, format = 'MMMM YYYY') {
    if (!dateString) return '';

    const date = new Date(dateString);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (format === 'MMM YYYY') {
        return `${monthsShort[date.getMonth()]} ${date.getFullYear()}`;
    } else if (format === 'YYYY') {
        return date.getFullYear().toString();
    } else {
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}

// Theme generators (from preview.js)
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
                            ${work.startDate && !work.isPrior ? ' - ' : ''}
                            ${work.endDate ? escapeHtml(formatDate(work.endDate)) : (work.startDate && !work.isPrior ? 'Present' : '')}
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
                            ${project.startDate ? ' - ' : ''}
                            ${project.endDate ? escapeHtml(formatDate(project.endDate)) : 'Present'}
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
    </div>`;

    return html;
}

function generateClassicTheme(resumeData) {
    if (!resumeData || !resumeData.basics) {
        return '<div class="preview-error">Invalid resume data</div>';
    }

    const basics = resumeData.basics;

    let html = `
    <div class="preview classic-theme">
        <div class="preview-header classic">
            <h1 class="classic-name">${escapeHtml(basics.name || '')}</h1>
            <div class="classic-contact">
                ${basics.email ? `<div>${escapeHtml(basics.email)}</div>` : ''}
                ${basics.phone ? `<div>${escapeHtml(basics.phone)}</div>` : ''}
                ${basics.website ? `<div>${escapeHtml(basics.website)}</div>` : ''}
                ${basics.location && Object.values(basics.location).some(val => val) ?
                    `<div>${[
                            basics.location.address,
                            basics.location.city,
                            basics.location.region,
                            basics.location.postalCode,
                            basics.location.countryCode
                        ].filter(Boolean).map(escapeHtml).join(', ')}</div>`
                    : ''}
            </div>
            ${basics.label ? `<div class="classic-label">${escapeHtml(basics.label)}</div>` : ''}
        </div>

        <hr class="classic-divider">

        ${basics.summary ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">PROFESSIONAL SUMMARY</h3>
            <div class="classic-summary">${escapeHtml(basics.summary)}</div>
        </div>
        <hr class="classic-divider">` : ''}

        ${resumeData.work && resumeData.work.length > 0 ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">PROFESSIONAL EXPERIENCE</h3>
            ${resumeData.work.map(work => `
                <div class="classic-work-item">
                    <div class="classic-work-header">
                        <div class="classic-work-company">${escapeHtml(work.name || '')}</div>
                        <div class="classic-work-date">
                            ${work.startDate ? escapeHtml(formatDate(work.startDate)) : ''}
                            ${work.startDate && !work.isPrior ? ' - ' : ''}
                            ${work.endDate ? escapeHtml(formatDate(work.endDate)) : (work.startDate && !work.isPrior ? 'Present' : '')}
                        </div>
                    </div>
                    <div class="classic-work-position">${escapeHtml(work.position || '')}</div>
                    ${work.location ? `<div class="classic-work-location">${escapeHtml(work.location)}</div>` : ''}
                    ${work.summary ? `<div class="classic-work-summary">${escapeHtml(work.summary)}</div>` : ''}
                    ${work.highlights && work.highlights.length > 0 ? `
                        <ul class="classic-work-highlights">
                            ${work.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        <hr class="classic-divider">` : ''}

        ${resumeData.education && resumeData.education.length > 0 ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">EDUCATION</h3>
            ${resumeData.education.map(edu => `
                <div class="classic-education-item">
                    <div class="classic-education-header">
                        <div class="classic-education-institution">${escapeHtml(edu.institution || '')}</div>
                        <div class="classic-education-date">
                            ${edu.startDate ? escapeHtml(formatDate(edu.startDate)) : ''}
                            ${edu.startDate ? ' - ' : ''}
                            ${edu.endDate ? escapeHtml(formatDate(edu.endDate)) : 'Present'}
                        </div>
                    </div>
                    <div class="classic-education-degree">${escapeHtml(edu.studyType || '')}${edu.area ? ` in ${escapeHtml(edu.area)}` : ''}</div>
                    ${edu.score ? `<div class="classic-education-score">Score: ${escapeHtml(edu.score)}</div>` : ''}
                    ${edu.courses && edu.courses.length > 0 ? `
                        <div class="classic-education-courses">
                            <span>Relevant Courses:</span> ${edu.courses.map(course => escapeHtml(course)).join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        <hr class="classic-divider">` : ''}

        ${resumeData.skills && resumeData.skills.length > 0 ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">SKILLS</h3>
            <div class="classic-skills">
                ${resumeData.skills.map(skill => `
                    <div class="classic-skill-item">
                        <strong>${escapeHtml(skill.name || '')}</strong>${skill.level ? ` (${escapeHtml(skill.level)})` : ''}:
                        ${skill.keywords && skill.keywords.length > 0 ?
                            skill.keywords.map(kw => escapeHtml(kw)).join(', ') : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        <hr class="classic-divider">` : ''}

        ${resumeData.projects && resumeData.projects.length > 0 ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">PROJECTS</h3>
            ${resumeData.projects.map(project => `
                <div class="classic-project-item">
                    <div class="classic-project-header">
                        <div class="classic-project-name">${escapeHtml(project.name || '')}</div>
                        <div class="classic-project-date">
                            ${project.startDate ? escapeHtml(formatDate(project.startDate)) : ''}
                            ${project.startDate ? ' - ' : ''}
                            ${project.endDate ? escapeHtml(formatDate(project.endDate)) : 'Present'}
                        </div>
                    </div>
                    ${project.url ? `<div class="classic-project-url">${escapeHtml(project.url)}</div>` : ''}
                    ${project.description ? `<div class="classic-project-description">${escapeHtml(project.description)}</div>` : ''}
                    ${project.highlights && project.highlights.length > 0 ? `
                        <ul class="classic-project-highlights">
                            ${project.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>` : ''}

        ${basics.profiles && basics.profiles.length > 0 ? `
        <div class="preview-section classic">
            <h3 class="classic-section-title">PROFILES</h3>
            <div class="classic-profiles">
                ${basics.profiles.map(profile => `
                    <div class="classic-profile">
                        <strong>${escapeHtml(profile.network || '')}:</strong>
                        ${profile.url ?
                            `<a href="${escapeHtml(profile.url)}" target="_blank">${escapeHtml(profile.username || profile.url)}</a>` :
                            escapeHtml(profile.username || '')
                        }
                    </div>
                `).join('')}
            </div>
        </div>` : ''}
    </div>`;

    return html;
}

function generateMinimalTheme(resumeData) {
    if (!resumeData || !resumeData.basics) {
        return '<div class="preview-error">Invalid resume data</div>';
    }

    const basics = resumeData.basics;

    let html = `
    <div class="preview minimal-theme">
        <div class="minimal-header">
            <h1>${escapeHtml(basics.name || '')}</h1>
            <div class="minimal-contact">
                ${[
                    basics.email,
                    basics.phone,
                    basics.website,
                    basics.location ? [
                        basics.location.city,
                        basics.location.region,
                        basics.location.countryCode
                    ].filter(Boolean).join(', ') : null
                ].filter(Boolean).map(item => escapeHtml(item)).join(' • ')}
            </div>
            ${basics.label ? `<div class="minimal-label">${escapeHtml(basics.label)}</div>` : ''}
        </div>

        ${basics.summary ? `
        <section class="minimal-section">
            <h2>Summary</h2>
            <p>${escapeHtml(basics.summary)}</p>
        </section>` : ''}

        ${resumeData.work && resumeData.work.length > 0 ? `
        <section class="minimal-section">
            <h2>Experience</h2>
            ${resumeData.work.map(work => `
                <div class="minimal-entry">
                    <div class="minimal-entry-header">
                        <h3>${escapeHtml(work.position || '')}</h3>
                        <div class="minimal-entry-meta">
                            <span class="minimal-company">${escapeHtml(work.name || '')}</span>
                            <span class="minimal-date">
                                ${work.startDate ? escapeHtml(formatDate(work.startDate, 'MMM YYYY')) : ''}
                                ${work.startDate && !work.isPrior ? '–' : ''}
                                ${work.endDate ? escapeHtml(formatDate(work.endDate, 'MMM YYYY')) : (work.startDate && !work.isPrior ? 'Present' : '')}
                            </span>
                        </div>
                    </div>
                    ${work.summary ? `<p class="minimal-summary">${escapeHtml(work.summary)}</p>` : ''}
                    ${work.highlights && work.highlights.length > 0 ? `
                        <ul class="minimal-highlights">
                            ${work.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>` : ''}

        ${resumeData.education && resumeData.education.length > 0 ? `
        <section class="minimal-section">
            <h2>Education</h2>
            ${resumeData.education.map(edu => `
                <div class="minimal-entry">
                    <h3>${escapeHtml(edu.studyType || '')}${edu.area ? ` in ${escapeHtml(edu.area)}` : ''}</h3>
                    <div class="minimal-entry-meta">
                        <span class="minimal-institution">${escapeHtml(edu.institution || '')}</span>
                        <span class="minimal-date">
                            ${edu.startDate ? escapeHtml(formatDate(edu.startDate, 'YYYY')) : ''}
                            ${edu.startDate ? '–' : ''}
                            ${edu.endDate ? escapeHtml(formatDate(edu.endDate, 'YYYY')) : 'Present'}
                        </span>
                    </div>
                </div>
            `).join('')}
        </section>` : ''}

        ${resumeData.skills && resumeData.skills.length > 0 ? `
        <section class="minimal-section">
            <h2>Skills</h2>
            <div class="minimal-skills">
                ${resumeData.skills.map(skill => `
                    <div class="minimal-skill">
                        <h3>${escapeHtml(skill.name || '')}</h3>
                        ${skill.keywords && skill.keywords.length > 0 ? `
                            <div class="minimal-keywords">
                                ${skill.keywords.map(kw => `<span class="minimal-keyword">${escapeHtml(kw)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </section>` : ''}

        ${resumeData.projects && resumeData.projects.length > 0 ? `
        <section class="minimal-section">
            <h2>Projects</h2>
            ${resumeData.projects.map(project => `
                <div class="minimal-entry">
                    <h3>${escapeHtml(project.name || '')}</h3>
                    <div class="minimal-entry-meta">
                        ${project.url ? `<a href="${escapeHtml(project.url)}" class="minimal-url">${escapeHtml(project.url)}</a>` : ''}
                        <span class="minimal-date">
                            ${project.startDate ? escapeHtml(formatDate(project.startDate, 'MMM YYYY')) : ''}
                            ${project.startDate ? '–' : ''}
                            ${project.endDate ? escapeHtml(formatDate(project.endDate, 'MMM YYYY')) : 'Present'}
                        </span>
                    </div>
                    ${project.description ? `<p class="minimal-description">${escapeHtml(project.description)}</p>` : ''}
                    ${project.highlights && project.highlights.length > 0 ? `
                        <ul class="minimal-highlights">
                            ${project.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>` : ''}

        ${basics.profiles && basics.profiles.length > 0 ? `
        <section class="minimal-section">
            <h2>Profiles</h2>
            <div class="minimal-profiles">
                ${basics.profiles.map(profile => `
                    <div class="minimal-profile">
                        <span class="minimal-network">${escapeHtml(profile.network || '')}</span>
                        ${profile.url ?
                            `<a href="${escapeHtml(profile.url)}" target="_blank">${escapeHtml(profile.username || profile.url)}</a>` :
                            `<span>${escapeHtml(profile.username || '')}</span>`
                        }
                    </div>
                `).join('')}
            </div>
        </section>` : ''}
    </div>`;

    return html;
}

// Generate HTML with theme
function generateHTML(resumeData, theme) {
    const themeCss = fs.readFileSync(path.join(__dirname, 'js', 'theme-styles.css'), 'utf8');

    let themeHtml;
    switch (theme) {
        case 'classic':
            themeHtml = generateClassicTheme(resumeData);
            break;
        case 'minimal':
            themeHtml = generateMinimalTheme(resumeData);
            break;
        case 'modern':
        default:
            themeHtml = generateModernTheme(resumeData);
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(resumeData.basics?.name || 'Resume')}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
        }

        ${themeCss}

        @page {
            margin: 0.5in;
            size: letter;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    ${themeHtml}
</body>
</html>`;
}

// Normalize resume data to handle different formats
function normalizeResumeData(data) {
    const normalized = { ...data };

    // Normalize work entries - handle both 'company' and 'name' fields
    if (normalized.work && Array.isArray(normalized.work)) {
        normalized.work = normalized.work.map(job => ({
            ...job,
            name: job.name || job.company || '',
            company: undefined // Remove to avoid duplication
        }));
    }

    // Merge prior_experience into work section if it exists
    if (normalized.prior_experience && Array.isArray(normalized.prior_experience)) {
        const priorJobs = normalized.prior_experience.map(job => ({
            ...job,
            name: job.name || job.company || '',
            company: undefined,
            isPrior: true // Mark as prior experience for potential different styling
        }));

        if (!normalized.work) {
            normalized.work = priorJobs;
        } else {
            normalized.work = [...normalized.work, ...priorJobs];
        }
    }

    // Ensure arrays exist for optional sections
    normalized.education = normalized.education || [];
    normalized.skills = normalized.skills || [];
    normalized.projects = normalized.projects || [];
    normalized.work = normalized.work || [];

    // Ensure basics.profiles exists
    if (normalized.basics && !normalized.basics.profiles) {
        normalized.basics.profiles = [];
    }

    return normalized;
}

// Main function
async function convertYamlToPdf(yamlFile, outputFile, theme = 'modern') {
    try {
        console.log(`\n📄 Reading YAML file: ${yamlFile}`);

        // Read YAML file
        if (!fs.existsSync(yamlFile)) {
            throw new Error(`File not found: ${yamlFile}`);
        }

        const yamlContent = fs.readFileSync(yamlFile, 'utf8');

        console.log('🔄 Parsing YAML...');
        const rawData = parseYAML(yamlContent);

        // Validate resume data
        if (!rawData.basics) {
            throw new Error('Invalid resume format: missing "basics" section');
        }

        console.log('🔧 Normalizing data structure...');
        const resumeData = normalizeResumeData(rawData);

        // Determine output filename
        if (!outputFile) {
            const name = resumeData.basics.name?.replace(/\s+/g, '-').toLowerCase() || 'resume';
            outputFile = `${name}-resume.pdf`;
        }

        console.log(`🎨 Using theme: ${theme}`);
        console.log('🖥️  Generating HTML...');

        // Generate HTML
        const html = generateHTML(resumeData, theme);

        console.log('🚀 Launching Puppeteer...');

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set content
        await page.setContent(html, { waitUntil: 'networkidle0' });

        console.log('📑 Generating PDF...');

        // Generate PDF
        await page.pdf({
            path: outputFile,
            format: 'Letter',
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            printBackground: true
        });

        await browser.close();

        console.log(`\n✅ PDF generated successfully: ${outputFile}\n`);

        // Show file info
        const stats = fs.statSync(outputFile);
        const fileSizeInKB = (stats.size / 1024).toFixed(2);
        console.log(`   File size: ${fileSizeInKB} KB`);
        console.log(`   Theme: ${theme}`);
        console.log(`   Name: ${resumeData.basics.name || 'N/A'}`);
        console.log('');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// CLI handling
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
YAML Resume to PDF Converter

Usage:
  node yaml-to-pdf.js <resume.yaml> [output.pdf] [theme]

Arguments:
  resume.yaml  - Input YAML file (required)
  output.pdf   - Output PDF filename (optional, default: [name]-resume.pdf)
  theme        - Theme to use: modern, classic, minimal (optional, default: modern)

Examples:
  node yaml-to-pdf.js resume.yaml
  node yaml-to-pdf.js resume.yaml my-resume.pdf
  node yaml-to-pdf.js resume.yaml my-resume.pdf classic
  node yaml-to-pdf.js resume.yaml output.pdf minimal

Themes:
  modern  - Clean, modern design with blue accents
  classic - Traditional, formal style
  minimal - Simple, minimalist layout
`);
        process.exit(0);
    }

    const yamlFile = args[0];
    const outputFile = args[1] || null;
    const theme = args[2] || 'modern';

    // Validate theme
    const validThemes = ['modern', 'classic', 'minimal'];
    if (!validThemes.includes(theme)) {
        console.error(`\n❌ Invalid theme: ${theme}`);
        console.error(`   Valid themes: ${validThemes.join(', ')}\n`);
        process.exit(1);
    }

    convertYamlToPdf(yamlFile, outputFile, theme);
}

module.exports = { convertYamlToPdf, parseYAML };
