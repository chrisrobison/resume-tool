// Resume Analytics Web Component
import aiService from '../js/ai-service.js';
import { getState } from '../js/store.js';

class ResumeAnalytics extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._resumeData = null;
        this._jobDescription = null;
        this._analysis = null;
    }

    connectedCallback() {
        this.render();
        // Wire AI analyze button if present
        this._boundAnalyzeClick = this.handleAnalyzeWithAI.bind(this);
        this.shadowRoot.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('#ai-analyze-btn');
            if (btn) this._boundAnalyzeClick();
        });
    }

    set resumeData(data) {
        this._resumeData = data;
        try {
            this.analyzeResume();
        } catch (e) {
            console.error('ResumeAnalytics: analyzeResume threw', e);
            // Ensure _analysis is set to prevent "Load a resume" fallback
            this._analysis = this._analysis || { score: 0, sections: { basics: { score:0, issues:[] }, work: { score:0, issues:[] }, education: { score:0, issues:[] }, skills: { score:0, issues:[] } }, issues: [] };
        }
        this.render();
    }

    set jobDescription(description) {
        this._jobDescription = description;
        try {
            this.analyzeResume();
        } catch (e) {
            console.error('ResumeAnalytics: analyzeResume threw during jobDescription set', e);
            this._analysis = this._analysis || { score: 0, sections: { basics: { score:0, issues:[] }, work: { score:0, issues:[] }, education: { score:0, issues:[] }, skills: { score:0, issues:[] } }, issues: [] };
        }
        this.render();
    }

    analyzeResume() {
        if (!this._resumeData) return;

        const analysis = {
            score: 0,
            issues: [],
            suggestions: [],
            keywordMatch: {
                found: [],
                missing: []
            },
            sections: {
                basics: { score: 0, issues: [] },
                work: { score: 0, issues: [] },
                education: { score: 0, issues: [] },
                skills: { score: 0, issues: [] }
            }
        };
        try {
            // Analyze basic information
            try { this.analyzeBasics(analysis); } catch (e) { console.error('analyzeBasics failed', e); }

            // Analyze work experience
            try { this.analyzeWorkExperience(analysis); } catch (e) { console.error('analyzeWorkExperience failed', e); }

            // Analyze education
            try { this.analyzeEducation(analysis); } catch (e) { console.error('analyzeEducation failed', e); }

            // Analyze skills
            try { this.analyzeSkills(analysis); } catch (e) { console.error('analyzeSkills failed', e); }

            // Calculate overall score
            analysis.score = Math.round(
                (analysis.sections.basics.score +
                analysis.sections.work.score +
                analysis.sections.education.score +
                analysis.sections.skills.score) / 4
            );

        } catch (e) {
            console.error('ResumeAnalytics: analyzeResume encountered an error', e);
        } finally {
            // Ensure we always set _analysis so render() will display the summary
            this._analysis = analysis;
        }
    }

    analyzeBasics(analysis) {
        const basics = this._resumeData.basics || {};
        const section = analysis.sections.basics;
        
        // Check required fields
        const requiredFields = ['name', 'email', 'phone', 'summary'];
        requiredFields.forEach(field => {
            if (!basics[field]) {
                section.issues.push(`Missing ${field}`);
            } else {
                section.score += 25;
            }
        });

        // Check summary length
        if (basics.summary) {
            const summaryLength = basics.summary.length;
            if (summaryLength < 50) {
                section.issues.push('Summary is too short (should be at least 50 characters)');
            } else if (summaryLength > 500) {
                section.issues.push('Summary is too long (should be under 500 characters)');
            } else {
                section.score += 25;
            }
        }

        // Check location completeness
        if (basics.location) {
            const locationFields = ['city', 'region', 'countryCode'];
            const filledFields = locationFields.filter(field => basics.location[field]);
            if (filledFields.length === locationFields.length) {
                section.score += 25;
            } else {
                section.issues.push('Incomplete location information');
            }
        }

        // Check social profiles
        if (basics.profiles && basics.profiles.length > 0) {
            section.score += 25;
        } else {
            section.issues.push('No social profiles added');
        }
    }

    analyzeWorkExperience(analysis) {
        const work = this._resumeData.work || [];
        const section = analysis.sections.work;

        if (work.length === 0) {
            section.issues.push('No work experience entries');
            return;
        }

        // Check each work entry
        work.forEach((job, index) => {
            const requiredFields = ['company', 'position', 'startDate'];
            const missingFields = requiredFields.filter(field => !job[field]);
            
            if (missingFields.length > 0) {
                section.issues.push(`Job #${index + 1} missing: ${missingFields.join(', ')}`);
            } else {
                section.score += 25;
            }

            // Check description
            if (!job.summary) {
                section.issues.push(`Job #${index + 1} missing description`);
            } else if (job.summary.length < 50) {
                section.issues.push(`Job #${index + 1} description is too short`);
            } else {
                section.score += 25;
            }

            // Check highlights
            if (!job.highlights || job.highlights.length === 0) {
                section.issues.push(`Job #${index + 1} missing achievements/highlights`);
            } else {
                section.score += 25;
            }

            // Check dates
            if (!job.endDate && !job.current) {
                section.issues.push(`Job #${index + 1} missing end date or current status`);
            } else {
                section.score += 25;
            }
        });

        // Normalize score based on number of entries
        section.score = Math.min(100, section.score);
    }

    analyzeEducation(analysis) {
        const education = this._resumeData.education || [];
        const section = analysis.sections.education;

        if (education.length === 0) {
            section.issues.push('No education entries');
            return;
        }

        // Check each education entry
        education.forEach((edu, index) => {
            const requiredFields = ['institution', 'studyType', 'area', 'startDate'];
            const missingFields = requiredFields.filter(field => !edu[field]);
            
            if (missingFields.length > 0) {
                section.issues.push(`Education #${index + 1} missing: ${missingFields.join(', ')}`);
            } else {
                section.score += 25;
            }

            // Check dates
            if (!edu.endDate && !edu.current) {
                section.issues.push(`Education #${index + 1} missing end date or current status`);
            } else {
                section.score += 25;
            }

            // Check score/GPA if provided
            if (edu.score) {
                section.score += 25;
            }

            // Check URL if provided
            if (edu.url) {
                section.score += 25;
            }
        });

        // Normalize score based on number of entries
        section.score = Math.min(100, section.score);
    }

    analyzeSkills(analysis) {
        const skills = this._resumeData.skills || [];
        const section = analysis.sections.skills;

        if (skills.length === 0) {
            section.issues.push('No skills listed');
            return;
        }

        // Check each skill group
        skills.forEach((skill, index) => {
            if (!skill.name) {
                section.issues.push(`Skill group #${index + 1} missing name`);
            } else {
                section.score += 25;
            }

            if (!skill.keywords || skill.keywords.length === 0) {
                section.issues.push(`Skill group #${index + 1} missing keywords`);
            } else {
                section.score += 25;
            }

            if (skill.level) {
                section.score += 25;
            }

            if (skill.keywords && skill.keywords.length >= 3) {
                section.score += 25;
            }
        });

        // Check for job description keyword matches if available
        if (this._jobDescription) {
            const jobKeywords = this.extractKeywords(this._jobDescription);
            const resumeKeywords = this.extractKeywords(JSON.stringify(this._resumeData));
            
            jobKeywords.forEach(keyword => {
                if (resumeKeywords.includes(keyword)) {
                    analysis.keywordMatch.found.push(keyword);
                } else {
                    analysis.keywordMatch.missing.push(keyword);
                }
            });
        }

        // Normalize score based on number of entries
        section.score = Math.min(100, section.score);
    }

    extractKeywords(text) {
        // Convert to lowercase and remove special characters
        const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        
        // Split into words and remove common words
        const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'from']);
        const words = cleanText.split(/\s+/).filter(word => 
            word.length > 3 && !commonWords.has(word)
        );
        
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Return top keywords (words that appear more than once)
        return Object.entries(wordCount)
            .filter(([_, count]) => count > 1)
            .map(([word]) => word);
    }

    hasApiKey() {
        try {
            // Prefer new settings store
            const settings = getState('settings');
            const providers = settings?.apiProviders || {};
            if (providers?.openai?.apiKey || providers?.claude?.apiKey) return true;
        } catch (e) { /* ignore */ }
        // Fallback to legacy localStorage keys
        return !!(localStorage.getItem('openai_api_key') || localStorage.getItem('claude_api_key') || localStorage.getItem('api_key'));
    }

    async handleAnalyzeWithAI() {
        if (!this._resumeData) return;
        if (!this.hasApiKey()) {
            alert('No API key configured. Please set your API key in Settings.');
            return;
        }

        // Determine provider and key from settings/localStorage
        let provider = null;
        let apiKey = null;
        try {
            const settings = getState('settings');
            const providers = settings?.apiProviders || {};
            if (providers?.openai?.apiKey) {
                provider = 'openai'; apiKey = providers.openai.apiKey;
            } else if (providers?.claude?.apiKey) {
                provider = 'claude'; apiKey = providers.claude.apiKey;
            }
        } catch (e) { /* ignore */ }
        if (!apiKey) {
            apiKey = localStorage.getItem('openai_api_key') || localStorage.getItem('claude_api_key') || localStorage.getItem('api_key');
            if (localStorage.getItem('openai_api_key')) provider = 'openai';
            else if (localStorage.getItem('claude_api_key')) provider = 'claude';
        }

        this._analysisAI = null;
        try {
            // Provide minimal progress feedback by updating a temporary section
            this._aiProgressMessage = 'Sending resume to AI for analysis...';
            this.render();

            const result = await aiService.analyzeMatch({
                resume: this._resumeData,
                jobDescription: this._jobDescription || '',
                provider,
                apiKey,
                onProgress: (m) => {
                    this._aiProgressMessage = m;
                    try { this.render(); } catch (e) {}
                }
            });

            // Store AI result and render
            this._analysisAI = result || { result };
        } catch (err) {
            console.error('ResumeAnalytics: AI analysis failed', err);
            this._analysisAI = { error: err.message || String(err) };
        } finally {
            this._aiProgressMessage = null;
            this.render();
        }
    }

    render() {
        const styles = `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #333;
            }
            
            * {
                box-sizing: border-box;
            }
            
            .analytics-container {
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .score-container {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .score-circle {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                font-weight: bold;
                color: white;
                position: relative;
            }
            
            .score-label {
                margin-top: 10px;
                font-size: 1.2rem;
                color: #666;
            }
            
            .section {
                margin-bottom: 30px;
            }
            
            .section-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 15px;
                color: #333;
            }
            
            .issue-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .issue-item {
                padding: 10px;
                margin-bottom: 5px;
                background: #f8f9fa;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .issue-item i {
                color: #dc3545;
            }
            
            .keyword-match {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }
            
            .keyword-group {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
            }
            
            .keyword-group h4 {
                margin: 0 0 10px 0;
                color: #495057;
            }
            
            .keyword-list {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
            
            .keyword-tag {
                background: #e9ecef;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 0.9rem;
                color: #495057;
            }
            
            .keyword-tag.found {
                background: #d4edda;
                color: #155724;
            }
            
            .keyword-tag.missing {
                background: #f8d7da;
                color: #721c24;
            }
        `;

        if (!this._analysis) {
            return this.shadowRoot.innerHTML = `
                <style>${styles}</style>
                <div class="analytics-container">
                    <p>Load a resume to see analytics</p>
                </div>
            `;
        }

        const getScoreColor = (score) => {
            if (score >= 80) return '#28a745';
            if (score >= 60) return '#ffc107';
            return '#dc3545';
        };

        const html = `
            <div class="analytics-container">
                <div class="score-container">
                    <div class="score-circle" style="background: ${getScoreColor(this._analysis.score)}">
                        ${this._analysis.score}%
                    </div>
                    <div class="score-label">ATS Compatibility Score</div>
                </div>

                <div class="section">
                    <h3 class="section-title">Basic Information</h3>
                    <div class="score-circle" style="background: ${getScoreColor(this._analysis.sections.basics.score)}">
                        ${this._analysis.sections.basics.score}%
                    </div>
                    <ul class="issue-list">
                        ${this._analysis.sections.basics.issues.map(issue => `
                            <li class="issue-item">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                ${issue}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="section">
                    <h3 class="section-title">Work Experience</h3>
                    <div class="score-circle" style="background: ${getScoreColor(this._analysis.sections.work.score)}">
                        ${this._analysis.sections.work.score}%
                    </div>
                    <ul class="issue-list">
                        ${this._analysis.sections.work.issues.map(issue => `
                            <li class="issue-item">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                ${issue}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="section">
                    <h3 class="section-title">Education</h3>
                    <div class="score-circle" style="background: ${getScoreColor(this._analysis.sections.education.score)}">
                        ${this._analysis.sections.education.score}%
                    </div>
                    <ul class="issue-list">
                        ${this._analysis.sections.education.issues.map(issue => `
                            <li class="issue-item">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                ${issue}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="section">
                    <h3 class="section-title">Skills</h3>
                    <div class="score-circle" style="background: ${getScoreColor(this._analysis.sections.skills.score)}">
                        ${this._analysis.sections.skills.score}%
                    </div>
                    <ul class="issue-list">
                        ${this._analysis.sections.skills.issues.map(issue => `
                            <li class="issue-item">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                ${issue}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                ${this._jobDescription ? `
                    <div class="section">
                        <h3 class="section-title">Keyword Analysis</h3>
                        <div class="keyword-match">
                            <div class="keyword-group">
                                <h4>Matching Keywords</h4>
                                <div class="keyword-list">
                                    ${this._analysis.keywordMatch.found.map(keyword => `
                                        <span class="keyword-tag found">${keyword}</span>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="keyword-group">
                                <h4>Missing Keywords</h4>
                                <div class="keyword-list">
                                    ${this._analysis.keywordMatch.missing.map(keyword => `
                                        <span class="keyword-tag missing">${keyword}</span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                <div style="margin-top: 20px; text-align:center;">
                    <button id="ai-analyze-btn" class="btn btn-primary" ${this.hasApiKey() ? '' : 'disabled'}>
                        <i class="fas fa-robot"></i> Analyze with AI
                    </button>
                </div>

                ${this._analysisAI ? `
                    <div class="section">
                        <h3 class="section-title">AI Recommendations</h3>
                        <pre style="white-space:pre-wrap; background:#f8f9fa; padding:10px; border-radius:4px;">${JSON.stringify(this._analysisAI, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;

        this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
    }
}

customElements.define('resume-analytics', ResumeAnalytics); 
