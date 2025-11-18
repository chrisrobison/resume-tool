// storage.js - Data storage operations with IndexedDB (via Worker) and localStorage fallback
import { config } from './config.js';
import { safelyParseJSON, showToast } from './utils.js';
import dataService from './data-service.js';

// Storage mode: 'indexeddb' or 'localstorage'
let storageMode = 'indexeddb';
let migrationComplete = false;

// Initialize storage - try IndexedDB first, fallback to localStorage
export async function initStorage() {
    try {
        // Try to initialize IndexedDB via worker
        const ready = await waitForWorker(5000);

        if (ready) {
            console.log('Using IndexedDB for data storage');
            storageMode = 'indexeddb';

            // Auto-migrate from localStorage if needed
            await autoMigrateFromLocalStorage();

            return true;
        }
    } catch (error) {
        console.warn('IndexedDB not available, falling back to localStorage:', error);
    }

    // Fallback to localStorage
    storageMode = 'localstorage';
    return initLocalStorage();
}

// Wait for worker to be ready
async function waitForWorker(timeout = 5000) {
    const startTime = Date.now();
    while (!dataService.isWorkerReady() && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return dataService.isWorkerReady();
}

// Auto-migrate from localStorage to IndexedDB
async function autoMigrateFromLocalStorage() {
    if (migrationComplete || dataService.isMigrated()) {
        return;
    }

    try {
        // Check if there's data in localStorage to migrate
        const hasLocalData = localStorage.getItem(config.storage.resumeKey) ||
                            localStorage.getItem(config.storage.savedResumesKey) ||
                            localStorage.getItem(config.storage.settingsKey);

        if (!hasLocalData) {
            migrationComplete = true;
            return;
        }

        console.log('Migrating data from localStorage to IndexedDB...');

        // Gather localStorage data
        const localStorageData = {
            resumes: safelyParseJSON(localStorage.getItem(config.storage.resumeKey)),
            savedResumes: safelyParseJSON(localStorage.getItem(config.storage.savedResumesKey)),
            jobs: safelyParseJSON(localStorage.getItem(config.storage.jobsKey)),
            logs: safelyParseJSON(localStorage.getItem(config.storage.logsKey)),
            settings: safelyParseJSON(localStorage.getItem(config.storage.settingsKey))
        };

        // Migrate to IndexedDB
        const result = await dataService.migrate(localStorageData);

        console.log('Migration complete:', result);
        migrationComplete = true;

        // Optionally clear localStorage after successful migration
        // Uncomment if you want to remove old data
        // localStorage.removeItem(config.storage.resumeKey);
        // localStorage.removeItem(config.storage.savedResumesKey);
        // localStorage.removeItem(config.storage.jobsKey);
        // localStorage.removeItem(config.storage.logsKey);
        // localStorage.removeItem(config.storage.settingsKey);

    } catch (error) {
        console.error('Migration failed:', error);
        // Don't set migrationComplete = true so we can retry later
    }
}

// Initialize localStorage functionality (fallback)
export function initLocalStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage is not available. Resume saving functionality will be disabled.');
        return false;
    }
    return true;
}

// Check if localStorage is available
export function isLocalStorageAvailable() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Get current storage mode
export function getStorageMode() {
    return storageMode;
}

// Save resume to storage (IndexedDB or localStorage)
export async function saveResumeToStorage(resumeData) {
    if (storageMode === 'indexeddb') {
        try {
            await dataService.saveResume(resumeData);
            return true;
        } catch (error) {
            console.error('Error saving resume to IndexedDB:', error);
            // Fallback to localStorage
            return saveResumeToLocalStorage(resumeData);
        }
    }
    return saveResumeToLocalStorage(resumeData);
}

// Load resume from storage (IndexedDB or localStorage)
export async function loadResumeFromStorage(id = null) {
    if (storageMode === 'indexeddb') {
        try {
            if (id) {
                return await dataService.getResume(id);
            }
            // Get most recent resume
            const resumes = await dataService.getResumes();
            return resumes && resumes.length > 0 ? resumes[0] : null;
        } catch (error) {
            console.error('Error loading resume from IndexedDB:', error);
            // Fallback to localStorage
            return loadResumeFromLocalStorage();
        }
    }
    return loadResumeFromLocalStorage();
}

// localStorage-specific functions (private)
function saveResumeToLocalStorage(resumeData) {
    if (!isLocalStorageAvailable()) return false;

    try {
        localStorage.setItem(config.storage.resumeKey, JSON.stringify(resumeData));
        return true;
    } catch (e) {
        console.error('Error saving resume to localStorage:', e);
        return false;
    }
}

function loadResumeFromLocalStorage() {
    if (!isLocalStorageAvailable()) return null;

    try {
        const resumeJson = localStorage.getItem(config.storage.resumeKey);
        if (!resumeJson) return null;

        return safelyParseJSON(resumeJson);
    } catch (e) {
        console.error('Error loading resume from localStorage:', e);
        return null;
    }
}

// Save named resume (now just calls saveResumeToStorage with name)
export async function saveNamedResume(resumeData, name) {
    if (storageMode === 'indexeddb') {
        try {
            // Add name to resume data
            resumeData.name = name;
            const resumeId = await dataService.saveResume(resumeData);
            return resumeId;
        } catch (error) {
            console.error('Error saving named resume to IndexedDB:', error);
            return saveNamedResumeToLocalStorage(resumeData, name);
        }
    }
    return saveNamedResumeToLocalStorage(resumeData, name);
}

// Load named resume
export async function loadNamedResume(name) {
    if (storageMode === 'indexeddb') {
        try {
            const resumes = await dataService.getResumes();
            const resume = resumes.find(r => r.name === name);
            return resume || null;
        } catch (error) {
            console.error('Error loading named resume from IndexedDB:', error);
            return loadNamedResumeFromLocalStorage(name);
        }
    }
    return loadNamedResumeFromLocalStorage(name);
}

// Load list of saved resumes
export async function loadSavedResumesList() {
    if (storageMode === 'indexeddb') {
        try {
            const resumes = await dataService.getResumes();
            // Convert to object format for compatibility
            const resumesList = {};
            resumes.forEach(resume => {
                if (resume.name) {
                    resumesList[resume.name] = {
                        id: resume.id,
                        data: resume,
                        timestamp: resume.timestamp || resume.lastModified
                    };
                }
            });
            return resumesList;
        } catch (error) {
            console.error('Error loading saved resumes from IndexedDB:', error);
            return loadSavedResumesListFromLocalStorage();
        }
    }
    return loadSavedResumesListFromLocalStorage();
}

// Delete named resume
export async function deleteNamedResume(name) {
    if (storageMode === 'indexeddb') {
        try {
            const resumes = await dataService.getResumes();
            const resume = resumes.find(r => r.name === name);
            if (resume) {
                await dataService.deleteResume(resume.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting named resume from IndexedDB:', error);
            return deleteNamedResumeFromLocalStorage(name);
        }
    }
    return deleteNamedResumeFromLocalStorage(name);
}

// Save settings
export async function saveSettings(settings) {
    if (storageMode === 'indexeddb') {
        try {
            await dataService.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Error saving settings to IndexedDB:', error);
            return saveSettingsToLocalStorage(settings);
        }
    }
    return saveSettingsToLocalStorage(settings);
}

// Load settings
export async function loadSettings() {
    if (storageMode === 'indexeddb') {
        try {
            return await dataService.getSettings();
        } catch (error) {
            console.error('Error loading settings from IndexedDB:', error);
            return loadSettingsFromLocalStorage();
        }
    }
    return loadSettingsFromLocalStorage();
}

// localStorage-specific functions for named resumes and settings (private)
function saveNamedResumeToLocalStorage(resumeData, name) {
    if (!isLocalStorageAvailable()) return false;

    try {
        let savedResumes = loadSavedResumesListFromLocalStorage() || {};

        const resumeId = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        savedResumes[name] = {
            id: resumeId,
            data: resumeData,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(config.storage.savedResumesKey, JSON.stringify(savedResumes));
        return resumeId;
    } catch (e) {
        console.error('Error saving named resume to localStorage:', e);
        return false;
    }
}

function loadNamedResumeFromLocalStorage(name) {
    if (!isLocalStorageAvailable()) return null;

    try {
        const savedResumes = loadSavedResumesListFromLocalStorage();
        if (!savedResumes || !savedResumes[name]) return null;

        return savedResumes[name].data;
    } catch (e) {
        console.error('Error loading named resume from localStorage:', e);
        return null;
    }
}

function loadSavedResumesListFromLocalStorage() {
    if (!isLocalStorageAvailable()) return null;

    try {
        const savedResumesJson = localStorage.getItem(config.storage.savedResumesKey);
        if (!savedResumesJson) return {};

        return safelyParseJSON(savedResumesJson) || {};
    } catch (e) {
        console.error('Error loading saved resumes list from localStorage:', e);
        return {};
    }
}

function deleteNamedResumeFromLocalStorage(name) {
    if (!isLocalStorageAvailable()) return false;

    try {
        let savedResumes = loadSavedResumesListFromLocalStorage() || {};
        if (savedResumes[name]) {
            delete savedResumes[name];
            localStorage.setItem(config.storage.savedResumesKey, JSON.stringify(savedResumes));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error deleting named resume from localStorage:', e);
        return false;
    }
}

function saveSettingsToLocalStorage(settings) {
    if (!isLocalStorageAvailable()) return false;

    try {
        localStorage.setItem(config.storage.settingsKey, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving settings to localStorage:', e);
        return false;
    }
}

function loadSettingsFromLocalStorage() {
    if (!isLocalStorageAvailable()) return null;

    try {
        const settingsJson = localStorage.getItem(config.storage.settingsKey);
        if (!settingsJson) return null;

        return safelyParseJSON(settingsJson);
    } catch (e) {
        console.error('Error loading settings from localStorage:', e);
        return null;
    }
}

// Export data service for direct access if needed
export { dataService };