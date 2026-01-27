/**
 * AI Response Parser Service
 * Handles robust parsing of AI responses with multiple fallback strategies
 * Addresses the fragile response parsing issue where different AI providers
 * return data in different formats
 */

/**
 * Parse tailored resume from AI response with robust fallback strategies
 * @param {object} result - AI operation result
 * @returns {object|null} Parsed tailored resume or null if not found
 */
export function parseTailoredResume(result) {
    console.log('ai-response-parser: Parsing tailored resume from result');

    // Strategy 1: Direct extraction from common paths
    let tailored = extractFromCommonPaths(result);
    if (tailored) {
        console.log('ai-response-parser: Found via common paths');
        return tailored;
    }

    // Strategy 2: Deep search through nested result objects
    tailored = deepSearchForResume(result);
    if (tailored) {
        console.log('ai-response-parser: Found via deep search');
        return tailored;
    }

    // Strategy 3: Try parsing stringified JSON
    tailored = parseStringifiedJSON(result);
    if (tailored) {
        console.log('ai-response-parser: Found via JSON parsing');
        return tailored;
    }

    // Strategy 4: Last resort - look for any object with resume-like structure
    tailored = findResumeStructure(result);
    if (tailored) {
        console.log('ai-response-parser: Found via structure matching');
        return tailored;
    }

    console.warn('ai-response-parser: Could not extract tailored resume from result');
    return null;
}

/**
 * Parse cover letter from AI response
 * @param {object} result - AI operation result
 * @returns {string|null} Cover letter text or null if not found
 */
export function parseCoverLetter(result) {
    console.log('ai-response-parser: Parsing cover letter from result');

    const payload = result?.result ?? result;

    // Try common paths
    if (payload?.coverLetter) return payload.coverLetter;
    if (payload?.cover_letter) return payload.cover_letter;
    if (payload?.result?.coverLetter) return payload.result.coverLetter;
    if (payload?.result?.cover_letter) return payload.result.cover_letter;

    // Try string parsing
    if (typeof payload === 'string') {
        try {
            const parsed = JSON.parse(payload);
            if (parsed.coverLetter) return parsed.coverLetter;
            if (parsed.cover_letter) return parsed.cover_letter;
        } catch (e) {
            // Not JSON, might be the cover letter itself
            if (payload.length > 100) return payload;
        }
    }

    console.warn('ai-response-parser: Could not extract cover letter from result');
    return null;
}

/**
 * Parse match analysis from AI response
 * @param {object} result - AI operation result
 * @returns {object|null} Analysis object or null if not found
 */
export function parseMatchAnalysis(result) {
    console.log('ai-response-parser: Parsing match analysis from result');

    const payload = result?.result ?? result;

    // Try common paths
    if (payload?.analysis) return payload.analysis;
    if (payload?.matchAnalysis) return payload.matchAnalysis;
    if (payload?.match_analysis) return payload.match_analysis;
    if (payload?.result?.analysis) return payload.result.analysis;

    // Try string parsing
    if (typeof payload === 'string') {
        try {
            const parsed = JSON.parse(payload);
            if (parsed.analysis) return parsed.analysis;
            if (parsed.matchAnalysis) return parsed.matchAnalysis;
        } catch (e) {
            // Ignore
        }
    }

    console.warn('ai-response-parser: Could not extract analysis from result');
    return null;
}

/**
 * Extract resume from common response paths
 * @param {object} result - AI result object
 * @returns {object|null} Resume object or null
 */
function extractFromCommonPaths(result) {
    const payload = result?.result ?? result;

    if (!payload || typeof payload !== 'object') return null;

    // Try common property names
    const commonPaths = [
        'tailoredResume',
        'tailored_resume',
        'tailored',
        'resume',
        'result.tailoredResume',
        'result.tailored',
        'data.tailoredResume'
    ];

    for (const path of commonPaths) {
        const value = getNestedProperty(payload, path);
        if (value && isResumeObject(value)) {
            return value;
        }
    }

    return null;
}

/**
 * Deep search for resume object in nested structures
 * @param {object} result - AI result object
 * @returns {object|null} Resume object or null
 */
function deepSearchForResume(result, maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth) return null;
    if (!result || typeof result !== 'object') return null;

    // Check if current object is a resume
    if (isResumeObject(result)) {
        return result;
    }

    // Search through all properties
    for (const key in result) {
        if (!result.hasOwnProperty(key)) continue;

        const value = result[key];
        if (value && typeof value === 'object') {
            const found = deepSearchForResume(value, maxDepth, currentDepth + 1);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Try parsing stringified JSON from result
 * @param {object} result - AI result object
 * @returns {object|null} Resume object or null
 */
function parseStringifiedJSON(result) {
    const payload = result?.result ?? result;

    // If payload is a string, try parsing it
    if (typeof payload === 'string') {
        try {
            const parsed = JSON.parse(payload);
            if (isResumeObject(parsed)) return parsed;
            if (parsed.tailoredResume) return parsed.tailoredResume;
            if (parsed.resume) return parsed.resume;
        } catch (e) {
            // Not valid JSON
        }
    }

    // Try stringifying and re-parsing (sometimes helps with double-encoding)
    try {
        const stringified = JSON.stringify(result);
        const parsed = JSON.parse(stringified);

        // Look for resume in the parsed result
        if (parsed?.result?.tailoredResume) return parsed.result.tailoredResume;
        if (parsed?.tailoredResume) return parsed.tailoredResume;
    } catch (e) {
        // Ignore
    }

    return null;
}

/**
 * Find any object with resume-like structure
 * @param {object} result - AI result object
 * @returns {object|null} Resume object or null
 */
function findResumeStructure(result, maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth) return null;
    if (!result || typeof result !== 'object') return null;

    // Search through all properties for resume-like objects
    for (const key in result) {
        if (!result.hasOwnProperty(key)) continue;

        const value = result[key];

        // Check if this looks like a resume
        if (value && typeof value === 'object' && hasResumeFields(value)) {
            return value;
        }

        // Recurse into nested objects
        if (value && typeof value === 'object') {
            const found = findResumeStructure(value, maxDepth, currentDepth + 1);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Check if object is a valid resume object (strict check)
 * @param {object} obj - Object to check
 * @returns {boolean} True if object looks like a resume
 */
function isResumeObject(obj) {
    if (!obj || typeof obj !== 'object') return false;

    // Check for JSON Resume schema properties
    const hasBasics = obj.basics && typeof obj.basics === 'object';
    const hasWork = Array.isArray(obj.work);
    const hasSkills = Array.isArray(obj.skills);

    return hasBasics || hasWork || hasSkills;
}

/**
 * Check if object has resume-like fields (loose check)
 * @param {object} obj - Object to check
 * @returns {boolean} True if object has resume-like fields
 */
function hasResumeFields(obj) {
    if (!obj || typeof obj !== 'object') return false;

    const resumeKeys = [
        'basics', 'work', 'education', 'skills', 'projects',
        'volunteer', 'awards', 'publications', 'languages',
        'interests', 'references'
    ];

    let matchCount = 0;
    for (const key of resumeKeys) {
        if (obj.hasOwnProperty(key)) {
            matchCount++;
        }
    }

    // Consider it resume-like if it has at least 2 standard fields
    return matchCount >= 2;
}

/**
 * Get nested property from object using dot notation
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-notation path (e.g., 'result.tailoredResume')
 * @returns {*} Value at path or undefined
 */
function getNestedProperty(obj, path) {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }

    return current;
}

/**
 * Validate parsed resume structure
 * @param {object} resume - Resume object to validate
 * @returns {object} Validation result with {valid: boolean, errors: string[]}
 */
export function validateResumeStructure(resume) {
    const errors = [];

    if (!resume || typeof resume !== 'object') {
        errors.push('Resume must be an object');
        return { valid: false, errors };
    }

    // Check for at least one major section
    const hasMajorSection = resume.basics || resume.work || resume.skills || resume.education;
    if (!hasMajorSection) {
        errors.push('Resume must have at least one major section (basics, work, skills, or education)');
    }

    // Validate basics if present
    if (resume.basics) {
        if (typeof resume.basics !== 'object') {
            errors.push('basics must be an object');
        }
    }

    // Validate work if present
    if (resume.work && !Array.isArray(resume.work)) {
        errors.push('work must be an array');
    }

    // Validate skills if present
    if (resume.skills && !Array.isArray(resume.skills)) {
        errors.push('skills must be an array');
    }

    // Validate education if present
    if (resume.education && !Array.isArray(resume.education)) {
        errors.push('education must be an array');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Extract metadata from AI response
 * @param {object} result - AI result object
 * @returns {object} Metadata object with provider, model, tokens, etc.
 */
export function extractMetadata(result) {
    return {
        provider: result.usedProvider || result.provider || 'unknown',
        model: result.usedModel || result.model || 'unknown',
        tokens: result.tokens || result.usage?.total_tokens || null,
        timestamp: new Date().toISOString(),
        success: !!result.result
    };
}

/**
 * Parse key points from AI response
 * @param {object} result - AI result object
 * @returns {Array} Array of key points or empty array
 */
export function parseKeyPoints(result) {
    const payload = result?.result ?? result;

    if (Array.isArray(payload?.keyPoints)) return payload.keyPoints;
    if (Array.isArray(payload?.key_points)) return payload.key_points;
    if (Array.isArray(payload?.result?.keyPoints)) return payload.result.keyPoints;

    return [];
}

/**
 * Parse changes list from AI response
 * @param {object} result - AI result object
 * @returns {Array} Array of change descriptions or empty array
 */
export function parseChanges(result) {
    const payload = result?.result ?? result;

    if (Array.isArray(payload?.changes)) return payload.changes;
    if (Array.isArray(payload?.result?.changes)) return payload.result.changes;

    return [];
}
