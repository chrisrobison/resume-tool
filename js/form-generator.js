// form-generator.js - Dynamic form generation system
// Extracted from jobs.html embedded JavaScript

import { validateField } from './schema-definitions.js';

/**
 * Utility function to escape HTML content
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format date for datetime-local input
 */
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Generate form HTML for item details
 * @param {object} schema - Field schema definition
 * @param {object} item - Item data
 * @param {string} section - Current section
 * @returns {string} Generated HTML
 */
export function generateFormHTML(schema, item, section) {
    try {
        let html = '<div class="form-container">';
        
        Object.entries(schema).forEach(([key, field]) => {
            if (field.type === 'hidden') return;
            
            html += generateFieldHTML(key, field, item[key], section);
        });
        
        html += '</div>';
        return html;
        
    } catch (error) {
        console.error('FormGenerator: Failed to generate form HTML:', error);
        return '<div class="error-state">Failed to load form</div>';
    }
}

/**
 * Initialize interactive behaviors for a generated form container
 * - Wires resume editor/viewer tab buttons produced by generateResumeEditorField
 * @param {HTMLElement} container - The element where form HTML was injected
 */
export function initializeFormInteractions(container) {
    if (!container || !(container instanceof Element)) return;

    // Wire resume tab buttons (preview / edit / analytics)
    container.querySelectorAll('.resume-content-container').forEach(wrapper => {
        const btns = wrapper.querySelectorAll('.tab-btn');
        const panels = {
            preview: wrapper.querySelector('#preview-tab'),
            edit: wrapper.querySelector('#edit-tab'),
            analytics: wrapper.querySelector('#analytics-tab')
        };

        // Initialize panel display based on active class
        Object.entries(panels).forEach(([key, panel]) => {
            if (!panel) return;
            try { panel.style.display = panel.classList.contains('active') ? 'block' : 'none'; } catch (e) {}
        });

        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                // Toggle active class on buttons
                btns.forEach(b => b.classList.toggle('active', b === btn));

                // Show matching panel (also set inline display for robustness)
                Object.entries(panels).forEach(([key, panel]) => {
                    if (!panel) return;
                    const isActive = key === tab;
                    panel.classList.toggle('active', isActive);
                    try {
                        panel.style.setProperty('display', isActive ? 'block' : 'none', 'important');
                    } catch (err) { /* ignore */ }
                });

                // Ensure wrapper is visible
                try { wrapper.style.setProperty('display', wrapper.style.display || 'block', 'important'); } catch (e) {}

                // If switching to preview, attempt to render preview into viewer and ensure viewer visible
                if (tab === 'preview') {
                    // Prefer migrated component tag, fall back to legacy
                    const viewer = wrapper.querySelector('resume-viewer-migrated') || wrapper.querySelector('resume-viewer');
                    if (viewer) {
                        try { viewer.style.setProperty('display', viewer.style.display || 'block', 'important'); } catch (e) {}
                        if (typeof viewer.render === 'function') {
                            try { viewer.render(); } catch (e) { /* best-effort */ }
                        }
                    }
                }
            });
        });
    });
}

/**
 * Generate HTML for a single field
 * @param {string} key - Field key
 * @param {object} field - Field definition
 * @param {any} value - Field value
 * @param {string} section - Current section
 * @returns {string} Field HTML
 */
function generateFieldHTML(key, field, value, section) {
    let fieldValue = value || '';
    const readonly = field.readonly ? 'readonly' : '';
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
    
    // Format for datetime-local
    if (field.type === 'datetime-local') {
        fieldValue = formatDateForInput(fieldValue);
    }
    
    let html = `<div class="form-group" data-field="${key}">`;
    html += `<label class="form-label">${escapeHtml(field.label)}</label>`;
    
    switch (field.type) {
        case 'textarea':
            html += generateTextareaField(key, field, fieldValue, readonly, required, placeholder);
            break;
            
        case 'select':
            html += generateSelectField(key, field, fieldValue, readonly, required);
            break;
            
        case 'resume-editor':
            html += generateResumeEditorField(key, field, fieldValue);
            break;
            
        default:
            html += generateInputField(key, field, fieldValue, readonly, required, placeholder);
    }
    
    // Add validation error container
    html += `<div class="field-error" id="error-${key}" style="display: none;"></div>`;
    html += '</div>';
    
    return html;
}

/**
 * Generate textarea field HTML
 */
function generateTextareaField(key, field, value, readonly, required, placeholder) {
    const rows = field.rows || 3;
    return `<textarea 
        class="form-input form-textarea" 
        name="${key}" 
        rows="${rows}" 
        ${readonly} 
        ${required} 
        ${placeholder}
        onInput="window.formGenerator?.validateFieldOnInput('${key}')"
        onBlur="window.formGenerator?.validateFieldOnBlur('${key}')"
    >${escapeHtml(value)}</textarea>`;
}

/**
 * Generate select field HTML
 */
function generateSelectField(key, field, value, readonly, required) {
    let options = '';
    
    // Handle dynamic options (functions)
    let optionList = field.options;
    if (typeof optionList === 'function') {
        try {
            optionList = optionList();
        } catch (error) {
            console.error(`FormGenerator: Failed to get dynamic options for ${key}:`, error);
            optionList = [];
        }
    }
    
    // Add placeholder option
    if (field.placeholder) {
        options += `<option value="">${escapeHtml(field.placeholder)}</option>`;
    }
    
    // Generate options
    if (Array.isArray(optionList)) {
        optionList.forEach(option => {
            if (typeof option === 'string') {
                const selected = value === option ? 'selected' : '';
                options += `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
            } else if (option.value !== undefined) {
                const selected = value === option.value ? 'selected' : '';
                options += `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label || option.value)}</option>`;
            }
        });
    }
    
    return `<select 
        class="form-input" 
        name="${key}" 
        ${readonly ? 'disabled' : ''} 
        ${required}
        onChange="window.formGenerator?.validateFieldOnInput('${key}')"
    >${options}</select>`;
}

/**
 * Generate resume editor field HTML
 */
function generateResumeEditorField(key, field, value) {
    return `
        <div class="resume-content-container">
            <div class="resume-tabs">
                <button type="button" class="tab-btn active" data-tab="preview">Preview</button>
                <button type="button" class="tab-btn" data-tab="edit">Edit</button>
                <button type="button" class="tab-btn" data-tab="analytics">Analytics</button>
            </div>
            <div class="tab-content">
                <div class="tab-panel active" id="preview-tab">
                    <div class="resume-viewer-controls">
                        <label>Template: 
                            <select id="template-selector">
                                <optgroup label="Local Templates">
                                    <option value="basic">Basic</option>
                                    <option value="modern">Modern</option>
                                    <option value="compact">Compact</option>
                                    <option value="elegant">Elegant</option>
                                </optgroup>
                            </select>
                        </label>
                        <button type="button" class="btn btn-secondary" onclick="window.formGenerator?.exportResume()">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                    <div class="resume-viewer-container">
                        <resume-viewer-migrated id="resume-viewer-${key}"></resume-viewer-migrated>
                    </div>
                </div>
                <div class="tab-panel" id="edit-tab">
                    <resume-editor-migrated id="resume-editor-${key}"></resume-editor-migrated>
                </div>
                <div class="tab-panel" id="analytics-tab">
                    <resume-analytics id="resume-analytics-${key}"></resume-analytics>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate input field HTML
 */
function generateInputField(key, field, value, readonly, required, placeholder) {
    return `<input 
        type="${field.type}" 
        class="form-input" 
        name="${key}" 
        value="${escapeHtml(value)}" 
        ${readonly} 
        ${required} 
        ${placeholder}
        onInput="window.formGenerator?.validateFieldOnInput('${key}')"
        onBlur="window.formGenerator?.validateFieldOnBlur('${key}')"
    />`;
}

/**
 * Extract form data from a form element
 * @param {HTMLFormElement} form - Form element
 * @returns {object} Form data object
 */
export function extractFormData(form) {
    try {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
        
    } catch (error) {
        console.error('FormGenerator: Failed to extract form data:', error);
        return {};
    }
}

/**
 * Populate form with data
 * @param {HTMLFormElement} form - Form element
 * @param {object} data - Data to populate
 */
export function populateForm(form, data) {
    try {
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'datetime-local') {
                    field.value = formatDateForInput(value);
                } else {
                    field.value = value || '';
                }
            }
        });
        
    } catch (error) {
        console.error('FormGenerator: Failed to populate form:', error);
    }
}

/**
 * Validate field on input (real-time validation)
 * @param {string} fieldKey - Field key
 */
function validateFieldOnInput(fieldKey) {
    // TODO: Implement real-time validation
    // This would use the current section and schema to validate
    console.log(`FormGenerator: Validating field on input: ${fieldKey}`);
}

/**
 * Validate field on blur (when user leaves field)
 * @param {string} fieldKey - Field key
 */
function validateFieldOnBlur(fieldKey) {
    // TODO: Implement blur validation
    console.log(`FormGenerator: Validating field on blur: ${fieldKey}`);
}

/**
 * Export resume (for resume editor)
 */
function exportResume() {
    // TODO: Implement resume export
    console.log('FormGenerator: Export resume requested');
}

/**
 * Show field validation error
 * @param {string} fieldKey - Field key
 * @param {string} message - Error message
 */
export function showFieldError(fieldKey, message) {
    const errorElement = document.getElementById(`error-${fieldKey}`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        const fieldGroup = document.querySelector(`[data-field="${fieldKey}"]`);
        if (fieldGroup) {
            fieldGroup.classList.add('has-error');
        }
    }
}

/**
 * Clear field validation error
 * @param {string} fieldKey - Field key
 */
export function clearFieldError(fieldKey) {
    const errorElement = document.getElementById(`error-${fieldKey}`);
    if (errorElement) {
        errorElement.style.display = 'none';
        
        const fieldGroup = document.querySelector(`[data-field="${fieldKey}"]`);
        if (fieldGroup) {
            fieldGroup.classList.remove('has-error');
        }
    }
}

/**
 * Validate entire form
 * @param {HTMLFormElement} form - Form element
 * @param {string} section - Current section
 * @returns {object} Validation result
 */
export function validateForm(form, section) {
    const data = extractFormData(form);
    // Import validateItem dynamically to avoid circular imports
    import('./schema-definitions.js').then(({ validateItem }) => {
        return validateItem(section, data);
    });
    // For now, return basic validation
    return { valid: true, errors: {} };
}

// Make validation functions available globally for inline handlers
window.formGenerator = {
    validateFieldOnInput,
    validateFieldOnBlur,
    exportResume
};
