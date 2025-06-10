// Global Store Utility
// Provides easy access to the global-store component

let storeInstance = null;

export function getStore() {
    if (!storeInstance) {
        storeInstance = document.querySelector('global-store');
        if (!storeInstance) {
            console.warn('global-store component not found in DOM');
        }
    }
    return storeInstance;
}

export function getState(path = null) {
    const store = getStore();
    return store ? store.getState(path) : null;
}

export function setState(updates, source = 'store-utility') {
    const store = getStore();
    if (store) {
        store.setState(updates, source);
    }
}

export function subscribe(callback, filter = null) {
    const store = getStore();
    return store ? store.subscribe(callback, filter) : null;
}

export function unsubscribe(listener) {
    const store = getStore();
    if (store) {
        store.unsubscribe(listener);
    }
}

// Convenience methods for common operations
export function setCurrentJob(job) {
    const store = getStore();
    if (store) {
        store.setCurrentJob(job);
    }
}

export function setCurrentResume(resume) {
    const store = getStore();
    if (store) {
        store.setCurrentResume(resume);
    }
}

export function addJob(job) {
    const store = getStore();
    if (store) {
        store.addJob(job);
    }
}

export function updateJob(jobId, updates) {
    const store = getStore();
    if (store) {
        store.updateJob(jobId, updates);
    }
}

export function deleteJob(jobId) {
    const store = getStore();
    if (store) {
        store.deleteJob(jobId);
    }
}

export function addResume(resume) {
    const store = getStore();
    if (store) {
        store.addResume(resume);
    }
}

export function updateResume(resumeId, updates) {
    const store = getStore();
    if (store) {
        store.updateResume(resumeId, updates);
    }
}

export function deleteResume(resumeId) {
    const store = getStore();
    if (store) {
        store.deleteResume(resumeId);
    }
}

export function addLog(logEntry) {
    const store = getStore();
    if (store) {
        store.addLog(logEntry);
    }
}

export function setLoading(isLoading) {
    const store = getStore();
    if (store) {
        store.setLoading(isLoading);
    }
}

export function updateSettings(settingUpdates) {
    const store = getStore();
    if (store) {
        store.updateSettings(settingUpdates);
    }
}

// Debug helper
export function debugStore() {
    const store = getStore();
    return store ? store.debug() : null;
}