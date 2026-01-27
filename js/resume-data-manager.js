/**
 * Resume Data Manager Service
 * Handles CRUD operations, localStorage integration, and data initialization
 */

/**
 * Get default resume data structure
 * @returns {object} Default resume object following JSON Resume schema
 */
export function getDefaultResumeData() {
    return {
        basics: {
            name: '',
            label: '',
            email: '',
            phone: '',
            url: '',
            summary: '',
            location: {
                address: '',
                city: '',
                countryCode: '',
                region: ''
            },
            profiles: []
        },
        work: [],
        education: [],
        skills: [],
        projects: [],
        volunteer: [],
        meta: {
            theme: 'modern',
            lastModified: new Date().toISOString()
        }
    };
}

/**
 * Validate resume data structure
 * @param {object} data - Resume data to validate
 * @returns {boolean} True if valid
 */
export function isValidResumeData(data) {
    if (!data || typeof data !== 'object') return false;

    // Check for required top-level properties
    if (!data.basics || typeof data.basics !== 'object') return false;

    // Check array properties
    const arrayProps = ['work', 'education', 'skills', 'projects', 'volunteer'];
    for (const prop of arrayProps) {
        if (data[prop] !== undefined && !Array.isArray(data[prop])) {
            return false;
        }
    }

    return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    if (!email) return true; // Empty is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Update resume metadata with current timestamp
 * @param {object} resumeData - Resume data to update
 * @returns {object} Updated resume data
 */
export function updateMetaLastModified(resumeData) {
    if (!resumeData.meta) {
        resumeData.meta = {};
    }
    resumeData.meta.lastModified = new Date().toISOString();
    return resumeData;
}

/**
 * Load resume from localStorage
 * @returns {object|null} Resume data or null if not found
 */
export function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem('resume-data');
        if (stored) {
            const data = JSON.parse(stored);
            if (isValidResumeData(data)) {
                console.log('resume-data-manager: Loaded resume from localStorage');
                return data;
            }
        }
    } catch (error) {
        console.error('resume-data-manager: Failed to load from localStorage', error);
    }
    return null;
}

/**
 * Save resume to localStorage
 * @param {object} resumeData - Resume data to save
 * @returns {boolean} True if saved successfully
 */
export function saveToLocalStorage(resumeData) {
    try {
        if (!isValidResumeData(resumeData)) {
            console.error('resume-data-manager: Invalid resume data, not saving');
            return false;
        }

        // Update metadata before saving
        const updatedData = updateMetaLastModified(resumeData);

        localStorage.setItem('resume-data', JSON.stringify(updatedData));
        console.log('resume-data-manager: Saved resume to localStorage');
        return true;
    } catch (error) {
        console.error('resume-data-manager: Failed to save to localStorage', error);
        return false;
    }
}

/**
 * Check if localStorage is available
 * @returns {boolean} True if available
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Initialize localStorage with default data if needed
 * @returns {object} Resume data (loaded or default)
 */
export function initLocalStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('resume-data-manager: localStorage not available');
        return getDefaultResumeData();
    }

    const existing = loadFromLocalStorage();
    if (existing) {
        return existing;
    }

    // No existing data, create default
    const defaultData = getDefaultResumeData();
    saveToLocalStorage(defaultData);
    return defaultData;
}

/**
 * Add item to resume section
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name (work, education, skills, etc.)
 * @param {object} item - Item to add
 * @returns {object} Updated resume data
 */
export function addSectionItem(resumeData, section, item) {
    if (!resumeData[section]) {
        resumeData[section] = [];
    }
    resumeData[section].push(item);
    return updateMetaLastModified(resumeData);
}

/**
 * Update item in resume section
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {number} index - Item index
 * @param {object} item - Updated item
 * @returns {object} Updated resume data
 */
export function updateSectionItem(resumeData, section, index, item) {
    if (!resumeData[section] || !resumeData[section][index]) {
        throw new Error(`Invalid section or index: ${section}[${index}]`);
    }
    resumeData[section][index] = item;
    return updateMetaLastModified(resumeData);
}

/**
 * Delete item from resume section
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {number} index - Item index
 * @returns {object} Updated resume data
 */
export function deleteSectionItem(resumeData, section, index) {
    if (!resumeData[section] || !resumeData[section][index]) {
        throw new Error(`Invalid section or index: ${section}[${index}]`);
    }
    resumeData[section].splice(index, 1);
    return updateMetaLastModified(resumeData);
}

/**
 * Get section item by index
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @param {number} index - Item index
 * @returns {object|null} Section item or null
 */
export function getSectionItem(resumeData, section, index) {
    if (!resumeData[section] || !resumeData[section][index]) {
        return null;
    }
    return resumeData[section][index];
}

/**
 * Get all items in a section
 * @param {object} resumeData - Resume data
 * @param {string} section - Section name
 * @returns {Array} Section items
 */
export function getSectionItems(resumeData, section) {
    return resumeData[section] || [];
}

/**
 * Update basics section
 * @param {object} resumeData - Resume data
 * @param {object} basicsData - Updated basics data
 * @returns {object} Updated resume data
 */
export function updateBasics(resumeData, basicsData) {
    resumeData.basics = { ...resumeData.basics, ...basicsData };
    return updateMetaLastModified(resumeData);
}

/**
 * Merge resume data with updates
 * @param {object} currentData - Current resume data
 * @param {object} updates - Updates to merge
 * @returns {object} Merged resume data
 */
export function mergeResumeData(currentData, updates) {
    const merged = { ...currentData };

    // Merge basics
    if (updates.basics) {
        merged.basics = { ...merged.basics, ...updates.basics };
    }

    // Merge array sections
    const sections = ['work', 'education', 'skills', 'projects', 'volunteer', 'profiles'];
    for (const section of sections) {
        if (updates[section]) {
            merged[section] = updates[section];
        }
    }

    // Merge meta
    if (updates.meta) {
        merged.meta = { ...merged.meta, ...updates.meta };
    }

    return updateMetaLastModified(merged);
}

/**
 * Clone resume data (deep copy)
 * @param {object} resumeData - Resume data to clone
 * @returns {object} Cloned resume data
 */
export function cloneResumeData(resumeData) {
    return JSON.parse(JSON.stringify(resumeData));
}

/**
 * Export resume data as JSON string
 * @param {object} resumeData - Resume data to export
 * @param {boolean} pretty - Whether to format with indentation
 * @returns {string} JSON string
 */
export function exportAsJSON(resumeData, pretty = true) {
    return pretty ? JSON.stringify(resumeData, null, 2) : JSON.stringify(resumeData);
}

/**
 * Import resume data from JSON string
 * @param {string} jsonString - JSON string to parse
 * @returns {object} Parsed resume data
 * @throws {Error} If JSON is invalid or data structure is invalid
 */
export function importFromJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (!isValidResumeData(data)) {
            throw new Error('Invalid resume data structure');
        }
        return updateMetaLastModified(data);
    } catch (error) {
        throw new Error(`Failed to import resume: ${error.message}`);
    }
}

/**
 * Clear all resume data (reset to default)
 * @returns {object} Default resume data
 */
export function clearResumeData() {
    const defaultData = getDefaultResumeData();
    saveToLocalStorage(defaultData);
    return defaultData;
}
