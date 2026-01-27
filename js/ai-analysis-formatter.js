/**
 * AI Analysis Formatter Service
 * Handles formatting and display of AI analysis results
 */

/**
 * Get score class for styling based on score value
 * @param {number} score - Score value (0-100)
 * @returns {string} CSS class name for score styling
 */
export function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
}

/**
 * Render match analysis summary
 * @param {object} analysis - Analysis object with match data
 * @returns {string} HTML string for match analysis summary
 */
export function renderMatchAnalysisSummary(analysis) {
    if (!analysis) return '';

    return `
        <div class="analysis-section">
            <h5>📊 Match Analysis Summary</h5>
            <div class="analysis-grid">
                ${analysis.strengths?.length > 0 ? `
                    <div class="analysis-item">
                        <h6>💪 Key Strengths</h6>
                        <ul>
                            ${analysis.strengths.slice(0, 3).map(strength => `<li>${escapeHtml(strength)}</li>`).join('')}
                            ${analysis.strengths.length > 3 ? `<li><em>+${analysis.strengths.length - 3} more</em></li>` : ''}
                        </ul>
                    </div>
                ` : ''}

                ${analysis.improvements?.length > 0 || analysis.missingSkills?.length > 0 ? `
                    <div class="analysis-item">
                        <h6>🎯 Areas for Improvement</h6>
                        <ul>
                            ${(analysis.improvements || []).slice(0, 2).map(improvement => `<li>${escapeHtml(improvement)}</li>`).join('')}
                            ${(analysis.missingSkills || []).slice(0, 2).map(skill => `<li>Missing: ${escapeHtml(skill)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render detailed analysis
 * @param {object} analysis - Analysis object with detailed match data
 * @returns {string} HTML string for detailed analysis
 */
export function renderDetailedAnalysis(analysis) {
    if (!analysis) return '';

    return `
        <div class="analysis-section">
            <h5>📋 Detailed Analysis</h5>
            <div class="analysis-grid">
                ${analysis.skillsMatch ? `
                    <div class="analysis-item">
                        <h6>🛠️ Skills Analysis</h6>
                        ${analysis.skillsMatch.matchedSkills?.length > 0 ? `
                            <p style="font-size: 12px; margin: 5px 0; color: #28a745;"><strong>Matched:</strong> ${escapeHtml(analysis.skillsMatch.matchedSkills.slice(0, 3).join(', '))}</p>
                        ` : ''}
                        ${analysis.skillsMatch.missingSkills?.length > 0 ? `
                            <p style="font-size: 12px; margin: 5px 0; color: #dc3545;"><strong>Missing:</strong> ${escapeHtml(analysis.skillsMatch.missingSkills.slice(0, 3).join(', '))}</p>
                        ` : ''}
                    </div>
                ` : ''}

                ${analysis.experienceMatch ? `
                    <div class="analysis-item">
                        <h6>💼 Experience Analysis</h6>
                        ${analysis.experienceMatch.relevantExperience?.length > 0 ? `
                            <ul>
                                ${analysis.experienceMatch.relevantExperience.slice(0, 2).map(exp => `<li>${escapeHtml(exp)}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${analysis.experienceMatch.gaps?.length > 0 ? `
                            <p style="font-size: 12px; margin: 5px 0; color: #ffc107;"><strong>Gaps:</strong> ${escapeHtml(analysis.experienceMatch.gaps.slice(0, 2).join(', '))}</p>
                        ` : ''}
                    </div>
                ` : ''}

                ${analysis.recommendations?.length > 0 ? `
                    <div class="analysis-item" style="grid-column: 1 / -1;">
                        <h6>💡 Recommendations</h6>
                        <ul>
                            ${analysis.recommendations.slice(0, 4).map(rec => `<li>${escapeHtml(rec)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${analysis.concerns?.length > 0 ? `
                    <div class="analysis-item" style="grid-column: 1 / -1;">
                        <h6>⚠️ Potential Concerns</h6>
                        <ul>
                            ${analysis.concerns.slice(0, 3).map(concern => `<li>${escapeHtml(concern)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Format AI operation result for display
 * @param {object} result - Result object from AI operation
 * @returns {object} Formatted result with title, summary, and content
 */
export function formatOperationResult(result) {
    if (!result || !result.type) {
        return null;
    }

    const formatted = {
        type: result.type,
        title: '',
        summary: {},
        content: '',
        actions: []
    };

    if (result.type === 'tailor-resume') {
        const analysis = result.data.result.analysis;
        formatted.title = '✨ Resume Tailored Successfully';
        formatted.summary = {
            changes: result.data.result.changes?.length || 0,
            matchScore: analysis?.matchScore
        };
        formatted.content = [
            analysis ? renderMatchAnalysisSummary(analysis) : '',
            result.data.result.changes?.length > 0 ? renderChangesList(result.data.result.changes) : ''
        ].filter(Boolean).join('');
        formatted.actions = ['view-details', 'save-result', 'apply-changes'];

    } else if (result.type === 'cover-letter') {
        const analysis = result.data.result.analysis;
        formatted.title = '📝 Cover Letter Generated';
        formatted.summary = {
            length: result.data.result.coverLetter?.length || 0,
            matchScore: analysis?.matchScore
        };
        formatted.content = [
            analysis ? renderMatchAnalysisSummary(analysis) : '',
            result.data.result.keyPoints?.length > 0 ? renderKeyPoints(result.data.result.keyPoints) : ''
        ].filter(Boolean).join('');
        formatted.actions = ['view-details', 'save-result', 'save-cover-letter'];

    } else if (result.type === 'match-analysis') {
        const analysis = result.data.result.analysis;
        formatted.title = '🔍 Match Analysis Complete';
        formatted.summary = {
            overallScore: analysis.overallScore,
            skillsScore: analysis.skillsMatch.score,
            experienceScore: analysis.experienceMatch.score
        };
        formatted.content = renderDetailedAnalysis(analysis);
        formatted.actions = ['view-details', 'save-result'];
    }

    return formatted;
}

/**
 * Render changes list
 * @param {Array} changes - Array of change descriptions
 * @returns {string} HTML string for changes preview
 */
function renderChangesList(changes) {
    if (!changes || changes.length === 0) return '';

    return `
        <div class="changes-preview">
            <h5>Key Changes:</h5>
            <ul>
                ${changes.slice(0, 3).map(change => `<li>${escapeHtml(change)}</li>`).join('')}
                ${changes.length > 3 ? `<li><em>+${changes.length - 3} more changes</em></li>` : ''}
            </ul>
        </div>
    `;
}

/**
 * Render key points list
 * @param {Array} keyPoints - Array of key point descriptions
 * @returns {string} HTML string for key points
 */
function renderKeyPoints(keyPoints) {
    if (!keyPoints || keyPoints.length === 0) return '';

    return `
        <div class="key-points">
            <h5>Key Selling Points:</h5>
            <ul>
                ${keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
            </ul>
        </div>
    `;
}

/**
 * Escape HTML for safe display
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp for log display
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string (HH:MM:SS.mmm)
 */
export function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Format score for display with appropriate styling
 * @param {number} score - Score value (0-100)
 * @returns {string} HTML string for formatted score
 */
export function formatScore(score) {
    const scoreClass = getScoreClass(score);
    return `<span class="match-score-${scoreClass}">${score}%</span>`;
}
