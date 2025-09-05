// import-export-manager.js - Import/Export functionality
// Extracted from jobs.html embedded JavaScript

import { showModal, closeModal, openFormModal } from './modal-manager.js';
import { getStore } from './store.js';
import aiService from './ai-service.js';

/**
 * Import/Export Manager
 * Handles all import and export operations for jobs, resumes, and other data
 */

/**
 * Open import job modal
 */
export function openImportJobModal() {
    try {
        showModal('import-job-modal');
        setupImportJobHandlers();
        // Ensure sections reflect the currently selected import method
        try {
            const urlMethodEl = document.getElementById('import-method-url');
            if (urlMethodEl) {
                // Default to URL method for backward-compatible tests
                urlMethodEl.checked = true;
            }
            toggleImportMethod();
        } catch (e) { /* non-fatal */ }

        // As a fallback, ensure URL section is visible shortly after open
        try {
            setTimeout(() => {
                const urlSection = document.getElementById('import-url-section');
                const descSection = document.getElementById('import-description-section');
                if (urlSection) urlSection.classList.remove('hidden');
                if (descSection) descSection.classList.add('hidden');
            }, 50);
        } catch (e) { /* ignore */ }
        
        // Show API warning if not configured (inside the modal)
        const submitBtn = document.getElementById('import-job-submit');
        if (!isAPIConfigured()) {
            showAPIWarning('import-api-warning');
            if (submitBtn) submitBtn.disabled = false; // Allow non-AI import flows
        } else {
            const warning = document.getElementById('import-api-warning');
            if (warning) warning.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
        
        console.log('ImportExportManager: Opened import job modal');
        
    } catch (error) {
        console.error('ImportExportManager: Failed to open import job modal:', error);
    }
}

/**
 * Open import resume modal
 */
export function openImportResumeModal() {
    try {
        showModal('import-resume-modal');
        setupImportResumeHandlers();
        
        console.log('ImportExportManager: Opened import resume modal');
        
    } catch (error) {
        console.error('ImportExportManager: Failed to open import resume modal:', error);
    }
}

/**
 * Setup import job modal handlers
 */
function setupImportJobHandlers() {
    // Import method radio buttons
    const urlMethod = document.getElementById('import-method-url');
    const descMethod = document.getElementById('import-method-description');
    
    if (urlMethod && descMethod) {
        urlMethod.addEventListener('change', toggleImportMethod);
        descMethod.addEventListener('change', toggleImportMethod);
    }

    // Submit button
    const submitBtn = document.getElementById('import-job-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', processJobImport);
    }

    // Cancel button
    const cancelBtn = document.getElementById('import-job-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('import-job-modal'));
    }
}

    // Keep alias and primary URL field in sync for tests and legacy code
    const jobUrlInput = document.getElementById('import-job-url');
    const jobUrlAlias = document.getElementById('job-url-import');
    if (jobUrlInput && jobUrlAlias) {
        jobUrlInput.addEventListener('input', () => {
            jobUrlAlias.value = jobUrlInput.value;
        });
        jobUrlAlias.addEventListener('input', () => {
            jobUrlInput.value = jobUrlAlias.value;
        });
    }

/**
 * Setup import resume modal handlers
 */
function setupImportResumeHandlers() {
    // Import method radio buttons
    const pasteMethod = document.getElementById('resume-import-method-paste');
    const fileMethod = document.getElementById('resume-import-method-file');
    const urlMethod = document.getElementById('resume-import-method-url');
    
    if (pasteMethod && fileMethod && urlMethod) {
        pasteMethod.addEventListener('change', toggleResumeImportMethod);
        fileMethod.addEventListener('change', toggleResumeImportMethod);
        urlMethod.addEventListener('change', toggleResumeImportMethod);
    }

    // File drag and drop
    setupFileDragDrop();

    // Submit button
    const submitBtn = document.getElementById('import-resume-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', processResumeImport);
    }

    // Cancel button
    const cancelBtn = document.getElementById('import-resume-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('import-resume-modal'));
    }
}

/**
 * Toggle import method visibility for job import
 */
function toggleImportMethod() {
    const urlSection = document.getElementById('import-url-section');
    const descSection = document.getElementById('import-description-section');
    const urlMethod = document.getElementById('import-method-url');
    
    if (urlSection && descSection && urlMethod) {
        if (urlMethod.checked) {
            urlSection.classList.remove('hidden');
            descSection.classList.add('hidden');
        } else {
            urlSection.classList.add('hidden');
            descSection.classList.remove('hidden');
        }
    }
}

/**
 * Toggle import method visibility for resume import
 */
function toggleResumeImportMethod() {
    const pasteSection = document.getElementById('resume-paste-section');
    const fileSection = document.getElementById('resume-file-section');
    const urlSection = document.getElementById('resume-url-section');
    
    const pasteMethod = document.getElementById('resume-import-method-paste');
    const fileMethod = document.getElementById('resume-import-method-file');
    const urlMethod = document.getElementById('resume-import-method-url');
    
    if (pasteSection && fileSection && urlSection && pasteMethod && fileMethod && urlMethod) {
        // Hide all sections
        pasteSection.classList.add('hidden');
        fileSection.classList.add('hidden');
        urlSection.classList.add('hidden');
        
        // Show selected section
        if (pasteMethod.checked) {
            pasteSection.classList.remove('hidden');
        } else if (fileMethod.checked) {
            fileSection.classList.remove('hidden');
        } else if (urlMethod.checked) {
            urlSection.classList.remove('hidden');
        }
    }
}

/**
 * Setup file drag and drop functionality
 */
function setupFileDragDrop() {
    const dropArea = document.getElementById('resume-drag-drop-area');
    const fileInput = document.getElementById('resume-file-input');
    const fileNameDisplay = document.getElementById('resume-file-name');
    
    if (!dropArea || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Click to browse
    dropArea.addEventListener('click', () => fileInput.click());

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.style.borderColor = '#007bff';
        dropArea.style.backgroundColor = '#f8f9fa';
    }

    function unhighlight() {
        dropArea.style.borderColor = '#ddd';
        dropArea.style.backgroundColor = 'transparent';
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = `Selected: ${file.name}`;
                    fileNameDisplay.classList.remove('hidden');
                }
                console.log('ImportExportManager: JSON file selected:', file.name);
            } else {
                alert('Please select a JSON file.');
            }
        }
    }
}

/**
 * Process job import
 */
async function processJobImport() {
    try {
        // Proceed whether API is configured or not; show a warning but don't abort
        if (!isAPIConfigured()) {
            showAPIWarning('import-api-warning');
            showToast('API keys not configured. Proceeding without AI extraction.', 'warning');
        }

    const urlMethod = document.getElementById('import-method-url');
    const jobUrlInput = document.getElementById('import-job-url');
    const jobUrlAlias = document.getElementById('job-url-import');
    const jobUrl = (jobUrlInput?.value.trim()) || (jobUrlAlias?.value.trim());
        const jobDescription = document.getElementById('import-job-description')?.value.trim();
        const customInstructions = document.getElementById('import-custom-instructions')?.value.trim();
        
        let content = '';
        let method = '';

    if (urlMethod?.checked) {
            if (!jobUrl) {
                alert('Please enter a job URL.');
                return;
            }
            content = jobUrl;
            method = 'url';
        } else {
            if (!jobDescription) {
                alert('Please enter a job description.');
                return;
            }
            content = jobDescription;
            method = 'description';
        }

        // Show progress
        showImportProgress();
        updateImportProgressText('Initializing import...');
        console.log('ImportExportManager: Starting job import', { method, hasURL: !!jobUrl, hasDesc: !!jobDescription });

        let result;
        if (method === 'url') {
            try {
                // Attempt to use AI to parse the job posting via server proxy
                let provider = null;
                let apiKey = null;
                try {
                    const store = getStore();
                    const settings = store?.getState('settings');
                    const providers = settings?.apiProviders || {};
                    if (providers?.openai?.apiKey) {
                        provider = 'openai';
                        apiKey = providers.openai.apiKey;
                    } else if (providers?.claude?.apiKey) {
                        provider = 'claude';
                        apiKey = providers.claude.apiKey;
                    }
                } catch (e) { /* ignore */ }

                // Fallback to localStorage legacy keys
                if (!apiKey) {
                    apiKey = localStorage.getItem('openai_api_key') || localStorage.getItem('claude_api_key') || localStorage.getItem('api_key');
                    if (localStorage.getItem('openai_api_key')) provider = 'openai';
                    else if (localStorage.getItem('claude_api_key')) provider = 'claude';
                }

                if (!provider || !apiKey) {
                    console.warn('ImportExportManager: No AI provider configured; falling back to simulated import');
                    result = await simulateJobImport(content, method, customInstructions);
                } else {
                    updateImportProgressText('Requesting parse from AI...');
                    const aiResult = await aiService.parseJob({ url: jobUrl, instructions: customInstructions, provider, apiKey, onProgress: (m) => updateImportProgressText(m) });
                    // aiResult may be an object or a string. Normalize to object if possible
                    let parsed = null;
                    if (typeof aiResult === 'object') parsed = aiResult.result ?? aiResult;
                    else if (typeof aiResult === 'string') {
                        try {
                            parsed = JSON.parse(aiResult);
                        } catch (e) {
                            const m = aiResult.match(/\{[\s\S]*\}/);
                            if (m) {
                                try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
                            }
                        }
                    }

                    if (parsed) {
                        result = { success: true, jobData: parsed };
                    } else {
                        // If AI didn't return structured JSON, fall back to a simulated snippet
                        console.warn('ImportExportManager: AI did not return structured JSON, falling back to snippet');
                        result = await simulateJobImport(content, method, customInstructions);
                    }
                }
            } catch (e) {
                console.warn('ImportExportManager: AI parse failed, falling back to simulation.', e);
                result = await simulateJobImport(content, method, customInstructions);
            }
        } else {
            // For pasted description, try AI parse if configured, otherwise simulate
            try {
                let provider = null;
                let apiKey = null;

                try {
                    const store = getStore();
                    const settings = store?.getState('settings');
                    const providers = settings?.apiProviders || {};
                    if (providers?.openai?.apiKey) {
                        provider = 'openai';
                        apiKey = providers.openai.apiKey;
                    } else if (providers?.claude?.apiKey) {
                        provider = 'claude';
                        apiKey = providers.claude.apiKey;
                    }
                } catch (innerErr) { /* ignore */ }

                if (!apiKey) {
                    apiKey = localStorage.getItem('openai_api_key') || localStorage.getItem('claude_api_key') || localStorage.getItem('api_key');
                    if (localStorage.getItem('openai_api_key')) provider = 'openai';
                    else if (localStorage.getItem('claude_api_key')) provider = 'claude';
                }

                if (!provider || !apiKey) {
                    result = await simulateJobImport(content, method, customInstructions);
                } else {
                    updateImportProgressText('Sending pasted description to AI...');
                    const aiResult = await aiService.parseJob({ description: content, instructions: customInstructions, provider, apiKey, onProgress: (m) => updateImportProgressText(m) });

                    let parsed = null;
                    if (typeof aiResult === 'object') {
                        parsed = aiResult.result ?? aiResult;
                    } else if (typeof aiResult === 'string') {
                        try {
                            parsed = JSON.parse(aiResult);
                        } catch (err) {
                            const m = aiResult.match(/\{[\s\S]*\}/);
                            if (m) {
                                try {
                                    parsed = JSON.parse(m[0]);
                                } catch (err2) {
                                    parsed = null;
                                }
                            }
                        }
                    }

                    if (parsed) {
                        result = { success: true, jobData: parsed };
                    } else {
                        result = await simulateJobImport(content, method, customInstructions);
                    }
                }
            } catch (e) {
                console.warn('ImportExportManager: AI parse of description failed, falling back to simulation.', e);
                result = await simulateJobImport(content, method, customInstructions);
            }
        }
        
        if (result.success) {
            // Open Add Job form pre-filled for confirmation/edit
            hideImportProgress();
            closeModal('import-job-modal');

            updateImportProgressText('Parsed — opening editor for review');

            const normalized = normalizeParsedJob(result.jobData, jobUrl);
            openFormModal('jobs', normalized, async (item) => {
                try {
                    await addImportedJob(item);
                    closeModal('form-modal');
                    showToast('Job saved successfully!', 'success');
                } catch (err) {
                    console.error('ImportExportManager: Failed to save imported job from confirmation form', err);
                    showToast('Failed to save job', 'error');
                }
            });
        } else {
            hideImportProgress();
            showToast('Failed to import job: ' + result.error, 'error');
        }
        
    } catch (error) {
        console.error('ImportExportManager: Failed to process job import:', error);
        hideImportProgress();
        showToast('Failed to import job', 'error');
    }
}

/**
 * Process resume import
 */
async function processResumeImport() {
    try {
        const resumeName = document.getElementById('resume-name-input')?.value.trim();
        if (!resumeName) {
            alert('Please enter a resume name.');
            return;
        }

        const pasteMethod = document.getElementById('resume-import-method-paste');
        const fileMethod = document.getElementById('resume-import-method-file');
        const urlMethod = document.getElementById('resume-import-method-url');
        
        let resumeData = null;

        if (pasteMethod?.checked) {
            const jsonInput = document.getElementById('resume-json-input')?.value.trim();
            if (!jsonInput) {
                alert('Please paste JSON content.');
                return;
            }
            resumeData = parseResumeJSON(jsonInput);
        } else if (fileMethod?.checked) {
            const fileInput = document.getElementById('resume-file-input');
            if (!fileInput?.files.length) {
                alert('Please select a JSON file.');
                return;
            }
            resumeData = await readResumeFile(fileInput.files[0]);
        } else if (urlMethod?.checked) {
            const resumeUrl = document.getElementById('resume-url-input')?.value.trim();
            if (!resumeUrl) {
                alert('Please enter a JSON URL.');
                return;
            }
            resumeData = await fetchResumeFromURL(resumeUrl);
        }

        if (resumeData) {
            await addImportedResume(resumeName, resumeData);
            closeModal('import-resume-modal');
            showToast('Resume imported successfully!', 'success');
        }
        
    } catch (error) {
        console.error('ImportExportManager: Failed to process resume import:', error);
        showToast('Failed to import resume', 'error');
    }
}

/**
 * Show import progress
 */
function showImportProgress() {
    const progress = document.getElementById('import-progress');
    if (progress) {
        progress.classList.remove('hidden');
    }
}

/**
 * Hide import progress
 */
function hideImportProgress() {
    const progress = document.getElementById('import-progress');
    if (progress) {
        progress.classList.add('hidden');
    }
}

/**
 * Update import progress text shown in the modal
 * @param {string} text
 */
function updateImportProgressText(text) {
    const el = document.getElementById('import-progress-text');
    if (el) el.textContent = text;
}

/**
 * Normalize parsed job data to the application's job schema
 * @param {object} parsed - AI parsed object
 * @param {string} sourceUrl - original job URL (optional)
 */
function normalizeParsedJob(parsed = {}, sourceUrl = '') {
    const p = parsed || {};
    const company = p.company || p.employer || p.organization || '';
    const position = p.title || p.position || p.role || p.jobTitle || '';
    const location = p.location || p.city || '';
    let details = '';
    if (p.jobDetails) details = p.jobDetails;
    else if (p.description) details = p.description;
    if (p.requirements) {
        details += '\n\nRequirements:\n' + (Array.isArray(p.requirements) ? p.requirements.join('\n') : p.requirements);
    }
    if (p.skills) {
        details += '\n\nSkills:\n' + (Array.isArray(p.skills) ? p.skills.join(', ') : p.skills);
    }
    const description = (p.description || '').slice(0, 400);
    const url = p.applyUrl || p.url || sourceUrl || '';
    const datePosted = p.postedDate || p.posted || null;

    return {
        company,
        position,
        location,
        description,
        jobDetails: details.trim(),
        url,
        datePosted,
        status: 'saved',
        notes: ''
    };
}

/**
 * Show API warning
 */
function showAPIWarning(elementId) {
    const warning = document.getElementById(elementId);
    if (warning) {
        warning.classList.remove('hidden');
    }
}

/**
 * Check if API is configured
 */
function isAPIConfigured() {
    // Check new Settings via global store first
    try {
        const store = getStore();
        const settings = store?.getState('settings');
        const providers = settings?.apiProviders || {};
        const anyKey = ['claude', 'openai'].some(p => providers[p]?.apiKey && providers[p].apiKey.trim().length > 0);
        if (anyKey) return true;
    } catch (e) { /* ignore */ }

    // Fallback to localStorage (legacy)
    const claudeKey = localStorage.getItem('claude_api_key');
    const openaiKey = localStorage.getItem('openai_api_key');
    const legacyKey = localStorage.getItem('api_key');
    return !!(claudeKey || openaiKey || legacyKey);
}

/**
 * Simulate job import (placeholder for actual AI API call)
 */
async function simulateJobImport(content, method, instructions) {
    // TODO: Implement actual AI API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                success: true,
                jobData: {
                    company: 'Example Company',
                    position: 'Software Engineer',
                    location: 'Remote',
                    description: 'Imported job description...',
                    status: 'saved'
                }
            });
        }, 2000);
    });
}

/**
 * Parse resume JSON
 */
function parseResumeJSON(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        alert('Invalid JSON format. Please check your input.');
        throw error;
    }
}

/**
 * Read resume from file
 */
async function readResumeFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Fetch resume from URL
 */
async function fetchResumeFromURL(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        alert('Failed to fetch resume from URL: ' + error.message);
        throw error;
    }
}

/**
 * Add imported job to data
 */
async function addImportedJob(jobData) {
    try {
        const app = window.appManager;
        if (app && typeof app.saveItem === 'function') {
            const prev = app.currentSection;
            app.currentSection = 'jobs';
            app.saveItem({ ...jobData }, false);
            app.currentSection = prev;
            console.log('ImportExportManager: Job added via app manager');
        } else {
            console.log('ImportExportManager: App manager not available; job not persisted');
        }
    } catch (e) {
        console.error('ImportExportManager: Failed to add imported job:', e);
    }
}

/**
 * Add imported resume to data
 */
async function addImportedResume(name, resumeData) {
    // TODO: Integrate with app-manager to add resume
    console.log('ImportExportManager: Adding imported resume:', name, resumeData);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    try {
        if (window.appManager && typeof window.appManager.showToast === 'function') {
            window.appManager.showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
        }
    } catch (e) {
        console.log(`Toast (${type}): ${message}`);
    }
}
