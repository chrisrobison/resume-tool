// API Settings Component - Migrated to ComponentBase
// Manages API keys and settings for AI service providers
// Note: API keys are stored with basic obfuscation. For production use,
// consider server-side storage with proper encryption.

import { ComponentBase } from '../js/component-base.js';

class ApiSettings extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Component-specific properties
        this._selectedService = 'claude';

        // Storage key version for migration
        this._storageVersion = 'v2';
        
        // Bind methods for external access
        this.saveApiKey = this.saveApiKey.bind(this);
        this.testApiKey = this.testApiKey.bind(this);
        this.showStatus = this.showStatus.bind(this);
        this.setSelectedService = this.setSelectedService.bind(this);
        this.getApiKey = this.getApiKey.bind(this);
        this.setApiKey = this.setApiKey.bind(this);
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('ApiSettings: Initializing API settings');
        
        // Load initial API keys data
        await this.loadApiKeys();
        
        // Render the component
        this.render();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Handle data changes
     * Called when setData() is used - API keys data
     */
    onDataChange(newData, previousData, source) {
        console.log('ApiSettings: API keys data changed from', source);
        
        // Update internal API keys when data changes
        if (newData && typeof newData === 'object') {
            // Merge with existing data or use new data if valid
            this._data = { ...newData };
        }
        
        // Re-render when data changes
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Handle component refresh
     * Called when refresh() is used
     */
    async onRefresh(force = false) {
        console.log('ApiSettings: Refreshing API settings');
        
        // Reload API keys if forced or if no data
        if (force || !this.getData()) {
            await this.loadApiKeys();
        }
        
        // Re-render the component
        this.render();
    }

    /**
     * Component validation
     * Validate API keys and settings
     */
    onValidate() {
        const errors = [];
        const apiKeys = this.getData() || {};
        
        // Validate API key formats if they exist
        if (apiKeys.claude) {
            if (!this.isValidClaudeApiKey(apiKeys.claude)) {
                errors.push('Invalid Claude API key format (should start with sk-ant-)');
            }
        }
        
        if (apiKeys.chatgpt) {
            if (!this.isValidChatGptApiKey(apiKeys.chatgpt)) {
                errors.push('Invalid ChatGPT API key format (should start with sk-)');
            }
        }
        
        // Validate selected service
        const validServices = ['claude', 'chatgpt'];
        if (!validServices.includes(this._selectedService)) {
            errors.push(`Invalid selected service: ${this._selectedService}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Component cleanup
     * Replaces disconnectedCallback()
     */
    onCleanup() {
        console.log('ApiSettings: Cleaning up API settings');
        
        // Clear any timeouts or intervals
        if (this._statusTimeout) {
            clearTimeout(this._statusTimeout);
            this._statusTimeout = null;
        }
        
        // Remove any global event listeners if needed
        this.removeEventListeners();
    }

    /**
     * Encode sensitive data for storage (basic obfuscation)
     * Note: This is not encryption - just obfuscation to prevent casual viewing
     */
    _encodeForStorage(data) {
        try {
            const json = JSON.stringify(data);
            // Simple obfuscation: reverse + base64
            const reversed = json.split('').reverse().join('');
            return btoa(unescape(encodeURIComponent(reversed)));
        } catch {
            return null;
        }
    }

    /**
     * Decode sensitive data from storage
     */
    _decodeFromStorage(encoded) {
        try {
            const reversed = decodeURIComponent(escape(atob(encoded)));
            const json = reversed.split('').reverse().join('');
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    /**
     * Load API keys from localStorage
     */
    async loadApiKeys() {
        try {
            // Try to load v2 (obfuscated) format first
            const savedKeysV2 = localStorage.getItem('resumeApiKeys_v2');
            if (savedKeysV2) {
                const apiKeys = this._decodeFromStorage(savedKeysV2);
                if (apiKeys) {
                    this.setData(apiKeys, 'storage-load');
                    return;
                }
            }

            // Fall back to v1 (plain) format for migration
            const savedKeysV1 = localStorage.getItem('resumeApiKeys');
            if (savedKeysV1) {
                const apiKeys = JSON.parse(savedKeysV1);
                this.setData(apiKeys, 'storage-load');
                // Migrate to v2 format
                this.saveApiKeys();
                // Remove old format after successful migration
                localStorage.removeItem('resumeApiKeys');
                return;
            }

            // No saved keys found
            this.setData({}, 'storage-load');

        } catch (error) {
            this.handleError(error, 'Failed to load API keys');
            this.setData({}, 'fallback');
        }
    }

    /**
     * Save API keys to localStorage with obfuscation
     */
    saveApiKeys() {
        try {
            const apiKeys = this.getData() || {};
            const encoded = this._encodeForStorage(apiKeys);
            if (encoded) {
                localStorage.setItem('resumeApiKeys_v2', encoded);
            }

            // Update global state if available
            this.updateGlobalState({ apiKeys }, 'api-settings-save');

        } catch (error) {
            this.handleError(error, 'Failed to save API keys');
        }
    }

    /**
     * Public API: Get API key for a specific service
     * @param {string} service - Service name (claude, chatgpt)
     * @returns {string} API key or empty string
     */
    getApiKey(service = null) {
        const apiKeys = this.getData() || {};
        const targetService = service || this._selectedService;
        return apiKeys[targetService] || '';
    }

    /**
     * Public API: Set API key for a specific service
     * @param {string} service - Service name
     * @param {string} apiKey - API key to set
     */
    setApiKey(service, apiKey) {
        const apiKeys = { ...(this.getData() || {}) };
        apiKeys[service] = apiKey;
        this.setData(apiKeys, 'external-set');
        this.saveApiKeys();
    }

    /**
     * Public API: Set selected service
     * @param {string} service - Service name
     */
    setSelectedService(service) {
        if (['claude', 'chatgpt'].includes(service)) {
            this._selectedService = service;
            this.render();
        }
    }

    /**
     * Public API: Get selected service
     * @returns {string} Currently selected service
     */
    getSelectedService() {
        return this._selectedService;
    }

    /**
     * Render the component
     */
    render() {
        if (!this.shadowRoot) return;
        
        const apiKeys = this.getData() || {};
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>
            
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
                           value="${apiKeys[this._selectedService] || ''}"
                           placeholder="Enter your API key">
                </div>
                
                <div class="button-group">
                    <button class="btn btn-primary" data-click="saveApiKey">Save API Key</button>
                    <button class="btn btn-secondary" data-click="testCurrentApiKey">Test Key</button>
                    <button class="btn btn-outline" data-click="clearApiKey">Clear Key</button>
                </div>
                
                <div id="status-message" class="status-message" style="display: none;"></div>
                
                <div class="api-info">
                    <h4>API Key Information</h4>
                    <div class="service-info">
                        <div class="info-item">
                            <strong>Claude:</strong> 
                            <span class="key-status ${apiKeys.claude ? 'has-key' : 'no-key'}">
                                ${apiKeys.claude ? 'Key configured' : 'No key set'}
                            </span>
                        </div>
                        <div class="info-item">
                            <strong>ChatGPT:</strong> 
                            <span class="key-status ${apiKeys.chatgpt ? 'has-key' : 'no-key'}">
                                ${apiKeys.chatgpt ? 'Key configured' : 'No key set'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup component event listeners
     */
    setupEventListeners() {
        if (!this.shadowRoot) return;
        
        this.shadowRoot.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.dataset.click) {
                // Handle button clicks
                if (typeof this[target.dataset.click] === 'function') {
                    this[target.dataset.click](e);
                }
            } else if (target.dataset.service) {
                // Handle service tab clicks
                this._selectedService = target.dataset.service;
                this.render();
            }
        });
        
        // Handle input changes
        this.shadowRoot.addEventListener('input', (e) => {
            if (e.target.id === 'api-key') {
                // Optionally save on change or validate
                this.clearStatus();
            }
        });
    }

    /**
     * Remove component event listeners
     */
    removeEventListeners() {
        // Shadow DOM listeners are automatically cleaned up
        // but we can do manual cleanup here if needed
    }

    /**
     * Save API key for selected service
     */
    async saveApiKey() {
        try {
            const apiKeyInput = this.shadowRoot.getElementById('api-key');
            if (!apiKeyInput) {
                this.showStatus('API key input not found', 'error');
                return;
            }
            
            const apiKey = apiKeyInput.value.trim();
            
            if (!apiKey) {
                this.showStatus('Please enter an API key', 'error');
                return;
            }

            // Validate API key format
            if (!this.validateApiKeyFormat(this._selectedService, apiKey)) {
                return; // Error message already shown by validateApiKeyFormat
            }

            // Save the API key
            const apiKeys = { ...(this.getData() || {}) };
            apiKeys[this._selectedService] = apiKey;
            this.setData(apiKeys, 'save-action');
            this.saveApiKeys();
            
            // Test the API key
            try {
                await this.testApiKey(apiKey);
                this.showStatus('API key saved and validated successfully', 'success');
                
                // Emit success event
                this.emitEvent('api-key-saved', {
                    service: this._selectedService,
                    validated: true
                });
                
            } catch (error) {
                this.showStatus(`API key saved but validation failed: ${error.message}`, 'error');
                
                // Emit warning event
                this.emitEvent('api-key-saved', {
                    service: this._selectedService,
                    validated: false,
                    error: error.message
                });
            }
            
        } catch (error) {
            this.handleError(error, 'Failed to save API key');
        }
    }

    /**
     * Test current API key
     */
    async testCurrentApiKey() {
        try {
            const apiKey = this.getApiKey();
            
            if (!apiKey) {
                this.showStatus('No API key set for testing', 'error');
                return;
            }
            
            this.showStatus('Testing API key...', 'info');
            
            await this.testApiKey(apiKey);
            this.showStatus('API key is valid!', 'success');
            
        } catch (error) {
            this.handleError(error, 'API key test failed');
            this.showStatus(`API key test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Clear API key for selected service
     */
    clearApiKey() {
        try {
            const apiKeys = { ...(this.getData() || {}) };
            delete apiKeys[this._selectedService];
            this.setData(apiKeys, 'clear-action');
            this.saveApiKeys();
            
            this.showStatus(`${this._selectedService} API key cleared`, 'info');
            
            // Emit clear event
            this.emitEvent('api-key-cleared', {
                service: this._selectedService
            });
            
        } catch (error) {
            this.handleError(error, 'Failed to clear API key');
        }
    }

    /**
     * Test API key by making a minimal request
     * @param {string} apiKey - API key to test
     */
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
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Invalid Claude API key');
            }
        } else if (this._selectedService === 'chatgpt') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Invalid ChatGPT API key');
            }
        } else {
            throw new Error(`Unsupported service: ${this._selectedService}`);
        }
    }

    /**
     * Validate API key format for a service
     * @param {string} service - Service name
     * @param {string} apiKey - API key to validate
     * @returns {boolean} True if valid format
     */
    validateApiKeyFormat(service, apiKey) {
        if (service === 'claude' && !this.isValidClaudeApiKey(apiKey)) {
            this.showStatus('Invalid Claude API key format (should start with sk-ant-)', 'error');
            return false;
        } else if (service === 'chatgpt' && !this.isValidChatGptApiKey(apiKey)) {
            this.showStatus('Invalid ChatGPT API key format (should start with sk-)', 'error');
            return false;
        }
        return true;
    }

    /**
     * Check if Claude API key has valid format
     * @param {string} apiKey - API key to check
     * @returns {boolean} True if valid format
     */
    isValidClaudeApiKey(apiKey) {
        return typeof apiKey === 'string' && apiKey.startsWith('sk-ant-');
    }

    /**
     * Check if ChatGPT API key has valid format
     * @param {string} apiKey - API key to check
     * @returns {boolean} True if valid format
     */
    isValidChatGptApiKey(apiKey) {
        return typeof apiKey === 'string' && apiKey.startsWith('sk-');
    }

    /**
     * Show status message
     * @param {string} message - Message to show
     * @param {string} type - Message type (success, error, info)
     */
    showStatus(message, type) {
        const statusElement = this.shadowRoot?.getElementById('status-message');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = 'block';
        
        // Clear any existing timeout
        if (this._statusTimeout) {
            clearTimeout(this._statusTimeout);
        }
        
        // Hide the message after 3 seconds
        this._statusTimeout = setTimeout(() => {
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        }, 3000);
    }

    /**
     * Clear status message
     */
    clearStatus() {
        const statusElement = this.shadowRoot?.getElementById('status-message');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
        
        if (this._statusTimeout) {
            clearTimeout(this._statusTimeout);
            this._statusTimeout = null;
        }
    }

    /**
     * Get component styles
     */
    getStyles() {
        return `
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
            
            h2 {
                margin: 0 0 20px 0;
                color: #333;
                font-size: 24px;
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
                background: white;
            }
            
            .service-tab:hover {
                background: #f8f9fa;
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
            
            .button-group {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
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
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #545b62;
            }
            
            .btn-outline {
                background: white;
                color: #dc3545;
                border: 1px solid #dc3545;
            }
            
            .btn-outline:hover {
                background: #dc3545;
                color: white;
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
                border: 1px solid #c3e6cb;
            }
            
            .status-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .status-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .api-info {
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            .api-info h4 {
                margin: 0 0 15px 0;
                color: #495057;
                font-size: 16px;
            }
            
            .service-info {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .key-status {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 500;
            }
            
            .key-status.has-key {
                background: #d4edda;
                color: #155724;
            }
            
            .key-status.no-key {
                background: #f8d7da;
                color: #721c24;
            }
            
            @media (max-width: 768px) {
                .service-tabs {
                    flex-direction: column;
                }
                
                .button-group {
                    flex-direction: column;
                }
                
                .info-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 5px;
                }
            }
        `;
    }
}

// Register the migrated component
customElements.define('api-settings', ApiSettings);

export { ApiSettings };