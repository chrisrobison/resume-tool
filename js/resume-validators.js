/**
 * Resume Validators Service
 * Field validation and data integrity checks
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} Validation result with {valid: boolean, error: string}
 */
export function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { valid: true, error: null }; // Empty is valid
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, error: null };
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result
 */
export function validatePhone(phone) {
    if (!phone || phone.trim() === '') {
        return { valid: true, error: null };
    }

    // Basic phone validation - allows various formats
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    if (!phoneRegex.test(phone)) {
        return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true, error: null };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {object} Validation result
 */
export function validateURL(url) {
    if (!url || url.trim() === '') {
        return { valid: true, error: null };
    }

    try {
        new URL(url);
        return { valid: true, error: null };
    } catch (e) {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate date format (YYYY-MM-DD or YYYY-MM)
 * @param {string} date - Date string to validate
 * @returns {object} Validation result
 */
export function validateDate(date) {
    if (!date || date.trim() === '') {
        return { valid: true, error: null };
    }

    // Accept YYYY-MM-DD or YYYY-MM format
    const dateRegex = /^\d{4}-\d{2}(-\d{2})?$/;
    if (!dateRegex.test(date)) {
        return { valid: false, error: 'Invalid date format (use YYYY-MM-DD or YYYY-MM)' };
    }

    return { valid: true, error: null };
}

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {object} Validation result
 */
export function validateRequired(value, fieldName) {
    if (!value || value.trim() === '') {
        return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, error: null };
}

/**
 * Validate basics section
 * @param {object} basics - Basics section data
 * @returns {object} Validation result with {valid: boolean, errors: Array}
 */
export function validateBasics(basics) {
    const errors = [];

    if (!basics || typeof basics !== 'object') {
        return { valid: false, errors: ['Basics section is required'] };
    }

    // Validate email if provided
    if (basics.email) {
        const emailResult = validateEmail(basics.email);
        if (!emailResult.valid) {
            errors.push(emailResult.error);
        }
    }

    // Validate phone if provided
    if (basics.phone) {
        const phoneResult = validatePhone(basics.phone);
        if (!phoneResult.valid) {
            errors.push(phoneResult.error);
        }
    }

    // Validate URL if provided
    if (basics.url) {
        const urlResult = validateURL(basics.url);
        if (!urlResult.valid) {
            errors.push(urlResult.error);
        }
    }

    // Validate profiles if provided
    if (basics.profiles && Array.isArray(basics.profiles)) {
        basics.profiles.forEach((profile, index) => {
            if (profile.url) {
                const urlResult = validateURL(profile.url);
                if (!urlResult.valid) {
                    errors.push(`Profile ${index + 1}: ${urlResult.error}`);
                }
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate work experience entry
 * @param {object} work - Work entry to validate
 * @returns {object} Validation result
 */
export function validateWorkEntry(work) {
    const errors = [];

    if (!work || typeof work !== 'object') {
        return { valid: false, errors: ['Work entry is required'] };
    }

    // Validate dates if provided
    if (work.startDate) {
        const dateResult = validateDate(work.startDate);
        if (!dateResult.valid) {
            errors.push(`Start date: ${dateResult.error}`);
        }
    }

    if (work.endDate) {
        const dateResult = validateDate(work.endDate);
        if (!dateResult.valid) {
            errors.push(`End date: ${dateResult.error}`);
        }
    }

    // Validate URL if provided
    if (work.url) {
        const urlResult = validateURL(work.url);
        if (!urlResult.valid) {
            errors.push(urlResult.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate education entry
 * @param {object} education - Education entry to validate
 * @returns {object} Validation result
 */
export function validateEducationEntry(education) {
    const errors = [];

    if (!education || typeof education !== 'object') {
        return { valid: false, errors: ['Education entry is required'] };
    }

    // Validate dates if provided
    if (education.startDate) {
        const dateResult = validateDate(education.startDate);
        if (!dateResult.valid) {
            errors.push(`Start date: ${dateResult.error}`);
        }
    }

    if (education.endDate) {
        const dateResult = validateDate(education.endDate);
        if (!dateResult.valid) {
            errors.push(`End date: ${dateResult.error}`);
        }
    }

    // Validate URL if provided
    if (education.url) {
        const urlResult = validateURL(education.url);
        if (!urlResult.valid) {
            errors.push(urlResult.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate project entry
 * @param {object} project - Project entry to validate
 * @returns {object} Validation result
 */
export function validateProjectEntry(project) {
    const errors = [];

    if (!project || typeof project !== 'object') {
        return { valid: false, errors: ['Project entry is required'] };
    }

    // Validate dates if provided
    if (project.startDate) {
        const dateResult = validateDate(project.startDate);
        if (!dateResult.valid) {
            errors.push(`Start date: ${dateResult.error}`);
        }
    }

    if (project.endDate) {
        const dateResult = validateDate(project.endDate);
        if (!dateResult.valid) {
            errors.push(`End date: ${dateResult.error}`);
        }
    }

    // Validate URL if provided
    if (project.url) {
        const urlResult = validateURL(project.url);
        if (!urlResult.valid) {
            errors.push(urlResult.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate volunteer entry
 * @param {object} volunteer - Volunteer entry to validate
 * @returns {object} Validation result
 */
export function validateVolunteerEntry(volunteer) {
    const errors = [];

    if (!volunteer || typeof volunteer !== 'object') {
        return { valid: false, errors: ['Volunteer entry is required'] };
    }

    // Validate dates if provided
    if (volunteer.startDate) {
        const dateResult = validateDate(volunteer.startDate);
        if (!dateResult.valid) {
            errors.push(`Start date: ${dateResult.error}`);
        }
    }

    if (volunteer.endDate) {
        const dateResult = validateDate(volunteer.endDate);
        if (!dateResult.valid) {
            errors.push(`End date: ${dateResult.error}`);
        }
    }

    // Validate URL if provided
    if (volunteer.url) {
        const urlResult = validateURL(volunteer.url);
        if (!urlResult.valid) {
            errors.push(urlResult.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate complete resume data
 * @param {object} resumeData - Complete resume data
 * @returns {object} Validation result with detailed errors by section
 */
export function validateResumeData(resumeData) {
    const result = {
        valid: true,
        errors: {},
        warnings: {}
    };

    if (!resumeData || typeof resumeData !== 'object') {
        return {
            valid: false,
            errors: { general: ['Resume data is required'] },
            warnings: {}
        };
    }

    // Validate basics
    const basicsResult = validateBasics(resumeData.basics);
    if (!basicsResult.valid) {
        result.valid = false;
        result.errors.basics = basicsResult.errors;
    }

    // Validate work entries
    if (resumeData.work && Array.isArray(resumeData.work)) {
        resumeData.work.forEach((work, index) => {
            const workResult = validateWorkEntry(work);
            if (!workResult.valid) {
                result.valid = false;
                if (!result.errors.work) result.errors.work = {};
                result.errors.work[index] = workResult.errors;
            }
        });
    }

    // Validate education entries
    if (resumeData.education && Array.isArray(resumeData.education)) {
        resumeData.education.forEach((edu, index) => {
            const eduResult = validateEducationEntry(edu);
            if (!eduResult.valid) {
                result.valid = false;
                if (!result.errors.education) result.errors.education = {};
                result.errors.education[index] = eduResult.errors;
            }
        });
    }

    // Validate project entries
    if (resumeData.projects && Array.isArray(resumeData.projects)) {
        resumeData.projects.forEach((project, index) => {
            const projectResult = validateProjectEntry(project);
            if (!projectResult.valid) {
                result.valid = false;
                if (!result.errors.projects) result.errors.projects = {};
                result.errors.projects[index] = projectResult.errors;
            }
        });
    }

    // Validate volunteer entries
    if (resumeData.volunteer && Array.isArray(resumeData.volunteer)) {
        resumeData.volunteer.forEach((volunteer, index) => {
            const volunteerResult = validateVolunteerEntry(volunteer);
            if (!volunteerResult.valid) {
                result.valid = false;
                if (!result.errors.volunteer) result.errors.volunteer = {};
                result.errors.volunteer[index] = volunteerResult.errors;
            }
        });
    }

    // Add warnings for missing recommended fields
    if (!resumeData.basics?.name) {
        if (!result.warnings.basics) result.warnings.basics = [];
        result.warnings.basics.push('Name is recommended');
    }

    if (!resumeData.basics?.summary) {
        if (!result.warnings.basics) result.warnings.basics = [];
        result.warnings.basics.push('Summary is recommended');
    }

    return result;
}

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
    if (!html) return '';

    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Validate and sanitize form input
 * @param {string} input - User input to sanitize
 * @param {string} type - Input type (text, email, url, etc.)
 * @returns {object} {value: sanitized value, valid: boolean, error: string}
 */
export function validateAndSanitizeInput(input, type = 'text') {
    if (!input) {
        return { value: '', valid: true, error: null };
    }

    const sanitized = input.trim();

    switch (type) {
        case 'email':
            const emailResult = validateEmail(sanitized);
            return { value: sanitized, ...emailResult };

        case 'phone':
            const phoneResult = validatePhone(sanitized);
            return { value: sanitized, ...phoneResult };

        case 'url':
            const urlResult = validateURL(sanitized);
            return { value: sanitized, ...urlResult };

        case 'date':
            const dateResult = validateDate(sanitized);
            return { value: sanitized, ...dateResult };

        default:
            return { value: sanitizeHTML(sanitized), valid: true, error: null };
    }
}
