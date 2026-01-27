/**
 * AI Operation Handlers
 * Handles AI operation execution with robust parsing and persistence
 */

import aiService from './ai-service.js';
import { addResume, setCurrentResume, updateJob } from './store.js';
import { parseTailoredResume, parseCoverLetter, parseMatchAnalysis, parseKeyPoints, extractMetadata } from './ai-response-parser.js';
import * as AIPersistence from './ai-persistence-service.js';

/**
 * Execute resume tailoring operation
 * @param {object} params - Operation parameters
 * @param {object} params.resume - Resume data to tailor
 * @param {string} params.jobDescription - Job description text
 * @param {Array} params.providerList - List of AI providers to try
 * @param {Function} params.onProgress - Progress callback
 * @param {object} params.currentJob - Current job object for persistence
 * @param {object} params.currentResume - Current resume object for reference
 * @returns {Promise<object>} Operation result
 */
export async function executeTailorResume(params) {
    const { resume, jobDescription, providerList, onProgress, currentJob, currentResume } = params;

    console.log('ai-operations-service: Tailoring resume...');

    const result = await aiService.tailorResume({
        resume,
        jobDescription,
        providerList,
        includeAnalysis: true,
        onProgress
    });

    console.log('ai-operations-service: Tailoring complete, result:', result);

    // Persist the tailored resume
    await persistTailoredResume(result, currentJob, currentResume);

    return result;
}

/**
 * Execute cover letter generation operation
 * @param {object} params - Operation parameters
 * @param {object} params.resume - Resume data
 * @param {string} params.jobDescription - Job description text
 * @param {object} params.jobInfo - Job information (title, company, location)
 * @param {Array} params.providerList - List of AI providers to try
 * @param {Function} params.onProgress - Progress callback
 * @param {object} params.currentJob - Current job object for persistence
 * @param {object} params.currentResume - Current resume object for reference
 * @returns {Promise<object>} Operation result
 */
export async function executeGenerateCoverLetter(params) {
    const { resume, jobDescription, jobInfo, providerList, onProgress, currentJob, currentResume } = params;

    console.log('ai-operations-service: Generating cover letter...');

    const result = await aiService.generateCoverLetter({
        resume,
        jobDescription,
        jobInfo,
        providerList,
        includeAnalysis: true,
        onProgress
    });

    console.log('ai-operations-service: Cover letter generation complete, result:', result);

    // Persist the cover letter
    await persistCoverLetter(result, currentJob, currentResume);

    return result;
}

/**
 * Execute match analysis operation
 * @param {object} params - Operation parameters
 * @param {object} params.resume - Resume data
 * @param {string} params.jobDescription - Job description text
 * @param {Array} params.providerList - List of AI providers to try
 * @param {Function} params.onProgress - Progress callback
 * @returns {Promise<object>} Operation result
 */
export async function executeAnalyzeMatch(params) {
    const { resume, jobDescription, providerList, onProgress } = params;

    console.log('ai-operations-service: Analyzing match...');

    const result = await aiService.analyzeMatch({
        resume,
        jobDescription,
        providerList,
        onProgress
    });

    console.log('ai-operations-service: Match analysis complete, result:', result);

    return result;
}

/**
 * Persist tailored resume to store
 * @param {object} result - AI operation result
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 */
async function persistTailoredResume(result, currentJob, currentResume) {
    try {
        // Use robust parser to extract tailored resume
        const tailored = parseTailoredResume(result);

        if (!tailored) {
            throw new Error('AI response did not contain a valid tailored resume');
        }

        // Extract metadata
        const metadata = extractMetadata(result);

        // Save using persistence service
        const newResume = await AIPersistence.saveTailoredResume({
            tailoredResume: tailored,
            currentJob,
            currentResume,
            metadata,
            addResume,
            setCurrentResume,
            updateJob
        });

        // Log the API operation
        await logApiOperation('tailor_resume', result, currentJob, newResume.id);

        console.log('ai-operation-handlers: Successfully persisted tailored resume', newResume.id);

    } catch (persistError) {
        console.error('ai-operation-handlers: Failed to persist tailored resume', persistError);
        throw persistError;
    }
}

/**
 * Persist cover letter to store
 * @param {object} result - AI operation result
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 */
async function persistCoverLetter(result, currentJob, currentResume) {
    try {
        // Use robust parser to extract cover letter data
        const coverLetter = parseCoverLetter(result);
        const keyPoints = parseKeyPoints(result);
        const analysis = parseMatchAnalysis(result);
        const metadata = extractMetadata(result);

        if (!coverLetter) {
            throw new Error('AI response did not contain a valid cover letter');
        }

        // Save using persistence service
        const globalStore = window.globalStore;
        const entry = await AIPersistence.saveCoverLetter({
            coverLetter,
            currentJob,
            currentResume,
            keyPoints,
            analysis,
            metadata,
            getState: (key) => globalStore ? globalStore.getState(key) : null,
            setState: (data, source) => globalStore ? globalStore.setState(data, source) : null
        });

        // Log the API operation
        await logApiOperation('generate_cover_letter', result, currentJob, currentResume?.id);

        console.log('ai-operation-handlers: Successfully persisted cover letter', entry.id);

    } catch (persistErr) {
        console.error('ai-operation-handlers: Failed to persist cover letter', persistErr);
        throw persistErr;
    }
}

/**
 * Log API operation to activity log
 * @param {string} operationType - Type of operation (tailor_resume, generate_cover_letter, etc.)
 * @param {object} result - AI operation result
 * @param {object} currentJob - Current job object
 * @param {string} resumeId - Resume ID for logging
 */
async function logApiOperation(operationType, result, currentJob, resumeId) {
    try {
        const { logApiCall } = await import('./logs.js');

        await AIPersistence.logAIOperation({
            operationType,
            result,
            currentJob,
            currentResume: null,
            resumeId,
            logApiCall
        });

        console.log('ai-operation-handlers: Logged API operation', operationType);
    } catch (logErr) {
        console.warn('ai-operation-handlers: Failed to log API call', logErr);
    }
}

/**
 * Save result to history/logs
 * @param {object} result - Result to save
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 * @param {Function} updateGlobalState - Function to update global state
 * @returns {object} Log entry that was created
 */
export function saveResultToHistory(result, currentJob, currentResume, updateGlobalState) {
    const logEntry = {
        id: 'log_' + Date.now(),
        type: 'ai_action',
        action: result.type,
        timestamp: new Date().toISOString(),
        details: {
            jobId: currentJob?.id,
            resumeId: currentResume?.id,
            provider: result.data.provider,
            result: result.data.result
        }
    };

    // Get current logs from global store
    const globalStore = window.globalStore;
    let currentLogs = [];

    if (globalStore && typeof globalStore.getState === 'function') {
        currentLogs = globalStore.getState('logs') || [];
    }

    // Update logs via provided function
    if (updateGlobalState) {
        updateGlobalState({
            logs: [...currentLogs, logEntry]
        }, 'ai-operations-save-history');
    }

    console.log('ai-operations-service: Saved result to history', logEntry.id);

    return logEntry;
}

/**
 * Apply tailored resume changes
 * @param {object} result - Tailoring result with tailoredResume
 * @param {object} currentResume - Current resume object
 * @param {object} currentJob - Current job object
 * @param {Function} updateGlobalState - Function to update global state
 */
export function applyTailoredChanges(result, currentResume, currentJob, updateGlobalState) {
    if (!result || result.type !== 'tailor-resume') {
        throw new Error('Invalid result for applying changes');
    }

    const tailoredResume = result.data.result.tailoredResume;

    if (!tailoredResume) {
        throw new Error('No tailored resume found in result');
    }

    // Update the current resume with the tailored version
    if (updateGlobalState) {
        updateGlobalState({
            currentResume: {
                ...currentResume,
                data: tailoredResume,
                lastModified: new Date().toISOString(),
                tailoredFor: currentJob?.id
            }
        }, 'ai-operations-apply-changes');
    }

    console.log('ai-operations-service: Applied tailored resume changes');
}

/**
 * Check if resume can be tailored
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 * @param {boolean} hasApiKey - Whether valid API key exists
 * @param {boolean} isProcessing - Whether currently processing
 * @returns {boolean} True if resume can be tailored
 */
export function canTailorResume(currentJob, currentResume, hasApiKey, isProcessing) {
    return currentJob &&
           (currentJob.description || currentJob.jobDetails) &&
           currentResume &&
           hasApiKey &&
           !isProcessing;
}

/**
 * Check if cover letter can be generated
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 * @param {boolean} hasApiKey - Whether valid API key exists
 * @param {boolean} isProcessing - Whether currently processing
 * @returns {boolean} True if cover letter can be generated
 */
export function canGenerateCoverLetter(currentJob, currentResume, hasApiKey, isProcessing) {
    return currentJob &&
           (currentJob.description || currentJob.jobDetails) &&
           currentResume &&
           hasApiKey &&
           !isProcessing;
}

/**
 * Check if match can be analyzed
 * @param {object} currentJob - Current job object
 * @param {object} currentResume - Current resume object
 * @param {boolean} hasApiKey - Whether valid API key exists
 * @param {boolean} isProcessing - Whether currently processing
 * @returns {boolean} True if match can be analyzed
 */
export function canAnalyzeMatch(currentJob, currentResume, hasApiKey, isProcessing) {
    return currentJob &&
           (currentJob.description || currentJob.jobDetails) &&
           currentResume &&
           hasApiKey &&
           !isProcessing;
}
