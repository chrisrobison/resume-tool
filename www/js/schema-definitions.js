// schema-definitions.js - Data schemas for all entity types
// Extracted from jobs.html embedded JavaScript

/**
 * Get dynamic options for select fields
 */
const dynamicOptions = {
    /**
     * Get resume options for job association
     * @returns {Array} Array of resume options
     */
    getResumeOptions() {
        const data = JSON.parse(localStorage.getItem('jobHuntData') || '{"resumes": []}');
        return data.resumes.map(r => ({ 
            value: r.id, 
            label: r.name || 'Untitled Resume' 
        }));
    },

    /**
     * Get job options for letter association
     * @returns {Array} Array of job options
     */
    getJobOptions() {
        const data = JSON.parse(localStorage.getItem('jobHuntData') || '{"jobs": []}');
        return data.jobs.map(j => ({ 
            value: j.id, 
            label: `${j.position || 'Untitled'} at ${j.company || 'Unknown Company'}` 
        }));
    }
};

/**
 * Job schema definition
 */
export const jobSchema = {
    id: { 
        type: 'hidden', 
        required: true 
    },
    company: { 
        type: 'text', 
        label: 'Company', 
        required: true,
        placeholder: 'Company name'
    },
    position: { 
        type: 'text', 
        label: 'Position', 
        required: true,
        placeholder: 'Job title'
    },
    status: { 
        type: 'select', 
        label: 'Status',
        options: [
            'saved', 
            'applied', 
            'interviewing', 
            'offered', 
            'rejected', 
            'accepted', 
            'declined'
        ],
        required: true
    },
    datePosted: { 
        type: 'date', 
        label: 'Date Posted' 
    },
    dateApplied: { 
        type: 'date', 
        label: 'Date Applied' 
    },
    description: { 
        type: 'textarea', 
        label: 'Short Description', 
        rows: 3,
        placeholder: 'Brief summary of the position...'
    },
    jobDetails: { 
        type: 'textarea', 
        label: 'Job Details', 
        rows: 8,
        placeholder: 'Complete job description, requirements, responsibilities...'
    },
    location: { 
        type: 'text', 
        label: 'Location',
        placeholder: 'City, State or Remote'
    },
    contactName: { 
        type: 'text', 
        label: 'Contact Name',
        placeholder: 'Recruiter or hiring manager name'
    },
    contactEmail: { 
        type: 'email', 
        label: 'Contact Email',
        placeholder: 'Contact email address'
    },
    contactPhone: { 
        type: 'tel', 
        label: 'Contact Phone',
        placeholder: 'Contact phone number'
    },
    url: { 
        type: 'url', 
        label: 'Job URL',
        placeholder: 'Link to job posting'
    },
    resumeId: { 
        type: 'select', 
        label: 'Associated Resume',
        options: () => dynamicOptions.getResumeOptions(),
        placeholder: 'Select a resume...'
    },
    notes: { 
        type: 'textarea', 
        label: 'Notes', 
        rows: 4,
        placeholder: 'Additional notes about this job...'
    }
};

/**
 * Resume schema definition
 */
export const resumeSchema = {
    id: { 
        type: 'hidden', 
        required: true 
    },
    name: { 
        type: 'text', 
        label: 'Resume Name', 
        required: true,
        placeholder: 'My Resume'
    },
    content: { 
        type: 'resume-editor', 
        label: 'Resume Content' 
    },
    dateCreated: { 
        type: 'datetime-local', 
        label: 'Date Created', 
        readonly: true 
    },
    dateModified: { 
        type: 'datetime-local', 
        label: 'Last Modified', 
        readonly: true 
    }
};

/**
 * Cover letter schema definition
 */
export const letterSchema = {
    id: { 
        type: 'hidden', 
        required: true 
    },
    name: { 
        type: 'text', 
        label: 'Letter Name', 
        required: true,
        placeholder: 'Cover Letter for [Company]'
    },
    type: { 
        type: 'select', 
        label: 'Letter Type',
        options: [
            { value: 'cover_letter', label: 'Cover Letter' },
            { value: 'thank_you', label: 'Thank You Letter' },
            { value: 'follow_up', label: 'Follow Up Letter' },
            { value: 'networking', label: 'Networking Letter' }
        ],
        required: true
    },
    content: { 
        type: 'textarea', 
        label: 'Letter Content', 
        rows: 15,
        placeholder: 'Dear Hiring Manager,\n\nI am writing to express my interest...'
    },
    jobId: { 
        type: 'select', 
        label: 'Associated Job',
        options: () => dynamicOptions.getJobOptions(),
        placeholder: 'Select a job...'
    },
    dateCreated: { 
        type: 'datetime-local', 
        label: 'Date Created', 
        readonly: true 
    }
};

/**
 * AI interaction schema definition
 */
export const aiSchema = {
    id: { 
        type: 'hidden', 
        required: true 
    },
    type: { 
        type: 'text', 
        label: 'Interaction Type', 
        readonly: true 
    },
    service: { 
        type: 'text', 
        label: 'AI Service', 
        readonly: true 
    },
    prompt: { 
        type: 'textarea', 
        label: 'Prompt', 
        rows: 5, 
        readonly: true 
    },
    response: { 
        type: 'textarea', 
        label: 'Response', 
        rows: 10, 
        readonly: true 
    },
    timestamp: { 
        type: 'datetime-local', 
        label: 'Timestamp', 
        readonly: true 
    },
    jobId: { 
        type: 'text', 
        label: 'Related Job ID', 
        readonly: true 
    }
};

/**
 * Schema registry - maps section names to their schemas
 */
export const schemas = {
    jobs: jobSchema,
    resumes: resumeSchema,
    letters: letterSchema,
    ai: aiSchema
};

/**
 * Field validation rules
 */
export const validationRules = {
    required: (value) => {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    email: (value) => {
        if (!value) return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    
    url: (value) => {
        if (!value) return true; // Optional field
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    
    tel: (value) => {
        if (!value) return true; // Optional field
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(value.replace(/[-\s\(\)]/g, ''));
    },
    
    date: (value) => {
        if (!value) return true; // Optional field
        const date = new Date(value);
        return !isNaN(date.getTime());
    }
};

/**
 * Get schema for a specific section
 * @param {string} section - Section name
 * @returns {object|null} Schema definition
 */
export function getSchema(section) {
    return schemas[section] || null;
}

/**
 * Validate field value against schema
 * @param {string} section - Section name
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @returns {object} Validation result {valid: boolean, message: string}
 */
export function validateField(section, fieldName, value) {
    const schema = getSchema(section);
    if (!schema || !schema[fieldName]) {
        return { valid: true, message: '' };
    }
    
    const field = schema[fieldName];
    
    // Check required fields
    if (field.required && !validationRules.required(value)) {
        return { 
            valid: false, 
            message: `${field.label} is required` 
        };
    }
    
    // Check field type validation
    if (value && validationRules[field.type]) {
        if (!validationRules[field.type](value)) {
            return { 
                valid: false, 
                message: `${field.label} format is invalid` 
            };
        }
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate entire item against schema
 * @param {string} section - Section name
 * @param {object} item - Item data
 * @returns {object} Validation result {valid: boolean, errors: object}
 */
export function validateItem(section, item) {
    const schema = getSchema(section);
    if (!schema) {
        return { valid: false, errors: { _schema: 'Invalid section' } };
    }
    
    const errors = {};
    let valid = true;
    
    Object.keys(schema).forEach(fieldName => {
        const result = validateField(section, fieldName, item[fieldName]);
        if (!result.valid) {
            errors[fieldName] = result.message;
            valid = false;
        }
    });
    
    return { valid, errors };
}