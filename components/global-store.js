class GlobalStore extends HTMLElement {
    constructor() {
        super();
        this._state = {};
        this._initialized = false;
        
        // Make this component invisible
        this.style.display = 'none';
        
        // Bind methods to preserve 'this' context
        this.setState = this.setState.bind(this);
        this.getState = this.getState.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
    }

    connectedCallback() {
        if (!this._initialized) {
            this._initialized = true;
            // Initialize with default state if needed
            this.initializeState();
        }
    }

    initializeState() {
        // Set up default state structure
        this._state = {
            currentJob: null,
            currentResume: null,
            jobs: [],
            resumes: [],
            coverLetters: [],
            settings: {
                apiProviders: {},
                theme: 'light',
                defaultResume: null
            },
            ui: {
                activeView: 'jobs',
                selectedJobId: null,
                selectedResumeId: null,
                isLoading: false
            },
            logs: []
        };

        // Load persisted state from localStorage if available
        this.loadFromStorage();
        
        // Dispatch initial state event
        this._dispatchStateChange('initialized', null, this._state);
    }

    get state() {
        return this._state;
    }

    setState(updates, source = 'unknown') {
        if (typeof updates !== 'object' || updates === null) {
            console.warn('GlobalStore.setState: updates must be an object');
            return;
        }

        const previousState = JSON.parse(JSON.stringify(this._state));
        
        // Deep merge updates into current state
        this._state = this._deepMerge(this._state, updates);
        
        // Persist to localStorage
        this.saveToStorage();
        
        // Dispatch change event
        this._dispatchStateChange(source, previousState, this._state);
    }

    getState(path = null) {
        if (!path) {
            return this._state;
        }
        
        // Support dot notation for nested access
        return this._getNestedValue(this._state, path);
    }

    // Subscribe to state changes
    subscribe(callback, filter = null) {
        const listener = (event) => {
            if (typeof callback === 'function') {
                // Apply filter if provided
                if (filter && typeof filter === 'function') {
                    if (filter(event.detail)) {
                        callback(event.detail);
                    }
                } else {
                    callback(event.detail);
                }
            }
        };

        this.addEventListener('state-changed', listener);
        return listener; // Return for unsubscribe
    }

    // Unsubscribe from state changes
    unsubscribe(listener) {
        this.removeEventListener('state-changed', listener);
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
        const jobs = [...this._state.jobs];
        jobs.push(job);
        this.setState({ jobs }, 'addJob');
    }

    updateJob(jobId, updates) {
        const jobs = this._state.jobs.map(job => 
            job.id === jobId ? { ...job, ...updates } : job
        );
        this.setState({ jobs }, 'updateJob');
        
        // Update currentJob if it's the one being updated
        if (this._state.currentJob?.id === jobId) {
            this.setState({
                currentJob: { ...this._state.currentJob, ...updates }
            }, 'updateCurrentJob');
        }
    }

    deleteJob(jobId) {
        const jobs = this._state.jobs.filter(job => job.id !== jobId);
        this.setState({ jobs }, 'deleteJob');
        
        // Clear currentJob if it's the one being deleted
        if (this._state.currentJob?.id === jobId) {
            this.setState({
                currentJob: null,
                ui: { selectedJobId: null }
            }, 'clearCurrentJob');
        }
    }

    addResume(resume) {
        const resumes = [...this._state.resumes];
        resumes.push(resume);
        this.setState({ resumes }, 'addResume');
    }

    updateResume(resumeId, updates) {
        const resumes = this._state.resumes.map(resume => 
            resume.id === resumeId ? { ...resume, ...updates } : resume
        );
        this.setState({ resumes }, 'updateResume');
        
        // Update currentResume if it's the one being updated
        if (this._state.currentResume?.id === resumeId) {
            this.setState({
                currentResume: { ...this._state.currentResume, ...updates }
            }, 'updateCurrentResume');
        }
    }

    deleteResume(resumeId) {
        const resumes = this._state.resumes.filter(resume => resume.id !== resumeId);
        this.setState({ resumes }, 'deleteResume');
        
        // Clear currentResume if it's the one being deleted
        if (this._state.currentResume?.id === resumeId) {
            this.setState({
                currentResume: null,
                ui: { selectedResumeId: null }
            }, 'clearCurrentResume');
        }
    }

    addLog(logEntry) {
        const logs = [...this._state.logs, logEntry];
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

    _dispatchStateChange(source, previousState, newState) {
        const event = new CustomEvent('state-changed', {
            detail: {
                source,
                previousState,
                newState,
                timestamp: new Date().toISOString()
            },
            bubbles: true,
            composed: true
        });
        
        this.dispatchEvent(event);
        
        // Also dispatch on document for global listening
        document.dispatchEvent(new CustomEvent('global-state-changed', {
            detail: event.detail
        }));
    }

    // Storage methods
    saveToStorage() {
        try {
            const stateToSave = {
                jobs: this._state.jobs,
                resumes: this._state.resumes,
                coverLetters: this._state.coverLetters,
                settings: this._state.settings,
                logs: this._state.logs
            };
            localStorage.setItem('global-store-state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('global-store-state');
            if (saved) {
                const parsedState = JSON.parse(saved);
                this._state = this._deepMerge(this._state, parsedState);
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }

    // Debug method
    debug() {
        console.log('GlobalStore State:', this._state);
        return this._state;
    }
}

// Register the custom element
customElements.define('global-store', GlobalStore);

export { GlobalStore };