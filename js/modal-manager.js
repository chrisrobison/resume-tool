// modal-manager.js - Modal management system
// Extracted from jobs.html embedded JavaScript

import { generateFormHTML, extractFormData, populateForm, validateForm } from './form-generator.js';
import { getSchema } from './schema-definitions.js';

/**
 * Modal configuration registry
 */
const modalRegistry = new Map();

/**
 * Current modal state
 */
let currentModal = null;
let currentSection = null;
let currentItem = null;
let currentSaveCallback = null;

/**
 * Initialize modal manager
 */
export function init() {
    setupModalEventListeners();
    registerDefaultModals();
    console.log('ModalManager: Initialized');
}

/**
 * Setup global modal event listeners
 */
export function setupModalEventListeners() {
    try {
        // Generic form modal events
        const formModalClose = document.getElementById('form-modal-close');
        if (formModalClose) {
            formModalClose.addEventListener('click', () => closeModal('form-modal'));
        }

        const formCancel = document.getElementById('form-cancel');
        if (formCancel) {
            formCancel.addEventListener('click', () => closeModal('form-modal'));
        }

        const formSave = document.getElementById('form-save');
        if (formSave) {
            formSave.addEventListener('click', handleFormSave);
        }

        // Settings modal events - handled by settings-manager component
        
        // Export modal events
        const exportModalClose = document.getElementById('export-modal-close');
        if (exportModalClose) {
            exportModalClose.addEventListener('click', () => closeModal('export-modal'));
        }

        // AI modal events
        const aiModalClose = document.getElementById('ai-modal-close');
        if (aiModalClose) {
            aiModalClose.addEventListener('click', () => closeModal('ai-modal'));
        }

        // Import job modal events
        const importJobModalClose = document.getElementById('import-job-modal-close');
        if (importJobModalClose) {
            importJobModalClose.addEventListener('click', () => closeModal('import-job-modal'));
        }

        // Import resume modal events
        const importResumeModalClose = document.getElementById('import-resume-modal-close');
        if (importResumeModalClose) {
            importResumeModalClose.addEventListener('click', () => closeModal('import-resume-modal'));
        }

        // Close modals on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    const modalId = backdrop.id;
                    closeModal(modalId);
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && currentModal) {
                closeModal(currentModal);
            }
        });
        
        console.log('ModalManager: Event listeners setup complete');
        
    } catch (error) {
        console.error('ModalManager: Failed to setup event listeners:', error);
    }
}

/**
 * Register default modal configurations
 */
function registerDefaultModals() {
    // Generic form modal
    registerModal('form-modal', {
        element: document.getElementById('form-modal'),
        titleElement: document.getElementById('form-modal-title'),
        bodyElement: document.querySelector('#form-modal .modal-body'),
        type: 'form'
    });

    // Import job modal
    registerModal('import-job-modal', {
        element: document.getElementById('import-job-modal'),
        type: 'import-job'
    });

    // Import resume modal
    registerModal('import-resume-modal', {
        element: document.getElementById('import-resume-modal'),
        type: 'import-resume'
    });

    // AI modal
    registerModal('ai-modal', {
        element: document.getElementById('ai-modal'),
        type: 'ai'
    });

    // Export modal
    registerModal('export-modal', {
        element: document.getElementById('export-modal'),
        type: 'export'
    });
}

/**
 * Register a modal configuration
 * @param {string} modalId - Modal identifier
 * @param {object} config - Modal configuration
 */
export function registerModal(modalId, config) {
    modalRegistry.set(modalId, config);
    console.log(`ModalManager: Registered modal: ${modalId}`);
}

/**
 * Open form modal for creating/editing items
 * @param {string} section - Current section
 * @param {object|null} item - Item to edit (null for new item)
 * @param {Function} saveCallback - Callback when item is saved
 */
export function openFormModal(section, item = null, saveCallback = null) {
    try {
        const schema = getSchema(section);
        if (!schema) {
            console.error(`ModalManager: No schema found for section: ${section}`);
            return false;
        }

        const modal = modalRegistry.get('form-modal');
        if (!modal) {
            console.error('ModalManager: Form modal not registered');
            return false;
        }

        // Set current state (also attach to modal element to survive state resets)
        currentSection = section;
        currentItem = item;
        currentSaveCallback = saveCallback;
        try {
            if (modal.element) {
                modal.element.dataset.currentSection = section;
                // Store callback and item directly on the DOM element (non-enumerable if possible)
                modal.element._currentSaveCallback = saveCallback;
                modal.element._currentItem = item;
            }
        } catch (e) {
            // Non-fatal if DOM access fails
        }

        // Update modal title
        const isEdit = item !== null;
        const sectionName = section.slice(0, -1); // Remove 's' from plural
        const title = isEdit ? `Edit ${sectionName}` : `Add ${sectionName}`;
        
        if (modal.titleElement) {
            modal.titleElement.textContent = title;
        }

        // Generate form content
        const formData = item || {};
        const formHTML = generateFormHTML(schema, formData, section);
        
        if (modal.bodyElement) {
            modal.bodyElement.innerHTML = `<form id="generic-form">${formHTML}</form>`;
        }

        // If the form contains resume editor/viewer elements, try to pre-load data into them
        try {
            if (section === 'resumes' && modal.bodyElement) {
                // The resume field uses id patterns like resume-editor-content and resume-viewer-content
                const editorEl = modal.bodyElement.querySelector('resume-editor-migrated, resume-editor');
                const viewerEl = modal.bodyElement.querySelector('resume-viewer-migrated, resume-viewer');
                const resumeSource = item?.data || item?.content || item || null;
                const parsed = typeof resumeSource === 'string' ? (() => { try { return JSON.parse(resumeSource); } catch { return null; } })() : resumeSource;
                if (parsed) {
                    if (editorEl && typeof editorEl.setResumeData === 'function') {
                        try { editorEl.setResumeData(parsed); } catch (e) { /* ignore */ }
                    }
                    if (viewerEl && typeof viewerEl.setResumeData === 'function') {
                        try { viewerEl.setResumeData(parsed); } catch (e) { /* ignore */ }
                    }
                }
            }
        } catch (e) { /* non-fatal */ }
        // Show modal
        showModal('form-modal');
        
        console.log(`ModalManager: Opened form modal for ${section}`);
        return true;
        
    } catch (error) {
        console.error('ModalManager: Failed to open form modal:', error);
        return false;
    }
}

/**
 * Handle form save
 */
function handleFormSave() {
    try {
        // Prefer module state, but fall back to modal element-stored callback
        let saveCb = currentSaveCallback;
        let section = currentSection;
        let item = currentItem;
        if ((!section || !saveCb) && modalRegistry.has('form-modal')) {
            const modal = modalRegistry.get('form-modal');
            if (modal && modal.element) {
                section = section || modal.element.dataset.currentSection || null;
                saveCb = saveCb || modal.element._currentSaveCallback || null;
                item = item || modal.element._currentItem || null;
            }
        }

        if (!section || !saveCb) {
            console.error('ModalManager: No current section or save callback');
            return;
        }

        const form = document.getElementById('generic-form');
        if (!form) {
            console.error('ModalManager: Form not found');
            return;
        }

        // Validate form
        const validation = validateForm(form, currentSection);
        if (!validation.valid) {
            // Show validation errors
            Object.entries(validation.errors).forEach(([field, message]) => {
                showFieldError(field, message);
            });
            return;
        }

        // Extract form data
        const formData = extractFormData(form);
        
        // Preserve existing ID if editing
        if (item && item.id) {
            formData.id = item.id;
        }

        // Call save callback
        const isEdit = item !== null;
        try {
            saveCb(formData, isEdit);
        } catch (err) {
            console.error('ModalManager: Save callback threw an error:', err);
        }

        // Close modal
        closeModal('form-modal');
        
        console.log('ModalManager: Form saved successfully');
        
    } catch (error) {
        console.error('ModalManager: Failed to handle form save:', error);
    }
}

/**
 * Show a modal
 * @param {string} modalId - Modal identifier
 */
export function showModal(modalId) {
    try {
        const modal = modalRegistry.get(modalId);
        if (!modal || !modal.element) {
            console.error(`ModalManager: Modal not found: ${modalId}`);
            return false;
        }

        // Hide other modals first
        hideAllModals();

        // Show the requested modal (ensure it is visible even if global CSS is strict)
        modal.element.classList.remove('hidden');
        try {
            // Backdrop often uses flex layout for centering
            modal.element.style.setProperty('display', 'flex', 'important');
            // Ensure inner modal element is displayed (some legacy code may hide it)
            const inner = modal.element.querySelector('.modal');
            if (inner) {
                inner.style.removeProperty('display');
                inner.style.display = 'block';
            }
        } catch (e) {}
        currentModal = modalId;

        // Focus first input if it's a form modal
        if (modal.type === 'form') {
            setTimeout(() => {
                const firstInput = modal.element.querySelector('input, textarea, select');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }

        // Special-case behavior for import modal: if no API keys are configured,
        // prefer the description import flow so users can paste job descriptions.
        try {
            if (modalId === 'import-job-modal') {
                const hasAPIKey = !!(localStorage.getItem('claude_api_key') || localStorage.getItem('openai_api_key') || localStorage.getItem('api_key'));
                if (!hasAPIKey) {
                    const descRadio = document.getElementById('import-method-description');
                    const urlSection = document.getElementById('import-url-section');
                    const descSection = document.getElementById('import-description-section');
                    if (descRadio) descRadio.checked = true;
                    if (urlSection) urlSection.classList.add('hidden');
                    if (descSection) descSection.classList.remove('hidden');
                }
            }
        } catch (e) {
            // Non-fatal
        }

        console.log(`ModalManager: Showed modal: ${modalId}`);
        return true;
        
    } catch (error) {
        console.error(`ModalManager: Failed to show modal ${modalId}:`, error);
        return false;
    }
}

/**
 * Close a modal
 * @param {string} modalId - Modal identifier
 */
export function closeModal(modalId) {
    try {
        const modal = modalRegistry.get(modalId);
        if (!modal || !modal.element) {
            console.error(`ModalManager: Modal not found: ${modalId}`);
            return false;
        }

        modal.element.classList.add('hidden');
        try {
            // Remove any inline display override left by showModal so the backdrop
            // doesn't remain interactable/cover other elements.
            modal.element.style.removeProperty('display');
            modal.element.style.display = '';
            const inner = modal.element.querySelector('.modal');
            if (inner) {
                inner.style.removeProperty('display');
                inner.style.display = '';
            }
        } catch (e) {
            // Non-fatal
        }
        
        if (currentModal === modalId) {
            currentModal = null;
            currentSection = null;
            currentItem = null;
            currentSaveCallback = null;
        }

        console.log(`ModalManager: Closed modal: ${modalId}`);
        return true;
        
    } catch (error) {
        console.error(`ModalManager: Failed to close modal ${modalId}:`, error);
        return false;
    }
}

/**
 * Hide all modals
 */
export function hideAllModals() {
    try {
        modalRegistry.forEach((modal, modalId) => {
            if (modal.element) {
                modal.element.classList.add('hidden');
                try {
                    modal.element.style.removeProperty('display');
                    modal.element.style.display = '';
                } catch (e) {}
                try {
                    const inner = modal.element.querySelector('.modal');
                    if (inner) {
                        inner.style.removeProperty('display');
                        inner.style.display = '';
                    }
                } catch (e) {}
            }
        });
        
        currentModal = null;
        currentSection = null;
        currentItem = null;
        currentSaveCallback = null;
        
    } catch (error) {
        console.error('ModalManager: Failed to hide all modals:', error);
    }
}

/**
 * Check if a modal is currently open
 * @param {string} modalId - Modal identifier (optional)
 * @returns {boolean} True if modal is open
 */
export function isModalOpen(modalId = null) {
    if (modalId) {
        return currentModal === modalId;
    }
    return currentModal !== null;
}

/**
 * Get current modal information
 * @returns {object|null} Current modal info
 */
export function getCurrentModal() {
    if (!currentModal) return null;
    
    return {
        modalId: currentModal,
        section: currentSection,
        item: currentItem
    };
}

/**
 * Show field validation error
 * @param {string} fieldName - Field name
 * @param {string} message - Error message
 */
function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;

    // Remove existing error styling
    field.classList.remove('error');
    
    // Add error styling
    field.classList.add('error');
    
    // Show error message
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * Clear field validation errors
 * @param {string} fieldName - Field name (optional, clears all if not provided)
 */
function clearFieldErrors(fieldName = null) {
    if (fieldName) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.remove('error');
            const errorElement = field.parentNode.querySelector('.field-error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    } else {
        // Clear all errors
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        document.querySelectorAll('.field-error').forEach(error => {
            error.style.display = 'none';
        });
    }
}

/**
 * Create and show a confirmation modal
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled (optional)
 */
export function showConfirmation(message, onConfirm, onCancel = null) {
    const modal = ensureUtilityModal('confirmation-modal', 'Confirmation', message, [
        { id: 'cancel', label: 'Cancel', className: 'btn', action: 'cancel' },
        { id: 'ok', label: 'Confirm', className: 'btn btn-primary', action: 'confirm' }
    ]);
    showUtilityModal(modal, (action) => {
        if (action === 'confirm') {
            onConfirm && onConfirm();
        } else if (action === 'cancel') {
            onCancel && onCancel();
        }
    });
}

/**
 * Show a simple alert modal
 * @param {string} message - Alert message
 * @param {string} type - Alert type (info, warning, error, success)
 */
export function showAlert(message, type = 'info') {
    const titleMap = { info: 'Info', warning: 'Warning', error: 'Error', success: 'Success' };
    const modal = ensureUtilityModal('alert-modal', titleMap[type] || 'Alert', message, [
        { id: 'ok', label: 'OK', className: 'btn btn-primary', action: 'ok' }
    ]);
    showUtilityModal(modal, () => {});
}

// --- Utility modal helpers ---
function ensureUtilityModal(id, title, message, buttons) {
    let backdrop = document.getElementById(id);
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = id;
        backdrop.className = 'modal-backdrop hidden';
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
                <div class="modal-header">
                    <h3 class="modal-title" id="${id}-title"></h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body"><div class="modal-message"></div></div>
                <div class="modal-footer"></div>
            </div>
        `;
        document.body.appendChild(backdrop);
        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) hideUtilityModal(backdrop);
        });
        // Close on header X
        backdrop.querySelector('.modal-close')?.addEventListener('click', () => hideUtilityModal(backdrop));
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (backdrop.classList.contains('hidden')) return;
            if (e.key === 'Escape') hideUtilityModal(backdrop);
        });
    }
    // Populate content
    const titleEl = backdrop.querySelector('.modal-title');
    const msgEl = backdrop.querySelector('.modal-message');
    const footer = backdrop.querySelector('.modal-footer');
    if (titleEl) titleEl.textContent = title || '';
    if (msgEl) msgEl.textContent = message || '';
    if (footer) {
        footer.innerHTML = '';
        buttons.forEach((btn) => {
            const b = document.createElement('button');
            b.id = `${id}-${btn.id}`;
            b.className = btn.className || 'btn';
            b.textContent = btn.label;
            b.dataset.action = btn.action || btn.id;
            footer.appendChild(b);
        });
    }
    return backdrop;
}

function showUtilityModal(backdrop, onAction) {
    if (!backdrop) return;
    // Wire button handlers
    backdrop.querySelectorAll('.modal-footer button').forEach((btn) => {
        btn.onclick = () => {
            const action = btn.dataset.action || 'ok';
            hideUtilityModal(backdrop);
            onAction && onAction(action);
        };
    });
    // Show
    try {
        hideAllModals();
    } catch (e) { /* ignore */ }
    backdrop.classList.remove('hidden');
    backdrop.style.display = 'flex';
    setTimeout(() => {
        const first = backdrop.querySelector('.modal-footer button') || backdrop.querySelector('.modal-close');
        first && first.focus && first.focus();
    }, 30);
}

function hideUtilityModal(backdrop) {
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    try { backdrop.style.removeProperty('display'); } catch (e) {}
}

// Initialize modal manager when module loads
// init() will be called by app-manager
