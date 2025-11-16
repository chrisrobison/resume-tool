// Settings Manager Component - Migrated to ComponentBase
// Handles all application settings including API providers, themes, and preferences

import { ComponentBase } from '../js/component-base.js';
import aiService from '../js/ai-service.js';

class SettingsManager extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component-specific properties
        this._activeTab = 'api';
        this._testingProvider = null;
        
        // Bind methods that need 'this' context
        this.handleApiTest = this.handleApiTest.bind(this);
        this.handleFileImport = this.handleFileImport.bind(this);
        this.handleTabSwitch = this.handleTabSwitch.bind(this);
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('SettingsManager: Initializing');
        
        // Load initial settings data
        await this.loadSettings();
        
        // Render the component
        this.render();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup file input listener with delay (as in original)
        setTimeout(() => {
            this.setupFileInputListener();
        }, 100);
    }

    /**
     * Handle data changes
     * Called when setData() is used
     */
    onDataChange(newData, previousData, source) {
        console.log('SettingsManager: Data changed from', source);
        
        // Update internal settings when data changes
        if (newData && typeof newData === 'object') {
            const defaultSettings = this.getDefaultSettings();
            this._data = this.mergeSettings(defaultSettings, newData);
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
        console.log('SettingsManager: Refreshing');
        
        // Reload settings if forced or if no data
        if (force || !this.getData()) {
            await this.loadSettings();
        }
        
        // Re-render the component
        this.render();
    }

    /**
     * Component validation
     * Override to add settings-specific validation logic
     */
    onValidate() {
        const errors = [];
        const settings = this.getData();
        
        if (!settings) {
            errors.push('No settings data available');
            return { valid: false, errors };
        }
        
        // Validate API providers
        if (settings.apiProviders) {
            Object.entries(settings.apiProviders).forEach(([provider, config]) => {
                // Browser LLM does not require an API key
                if (provider === 'browser') return;
                if (config.enabled && !config.apiKey) {
                    errors.push(`${provider} is enabled but missing API key`);
                }
            });
        }
        
        // Validate preferences
        if (settings.preferences) {
            const validThemes = ['light', 'dark', 'auto'];
            if (settings.preferences.theme && !validThemes.includes(settings.preferences.theme)) {
                errors.push('Invalid theme selected');
            }
            
            const validProviders = ['claude', 'openai', 'browser'];
            if (settings.preferences.defaultProvider && !validProviders.includes(settings.preferences.defaultProvider)) {
                errors.push('Invalid default provider selected');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Handle global store changes
     * Called when store state changes
     */
    handleStoreChange(event) {
        try {
            const payload = event && (event.detail?.newState || event.detail || event) || null;
            if (!payload) return;

            if (payload.settings) {
                // Merge and set data so component re-renders with latest settings
                const defaultSettings = this.getDefaultSettings();
                const merged = this.mergeSettings(defaultSettings, payload.settings);
                this.setData(merged, 'global-store-sync');
                return;
            }

            // Fallback: if source mentions settings, reload explicitly
            if (event.detail?.source && typeof event.detail.source === 'string' && event.detail.source.toLowerCase().includes('settings')) {
                this.loadSettings();
            }
        } catch (e) {
            console.warn('SettingsManager: Error handling store change', e);
        }
    }

    /**
     * Component cleanup
     * Replaces disconnectedCallback()
     */
    onCleanup() {
        console.log('SettingsManager: Cleaning up');
        
        // Cancel any ongoing API tests
        this._testingProvider = null;
        
        // Remove any global event listeners if needed
        this.removeEventListeners();
    }

    /**
     * Load settings from global store
     */
    async loadSettings() {
        try {
            const storedSettings = this.getGlobalState('settings');
            const defaultSettings = this.getDefaultSettings();
            
            // Deep merge stored settings with defaults
            const mergedSettings = this.mergeSettings(defaultSettings, storedSettings);
            
            // Set the data using ComponentBase method
            this.setData(mergedSettings, 'store-load');
            
        } catch (error) {
            this.handleError(error, 'Failed to load settings');
            
            // Fallback to default settings
            this.setData(this.getDefaultSettings(), 'default-fallback');
        }
    }

    /**
     * Save settings to global store
     */
    saveSettings() {
        try {
            const settings = this.getData();
            if (settings) {
                this.updateGlobalState({ settings }, 'settings-manager-save');
                this.showToast('Settings saved successfully', 'success');
            }
        } catch (error) {
            this.handleError(error, 'Failed to save settings');
        }
    }

    /**
     * Deep merge settings objects
     */
    mergeSettings(defaults, stored) {
        if (!stored || typeof stored !== 'object') {
            return defaults;
        }
        
        const merged = { ...defaults };
        
        // Merge each top-level section
        Object.keys(defaults).forEach(key => {
            if (stored[key] && typeof stored[key] === 'object' && typeof defaults[key] === 'object') {
                merged[key] = { ...defaults[key], ...stored[key] };
            } else if (stored[key] !== undefined) {
                merged[key] = stored[key];
            }
        });
        
        return merged;
    }

    /**
     * Get default settings structure
     */
    getDefaultSettings() {
        return {
            apiProviders: {
                claude: {
                    apiKey: '',
                    model: 'claude-3-5-sonnet-20241022',
                    route: 'auto',
                    enabled: false
                },
                openai: {
                    apiKey: '',
                    model: 'gpt-4o',
                    route: 'auto',
                    enabled: false
                },
                browser: {
                    apiKey: '',
                    model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
                    route: 'browser',
                    enabled: false
                }
            },
            preferences: {
                theme: 'light',
                defaultProvider: 'claude',
                providerPriority: ['claude', 'openai', 'browser'],
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

    /**
     * Render the component
     */
    render() {
        if (!this.shadowRoot) return;
        
        const settings = this.getData();
        if (!settings) {
            this.shadowRoot.innerHTML = '<div>Loading settings...</div>';
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>
            
            <div class="settings-container">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <p>Configure your job hunt manager preferences and AI providers</p>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-btn ${this._activeTab === 'api' ? 'active' : ''}" data-tab="api">
                        AI Providers
                    </button>
                    <button class="tab-btn ${this._activeTab === 'preferences' ? 'active' : ''}" data-tab="preferences">
                        Preferences
                    </button>
                    <button class="tab-btn ${this._activeTab === 'resume' ? 'active' : ''}" data-tab="resume">
                        Resume
                    </button>
                    <button class="tab-btn ${this._activeTab === 'privacy' ? 'active' : ''}" data-tab="privacy">
                        Privacy
                    </button>
                    <button class="tab-btn ${this._activeTab === 'import-export' ? 'active' : ''}" data-tab="import-export">
                        Import/Export
                    </button>
                </div>
                
                <div class="settings-content">
                    ${this.renderActiveTab(settings)}
                </div>
                
                <div class="settings-footer">
                    <div class="settings-actions">
                        <button class="btn btn-secondary" id="reset-settings">Reset to Defaults</button>
                        <button class="btn btn-primary" id="save-settings">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render the currently active tab
     */
    renderActiveTab(settings) {
        switch (this._activeTab) {
            case 'api':
                return this.renderApiTab(settings);
            case 'preferences':
                return this.renderPreferencesTab(settings);
            case 'resume':
                return this.renderResumeTab(settings);
            case 'privacy':
                return this.renderPrivacyTab(settings);
            case 'import-export':
                return this.renderImportExportTab(settings);
            default:
                return '<div>Invalid tab selected</div>';
        }
    }

    /**
     * Render API providers tab
     */
    renderApiTab(settings) {
        const providers = settings.apiProviders || {};
        const providerPriority = settings.preferences?.providerPriority || ['claude', 'openai', 'browser'];

        return `
            <div class="tab-panel">
                <div class="setting-group">
                    <h3>AI Service Providers</h3>
                    <p>Configure your AI service providers for resume tailoring, cover letter generation, and match analysis.</p>

                    ${this.renderApiProvider('claude', 'Claude (Anthropic)', providers.claude)}
                    ${this.renderApiProvider('openai', 'OpenAI (GPT-5)', providers.openai)}
                    ${this.renderApiProvider('browser', 'Browser LLM (Local)', providers.browser)}
                </div>

                <div class="setting-group">
                    <h3>Provider Priority</h3>
                    <p>When a provider fails, the system will automatically try the next one in this order. Use arrows to reorder.</p>
                    <div class="provider-priority-list">
                        ${providerPriority.map((providerKey, index) => this.renderProviderPriorityItem(providerKey, index, providerPriority.length, providers)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a single provider priority item
     */
    renderProviderPriorityItem(providerKey, index, totalCount, providers) {
        const providerNames = {
            claude: 'Claude (Anthropic)',
            openai: 'OpenAI',
            browser: 'Browser LLM (Local)'
        };

        const name = providerNames[providerKey] || providerKey;
        const isEnabled = providers[providerKey]?.enabled || false;
        const hasApiKey = providerKey === 'browser' || (providers[providerKey]?.apiKey && providers[providerKey].apiKey.length > 0);

        return `
            <div class="provider-priority-item ${!isEnabled ? 'disabled' : ''}" data-provider="${providerKey}">
                <div class="priority-number">${index + 1}</div>
                <div class="priority-info">
                    <div class="priority-name">${name}</div>
                    <div class="priority-status">
                        ${isEnabled ? '<span class="status-badge enabled">Enabled</span>' : '<span class="status-badge disabled">Disabled</span>'}
                        ${isEnabled && !hasApiKey ? '<span class="status-badge warning">No API Key</span>' : ''}
                    </div>
                </div>
                <div class="priority-controls">
                    <button class="arrow-btn" data-action="move-up" data-provider="${providerKey}" ${index === 0 ? 'disabled' : ''}>
                        ↑
                    </button>
                    <button class="arrow-btn" data-action="move-down" data-provider="${providerKey}" ${index === totalCount - 1 ? 'disabled' : ''}>
                        ↓
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render individual API provider
     */
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
                        ${key === 'browser' ? `
                        <label>Browser LLM</label>
                        <div class="help-text">Uses a local WebLLM runtime (no API key required)</div>
                        ` : `
                        <label for="${key}-api-key">API Key</label>
                        <input type="password" id="${key}-api-key" value="${config.apiKey || ''}" 
                               placeholder="Enter your ${name} API key" data-provider="${key}" data-field="apiKey">
                        `}
                    </div>
                    <div class="form-group">
                        <label for="${key}-model">Model</label>
                        <select id="${key}-model" data-provider="${key}" data-field="model">
                            ${this.renderModelOptions(key, config.model)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="${key}-route">Connection Route</label>
                        <select id="${key}-route" data-provider="${key}" data-field="route">
                            <option value="auto" ${(!config.route || config.route === 'auto') ? 'selected' : ''}>Auto (try direct, fallback to proxy)</option>
                            <option value="direct" ${config.route === 'direct' ? 'selected' : ''}>Direct (connect from browser)</option>
                            <option value="proxy" ${config.route === 'proxy' ? 'selected' : ''}>Server Proxy (send to ai-proxy)</option>
                        </select>
                    </div>
                </div>
                
                    <div>
                    <button class="btn btn-primary" data-test-provider="${key}" ${isTesting ? 'disabled' : ''}>
                        ${isTesting ? '<span class="spinner"></span>' : ''} Test Connection
                    </button>
                </div>
                
                <div id="${key}-test-result"></div>
            </div>
        `;
    }

    /**
     * Render model options for provider
     */
    renderModelOptions(provider, selectedModel) {
        const models = {
            claude: [
                { value: 'claude-opus-4-20250514', label: 'Claude 4 Opus (Preview)' },
                { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
                { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Latest)' },
                { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
                { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
                { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
            ],
            openai: [
                { value: 'gpt-5', label: 'GPT-5 (Latest)' },
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                { value: 'o1-preview', label: 'o1 Preview' },
                { value: 'o1-mini', label: 'o1 Mini' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
            ]
            ,
            browser: [
                { value: 'local-ggml', label: 'Local ggml model (custom)' },
                { value: 'llama2-7b', label: 'LLaMA 2 - 7B (HF)' },
                { value: 'vicuna-13b', label: 'Vicuna - 13B (HF)' }
            ]
        };
        
        return (models[provider] || []).map(model => 
            `<option value="${model.value}" ${selectedModel === model.value ? 'selected' : ''}>${model.label}</option>`
        ).join('');
    }

    /**
     * Render preferences tab (simplified for now)
     */
    renderPreferencesTab(settings) {
        const prefs = settings.preferences || {};
        
        return `
            <div class="tab-panel">
                <div class="setting-group">
                    <h3>User Interface</h3>
                    <div class="form-group">
                        <label for="theme-select">Theme</label>
                        <select id="theme-select">
                            <option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="auto" ${prefs.theme === 'auto' ? 'selected' : ''}>Auto</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-save" ${prefs.autoSave ? 'checked' : ''}>
                            Auto-save changes
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="show-progress" ${prefs.showProgressDetails ? 'checked' : ''}>
                            Show detailed progress information
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render resume tab (simplified for now)
     */
    renderResumeTab(settings) {
        const resume = settings.resume || {};
        
        return `
            <div class="tab-panel">
                <div class="setting-group">
                    <h3>Resume Settings</h3>
                    <div class="form-group">
                        <label for="default-template">Default Template</label>
                        <select id="default-template">
                            <option value="basic" ${resume.defaultTemplate === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="modern" ${resume.defaultTemplate === 'modern' ? 'selected' : ''}>Modern</option>
                            <option value="compact" ${resume.defaultTemplate === 'compact' ? 'selected' : ''}>Compact</option>
                            <option value="elegant" ${resume.defaultTemplate === 'elegant' ? 'selected' : ''}>Elegant</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-backup" ${resume.autoBackup ? 'checked' : ''}>
                            Automatically backup resumes
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render privacy tab (simplified for now)
     */
    renderPrivacyTab(settings) {
        const privacy = settings.privacy || {};
        
        return `
            <div class="tab-panel">
                <div class="setting-group">
                    <h3>Privacy Settings</h3>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="save-api-keys" ${privacy.saveApiKeys ? 'checked' : ''}>
                            Save API keys locally
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="log-api-calls" ${privacy.logApiCalls ? 'checked' : ''}>
                            Log API calls for debugging
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render import/export tab (simplified for now)
     */
    renderImportExportTab(settings) {
        return `
            <div class="tab-panel">
                <div class="setting-group">
                    <h3>Import/Export Settings</h3>
                    <div class="form-group">
                        <button class="btn btn-secondary" id="export-settings">Export Settings</button>
                        <button class="btn btn-secondary" id="import-settings">Import Settings</button>
                        <input type="file" id="import-file" accept=".json" style="display: none;">
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
        
        // Tab switching
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.handleTabSwitch(e.target.dataset.tab);
            }
        });
        
        // Settings save/reset
        const saveBtn = this.shadowRoot.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveSettings());
        }
        
        const resetBtn = this.shadowRoot.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetSettings());
        }
        
        // API provider toggles and tests
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.dataset.testProvider) {
                this.handleApiTest(e.target.dataset.testProvider);
            }
        });

        // Provider priority reordering
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'move-up' || e.target.dataset.action === 'move-down') {
                this.handleProviderReorder(e.target.dataset.action, e.target.dataset.provider);
            }
        });

        // Form field changes
        this.shadowRoot.addEventListener('change', (e) => {
            this.handleFieldChange(e);
        });

        // Toggle switches
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.dataset.toggle) {
                this.handleToggleSwitch(e);
            }
        });
    }

    /**
     * Setup file input listener with delay
     */
    setupFileInputListener() {
        const fileInput = this.shadowRoot?.getElementById('import-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileImport);
        }
    }

    /**
     * Remove component event listeners
     */
    removeEventListeners() {
        // Shadow DOM listeners are automatically cleaned up
        // but we can do manual cleanup here if needed
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabName) {
        if (this._activeTab !== tabName) {
            this._activeTab = tabName;
            this.render();
        }
    }

    /**
     * Handle save settings
     */
    handleSaveSettings() {
        // Ensure we capture current form values even if fields haven't blurred
        this.applyFormValuesToSettings();
        const validation = this.validate();
        if (!validation.valid) {
            this.showToast(`Validation failed: ${validation.errors.join(', ')}`, 'error');
            return;
        }
        
        this.saveSettings();
    }

    /**
     * Handle reset settings
     */
    handleResetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            this.setData(this.getDefaultSettings(), 'reset');
            this.saveSettings();
            this.showToast('Settings reset to defaults', 'info');
        }
    }

    /**
     * Handle field changes
     */
    handleFieldChange(e) {
        const settings = { ...this.getData() };
        const target = e.target;

        // Track if this is a critical field that should auto-save
        let shouldAutoSave = false;

        // Update settings based on field
        if (target.dataset.provider && target.dataset.field) {
            // API provider field
            const provider = target.dataset.provider;
            const field = target.dataset.field;
            if (!settings.apiProviders[provider]) {
                settings.apiProviders[provider] = {};
            }
            settings.apiProviders[provider][field] = target.value;

            // Auto-save for critical fields: route, model, apiKey
            if (field === 'route' || field === 'model' || field === 'apiKey') {
                shouldAutoSave = true;
            }
        } else {
            // Other settings fields
            const fieldMap = {
                'default-provider': 'preferences.defaultProvider',
                'theme-select': 'preferences.theme',
                'auto-save': 'preferences.autoSave',
                'show-progress': 'preferences.showProgressDetails',
                'default-template': 'resume.defaultTemplate',
                'auto-backup': 'resume.autoBackup',
                'save-api-keys': 'privacy.saveApiKeys',
                'log-api-calls': 'privacy.logApiCalls'
            };

            const path = fieldMap[target.id];
            if (path) {
                const keys = path.split('.');
                let obj = settings;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!obj[keys[i]]) obj[keys[i]] = {};
                    obj = obj[keys[i]];
                }
                obj[keys[keys.length - 1]] = target.type === 'checkbox' ? target.checked : target.value;
            }
        }

        this.setData(settings, 'field-change');

        // Auto-save critical fields immediately
        if (shouldAutoSave) {
            this.saveSettings();
            console.log(`SettingsManager: Auto-saved ${target.dataset.field} for ${target.dataset.provider}`);
        }
    }

    /**
     * Handle toggle switches
     */
    handleToggleSwitch(e) {
        const provider = e.target.dataset.provider;
        const field = e.target.dataset.toggle;
        
        if (provider && field) {
            const settings = { ...this.getData() };
            if (!settings.apiProviders[provider]) {
                settings.apiProviders[provider] = {};
            }
            settings.apiProviders[provider][field] = !settings.apiProviders[provider][field];
            this.setData(settings, 'toggle-change');
            // Persist immediately so users see it saved
            this.saveSettings();
        }
    }

    /**
     * Handle provider priority reordering
     */
    handleProviderReorder(action, providerKey) {
        const settings = { ...this.getData() };
        const providerPriority = settings.preferences?.providerPriority || ['claude', 'openai', 'browser'];

        const currentIndex = providerPriority.indexOf(providerKey);
        if (currentIndex === -1) return; // Provider not found

        let newIndex = currentIndex;
        if (action === 'move-up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (action === 'move-down' && currentIndex < providerPriority.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return; // Can't move (already at boundary)
        }

        // Swap positions
        const newPriority = [...providerPriority];
        [newPriority[currentIndex], newPriority[newIndex]] = [newPriority[newIndex], newPriority[currentIndex]];

        // Update settings
        if (!settings.preferences) settings.preferences = {};
        settings.preferences.providerPriority = newPriority;

        this.setData(settings, 'provider-reorder');
        this.render(); // Re-render to show new order
    }

    /**
     * Read current form values from the DOM and apply to settings
     */
    applyFormValuesToSettings() {
        if (!this.shadowRoot) return;
        const settings = { ...(this.getData() || this.getDefaultSettings()) };
        if (!settings.apiProviders) settings.apiProviders = {};

        const providers = ['claude', 'openai'];
        providers.forEach((key) => {
            const apiKeyEl = this.shadowRoot.getElementById(`${key}-api-key`);
            const modelEl = this.shadowRoot.getElementById(`${key}-model`);
            const routeEl = this.shadowRoot.getElementById(`${key}-route`);
            const toggleEl = this.shadowRoot.querySelector(`.toggle-switch[data-provider="${key}"]`);

            if (!settings.apiProviders[key]) settings.apiProviders[key] = {};
            const cfg = settings.apiProviders[key];
            if (apiKeyEl) cfg.apiKey = apiKeyEl.value || '';
            if (modelEl) cfg.model = modelEl.value || cfg.model || '';
            if (routeEl) cfg.route = routeEl.value || cfg.route || 'auto';
            if (toggleEl) cfg.enabled = toggleEl.classList.contains('active');
        });

        // Default provider and other preferences
        const defaultProviderEl = this.shadowRoot.getElementById('default-provider');
        if (!settings.preferences) settings.preferences = {};
        if (defaultProviderEl) settings.preferences.defaultProvider = defaultProviderEl.value;

        this.setData(settings, 'form-sync');
    }

    /**
     * Handle API test
     */
    async handleApiTest(provider) {
        try {
            this._testingProvider = provider;
            this.render(); // Update UI to show testing state
            
            const settings = this.getData();
            const config = settings.apiProviders[provider];
            
            if (!config.apiKey) {
                throw new Error('API key is required');
            }
            
            // Test the API connection
            const result = await aiService.testConnection(provider, config.apiKey, config.model);
            
            if (result.success) {
                this.showToast(`${provider} connection successful!`, 'success');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
            
        } catch (error) {
            this.handleError(error, `Failed to test ${provider} connection`);
        } finally {
            this._testingProvider = null;
            this.render(); // Update UI to hide testing state
        }
    }

    /**
     * Handle file import
     */
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedSettings = JSON.parse(event.target.result);
                const defaultSettings = this.getDefaultSettings();
                const mergedSettings = this.mergeSettings(defaultSettings, importedSettings);
                
                this.setData(mergedSettings, 'import');
                this.saveSettings();
                this.showToast('Settings imported successfully', 'success');
                
            } catch (error) {
                this.handleError(error, 'Failed to import settings');
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Get component styles
     */
    getStyles() {
        return `
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
                background: none;
                border: none;
                padding: 15px 20px;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                font-size: 14px;
                color: #666;
                transition: all 0.2s;
            }
            
            .tab-btn:hover {
                color: #007bff;
                background: rgba(0,123,255,0.1);
            }
            
            .tab-btn.active {
                color: #007bff;
                border-bottom-color: #007bff;
                background: white;
            }
            
            .settings-content {
                padding: 20px;
            }
            
            .setting-group {
                margin-bottom: 30px;
            }
            
            .setting-group h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #555;
            }
            
            .form-group input,
            .form-group select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .form-group input[type="checkbox"] {
                width: auto;
                margin-right: 8px;
            }
            
            .api-provider {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                background: #f9f9f9;
            }
            
            .api-provider.enabled {
                border-color: #28a745;
                background: #f8fff9;
            }
            
            .api-provider .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .api-provider h4 {
                margin: 0;
                color: #333;
            }
            
            .provider-status {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                margin-left: 10px;
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
            
            .toggle-switch {
                width: 50px;
                height: 24px;
                background: #ccc;
                border-radius: 12px;
                position: relative;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .toggle-switch.active {
                background: #007bff;
            }
            
            .toggle-switch::after {
                content: '';
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: transform 0.2s;
            }
            
            .toggle-switch.active::after {
                transform: translateX(26px);
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
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
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .settings-footer {
                border-top: 1px solid #dee2e6;
                padding: 20px;
                background: #f8f9fa;
            }
            
            .settings-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .spinner {
                display: inline-block;
                width: 12px;
                height: 12px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s ease-in-out infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Provider Priority List Styles */
            .provider-priority-list {
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                background: white;
            }

            .provider-priority-item {
                display: flex;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.2s;
            }

            .provider-priority-item:last-child {
                border-bottom: none;
            }

            .provider-priority-item.disabled {
                opacity: 0.6;
            }

            .priority-number {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 16px;
                margin-right: 15px;
                flex-shrink: 0;
            }

            .priority-info {
                flex: 1;
            }

            .priority-name {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }

            .priority-status {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .status-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
            }

            .status-badge.enabled {
                background: #d4edda;
                color: #155724;
            }

            .status-badge.disabled {
                background: #f8d7da;
                color: #721c24;
            }

            .status-badge.warning {
                background: #fff3cd;
                color: #856404;
            }

            .priority-controls {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .arrow-btn {
                width: 32px;
                height: 32px;
                border: 1px solid #007bff;
                background: white;
                color: #007bff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .arrow-btn:hover:not(:disabled) {
                background: #007bff;
                color: white;
            }

            .arrow-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                border-color: #ccc;
                color: #ccc;
            }
        `;
    }
}

// Register the migrated component
customElements.define('settings-manager', SettingsManager);

export { SettingsManager };
