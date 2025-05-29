// AI Assistant Web Component
import { logApiCall } from '../js/jobs.js';

class AIAssistant extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._job = null;
        this._resume = null;
        this._isGenerating = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setJob(job) {
        this._job = job;
        this.render();
    }

    setResume(resume) {
        this._resume = resume;
        this.render();
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
            
            .ai-assistant {
                display: flex;
                flex-direction: column;
                height: 100%;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .ai-header {
                padding: 1rem;
                background: #f8f9fa;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .ai-content {
                flex: 1;
                padding: 1rem;
                overflow-y: auto;
            }
            
            .ai-section {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1rem;
                margin-bottom: 1rem;
            }
            
            .ai-section h3 {
                margin: 0 0 1rem 0;
                font-size: 1.1rem;
                color: #495057;
            }
            
            .btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
                margin-right: 0.5rem;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
            }
            
            .btn-primary:disabled {
                background: #6c757d;
                cursor: not-allowed;
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #545b62;
            }
            
            .generated-content {
                margin-top: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                white-space: pre-wrap;
            }
            
            .loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                color: #6c757d;
            }
            
            .loading i {
                margin-right: 0.5rem;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .error {
                color: #dc3545;
                padding: 1rem;
                background: #ffe3e3;
                border: 1px solid #ffa8a8;
                border-radius: 4px;
                margin-top: 1rem;
            }
            
            .success {
                color: #2b8a3e;
                padding: 1rem;
                background: #d3f9d8;
                border: 1px solid #b2f2bb;
                border-radius: 4px;
                margin-top: 1rem;
            }
            
            .api-settings {
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
        `;

        const html = `
            <div class="ai-assistant">
                <div class="assistant-header">
                    <h2>AI Assistant</h2>
                    <div class="service-selector">
                        <select id="ai-service">
                            <option value="claude">Claude</option>
                            <option value="chatgpt">ChatGPT</option>
                        </select>
                    </div>
                </div>
                
                <div class="api-settings">
                    <api-settings></api-settings>
                </div>
                
                <div class="ai-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;

        this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
    }

    renderContent() {
        if (!this._job) {
            return `
                <div class="ai-section">
                    <p>Select a job to get started with AI assistance.</p>
                </div>
            `;
        }

        if (!this._resume) {
            return `
                <div class="ai-section">
                    <p>Please create or select a resume to get started with AI assistance.</p>
                </div>
            `;
        }

        if (this._isGenerating) {
            return `
                <div class="loading">
                    <i class="fa-solid fa-spinner"></i>
                    <span>Generating content...</span>
                </div>
            `;
        }

        return `
            <div class="ai-section">
                <h3>Resume Optimization</h3>
                <p>Optimize your resume for this specific job posting.</p>
                <button class="btn btn-primary" data-click="handleOptimizeResume">
                    Optimize Resume
                </button>
            </div>
            
            <div class="ai-section">
                <h3>Cover Letter Generation</h3>
                <p>Generate a tailored cover letter for this position.</p>
                <button class="btn btn-primary" data-click="handleGenerateCoverLetter">
                    Generate Cover Letter
                </button>
            </div>
            
            <div class="ai-section">
                <h3>Interview Preparation</h3>
                <p>Get AI-generated interview questions and preparation tips.</p>
                <button class="btn btn-primary" data-click="handleGenerateInterviewPrep">
                    Generate Interview Prep
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const tgt = e.target;
            if (tgt.dataset.click) {
                this[tgt.dataset.click](e);
            }
        });

        const serviceSelector = this.shadowRoot.getElementById('ai-service');
        if (serviceSelector) {
            serviceSelector.value = localStorage.getItem('selectedAIService') || 'claude';
            serviceSelector.addEventListener('change', (e) => {
                localStorage.setItem('selectedAIService', e.target.value);
            });
        }
    }

    async handleOptimizeResume(e) {
        if (!this._job || !this._resume || this._isGenerating) return;
        
        this._isGenerating = true;
        this.render();
        
        try {
            const prompt = `Optimize the following resume for this job posting:
                Job Title: ${this._job.title}
                Company: ${this._job.company}
                Description: ${this._job.description}
                
                Resume: ${JSON.stringify(this._resume)}`;
            
            const response = await this.callAI(prompt);
            this.showGeneratedContent('Resume Optimization', response);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this._isGenerating = false;
            this.render();
        }
    }

    async handleGenerateCoverLetter(e) {
        if (!this._job || !this._resume || this._isGenerating) return;
        
        this._isGenerating = true;
        this.render();
        
        try {
            const prompt = `Generate a cover letter for this job posting using the following resume:
                Job Title: ${this._job.title}
                Company: ${this._job.company}
                Description: ${this._job.description}
                
                Resume: ${JSON.stringify(this._resume)}`;
            
            const response = await this.callAI(prompt);
            this.showGeneratedContent('Cover Letter', response);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this._isGenerating = false;
            this.render();
        }
    }

    async handleGenerateInterviewPrep(e) {
        if (!this._job || !this._resume || this._isGenerating) return;
        
        this._isGenerating = true;
        this.render();
        
        try {
            const prompt = `Generate interview preparation questions and tips for this job posting:
                Job Title: ${this._job.title}
                Company: ${this._job.company}
                Description: ${this._job.description}
                
                Resume: ${JSON.stringify(this._resume)}`;
            
            const response = await this.callAI(prompt);
            this.showGeneratedContent('Interview Preparation', response);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this._isGenerating = false;
            this.render();
        }
    }

    async callAI(prompt, options = {}) {
        const apiKeys = JSON.parse(localStorage.getItem('resumeApiKeys') || '{}');
        const selectedService = localStorage.getItem('selectedAIService') || 'claude';
        const apiKey = apiKeys[selectedService];

        if (!apiKey) {
            throw new Error(`No API key found for ${selectedService}. Please configure your API settings.`);
        }

        const response = await fetch('/api/tailor-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                apiType: selectedService,
                apiKey,
                ...options
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get AI response');
        }

        return await response.json();
    }

    showGeneratedContent(title, content) {
        const section = document.createElement('div');
        section.className = 'ai-section';
        section.innerHTML = `
            <h3>${title}</h3>
            <div class="generated-content">${content}</div>
            <button class="btn btn-secondary" data-click="handleCopyContent">Copy to Clipboard</button>
        `;
        
        this.shadowRoot.querySelector('.ai-content').appendChild(section);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = message;
        
        this.shadowRoot.querySelector('.ai-content').appendChild(error);
    }

    handleCopyContent(e) {
        const content = e.target.previousElementSibling.textContent;
        navigator.clipboard.writeText(content).then(() => {
            const success = document.createElement('div');
            success.className = 'success';
            success.textContent = 'Content copied to clipboard!';
            
            e.target.parentElement.appendChild(success);
            setTimeout(() => success.remove(), 3000);
        });
    }
}

customElements.define('ai-assistant', AIAssistant); 