// storage.js - Data storage operations with IndexedDB and localStorage fallback
import { config } from './config.js';
import { safelyParseJSON, showToast } from './utils.js';

// Storage mode: 'indexeddb' or 'localstorage'
let storageMode = 'indexeddb';
let migrationComplete = false;

// Initialize storage - try IndexedDB first, fallback to localStorage
export async function initStorage() {
    try {
        // Check if IndexedDB service is available (bootstrapped in app.html)
        if (window.indexedDBService && window.indexedDBService.isInitialized) {
            console.log('Using IndexedDB for data storage');
            storageMode = 'indexeddb';

            // Check if migration was already handled by bootstrap
            if (window.storageMigration) {
                const isMigrated = await window.storageMigration.isMigrationComplete();
                migrationComplete = isMigrated;

                if (!isMigrated) {
                    // Migration will be handled by bootstrap script
                    console.log('Migration will be handled by bootstrap initialization');
                }
            }

            return true;
        } else {
            console.warn('IndexedDB service not available, waiting for initialization...');

            // Wait briefly for bootstrap to complete
            await waitForIndexedDB(3000);

            if (window.indexedDBService && window.indexedDBService.isInitialized) {
                console.log('IndexedDB initialized, using IndexedDB for storage');
                storageMode = 'indexeddb';
                return true;
            }
        }
    } catch (error) {
        console.warn('IndexedDB not available, falling back to localStorage:', error);
    }

    // Fallback to localStorage
    console.log('Using localStorage for data storage');
    storageMode = 'localstorage';
    return initLocalStorage();
}

// Wait for IndexedDB to be initialized
async function waitForIndexedDB(timeout = 3000) {
    const startTime = Date.now();
    while ((!window.indexedDBService || !window.indexedDBService.isInitialized) &&
           (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.indexedDBService && window.indexedDBService.isInitialized;
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
            // Ensure resume has an ID
            if (!resumeData.id) {
                resumeData.id = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }

            // Add timestamp metadata
            resumeData.updatedAt = new Date().toISOString();
            if (!resumeData.createdAt) {
                resumeData.createdAt = resumeData.updatedAt;
            }

            await window.indexedDBService.save('resumes', resumeData);
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
                return await window.indexedDBService.get('resumes', id);
            }
            // Get most recent resume
            const resumes = await window.indexedDBService.getAll('resumes');
            if (!resumes || resumes.length === 0) return null;

            // Sort by updatedAt or createdAt, most recent first
            resumes.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB - dateA;
            });

            return resumes[0];
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

            // Ensure resume has an ID
            if (!resumeData.id) {
                resumeData.id = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }

            // Add timestamp metadata
            resumeData.updatedAt = new Date().toISOString();
            if (!resumeData.createdAt) {
                resumeData.createdAt = resumeData.updatedAt;
            }

            await window.indexedDBService.save('resumes', resumeData);
            return resumeData.id;
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
            const resumes = await window.indexedDBService.getAll('resumes');
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
            const resumes = await window.indexedDBService.getAll('resumes');
            // Convert to object format for compatibility
            const resumesList = {};
            resumes.forEach(resume => {
                if (resume.name) {
                    resumesList[resume.name] = {
                        id: resume.id,
                        data: resume,
                        timestamp: resume.updatedAt || resume.createdAt || resume.lastModified
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
            const resumes = await window.indexedDBService.getAll('resumes');
            const resume = resumes.find(r => r.name === name);
            if (resume) {
                await window.indexedDBService.delete('resumes', resume.id);
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
            // Save each setting individually to the settings store
            for (const [key, value] of Object.entries(settings)) {
                await window.indexedDBService.saveSetting(key, value);
            }
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
            // Get all settings from the settings store
            const settingsArray = await window.indexedDBService.getAll('settings');

            // Convert array to object
            const settings = {};
            settingsArray.forEach(item => {
                settings[item.key] = item.value;
            });

            return settings;
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

// Get IndexedDB service for direct access if needed
export function getIndexedDBService() {
    return window.indexedDBService;
}

// Get storage migration service for direct access if needed
export function getStorageMigrationService() {
    return window.storageMigration;
}