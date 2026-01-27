/**
 * Resume Modal Manager Service
 * Handles modal dialog operations for resume sections
 */

/**
 * Show modal dialog
 * @param {HTMLElement} modalElement - Modal DOM element
 * @param {number} editIndex - Index of item being edited (-1 for new)
 */
export function showModal(modalElement, editIndex = -1) {
    if (!modalElement) return;

    modalElement.style.display = 'flex';
    modalElement.setAttribute('data-edit-index', editIndex);

    // Focus first input
    const firstInput = modalElement.querySelector('input, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

/**
 * Hide modal dialog
 * @param {HTMLElement} modalElement - Modal DOM element
 */
export function hideModal(modalElement) {
    if (!modalElement) return;

    modalElement.style.display = 'none';
    modalElement.removeAttribute('data-edit-index');
}

/**
 * Clear all form fields in modal
 * @param {HTMLElement} modalElement - Modal DOM element
 */
export function clearModalFields(modalElement) {
    if (!modalElement) return;

    const inputs = modalElement.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
}

/**
 * Populate profile modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} profile - Profile data
 */
export function populateProfileModal(modal, profile) {
    if (!modal) return;

    const fields = {
        'profile-network': profile?.network || '',
        'profile-username': profile?.username || '',
        'profile-url': profile?.url || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Populate work modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} work - Work experience data
 */
export function populateWorkModal(modal, work) {
    if (!modal) return;

    const fields = {
        'work-name': work?.name || '',
        'work-position': work?.position || '',
        'work-location': work?.location || '',
        'work-url': work?.url || '',
        'work-startDate': work?.startDate || '',
        'work-endDate': work?.endDate || '',
        'work-summary': work?.summary || '',
        'work-highlights': (work?.highlights || []).join('\n')
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Populate education modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} education - Education data
 */
export function populateEducationModal(modal, education) {
    if (!modal) return;

    const fields = {
        'edu-institution': education?.institution || '',
        'edu-area': education?.area || '',
        'edu-studyType': education?.studyType || '',
        'edu-startDate': education?.startDate || '',
        'edu-endDate': education?.endDate || '',
        'edu-gpa': education?.score || '',
        'edu-courses': (education?.courses || []).join('\n')
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Populate skills modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} skill - Skill data
 */
export function populateSkillsModal(modal, skill) {
    if (!modal) return;

    const fields = {
        'skill-name': skill?.name || '',
        'skill-level': skill?.level || '',
        'skill-keywords': (skill?.keywords || []).join(', ')
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Populate projects modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} project - Project data
 */
export function populateProjectsModal(modal, project) {
    if (!modal) return;

    const fields = {
        'project-name': project?.name || '',
        'project-description': project?.description || '',
        'project-url': project?.url || '',
        'project-startDate': project?.startDate || '',
        'project-endDate': project?.endDate || '',
        'project-highlights': (project?.highlights || []).join('\n'),
        'project-keywords': (project?.keywords || []).join(', ')
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Populate volunteer modal with data
 * @param {HTMLElement} modal - Modal element
 * @param {object} volunteer - Volunteer data
 */
export function populateVolunteerModal(modal, volunteer) {
    if (!modal) return;

    const fields = {
        'volunteer-organization': volunteer?.organization || '',
        'volunteer-position': volunteer?.position || '',
        'volunteer-url': volunteer?.url || '',
        'volunteer-startDate': volunteer?.startDate || '',
        'volunteer-endDate': volunteer?.endDate || '',
        'volunteer-summary': volunteer?.summary || '',
        'volunteer-highlights': (volunteer?.highlights || []).join('\n')
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = modal.querySelector(`#${id}`);
        if (input) input.value = value;
    });
}

/**
 * Extract form data from modal
 * @param {HTMLElement} modal - Modal element
 * @param {Array} fieldIds - Array of field IDs to extract
 * @returns {object} Extracted form data
 */
export function extractFormData(modal, fieldIds) {
    if (!modal) return {};

    const data = {};

    fieldIds.forEach(id => {
        const input = modal.querySelector(`#${id}`);
        if (input) {
            data[id] = input.value;
        }
    });

    return data;
}

/**
 * Get modal edit index
 * @param {HTMLElement} modal - Modal element
 * @returns {number} Edit index or -1
 */
export function getEditIndex(modal) {
    if (!modal) return -1;

    const index = modal.getAttribute('data-edit-index');
    return index ? parseInt(index, 10) : -1;
}

/**
 * Setup modal escape key handler
 * @param {Function} callback - Callback to call on escape
 * @returns {Function} Handler function (for cleanup)
 */
export function setupEscapeHandler(callback) {
    const handler = (e) => {
        if (e.key === 'Escape') {
            callback();
        }
    };

    document.addEventListener('keydown', handler);
    return handler;
}

/**
 * Remove escape key handler
 * @param {Function} handler - Handler function to remove
 */
export function removeEscapeHandler(handler) {
    if (handler) {
        document.removeEventListener('keydown', handler);
    }
}
