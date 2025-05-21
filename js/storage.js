// storage.js - Local storage operations
import { config } from './config.js';
import { safelyParseJSON, showToast } from './utils.js';

// Initialize localStorage functionality
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

// Save resume to localStorage
export function saveResumeToStorage(resumeData) {
    if (!isLocalStorageAvailable()) return false;
    
    try {
        localStorage.setItem(config.storage.resumeKey, JSON.stringify(resumeData));
        return true;
    } catch (e) {
        console.error('Error saving resume to storage:', e);
        return false;
    }
}

// Load resume from localStorage
export function loadResumeFromStorage() {
    if (!isLocalStorageAvailable()) return null;
    
    try {
        const resumeJson = localStorage.getItem(config.storage.resumeKey);
        if (!resumeJson) return null;
        
        return safelyParseJSON(resumeJson);
    } catch (e) {
        console.error('Error loading resume from storage:', e);
        return null;
    }
}

// Save named resume to localStorage
export function saveNamedResume(resumeData, name) {
    if (!isLocalStorageAvailable()) return false;
    
    try {
        let savedResumes = loadSavedResumesList() || {};
        
        // Generate a unique ID for the resume
        const resumeId = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        savedResumes[name] = {
            id: resumeId,
            data: resumeData,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(config.storage.savedResumesKey, JSON.stringify(savedResumes));
        return resumeId;
    } catch (e) {
        console.error('Error saving named resume:', e);
        return false;
    }
}

// Load named resume from localStorage
export function loadNamedResume(name) {
    if (!isLocalStorageAvailable()) return null;
    
    try {
        const savedResumes = loadSavedResumesList();
        if (!savedResumes || !savedResumes[name]) return null;
        
        return savedResumes[name].data;
    } catch (e) {
        console.error('Error loading named resume:', e);
        return null;
    }
}

// Load list of saved resumes
export function loadSavedResumesList() {
    if (!isLocalStorageAvailable()) return null;
    
    try {
        const savedResumesJson = localStorage.getItem(config.storage.savedResumesKey);
        if (!savedResumesJson) return {};
        
        return safelyParseJSON(savedResumesJson) || {};
    } catch (e) {
        console.error('Error loading saved resumes list:', e);
        return {};
    }
}

// Delete named resume from localStorage
export function deleteNamedResume(name) {
    if (!isLocalStorageAvailable()) return false;
    
    try {
        let savedResumes = loadSavedResumesList() || {};
        if (savedResumes[name]) {
            delete savedResumes[name];
            localStorage.setItem(config.storage.savedResumesKey, JSON.stringify(savedResumes));
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error deleting named resume:', e);
        return false;
    }
}

// Save settings to localStorage
export function saveSettings(settings) {
    if (!isLocalStorageAvailable()) return false;
    
    try {
        localStorage.setItem(config.storage.settingsKey, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

// Load settings from localStorage
export function loadSettings() {
    if (!isLocalStorageAvailable()) return null;
    
    try {
        const settingsJson = localStorage.getItem(config.storage.settingsKey);
        if (!settingsJson) return null;
        
        return safelyParseJSON(settingsJson);
    } catch (e) {
        console.error('Error loading settings:', e);
        return null;
    }
}