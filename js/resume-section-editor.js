/**
 * Resume Section Editor Service
 * Reusable section editing logic for all resume sections
 */

import * as DataManager from './resume-data-manager.js';
import * as Validators from './resume-validators.js';

/**
 * Edit section item
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {number} index - Item index
 * @param {object} updates - Updated data
 * @returns {object} Updated resume data
 */
export function editSectionItem(resumeData, section, index, updates) {
    return DataManager.updateSectionItem(resumeData, section, index, updates);
}

/**
 * Delete section item with confirmation
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {number} index - Item index
 * @param {boolean} skipConfirm - Skip confirmation dialog
 * @returns {object|null} Updated resume data or null if cancelled
 */
export function deleteSectionItem(resumeData, section, index, skipConfirm = false) {
    if (!skipConfirm) {
        const confirmed = confirm('Are you sure you want to delete this item?');
        if (!confirmed) return null;
    }

    return DataManager.deleteSectionItem(resumeData, section, index);
}

/**
 * Add new section item
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {object} item - New item data
 * @returns {object} Updated resume data
 */
export function addSectionItem(resumeData, section, item) {
    return DataManager.addSectionItem(resumeData, section, item);
}

/**
 * Render profiles list
 * @param {Array} profiles - Profiles array
 * @param {Function} onEdit - Edit callback
 * @param {Function} onDelete - Delete callback
 * @returns {string} HTML string
 */
export function renderProfiles(profiles, onEdit, onDelete) {
    if (!profiles || profiles.length === 0) {
        return '<p class="empty-message">No profiles added yet.</p>';
    }

    return profiles.map((profile, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(profile.network)}</strong>
                <span>${escapeHtml(profile.username)}</span>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="profiles" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="profiles" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render work experience list
 * @param {Array} work - Work array
 * @returns {string} HTML string
 */
export function renderWork(work) {
    if (!work || work.length === 0) {
        return '<p class="empty-message">No work experience added yet.</p>';
    }

    return work.map((job, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(job.position || 'Position')}</strong>
                <span>${escapeHtml(job.name || 'Company')}</span>
                <small>${formatDate(job.startDate)} - ${job.endDate ? formatDate(job.endDate) : 'Present'}</small>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="work" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="work" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render education list
 * @param {Array} education - Education array
 * @returns {string} HTML string
 */
export function renderEducation(education) {
    if (!education || education.length === 0) {
        return '<p class="empty-message">No education added yet.</p>';
    }

    return education.map((edu, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(edu.institution || 'Institution')}</strong>
                <span>${escapeHtml(edu.studyType || 'Degree')} in ${escapeHtml(edu.area || 'Field')}</span>
                <small>${formatDate(edu.startDate)} - ${edu.endDate ? formatDate(edu.endDate) : 'Present'}</small>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="education" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="education" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render skills list
 * @param {Array} skills - Skills array
 * @returns {string} HTML string
 */
export function renderSkills(skills) {
    if (!skills || skills.length === 0) {
        return '<p class="empty-message">No skills added yet.</p>';
    }

    return skills.map((skill, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(skill.name)}</strong>
                ${skill.level ? `<span class="skill-level">${escapeHtml(skill.level)}</span>` : ''}
                ${skill.keywords && skill.keywords.length > 0 ? `<small>${skill.keywords.join(', ')}</small>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="skills" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="skills" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render projects list
 * @param {Array} projects - Projects array
 * @returns {string} HTML string
 */
export function renderProjects(projects) {
    if (!projects || projects.length === 0) {
        return '<p class="empty-message">No projects added yet.</p>';
    }

    return projects.map((project, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(project.name || 'Project')}</strong>
                ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="projects" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="projects" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render volunteer list
 * @param {Array} volunteer - Volunteer array
 * @returns {string} HTML string
 */
export function renderVolunteer(volunteer) {
    if (!volunteer || volunteer.length === 0) {
        return '<p class="empty-message">No volunteer work added yet.</p>';
    }

    return volunteer.map((vol, index) => `
        <div class="list-item" data-index="${index}">
            <div class="item-content">
                <strong>${escapeHtml(vol.position || 'Position')}</strong>
                <span>${escapeHtml(vol.organization || 'Organization')}</span>
                <small>${formatDate(vol.startDate)} - ${vol.endDate ? formatDate(vol.endDate) : 'Present'}</small>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-section="volunteer" data-index="${index}">Edit</button>
                <button class="btn-delete" data-section="volunteer" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Get section display name
 * @param {string} section - Section name
 * @returns {string} Display name
 */
export function getSectionDisplayName(section) {
    const names = {
        basics: 'Basics',
        work: 'Work Experience',
        education: 'Education',
        skills: 'Skills',
        projects: 'Projects',
        volunteer: 'Volunteer Work',
        profiles: 'Profiles'
    };

    return names[section] || section;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
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
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Parse highlights from textarea (newline separated)
 * @param {string} text - Textarea content
 * @returns {Array} Array of highlights
 */
export function parseHighlights(text) {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim().length > 0);
}

/**
 * Parse keywords from comma-separated string
 * @param {string} text - Comma-separated keywords
 * @returns {Array} Array of keywords
 */
export function parseKeywords(text) {
    if (!text) return [];
    return text.split(',').map(k => k.trim()).filter(k => k.length > 0);
}
