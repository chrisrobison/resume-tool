// API Settings Web Component
class ApiSettings extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._apiKeys = {};
        this._selectedService = 'claude';
    }

    connectedCallback() {
        this.loadApiKeys();
        this.render();
        this.setupEventListeners();
    }

    loadApiKeys() {
        const savedKeys = localStorage.getItem('resumeApiKeys');
        this._apiKeys = savedKeys ? JSON.parse(savedKeys) : {};
    }

    saveApiKeys() {
        localStorage.setItem('resumeApiKeys', JSON.stringify(this._apiKeys));
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
            
            .settings-container {
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .service-selector {
                margin-bottom: 20px;
            }
            
            .service-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .service-tab {
                padding: 10px 20px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .service-tab.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #495057;
            }
            
            input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
            }
            
            input:focus {
                outline: none;
                border-color: #80bdff;
                box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
            }
            
            .status-message {
                margin-top: 10px;
                padding: 10px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .status-success {
                background: #d4edda;
                color: #155724;
            }
            
            .status-error {
                background: #f8d7da;
                color: #721c24;
            }
        `;

        const html = `
            <div class="settings-container">
                <h2>API Settings</h2>
                
                <div class="service-selector">
                    <div class="service-tabs">
                        <div class="service-tab ${this._selectedService === 'claude' ? 'active' : ''}" 
                             data-service="claude">
                            Claude
                        </div>
                        <div class="service-tab ${this._selectedService === 'chatgpt' ? 'active' : ''}" 
                             data-service="chatgpt">
                            ChatGPT
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="api-key">API Key</label>
                    <input type="password" 
                           id="api-key" 
                           value="${this._apiKeys[this._selectedService] || ''}"
                           placeholder="Enter your API key">
                </div>
                
                <button class="btn btn-primary" data-click="saveApiKey">Save API Key</button>
                
                <div id="status-message" class="status-message" style="display: none;"></div>
            </div>
        `;

        this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const tgt = e.target;
            if (tgt.dataset.click) {
                this[tgt.dataset.click](e);
            } else if (tgt.dataset.service) {
                this._selectedService = tgt.dataset.service;
                this.render();
            }
        });
    }

    async saveApiKey() {
        const apiKeyInput = this.shadowRoot.getElementById('api-key');
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showStatus('Please enter an API key', 'error');
            return;
        }

        // Validate API key format
        if (this._selectedService === 'claude' && !apiKey.startsWith('sk-ant-')) {
            this.showStatus('Invalid Claude API key format', 'error');
            return;
        } else if (this._selectedService === 'chatgpt' && !apiKey.startsWith('sk-')) {
            this.showStatus('Invalid ChatGPT API key format', 'error');
            return;
        }

        // Save the API key
        this._apiKeys[this._selectedService] = apiKey;
        this.saveApiKeys();
        
        // Test the API key
        try {
            await this.testApiKey(apiKey);
            this.showStatus('API key saved and validated successfully', 'success');
        } catch (error) {
            this.showStatus(`API key saved but validation failed: ${error.message}`, 'error');
        }
    }

    async testApiKey(apiKey) {
        if (this._selectedService === 'claude') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-opus-4-20250514',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });
            
            if (!response.ok) {
                throw new Error('Invalid Claude API key');
            }
        } else if (this._selectedService === 'chatgpt') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });
            
            if (!response.ok) {
                throw new Error('Invalid ChatGPT API key');
            }
        }
    }

    showStatus(message, type) {
        const statusElement = this.shadowRoot.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = 'block';
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

customElements.define('api-settings', ApiSettings); 