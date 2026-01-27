/**
 * AI UI Helpers Service
 * Handles UI rendering and display logic for AI Assistant component
 */

import { getScoreClass, renderMatchAnalysisSummary, renderDetailedAnalysis, formatTime } from './ai-analysis-formatter.js';

/**
 * Escape HTML for safe display
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render current job and resume selection
 * @param {object} currentJob - Current selected job
 * @param {object} currentResume - Current selected resume
 * @param {Array} allJobs - All available jobs
 * @param {Array} allResumes - All available resumes
 * @returns {string} HTML string for current selection display
 */
export function renderCurrentSelection(currentJob, currentResume, allJobs, allResumes) {
    return `
        <div class="selection-item">
            <div class="selection-info">
                <div class="label">Current Job</div>
                <div class="value ${!currentJob ? 'no-selection' : ''}">
                    ${currentJob ?
                        `${escapeHtml(currentJob.title || currentJob.position || 'Untitled')} at ${escapeHtml(currentJob.company || 'Unknown Company')}` :
                        'No job selected'
                    }
                </div>
            </div>
            <div class="selection-actions">
                <button class="selection-btn" id="select-job" ${allJobs.length === 0 ? 'disabled' : ''}>
                    ${currentJob ? 'Change' : 'Select'} Job
                </button>
            </div>
        </div>

        <div class="selection-item">
            <div class="selection-info">
                <div class="label">Current Resume</div>
                <div class="value ${!currentResume ? 'no-selection' : ''}">
                    ${currentResume ?
                        `${escapeHtml(currentResume.name || 'Untitled Resume')}${currentResume.data?.basics?.name ? ` (${escapeHtml(currentResume.data.basics.name)})` : ''}` :
                        'No resume selected'
                    }
                </div>
            </div>
            <div class="selection-actions">
                <button class="selection-btn" id="select-resume" ${allResumes.length === 0 ? 'disabled' : ''}>
                    ${currentResume ? 'Change' : 'Select'} Resume
                </button>
            </div>
        </div>

        ${allJobs.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create jobs in the Jobs section first</p>' : ''}
        ${allResumes.length === 0 ? '<p style="margin: 10px 0; color: #dc3545; font-size: 12px;"><i class="fas fa-info-circle"></i> Create resumes in the Resumes section first</p>' : ''}
    `;
}

/**
 * Render requirements status
 * @param {object} currentJob - Current selected job
 * @param {object} currentResume - Current selected resume
 * @param {boolean} hasApiKey - Whether valid API key is configured
 * @returns {string} HTML string for requirements status
 */
export function renderRequirements(currentJob, currentResume, hasApiKey) {
    const hasJob = !!currentJob;
    const hasResume = !!currentResume;
    const hasJobDescription = hasJob && (currentJob.description || currentJob.jobDetails);

    return `
        <div class="requirement-item">
            <div class="requirement-status ${hasJob ? 'valid' : 'invalid'}">
                ${hasJob ? '✓' : '✗'}
            </div>
            Job selected
        </div>
        <div class="requirement-item">
            <div class="requirement-status ${hasJobDescription ? 'valid' : 'invalid'}">
                ${hasJobDescription ? '✓' : '✗'}
            </div>
            Job description provided
        </div>
        <div class="requirement-item">
            <div class="requirement-status ${hasResume ? 'valid' : 'invalid'}">
                ${hasResume ? '✓' : '✗'}
            </div>
            Resume selected
        </div>
        <div class="requirement-item">
            <div class="requirement-status ${hasApiKey ? 'valid' : 'invalid'}">
                ${hasApiKey ? '✓' : '✗'}
            </div>
            AI API key configured
        </div>
    `;
}

/**
 * Render progress indicator
 * @param {string} currentProgress - Current progress message
 * @returns {string} HTML string for progress indicator
 */
export function renderProgress(currentProgress) {
    return `
        <div class="progress">
            <div class="progress-message">${escapeHtml(currentProgress)}</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        </div>
    `;
}

/**
 * Render progress log (interactive console)
 * @param {Array} progressLog - Array of {timestamp, message} objects
 * @returns {string} HTML string for progress log
 */
export function renderProgressLog(progressLog) {
    const hasMessages = progressLog.length > 0;

    return `
        <div class="progress-log ${hasMessages ? '' : 'empty'}">
            <div class="progress-log-header">
                <h4>AI Activity Log</h4>
                <div class="progress-log-controls">
                    ${hasMessages ? `
                        <button class="btn-small" id="clear-log" title="Clear log">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="progress-log-messages">
                ${hasMessages ?
                    progressLog.map(entry => {
                        const time = formatTime(entry.timestamp);
                        return `
                            <div class="log-entry">
                                <span class="log-time">${time}</span>
                                <span class="log-message">${escapeHtml(entry.message)}</span>
                            </div>
                        `;
                    }).join('')
                    :
                    `<div class="log-empty">No activity yet. Start an AI operation to see progress here.</div>`
                }
            </div>
        </div>
    `;
}

/**
 * Render AI operation result
 * @param {object} result - Result object from AI operation
 * @returns {string} HTML string for result display
 */
export function renderResult(result) {
    if (!result) return '';

    let content = '';

    if (result.type === 'tailor-resume') {
        const analysis = result.data.result.analysis;
        content = `
            <h4>✨ Resume Tailored Successfully</h4>
            <div class="result-summary">
                <div class="result-stat">
                    <span class="stat-label">Changes Made:</span>
                    <span class="stat-value">${result.data.result.changes?.length || 0}</span>
                </div>
                ${analysis ? `
                    <div class="result-stat">
                        <span class="stat-label">Match Score:</span>
                        <span class="stat-value match-score-${getScoreClass(analysis.matchScore)}">${analysis.matchScore}%</span>
                    </div>
                ` : ''}
            </div>
            ${analysis ? renderMatchAnalysisSummary(analysis) : ''}
            ${result.data.result.changes?.length > 0 ? `
                <div class="changes-preview">
                    <h5>Key Changes:</h5>
                    <ul>
                        ${result.data.result.changes.slice(0, 3).map(change => `<li>${escapeHtml(change)}</li>`).join('')}
                        ${result.data.result.changes.length > 3 ? `<li><em>+${result.data.result.changes.length - 3} more changes</em></li>` : ''}
                    </ul>
                </div>
            ` : ''}
        `;
    } else if (result.type === 'cover-letter') {
        const analysis = result.data.result.analysis;
        content = `
            <h4>📝 Cover Letter Generated</h4>
            <div class="result-summary">
                <div class="result-stat">
                    <span class="stat-label">Length:</span>
                    <span class="stat-value">${result.data.result.coverLetter?.length || 0} characters</span>
                </div>
                ${analysis ? `
                    <div class="result-stat">
                        <span class="stat-label">Match Score:</span>
                        <span class="stat-value match-score-${getScoreClass(analysis.matchScore)}">${analysis.matchScore}%</span>
                    </div>
                ` : ''}
            </div>
            ${analysis ? renderMatchAnalysisSummary(analysis) : ''}
            ${result.data.result.keyPoints?.length > 0 ? `
                <div class="key-points">
                    <h5>Key Selling Points:</h5>
                    <ul>
                        ${result.data.result.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    } else if (result.type === 'match-analysis') {
        const analysis = result.data.result.analysis;
        content = `
            <h4>🔍 Match Analysis Complete</h4>
            <div class="result-summary">
                <div class="result-stat">
                    <span class="stat-label">Overall Score:</span>
                    <span class="stat-value match-score-${getScoreClass(analysis.overallScore)}">${analysis.overallScore}%</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Skills Match:</span>
                    <span class="stat-value match-score-${getScoreClass(analysis.skillsMatch.score)}">${analysis.skillsMatch.score}%</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Experience Match:</span>
                    <span class="stat-value match-score-${getScoreClass(analysis.experienceMatch.score)}">${analysis.experienceMatch.score}%</span>
                </div>
            </div>
            ${renderDetailedAnalysis(analysis)}
        `;
    }

    return `
        <div class="result">
            ${content}
            <div class="result-actions">
                <button class="result-btn" id="view-details">View Full Details</button>
                <button class="result-btn" id="save-result">Save to History</button>
                ${result.type === 'tailor-resume' ? '<button class="result-btn" id="apply-changes">Apply Changes</button>' : ''}
                ${result.type === 'cover-letter' ? '<button class="result-btn" id="save-cover-letter">Save Cover Letter</button>' : ''}
            </div>
        </div>
    `;
}

/**
 * Populate job selection modal
 * @param {HTMLElement} listElement - List element to populate
 * @param {Array} jobs - Available jobs
 * @param {string} currentJobId - ID of currently selected job
 * @param {Function} onSelect - Callback when job is selected
 */
export function populateJobSelectionModal(listElement, jobs, currentJobId, onSelect) {
    if (jobs.length === 0) {
        listElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No jobs available. Create jobs in the Jobs section first.</div>';
        return;
    }

    listElement.innerHTML = jobs.map(job => `
        <div class="selection-list-item ${currentJobId === job.id ? 'selected' : ''}"
             data-job-id="${job.id}">
            <div class="title">${escapeHtml(job.title || job.position || 'Untitled Job')}</div>
            <div class="subtitle">${escapeHtml(job.company || 'Unknown Company')}${job.location ? ` • ${escapeHtml(job.location)}` : ''}</div>
        </div>
    `).join('');

    // Add click handler
    listElement.addEventListener('click', (e) => {
        const item = e.target.closest('.selection-list-item');
        if (item) {
            const jobId = item.dataset.jobId;
            const job = jobs.find(j => j.id === jobId);
            if (job && onSelect) {
                onSelect(job);
            }
        }
    });
}

/**
 * Populate resume selection modal
 * @param {HTMLElement} listElement - List element to populate
 * @param {Array} resumes - Available resumes
 * @param {string} currentResumeId - ID of currently selected resume
 * @param {Function} onSelect - Callback when resume is selected
 */
export function populateResumeSelectionModal(listElement, resumes, currentResumeId, onSelect) {
    if (resumes.length === 0) {
        listElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No resumes available. Create resumes in the Resumes section first.</div>';
        return;
    }

    listElement.innerHTML = resumes.map(resume => `
        <div class="selection-list-item ${currentResumeId === resume.id ? 'selected' : ''}"
             data-resume-id="${resume.id}">
            <div class="title">${escapeHtml(resume.name || 'Untitled Resume')}</div>
            <div class="subtitle">${escapeHtml(resume.data?.basics?.name || 'No name set')}${resume.lastModified ? ` • Updated ${new Date(resume.lastModified).toLocaleDateString()}` : ''}</div>
        </div>
    `).join('');

    // Add click handler
    listElement.addEventListener('click', (e) => {
        const item = e.target.closest('.selection-list-item');
        if (item) {
            const resumeId = item.dataset.resumeId;
            const resume = resumes.find(r => r.id === resumeId);
            if (resume && onSelect) {
                onSelect(resume);
            }
        }
    });
}

/**
 * Show toast message
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, info)
 */
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const backgrounds = {
        success: '#d4edda',
        error: '#f8d7da',
        info: '#d1ecf1'
    };
    const colors = {
        success: '#155724',
        error: '#721c24',
        info: '#0c5460'
    };
    const borders = {
        success: '#c3e6cb',
        error: '#f5c6cb',
        info: '#bee5eb'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgrounds[type] || backgrounds.success};
        color: ${colors[type] || colors.success};
        padding: 15px 20px;
        border-radius: 6px;
        border: 1px solid ${borders[type] || borders.success};
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Auto-scroll log container to bottom
 * @param {HTMLElement} logContainer - Log messages container element
 */
export function scrollLogToBottom(logContainer) {
    if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}
