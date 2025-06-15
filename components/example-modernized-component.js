// example-modernized-component.js - Example of how to use ComponentBase
// This shows how to convert existing components to use the standardized interface

import { ComponentBase } from '../js/component-base.js';

/**
 * Example modernized component using ComponentBase
 * This serves as a template for converting existing components
 */
class ExampleModernizedComponent extends ComponentBase {
    constructor() {
        super();
        
        // Component-specific properties
        this._template = 'default';
        this._isProcessing = false;
        
        // Attach shadow DOM if needed
        this.attachShadow({ mode: 'open' });
    }

    /**
     * Custom initialization after dependencies are ready
     * Override from ComponentBase
     */
    async onInitialize() {
        console.log('ExampleModernizedComponent: Custom initialization');
        
        // Render initial UI
        this.render();
        
        // Setup component-specific event listeners
        this.setupEventListeners();
        
        // Load initial data if needed
        await this.loadInitialData();
    }

    /**
     * Handle data changes
     * Override from ComponentBase
     */
    onDataChange(newData, previousData, source) {
        console.log('ExampleModernizedComponent: Data changed from', source);
        
        // Re-render when data changes
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Handle component refresh
     * Override from ComponentBase
     */
    async onRefresh(force = false) {
        console.log('ExampleModernizedComponent: Refreshing', force ? '(forced)' : '');
        
        // Re-render the component
        this.render();
        
        // Reload data if forced
        if (force) {
            await this.loadInitialData();
        }
    }

    /**
     * Handle component validation
     * Override from ComponentBase
     */
    onValidate() {
        const errors = [];
        
        // Example validation
        if (!this._data) {
            errors.push('No data provided');
        }
        
        if (this._template && !this.isValidTemplate(this._template)) {
            errors.push('Invalid template specified');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Handle global store changes
     * Override from ComponentBase
     */
    handleStoreChange(event) {
        console.log('ExampleModernizedComponent: Store changed:', event);
        
        // Example: React to specific store changes
        if (event.detail && event.detail.source?.includes('job')) {
            // Job-related data changed, update if relevant
            const currentJob = this.getGlobalState('currentJob');
            if (currentJob) {
                this.setData(currentJob, 'store-sync');
            }
        }
    }

    /**
     * Handle component cleanup
     * Override from ComponentBase
     */
    onCleanup() {
        console.log('ExampleModernizedComponent: Custom cleanup');
        
        // Remove component-specific event listeners
        this.removeEventListeners();
        
        // Cancel any ongoing processes
        this._isProcessing = false;
    }

    /**
     * Render the component
     */
    render() {
        if (!this.shadowRoot) return;
        
        const data = this.getData();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 1rem;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                }
                
                .component-header {
                    font-weight: bold;
                    margin-bottom: 1rem;
                    color: #333;
                }
                
                .component-content {
                    color: #666;
                }
                
                .component-actions {
                    margin-top: 1rem;
                    display: flex;
                    gap: 0.5rem;
                }
                
                button {
                    padding: 0.5rem 1rem;
                    border: 1px solid #007bff;
                    background: #007bff;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                button:hover {
                    background: #0056b3;
                }
                
                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .processing {
                    opacity: 0.7;
                }
            </style>
            
            <div class="component-container ${this._isProcessing ? 'processing' : ''}">
                <div class="component-header">
                    Example Modernized Component (${this._componentName})
                </div>
                
                <div class="component-content">
                    <p>Component ID: ${this._componentId}</p>
                    <p>Template: ${this._template}</p>
                    <p>Has Data: ${data ? 'Yes' : 'No'}</p>
                    <p>Status: ${this.isReady() ? 'Ready' : 'Not Ready'}</p>
                    
                    ${data ? `
                        <div class="data-display">
                            <h4>Current Data:</h4>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
                
                <div class="component-actions">
                    <button id="refresh-btn" ${this._isProcessing ? 'disabled' : ''}>
                        Refresh
                    </button>
                    <button id="validate-btn" ${this._isProcessing ? 'disabled' : ''}>
                        Validate
                    </button>
                    <button id="test-btn" ${this._isProcessing ? 'disabled' : ''}>
                        Test Toast
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup component-specific event listeners
     */
    setupEventListeners() {
        if (!this.shadowRoot) return;
        
        // Refresh button
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh(true);
            });
        }
        
        // Validate button
        const validateBtn = this.shadowRoot.getElementById('validate-btn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                const result = this.validate();
                this.showToast(
                    result.valid ? 'Validation passed!' : `Validation failed: ${result.errors.join(', ')}`,
                    result.valid ? 'success' : 'error'
                );
            });
        }
        
        // Test toast button
        const testBtn = this.shadowRoot.getElementById('test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.showToast('This is a test toast message!', 'info');
            });
        }
    }

    /**
     * Remove component-specific event listeners
     */
    removeEventListeners() {
        // Event listeners on shadow DOM elements are automatically cleaned up
        // when the shadow DOM is destroyed, but you can do manual cleanup here if needed
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this._isProcessing = true;
            this.render(); // Update UI to show processing state
            
            // Simulate async data loading
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const initialData = {
                timestamp: new Date().toISOString(),
                message: 'Initial data loaded successfully',
                componentId: this._componentId
            };
            
            this.setData(initialData, 'initial-load');
            
        } catch (error) {
            this.handleError(error, 'Failed to load initial data');
        } finally {
            this._isProcessing = false;
            this.render(); // Update UI to hide processing state
        }
    }

    /**
     * Check if template is valid
     */
    isValidTemplate(template) {
        const validTemplates = ['default', 'compact', 'detailed'];
        return validTemplates.includes(template);
    }

    /**
     * Set template (example of component-specific method)
     */
    setTemplate(template) {
        if (this.isValidTemplate(template)) {
            this._template = template;
            this.render();
            
            // Emit custom event
            this.emitEvent('template-changed', {
                componentId: this._componentId,
                template: template
            });
            
            return true;
        } else {
            this.handleError(new Error(`Invalid template: ${template}`), 'setTemplate');
            return false;
        }
    }

    /**
     * Get template (example of component-specific method)
     */
    getTemplate() {
        return this._template;
    }

    /**
     * Example of using standardized form validation
     */
    validateInternalForm() {
        // This would be used if the component had forms
        const form = this.shadowRoot.querySelector('form');
        if (form) {
            return this.validateForm(form);
        }
        return { valid: true, errors: [] };
    }

    /**
     * Example of using standardized modal functionality
     */
    showExampleModal() {
        this.showModal('example-modal', {
            componentId: this._componentId,
            data: this.getData()
        });
    }
}

// Register the component
customElements.define('example-modernized-component', ExampleModernizedComponent);

// Export for use in other modules
export { ExampleModernizedComponent };

/**
 * MIGRATION GUIDE for existing components:
 * 
 * 1. Change class declaration:
 *    OLD: class MyComponent extends HTMLElement
 *    NEW: class MyComponent extends ComponentBase
 * 
 * 2. Import ComponentBase:
 *    Add: import { ComponentBase } from '../js/component-base.js';
 * 
 * 3. Update constructor:
 *    - Call super() first
 *    - Remove manual data/state initialization that's now in ComponentBase
 *    - Keep component-specific properties
 * 
 * 4. Replace connectedCallback:
 *    - Rename to onInitialize() and make it async
 *    - Remove dependency waiting logic (handled by ComponentBase)
 *    - Keep component-specific initialization
 * 
 * 5. Replace disconnectedCallback:
 *    - Rename to onCleanup()
 *    - Remove store unsubscription (handled by ComponentBase)
 *    - Keep component-specific cleanup
 * 
 * 6. Add data handling:
 *    - Override onDataChange() for data changes
 *    - Use setData()/getData() instead of direct property access
 * 
 * 7. Add refresh handling:
 *    - Override onRefresh() for component updates
 *    - Use refresh() method from other code
 * 
 * 8. Add validation:
 *    - Override onValidate() for component validation
 *    - Use validate() method for checking component state
 * 
 * 9. Use standardized methods:
 *    - this.showToast() for notifications
 *    - this.showModal()/closeModal() for modals
 *    - this.emitEvent() for custom events
 *    - this.handleError() for error handling
 *    - this.updateGlobalState()/getGlobalState() for store access
 * 
 * 10. Handle store changes:
 *     - Override handleStoreChange() instead of manual subscription
 * 
 * This provides consistent behavior across all components while allowing
 * for component-specific functionality.
 */