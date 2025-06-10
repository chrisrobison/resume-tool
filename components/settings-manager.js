// Settings Manager Component
// Handles all application settings including API providers, themes, and preferences

import { getState, setState, subscribe } from '../js/store.js';
import aiService from '../js/ai-service.js';

class SettingsManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this._settings = null;
        this._activeTab = 'api';
        this._testingProvider = null;
        
        // Bind methods
        this.handleApiTest = this.handleApiTest.bind(this);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.subscribeToStore();
        this.loadSettings();
    }

    subscribeToStore() {
        this._storeUnsubscribe = subscribe((event) => {
            if (event.source.includes('settings') || event.source === 'updateSettings') {
                this.loadSettings();
            }
        });
    }

    disconnectedCallback() {
        if (this._storeUnsubscribe) {
            this._storeUnsubscribe();
        }
    }

    loadSettings() {
        this._settings = getState('settings') || this.getDefaultSettings();
        this.render();
    }

    getDefaultSettings() {
        return {
            apiProviders: {
                claude: {
                    apiKey: '',
                    model: 'claude-3-sonnet-20240229',
                    enabled: false
                },
                openai: {
                    apiKey: '',
                    model: 'gpt-4',
                    enabled: false
                }
            },
            preferences: {
                theme: 'light',
                defaultProvider: 'claude',
                autoSave: true,
                showProgressDetails: true,
                includeAnalysisInRequests: true
            },
            resume: {
                defaultTemplate: 'modern',
                autoBackup: true,
                maxVersions: 10
            },
            privacy: {
                saveApiKeys: true,
                logApiCalls: true,
                shareUsageStats: false
            }
        };
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .settings-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .settings-header {
                    background: #f8f9fa;
                    padding: 20px;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .settings-header h2 {
                    margin: 0;
                    color: #333;
                    font-size: 24px;
                }
                
                .settings-header p {
                    margin: 5px 0 0 0;
                    color: #666;
                    font-size: 14px;
                }
                
                .settings-tabs {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .tab-btn {
                    flex: 1;
                    padding: 15px 20px;
                    border: none;
                    background: transparent;
                    color: #666;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    border-bottom: 3px solid transparent;
                }
                
                .tab-btn:hover {
                    background: #e9ecef;
                    color: #333;
                }
                
                .tab-btn.active {
                    color: #007bff;
                    border-bottom-color: #007bff;
                    background: white;
                }
                
                .settings-content {
                    padding: 30px;
                }
                
                .tab-panel {
                    display: none;
                }
                
                .tab-panel.active {
                    display: block;
                }
                
                .setting-group {
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #eee;
                }
                
                .setting-group:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .setting-group h3 {
                    margin: 0 0 15px 0;
                    color: #333;
                    font-size: 18px;
                }
                
                .setting-group p {
                    margin: 0 0 15px 0;
                    color: #666;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .setting-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 15px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }
                
                .setting-item .label {
                    flex: 1;
                }
                
                .setting-item .label h4 {
                    margin: 0 0 5px 0;
                    color: #333;
                    font-size: 16px;
                }
                
                .setting-item .label span {
                    color: #666;
                    font-size: 12px;
                }
                
                .setting-item .control {
                    margin-left: 20px;
                }
                
                .form-group {
                    margin: 15px 0;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #333;
                    font-size: 14px;
                }
                
                .form-group input, .form-group select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                
                .form-group input[type="password"] {
                    font-family: monospace;
                }
                
                .form-row {
                    display: flex;
                    gap: 15px;
                }
                
                .form-row .form-group {
                    flex: 1;
                }
                
                .toggle-switch {
                    position: relative;
                    width: 50px;
                    height: 24px;
                    background: #ccc;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                
                .toggle-switch.active {
                    background: #007bff;
                }
                
                .toggle-switch::before {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.3s;
                }
                
                .toggle-switch.active::before {
                    transform: translateX(26px);
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    margin: 0 5px;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background: #0056b3;
                }
                
                .btn-success {
                    background: #28a745;
                    color: white;
                }
                
                .btn-danger {
                    background: #dc3545;
                    color: white;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .api-provider {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 15px 0;
                    background: white;
                }
                
                .api-provider.enabled {
                    border-color: #28a745;
                    background: #f8fff9;
                }
                
                .api-provider .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }
                
                .api-provider .header h4 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .provider-status {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .provider-status.enabled {
                    background: #d4edda;
                    color: #155724;
                }
                
                .provider-status.disabled {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .provider-status.testing {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .test-result {
                    margin: 10px 0;
                    padding: 10px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .test-result.success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .test-result.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .actions-bar {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 20px 30px;
                    background: #f8f9fa;
                    border-top: 1px solid #dee2e6;
                }
                
                .spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                    margin-right: 5px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            
            <div class="settings-container">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <p>Configure your job search management preferences</p>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-btn ${this._activeTab === 'api' ? 'active' : ''}" data-tab="api">
                        <i class="fas fa-robot"></i> AI Providers
                    </button>
                    <button class="tab-btn ${this._activeTab === 'preferences' ? 'active' : ''}" data-tab="preferences">
                        <i class="fas fa-cog"></i> Preferences
                    </button>
                    <button class="tab-btn ${this._activeTab === 'resume' ? 'active' : ''}" data-tab="resume">
                        <i class="fas fa-file-alt"></i> Resume
                    </button>
                    <button class="tab-btn ${this._activeTab === 'privacy' ? 'active' : ''}" data-tab="privacy">
                        <i class="fas fa-shield-alt"></i> Privacy
                    </button>
                </div>
                
                <div class="settings-content">
                    ${this.renderTabContent()}
                </div>
                
                <div class="actions-bar">
                    <button class="btn btn-secondary" id="reset-settings">Reset to Defaults</button>
                    <button class="btn btn-primary" id="save-settings">Save Settings</button>
                </div>
            </div>
        `;
    }

    renderTabContent() {
        switch (this._activeTab) {
            case 'api':
                return this.renderApiTab();
            case 'preferences':
                return this.renderPreferencesTab();
            case 'resume':
                return this.renderResumeTab();
            case 'privacy':
                return this.renderPrivacyTab();
            default:
                return '';
        }
    }

    renderApiTab() {
        const providers = this._settings?.apiProviders || {};
        
        return `
            <div class="tab-panel active">
                <div class="setting-group">
                    <h3>AI Provider Configuration</h3>
                    <p>Configure your AI service providers for resume tailoring, cover letter generation, and match analysis.</p>
                    
                    ${this.renderApiProvider('claude', 'Claude (Anthropic)', providers.claude)}
                    ${this.renderApiProvider('openai', 'OpenAI (GPT-4)', providers.openai)}
                </div>
                
                <div class="setting-group">
                    <h3>Default Provider</h3>
                    <div class="form-group">
                        <label for="default-provider">Primary AI Provider</label>
                        <select id="default-provider">
                            <option value="claude" ${this._settings?.preferences?.defaultProvider === 'claude' ? 'selected' : ''}>Claude</option>
                            <option value="openai" ${this._settings?.preferences?.defaultProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    renderApiProvider(key, name, config = {}) {
        const isEnabled = config.enabled || false;
        const isTesting = this._testingProvider === key;
        
        return `
            <div class="api-provider ${isEnabled ? 'enabled' : ''}">
                <div class="header">
                    <h4>
                        ${name}
                        <span class="provider-status ${isTesting ? 'testing' : (isEnabled ? 'enabled' : 'disabled')}">
                            ${isTesting ? 'Testing...' : (isEnabled ? 'Enabled' : 'Disabled')}
                        </span>
                    </h4>
                    <div class="toggle-switch ${isEnabled ? 'active' : ''}" data-provider="${key}" data-toggle="enabled"></div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="${key}-api-key">API Key</label>
                        <input type="password" id="${key}-api-key" value="${config.apiKey || ''}" 
                               placeholder="Enter your ${name} API key" data-provider="${key}" data-field="apiKey">
                    </div>
                    <div class="form-group">
                        <label for="${key}-model">Model</label>
                        <select id="${key}-model" data-provider="${key}" data-field="model">
                            ${this.renderModelOptions(key, config.model)}
                        </select>
                    </div>
                </div>
                
                <div>
                    <button class="btn btn-primary" data-test-provider="${key}" ${!config.apiKey || isTesting ? 'disabled' : ''}>
                        ${isTesting ? '<span class="spinner"></span>' : ''} Test Connection
                    </button>
                </div>
                
                <div id="${key}-test-result"></div>
            </div>
        `;
    }

    renderModelOptions(provider, selectedModel) {
        const models = {
            claude: [
                { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
                { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
            ],
            openai: [
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
            ]
        };
        
        return (models[provider] || []).map(model => 
            `<option value="${model.value}" ${selectedModel === model.value ? 'selected' : ''}>${model.label}</option>`
        ).join('');
    }

    renderPreferencesTab() {
        const prefs = this._settings?.preferences || {};
        
        return `
            <div class="tab-panel active">
                <div class="setting-group">
                    <h3>User Interface</h3>
                    <div class="setting-item">
                        <div class="label">
                            <h4>Theme</h4>
                            <span>Choose your preferred interface theme</span>
                        </div>
                        <div class="control">
                            <select id="theme-select">
                                <option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                <option value="auto" ${prefs.theme === 'auto' ? 'selected' : ''}>Auto</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h3>AI Behavior</h3>
                    <div class="setting-item">
                        <div class="label">
                            <h4>Show Progress Details</h4>
                            <span>Display detailed progress during AI operations</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${prefs.showProgressDetails ? 'active' : ''}" data-setting="showProgressDetails"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="label">
                            <h4>Include Match Analysis</h4>
                            <span>Automatically include job match analysis in AI requests</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${prefs.includeAnalysisInRequests ? 'active' : ''}" data-setting="includeAnalysisInRequests"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="label">
                            <h4>Auto Save</h4>
                            <span>Automatically save changes as you work</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${prefs.autoSave ? 'active' : ''}" data-setting="autoSave"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderResumeTab() {
        const resume = this._settings?.resume || {};
        
        return `
            <div class="tab-panel active">
                <div class="setting-group">
                    <h3>Resume Defaults</h3>
                    <div class="form-group">
                        <label for="default-template">Default Template</label>
                        <select id="default-template">
                            <option value="modern" ${resume.defaultTemplate === 'modern' ? 'selected' : ''}>Modern</option>
                            <option value="classic" ${resume.defaultTemplate === 'classic' ? 'selected' : ''}>Classic</option>
                            <option value="minimal" ${resume.defaultTemplate === 'minimal' ? 'selected' : ''}>Minimal</option>
                        </select>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h3>Version Management</h3>
                    <div class="setting-item">
                        <div class="label">
                            <h4>Auto Backup</h4>
                            <span>Automatically create backups when making changes</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${resume.autoBackup ? 'active' : ''}" data-setting="autoBackup"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="max-versions">Maximum Versions to Keep</label>
                        <select id="max-versions">
                            <option value="5" ${resume.maxVersions === 5 ? 'selected' : ''}>5 versions</option>
                            <option value="10" ${resume.maxVersions === 10 ? 'selected' : ''}>10 versions</option>
                            <option value="20" ${resume.maxVersions === 20 ? 'selected' : ''}>20 versions</option>
                            <option value="50" ${resume.maxVersions === 50 ? 'selected' : ''}>50 versions</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    renderPrivacyTab() {
        const privacy = this._settings?.privacy || {};
        
        return `
            <div class="tab-panel active">
                <div class="setting-group">
                    <h3>Data Storage</h3>
                    <div class="setting-item">
                        <div class="label">
                            <h4>Save API Keys Locally</h4>
                            <span>Store API keys in browser localStorage for convenience</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${privacy.saveApiKeys ? 'active' : ''}" data-setting="saveApiKeys"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="label">
                            <h4>Log API Calls</h4>
                            <span>Keep a local log of AI API interactions</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${privacy.logApiCalls ? 'active' : ''}" data-setting="logApiCalls"></div>
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h3>Analytics</h3>
                    <div class="setting-item">
                        <div class="label">
                            <h4>Share Usage Statistics</h4>
                            <span>Help improve the app by sharing anonymous usage data</span>
                        </div>
                        <div class="control">
                            <div class="toggle-switch ${privacy.shareUsageStats ? 'active' : ''}" data-setting="shareUsageStats"></div>
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h3>Data Management</h3>
                    <p>Manage your local data and privacy settings.</p>
                    <div>
                        <button class="btn btn-secondary" id="export-data">Export All Data</button>
                        <button class="btn btn-danger" id="clear-data">Clear All Data</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            this.handleClick(e);
        });
        
        this.shadowRoot.addEventListener('change', (e) => {
            this.handleChange(e);
        });
    }

    handleClick(e) {
        const target = e.target.closest('[data-tab], [data-toggle], [data-test-provider], [data-setting], button');
        if (!target) return;
        
        // Tab switching
        if (target.dataset.tab) {
            this._activeTab = target.dataset.tab;
            this.render();
            return;
        }
        
        // Toggle switches
        if (target.dataset.toggle || target.dataset.setting) {
            this.handleToggle(target);
            return;
        }
        
        // API testing
        if (target.dataset.testProvider) {
            this.handleApiTest(target.dataset.testProvider);
            return;
        }
        
        // Action buttons
        switch (target.id) {
            case 'save-settings':
                this.saveSettings();
                break;
            case 'reset-settings':
                this.resetSettings();
                break;
            case 'export-data':
                this.exportData();
                break;
            case 'clear-data':
                this.clearData();
                break;
        }
    }

    handleChange(e) {
        const target = e.target;
        
        if (target.dataset.provider && target.dataset.field) {
            this.updateProviderSetting(target.dataset.provider, target.dataset.field, target.value);
        }
    }

    handleToggle(toggle) {
        const isActive = toggle.classList.contains('active');
        toggle.classList.toggle('active');
        
        if (toggle.dataset.toggle === 'enabled' && toggle.dataset.provider) {
            this.updateProviderSetting(toggle.dataset.provider, 'enabled', !isActive);
        } else if (toggle.dataset.setting) {
            this.updatePreferenceSetting(toggle.dataset.setting, !isActive);
        }
    }

    updateProviderSetting(provider, field, value) {
        const updatedSettings = { ...this._settings };
        if (!updatedSettings.apiProviders[provider]) {
            updatedSettings.apiProviders[provider] = {};
        }
        updatedSettings.apiProviders[provider][field] = value;
        this._settings = updatedSettings;
    }

    updatePreferenceSetting(setting, value) {
        const updatedSettings = { ...this._settings };
        
        // Determine which section this setting belongs to
        if (['theme', 'defaultProvider', 'autoSave', 'showProgressDetails', 'includeAnalysisInRequests'].includes(setting)) {
            updatedSettings.preferences[setting] = value;
        } else if (['autoBackup'].includes(setting)) {
            updatedSettings.resume[setting] = value;
        } else if (['saveApiKeys', 'logApiCalls', 'shareUsageStats'].includes(setting)) {
            updatedSettings.privacy[setting] = value;
        }
        
        this._settings = updatedSettings;
    }

    async handleApiTest(provider) {
        this._testingProvider = provider;
        this.render();
        
        const config = this._settings.apiProviders[provider];
        const resultContainer = this.shadowRoot.getElementById(`${provider}-test-result`);
        
        try {
            await aiService.testApiKey({
                provider,
                apiKey: config.apiKey
            });
            
            resultContainer.innerHTML = `
                <div class="test-result success">
                    ✅ Connection successful! API key is valid.
                </div>
            `;
            
            // Mark as enabled if test passes
            this.updateProviderSetting(provider, 'enabled', true);
            
        } catch (error) {
            resultContainer.innerHTML = `
                <div class="test-result error">
                    ❌ Connection failed: ${error.message}
                </div>
            `;
        } finally {
            this._testingProvider = null;
            setTimeout(() => this.render(), 1000);
        }
    }

    saveSettings() {
        setState({
            settings: this._settings
        }, 'settings-manager');
        
        // Show success feedback
        const saveBtn = this.shadowRoot.getElementById('save-settings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            this._settings = this.getDefaultSettings();
            this.render();
        }
    }

    exportData() {
        const data = {
            settings: this._settings,
            jobs: getState('jobs'),
            resumes: getState('resumes'),
            logs: getState('logs'),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-hunt-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    clearData() {
        if (confirm('Are you sure you want to clear ALL data? This will delete all jobs, resumes, and settings. This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }
}

customElements.define('settings-manager', SettingsManager);

export { SettingsManager };