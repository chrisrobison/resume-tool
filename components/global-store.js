// Global Store Component - Migrated to ComponentBase
// Central state management component that coordinates application state

import { ComponentBase } from '../js/component-base.js';

class GlobalStore extends ComponentBase {
    constructor() {
        super();

        // Make this component invisible (it's a service component)
        this.style.display = 'none';

        // GlobalStore doesn't need to wait for dependencies - it IS the dependency
        this._skipDependencyCheck = true;

        // Component-specific properties
        this._stateSubscribers = new Set();
        this._subscriberFilters = new Map();

        // Bind public methods for external access
        this.setState = this.setState.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);

        // Bind helper methods
        this.setCurrentJob = this.setCurrentJob.bind(this);
        this.setCurrentResume = this.setCurrentResume.bind(this);
        this.addJob = this.addJob.bind(this);
        this.updateJob = this.updateJob.bind(this);
        this.deleteJob = this.deleteJob.bind(this);
        this.addResume = this.addResume.bind(this);
        this.updateResume = this.updateResume.bind(this);
        this.deleteResume = this.deleteResume.bind(this);
        this.addLog = this.addLog.bind(this);
        this.setLoading = this.setLoading.bind(this);
        this.updateSettings = this.updateSettings.bind(this);
        this.debug = this.debug.bind(this);
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('GlobalStore: Initializing global state store');

        // Request persistent storage to protect data from eviction
        await this.requestPersistentStorage();

        // Initialize the default state structure
        await this.initializeState();

        // Make store globally accessible for backward compatibility
        window.globalStore = this;

        // Emit initialization event
        this.emitEvent('global-store-ready', {
            stateKeys: Object.keys(this.getData()),
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Request persistent storage to protect data from browser eviction
     */
    async requestPersistentStorage() {
        try {
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) {
                    console.log('✅ GlobalStore: Persistent storage granted - data protected from eviction');
                } else {
                    console.warn('⚠️ GlobalStore: Persistent storage denied - data may be evicted under storage pressure');
                }
                return isPersisted;
            } else {
                console.log('ℹ️ GlobalStore: Persistent storage API not available in this browser');
                return false;
            }
        } catch (error) {
            console.error('GlobalStore: Failed to request persistent storage:', error);
            return false;
        }
    }

    /**
     * Handle data changes
     * Called when setData() is used
     */
    onDataChange(newData, previousData, source, origin) {
        console.log('GlobalStore: State changed from', source, 'origin:', origin);

        // Dispatch state change events for subscribers, include origin
        this._dispatchStateChange(source, previousData, newData, origin);

        // Persist to storage if this is a real data change (not initial load)
        if (source !== 'storage-load' && source !== 'initialization') {
            this.saveToStorage();
        }
    }

    /**
     * Handle component refresh
     * Reload state from storage
     */
    async onRefresh(force = false) {
        console.log('GlobalStore: Refreshing state from storage');
        
        if (force) {
            // Force reload from storage
            await this.loadFromStorage();
        }
        
        // Emit refresh event
        this.emitEvent('global-store-refreshed', {
            forced: force,
            stateKeys: Object.keys(this.getData())
        });
    }

    /**
     * Component validation
     * Validate the state structure
     */
    onValidate() {
        const errors = [];
        const state = this.getData();
        
        if (!state) {
            errors.push('Global state is null or undefined');
            return { valid: false, errors };
        }
        
        // Validate required state structure
        const requiredKeys = ['jobs', 'resumes', 'coverLetters', 'settings', 'ui', 'logs'];
        requiredKeys.forEach(key => {
            if (!(key in state)) {
                errors.push(`Missing required state key: ${key}`);
            }
        });
        
        // Validate data types
        if (state.jobs && !Array.isArray(state.jobs)) {
            errors.push('State.jobs must be an array');
        }
        
        if (state.resumes && !Array.isArray(state.resumes)) {
            errors.push('State.resumes must be an array');
        }
        
        if (state.coverLetters && !Array.isArray(state.coverLetters)) {
            errors.push('State.coverLetters must be an array');
        }
        
        if (state.logs && !Array.isArray(state.logs)) {
            errors.push('State.logs must be an array');
        }
        
        if (state.settings && typeof state.settings !== 'object') {
            errors.push('State.settings must be an object');
        }
        
        if (state.ui && typeof state.ui !== 'object') {
            errors.push('State.ui must be an object');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Component cleanup
     * Clear subscribers and global references
     */
    onCleanup() {
        console.log('GlobalStore: Cleaning up global store');
        
        // Clear all subscribers
        this._stateSubscribers.clear();
        this._subscriberFilters.clear();
        
        // Remove global reference
        if (window.globalStore === this) {
            delete window.globalStore;
        }
    }

    /**
     * Initialize the state structure
     */
    async initializeState() {
        try {
            // Initialize IndexedDB first
            if (window.indexedDBService) {
                await window.indexedDBService.init();
                console.log('GlobalStore: IndexedDB initialized');

                // Check if migration is needed
                if (window.storageMigration) {
                    const needsMigration = await window.storageMigration.needsMigration();
                    if (needsMigration) {
                        console.log('GlobalStore: Migration needed, starting...');
                        try {
                            const migrationResult = await window.storageMigration.migrate({
                                clearLocalStorageAfter: false, // Keep localStorage as backup
                                backupLocalStorage: true
                            });
                            console.log('GlobalStore: Migration completed', migrationResult);
                        } catch (migrationError) {
                            console.error('GlobalStore: Migration failed, continuing with localStorage', migrationError);
                        }
                    }
                }
            }

            // Set up default state structure
            const defaultState = {
                currentJob: null,
                currentResume: null,
                jobs: [],
                resumes: [],
                coverLetters: [],
                settings: {
                    apiProviders: {},
                    theme: 'light',
                    defaultResume: null,
                    jobFeeds: {
                        keywords: '',
                        autoImport: false,
                        notifyOnReady: true,
                        sources: {
                            hackernews: true,
                            linkedin: false,
                            indeed: false
                        },
                        lastFetchedAt: null
                    }
                },
                ui: {
                    activeView: 'jobs',
                    selectedJobId: null,
                    selectedResumeId: null,
                    isLoading: false
                },
                logs: []
            };

            // Load persisted state from IndexedDB (with localStorage fallback)
            const persistedState = await this.loadFromStorage();

            // Merge default state with persisted state
            const mergedState = this._deepMerge(defaultState, persistedState || {});

            // Set the data using ComponentBase method
            this.setData(mergedState, 'initialization');

        } catch (error) {
            this.handleError(error, 'Failed to initialize state');

            // Fallback to default state only
            this.setData(this.getDefaultState(), 'fallback');
        }
    }

    /**
     * Get default state structure
     */
    getDefaultState() {
        return {
            currentJob: null,
            currentResume: null,
            jobs: [],
            resumes: [],
            coverLetters: [],
            settings: {
                apiProviders: {},
                theme: 'light',
                defaultResume: null,
                jobFeeds: {
                    keywords: '',
                    autoImport: false,
                    notifyOnReady: true,
                    sources: {
                        hackernews: true,
                        linkedin: false,
                        indeed: false
                    },
                    lastFetchedAt: null
                }
            },
            ui: {
                activeView: 'jobs',
                selectedJobId: null,
                selectedResumeId: null,
                isLoading: false
            },
            logs: []
        };
    }

    /**
     * Public API: Set state updates
     * @param {object} updates - State updates to apply
     * @param {string} source - Source identifier for the change
     */
    setState(updates, source = 'external', origin = null) {
        if (typeof updates !== 'object' || updates === null) {
            console.warn('GlobalStore.setState: updates must be an object');
            return;
        }

        try {
            const currentState = this.getData() || {};
            const newState = this._deepMerge(currentState, updates);

            // Use ComponentBase setData method and include origin so onDataChange
            // and _dispatchStateChange can propagate it to subscribers.
            this.setData(newState, source, origin);
            
        } catch (error) {
            this.handleError(error, 'Failed to set state');
        }
    }

    /**
     * Public API: Get state or nested state value
     * @param {string} path - Optional dot notation path for nested access
     * @returns {any} State value
     */
    getState(path = null) {
        const state = this.getData();
        
        if (!path) {
            return state;
        }
        
        // Support dot notation for nested access
        return this._getNestedValue(state, path);
    }

    /**
     * Public API: Subscribe to state changes
     * @param {function} callback - Callback function to call on state changes
     * @param {function} filter - Optional filter function
     * @returns {function} Unsubscribe function
     */
    subscribe(callback, filter = null) {
        if (typeof callback !== 'function') {
            console.warn('GlobalStore.subscribe: callback must be a function');
            return () => {};
        }

        // Store the subscription
        this._stateSubscribers.add(callback);
        if (filter) {
            this._subscriberFilters.set(callback, filter);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(callback);
    }

    /**
     * Public API: Unsubscribe from state changes
     * @param {function} callback - Callback function to remove
     */
    unsubscribe(callback) {
        this._stateSubscribers.delete(callback);
        this._subscriberFilters.delete(callback);
    }

    // Helper methods for common state operations
    setCurrentJob(job) {
        this.setState({
            currentJob: job,
            ui: { selectedJobId: job?.id || null }
        }, 'setCurrentJob');
    }

    setCurrentResume(resume) {
        this.setState({
            currentResume: resume,
            ui: { selectedResumeId: resume?.id || null }
        }, 'setCurrentResume');
    }

    addJob(job) {
        const state = this.getData();
        const jobs = [...(state.jobs || [])];
        jobs.push(job);
        this.setState({ jobs }, 'addJob');
    }

    updateJob(jobId, updates) {
        const state = this.getData();
        const jobs = (state.jobs || []).map(job => 
            job.id === jobId ? { ...job, ...updates } : job
        );
        this.setState({ jobs }, 'updateJob');
        
        // Update currentJob if it's the one being updated
        if (state.currentJob?.id === jobId) {
            this.setState({
                currentJob: { ...state.currentJob, ...updates }
            }, 'updateCurrentJob');
        }
    }

    deleteJob(jobId) {
        const state = this.getData();
        const jobs = (state.jobs || []).filter(job => job.id !== jobId);
        this.setState({ jobs }, 'deleteJob');
        
        // Clear currentJob if it's the one being deleted
        if (state.currentJob?.id === jobId) {
            this.setState({
                currentJob: null,
                ui: { selectedJobId: null }
            }, 'clearCurrentJob');
        }
    }

    addResume(resume) {
        const state = this.getData();
        const resumes = [...(state.resumes || [])];
        resumes.push(resume);
        this.setState({ resumes }, 'addResume');
    }

    updateResume(resumeId, updates) {
        const state = this.getData();
        const resumes = (state.resumes || []).map(resume => 
            resume.id === resumeId ? { ...resume, ...updates } : resume
        );
        this.setState({ resumes }, 'updateResume');
        
        // Update currentResume if it's the one being updated
        if (state.currentResume?.id === resumeId) {
            this.setState({
                currentResume: { ...state.currentResume, ...updates }
            }, 'updateCurrentResume');
        }
    }

    deleteResume(resumeId) {
        const state = this.getData();
        const resumes = (state.resumes || []).filter(resume => resume.id !== resumeId);
        this.setState({ resumes }, 'deleteResume');
        
        // Clear currentResume if it's the one being deleted
        if (state.currentResume?.id === resumeId) {
            this.setState({
                currentResume: null,
                ui: { selectedResumeId: null }
            }, 'clearCurrentResume');
        }
    }

    addLog(logEntry) {
        const state = this.getData();
        const logs = [...(state.logs || []), logEntry];
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        this.setState({ logs }, 'addLog');
    }

    setLoading(isLoading) {
        this.setState({
            ui: { isLoading }
        }, 'setLoading');
    }

    updateSettings(settingUpdates) {
        this.setState({
            settings: settingUpdates
        }, 'updateSettings');
    }

    /**
     * Debug method to inspect current state
     */
    debug() {
        const state = this.getData();
        console.log('GlobalStore State:', state);
        return state;
    }

    // Private helper methods
    _deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    _dispatchStateChange(source, previousState, newState, origin = null) {
        // Notify internal subscribers
        this._stateSubscribers.forEach(callback => {
            try {
                const filter = this._subscriberFilters.get(callback);
                const eventDetail = {
                    source,
                    origin,
                    previousState,
                    newState,
                    timestamp: new Date().toISOString()
                };
                
                // Apply filter if provided
                if (filter && typeof filter === 'function') {
                    if (filter(eventDetail)) {
                        callback(eventDetail);
                    }
                } else {
                    callback(eventDetail);
                }
            } catch (error) {
                console.error('Error in state change subscriber:', error);
            }
        });

        // Emit component event
        this.emitEvent('state-changed', {
            source,
            origin,
            previousState,
            newState,
            timestamp: new Date().toISOString()
        });
        
        // Also dispatch on document for global listening (backward compatibility)
        try {
            document.dispatchEvent(new CustomEvent('global-state-changed', {
                detail: {
                    source,
                    origin,
                    previousState,
                    newState,
                    timestamp: new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error('Error dispatching global state change event:', error);
        }
    }

    // Storage methods (using IndexedDB with localStorage fallback)
    async saveToStorage() {
        try {
            const state = this.getData();
            if (!state) return;

            // Avoid accidentally wiping non-empty settings with an empty object
            let settingsSafe = state.settings || {};
            if (settingsSafe && typeof settingsSafe === 'object' && Object.keys(settingsSafe).length === 0) {
                try {
                    const existing = await this.getSetting('settings');
                    if (existing && Object.keys(existing).length > 0) {
                        settingsSafe = existing;
                        console.warn('GlobalStore: Prevented overwrite of settings with empty object; preserved existing saved settings.');
                    }
                } catch (e) {
                    // ignore
                }
            }

            // Use IndexedDB if available
            if (window.indexedDBService && window.indexedDBService.isInitialized) {
                try {
                    // Save jobs to IndexedDB
                    const jobs = state.jobs || [];
                    for (const job of jobs) {
                        await window.indexedDBService.saveJob(job);
                    }

                    // Save resumes to IndexedDB
                    const resumes = state.resumes || [];
                    for (const resume of resumes) {
                        await window.indexedDBService.saveResume(resume);
                    }

                    // Save cover letters to IndexedDB
                    const letters = state.coverLetters || [];
                    for (const letter of letters) {
                        await window.indexedDBService.saveLetter(letter);
                    }

                    // Save settings
                    await window.indexedDBService.saveSetting('globalStore', settingsSafe);

                    console.log('GlobalStore: Saved to IndexedDB');
                    return;
                } catch (idbError) {
                    console.error('Failed to save to IndexedDB, falling back to localStorage:', idbError);
                }
            }

            // Fallback to localStorage
            const stateToSave = {
                jobs: state.jobs || [],
                resumes: state.resumes || [],
                coverLetters: state.coverLetters || [],
                settings: settingsSafe,
                logs: state.logs || []
            };

            localStorage.setItem('global-store-state', JSON.stringify(stateToSave));
            console.log('GlobalStore: Saved to localStorage (fallback)');

        } catch (error) {
            this.handleError(error, 'Failed to save state to storage');
        }
    }

    async loadFromStorage() {
        try {
            // Try IndexedDB first
            if (window.indexedDBService && window.indexedDBService.isInitialized) {
                try {
                    const jobs = await window.indexedDBService.getJobs();
                    const resumes = await window.indexedDBService.getResumes();
                    const coverLetters = await window.indexedDBService.getLetters();
                    const settings = await window.indexedDBService.getSetting('globalStore', {});

                    // Only return IndexedDB data if we have some data
                    if (jobs.length > 0 || resumes.length > 0 || coverLetters.length > 0) {
                        console.log('GlobalStore: Loaded from IndexedDB');
                        return {
                            jobs,
                            resumes,
                            coverLetters,
                            settings
                        };
                    }
                } catch (idbError) {
                    console.error('Failed to load from IndexedDB, falling back to localStorage:', idbError);
                }
            }

            // Fallback to localStorage
            const saved = localStorage.getItem('global-store-state');
            if (saved) {
                const parsedState = JSON.parse(saved);
                console.log('GlobalStore: Loaded from localStorage');
                return parsedState;
            }

            // Legacy fallback: migrate from old standalone settings
            try {
                const legacySettings = localStorage.getItem('resumeEditorSettings');
                if (legacySettings) {
                    const parsed = JSON.parse(legacySettings);
                    return { settings: parsed };
                }
            } catch (e) { /* ignore */ }

            return null;

        } catch (error) {
            this.handleError(error, 'Failed to load state from storage');
            return null;
        }
    }
}

// Register the component
customElements.define('global-store', GlobalStore);

export { GlobalStore };
