/**
 * AI Persistence Service
 * Centralized service for saving AI operation results, history, and logs
 */

/**
 * Save tailored resume to global store
 * @param {object} params - Persistence parameters
 * @param {object} params.tailoredResume - The tailored resume object
 * @param {object} params.currentJob - Current job object
 * @param {object} params.currentResume - Original resume object
 * @param {object} params.metadata - AI operation metadata
 * @param {Function} params.addResume - Function to add resume to store
 * @param {Function} params.setCurrentResume - Function to set current resume
 * @param {Function} params.updateJob - Function to update job
 * @returns {object} Created resume object with ID
 */
export async function saveTailoredResume(params) {
    const { tailoredResume, currentJob, currentResume, metadata, addResume, setCurrentResume, updateJob } = params;

    const timestamp = new Date().toISOString();
    const newResume = {
        id: generateResumeId(),
        name: generateResumeName(currentJob),
        content: tailoredResume,
        dateCreated: timestamp,
        dateModified: timestamp,
        metadata: {
            tailoredFor: currentJob?.id,
            originalResumeId: currentResume?.id,
            provider: metadata?.provider,
            model: metadata?.model,
            aiGenerated: true
        }
    };

    try {
        // Add to global store
        addResume(newResume);
        console.log('ai-persistence: Saved tailored resume', newResume.id);

        // Associate with job if present
        if (currentJob?.id && updateJob) {
            await updateJob(currentJob.id, {
                resumeId: newResume.id,
                dateUpdated: timestamp
            });
            console.log('ai-persistence: Associated resume with job', currentJob.id);
        }

        // Set as current resume
        if (setCurrentResume) {
            setCurrentResume(newResume);
            console.log('ai-persistence: Set as current resume');
        }

        return newResume;

    } catch (error) {
        console.error('ai-persistence: Failed to save tailored resume', error);
        throw new Error(`Failed to save tailored resume: ${error.message}`);
    }
}

/**
 * Save cover letter to global store
 * @param {object} params - Persistence parameters
 * @param {string} params.coverLetter - Cover letter text
 * @param {object} params.currentJob - Current job object
 * @param {object} params.currentResume - Current resume object
 * @param {Array} params.keyPoints - Key selling points
 * @param {object} params.analysis - Match analysis
 * @param {object} params.metadata - AI operation metadata
 * @param {Function} params.getState - Function to get state from store
 * @param {Function} params.setState - Function to update store state
 * @returns {object} Created cover letter entry
 */
export async function saveCoverLetter(params) {
    const { coverLetter, currentJob, currentResume, keyPoints, analysis, metadata, getState, setState } = params;

    const entry = {
        id: generateCoverLetterId(),
        jobId: currentJob?.id,
        resumeId: currentResume?.id,
        content: coverLetter,
        keyPoints: keyPoints || [],
        analysis: analysis || null,
        createdDate: new Date().toISOString(),
        metadata: {
            provider: metadata?.provider,
            model: metadata?.model,
            aiGenerated: true
        }
    };

    try {
        // Get existing cover letters
        const existing = getState('coverLetters') || [];

        // Add new entry
        setState({
            coverLetters: [...existing, entry]
        }, 'ai-persistence-cover-letter');

        console.log('ai-persistence: Saved cover letter', entry.id);

        return entry;

    } catch (error) {
        console.error('ai-persistence: Failed to save cover letter', error);
        throw new Error(`Failed to save cover letter: ${error.message}`);
    }
}

/**
 * Save AI operation to logs/history
 * @param {object} params - Log parameters
 * @param {string} params.operationType - Type of operation (tailor_resume, generate_cover_letter, etc.)
 * @param {object} params.result - AI operation result
 * @param {object} params.currentJob - Current job object
 * @param {object} params.currentResume - Current resume object
 * @param {string} params.resumeId - ID of created/modified resume
 * @param {Function} params.logApiCall - Function to log API call (from logs.js)
 * @returns {void}
 */
export async function logAIOperation(params) {
    const { operationType, result, currentJob, currentResume, resumeId, logApiCall } = params;

    try {
        if (!logApiCall) {
            console.warn('ai-persistence: logApiCall function not provided, skipping');
            return;
        }

        const provider = result.usedProvider || result.provider || 'unknown';
        const model = result.usedModel || result.model || 'unknown';

        logApiCall(
            provider,
            operationType,
            { model },
            result,
            null,
            {
                jobId: currentJob?.id,
                resumeId: resumeId || currentResume?.id
            }
        );

        console.log('ai-persistence: Logged AI operation', operationType);

    } catch (error) {
        console.warn('ai-persistence: Failed to log AI operation', error);
        // Don't throw - logging failures shouldn't break the operation
    }
}

/**
 * Save AI operation result to history
 * @param {object} params - Save parameters
 * @param {object} params.result - AI operation result
 * @param {string} params.resultType - Type of result (tailor-resume, cover-letter, match-analysis)
 * @param {object} params.currentJob - Current job object
 * @param {object} params.currentResume - Current resume object
 * @param {Function} params.getState - Function to get state from store
 * @param {Function} params.setState - Function to update store state
 * @returns {object} Created log entry
 */
export function saveResultToHistory(params) {
    const { result, resultType, currentJob, currentResume, getState, setState } = params;

    const logEntry = {
        id: generateLogId(),
        type: 'ai_action',
        action: resultType,
        timestamp: new Date().toISOString(),
        details: {
            jobId: currentJob?.id,
            resumeId: currentResume?.id,
            provider: result.data?.provider || result.provider,
            model: result.data?.model || result.model,
            result: result.data?.result || result.result
        }
    };

    try {
        // Get existing logs
        const currentLogs = getState('logs') || [];

        // Add new entry
        setState({
            logs: [...currentLogs, logEntry]
        }, 'ai-persistence-history');

        console.log('ai-persistence: Saved result to history', logEntry.id);

        return logEntry;

    } catch (error) {
        console.error('ai-persistence: Failed to save result to history', error);
        throw new Error(`Failed to save to history: ${error.message}`);
    }
}

/**
 * Associate cover letter with job
 * @param {object} params - Association parameters
 * @param {object} params.currentJob - Current job object
 * @param {string} params.coverLetterId - Cover letter ID
 * @param {Function} params.setState - Function to update store state
 * @returns {void}
 */
export function associateCoverLetterWithJob(params) {
    const { currentJob, coverLetterId, setState } = params;

    if (!currentJob) {
        console.warn('ai-persistence: No current job to associate cover letter with');
        return;
    }

    try {
        setState({
            currentJob: {
                ...currentJob,
                coverLetterId
            }
        }, 'ai-persistence-associate-cover-letter');

        console.log('ai-persistence: Associated cover letter with job', currentJob.id);

    } catch (error) {
        console.error('ai-persistence: Failed to associate cover letter', error);
        throw new Error(`Failed to associate cover letter: ${error.message}`);
    }
}

/**
 * Update resume with tailored changes
 * @param {object} params - Update parameters
 * @param {object} params.currentResume - Current resume object
 * @param {object} params.tailoredResume - Tailored resume data
 * @param {object} params.currentJob - Current job object
 * @param {Function} params.setState - Function to update store state
 * @returns {void}
 */
export function applyTailoredChanges(params) {
    const { currentResume, tailoredResume, currentJob, setState } = params;

    if (!currentResume) {
        throw new Error('No current resume to update');
    }

    if (!tailoredResume) {
        throw new Error('No tailored resume data provided');
    }

    try {
        setState({
            currentResume: {
                ...currentResume,
                data: tailoredResume,
                content: tailoredResume,
                lastModified: new Date().toISOString(),
                metadata: {
                    ...currentResume.metadata,
                    tailoredFor: currentJob?.id,
                    lastTailored: new Date().toISOString()
                }
            }
        }, 'ai-persistence-apply-changes');

        console.log('ai-persistence: Applied tailored changes to resume');

    } catch (error) {
        console.error('ai-persistence: Failed to apply tailored changes', error);
        throw new Error(`Failed to apply changes: ${error.message}`);
    }
}

/**
 * Get AI operation history for a job
 * @param {string} jobId - Job ID
 * @param {Function} getState - Function to get state from store
 * @returns {Array} Array of AI operation log entries
 */
export function getJobAIHistory(jobId, getState) {
    try {
        const logs = getState('logs') || [];
        return logs.filter(log =>
            log.type === 'ai_action' &&
            log.details?.jobId === jobId
        );
    } catch (error) {
        console.error('ai-persistence: Failed to get job AI history', error);
        return [];
    }
}

/**
 * Get AI operation history for a resume
 * @param {string} resumeId - Resume ID
 * @param {Function} getState - Function to get state from store
 * @returns {Array} Array of AI operation log entries
 */
export function getResumeAIHistory(resumeId, getState) {
    try {
        const logs = getState('logs') || [];
        return logs.filter(log =>
            log.type === 'ai_action' &&
            log.details?.resumeId === resumeId
        );
    } catch (error) {
        console.error('ai-persistence: Failed to get resume AI history', error);
        return [];
    }
}

/**
 * Get all cover letters for a job
 * @param {string} jobId - Job ID
 * @param {Function} getState - Function to get state from store
 * @returns {Array} Array of cover letter entries
 */
export function getJobCoverLetters(jobId, getState) {
    try {
        const coverLetters = getState('coverLetters') || [];
        return coverLetters.filter(cl => cl.jobId === jobId);
    } catch (error) {
        console.error('ai-persistence: Failed to get job cover letters', error);
        return [];
    }
}

/**
 * Delete AI operation from history
 * @param {string} logId - Log entry ID
 * @param {Function} getState - Function to get state from store
 * @param {Function} setState - Function to update store state
 * @returns {boolean} True if deleted successfully
 */
export function deleteAIHistoryEntry(logId, getState, setState) {
    try {
        const logs = getState('logs') || [];
        const filtered = logs.filter(log => log.id !== logId);

        setState({
            logs: filtered
        }, 'ai-persistence-delete-history');

        console.log('ai-persistence: Deleted history entry', logId);
        return true;

    } catch (error) {
        console.error('ai-persistence: Failed to delete history entry', error);
        return false;
    }
}

// ID Generation Helpers

/**
 * Generate unique resume ID
 * @returns {string} Unique resume ID
 */
function generateResumeId() {
    return 'resume_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/**
 * Generate unique cover letter ID
 * @returns {string} Unique cover letter ID
 */
function generateCoverLetterId() {
    return 'cover_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/**
 * Generate unique log ID
 * @returns {string} Unique log ID
 */
function generateLogId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/**
 * Generate resume name based on job
 * @param {object} job - Job object
 * @returns {string} Generated resume name
 */
function generateResumeName(job) {
    const jobTitle = job?.title || job?.position || 'Tailored Resume';
    const date = new Date().toLocaleDateString();
    return `${jobTitle} - ${date}`;
}
