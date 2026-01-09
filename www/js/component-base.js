// component-base.js - Standardized Web Component Interface
// Base class that all components should extend for consistent behavior

import { getState, setState, subscribe } from './store.js';

/**
 * Base class for all Web Components in the application
 * Provides standardized interface for data, events, and app manager communication
 */
export class ComponentBase extends HTMLElement {
    constructor() {
        super();
        
        // Standard properties
        this._data = null;
        this._isInitialized = false;
        this._isConnected = false;
        this._storeSubscription = null;
        this._appManager = null;
        
        // Component metadata
        this._componentName = this.constructor.name;
        this._componentId = this.generateComponentId();
        
        // Bind standard methods
        this.setData = this.setData.bind(this);
        this.getData = this.getData.bind(this);
        this.refresh = this.refresh.bind(this);
        this.validate = this.validate.bind(this);
        this.handleStoreChange = this.handleStoreChange.bind(this);
        this.handleError = this.handleError.bind(this);
        
        console.log(`ComponentBase: Created ${this._componentName} with ID: ${this._componentId}`);
    }

    /**
     * Called when component is connected to DOM
     * Override this method in child classes, but call super.connectedCallback()
     */
    connectedCallback() {
        if (this._isConnected) return;
        
        this._isConnected = true;
        console.log(`ComponentBase: ${this._componentName} connected to DOM`);
        
        try {
            // Wait for app manager and store to be ready
            this.waitForDependencies().then(() => {
                this.initialize();
            });
        } catch (error) {
            this.handleError(error, 'Failed to connect component');
        }
    }

    /**
     * Called when component is disconnected from DOM
     * Override this method in child classes, but call super.disconnectedCallback()
     */
    disconnectedCallback() {
        this._isConnected = false;
        console.log(`ComponentBase: ${this._componentName} disconnected from DOM`);
        
        try {
            this.cleanup();
        } catch (error) {
            console.error(`ComponentBase: Error during ${this._componentName} cleanup:`, error);
        }
    }

    /**
     * Wait for dependencies to be ready (app manager, global store)
     */
    async waitForDependencies() {
        // If component doesn't need dependencies, skip the check
        if (this._skipDependencyCheck) {
            console.log(`ComponentBase: ${this._componentName} skipping dependency check`);
            return Promise.resolve();
        }

        const maxAttempts = 50; // 5 seconds max wait
        let attempts = 0;

        return new Promise((resolve) => {
            const checkDependencies = () => {
                // Check for app manager
                this._appManager = window.appManager || null;

                // Check for global store
                const state = getState();
                const storeReady = state && typeof state === 'object';

                if (this._appManager && storeReady) {
                    console.log(`ComponentBase: ${this._componentName} dependencies ready`);
                    resolve();
                    return true;
                }
                return false;
            };

            // Check immediately
            if (checkDependencies()) return;

            // Keep checking every 100ms
            const interval = setInterval(() => {
                attempts++;
                if (checkDependencies()) {
                    clearInterval(interval);
                } else if (attempts >= maxAttempts) {
                    console.warn(`ComponentBase: ${this._componentName} dependencies not ready after maximum attempts, proceeding anyway`);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Initialize the component after dependencies are ready
     * Override this method in child classes
     */
    async initialize() {
        if (this._isInitialized) return;
        
        try {
            console.log(`ComponentBase: Initializing ${this._componentName}`);
            
            // Register with app manager
            if (this._appManager) {
                this._appManager.registerComponent(this._componentId, this);
            }
            
            // Subscribe to store changes
            this.subscribeToStore();
            
            // Call child class initialization
            await this.onInitialize();
            
            this._isInitialized = true;
            this.emitEvent('component-initialized', { componentId: this._componentId });
            
            console.log(`ComponentBase: ${this._componentName} initialized successfully`);
            
        } catch (error) {
            this.handleError(error, 'Failed to initialize component');
        }
    }

    /**
     * Child class initialization hook
     * Override this method in child classes for custom initialization
     */
    async onInitialize() {
        // Default implementation - can be overridden
    }

    /**
     * Subscribe to global store changes
     */
    subscribeToStore() {
        try {
            this._storeSubscription = subscribe((event) => {
                this.handleStoreChange(event);
            });
        } catch (error) {
            console.error(`ComponentBase: Failed to subscribe to store for ${this._componentName}:`, error);
        }
    }

    /**
     * Handle global store changes
     * Override this method in child classes for custom store handling
     * @param {CustomEvent} event - Store change event
     */
    handleStoreChange(event) {
        // Default implementation - can be overridden
        console.log(`ComponentBase: ${this._componentName} received store change:`, event);
    }

    /**
     * Set component data
     * @param {any} data - Data to set
     * @param {string} source - Source of the data change
     * @param {string|null} origin - Optional origin identifier for the change (componentId)
     */
    setData(data, source = 'external', origin = null) {
        try {
            const previousData = this._data;
            this._data = data;

            // Notify of data change (pass origin so subscribers can ignore echoes)
            this.onDataChange(data, previousData, source, origin);

            // Emit data change event
            this.emitEvent('data-changed', {
                componentId: this._componentId,
                data: data,
                previousData: previousData,
                source: source,
                origin: origin
            });

            console.log(`ComponentBase: ${this._componentName} data updated from ${source}`);

        } catch (error) {
            this.handleError(error, 'Failed to set component data');
        }
    }

    /**
     * Get component data
     * @returns {any} Current component data
     */
    getData() {
        return this._data;
    }

    /**
     * Handle data changes
     * Override this method in child classes
     * @param {any} newData - New data
     * @param {any} previousData - Previous data
     * @param {string} source - Source of change
     */
    onDataChange(newData, previousData, source) {
        // Default implementation - can be overridden
    }

    /**
     * Refresh the component (re-render with current data)
     * @param {boolean} force - Force refresh even if not needed
     */
    async refresh(force = false) {
        try {
            if (!this._isInitialized && !force) {
                console.log(`ComponentBase: Skipping refresh for uninitialized ${this._componentName}`);
                return;
            }
            
            await this.onRefresh(force);
            
            this.emitEvent('component-refreshed', {
                componentId: this._componentId,
                forced: force
            });
            
        } catch (error) {
            this.handleError(error, 'Failed to refresh component');
        }
    }

    /**
     * Handle component refresh
     * Override this method in child classes
     * @param {boolean} force - Force refresh
     */
    async onRefresh(force = false) {
        // Default implementation - can be overridden
    }

    /**
     * Validate component data
     * @returns {object} Validation result {valid: boolean, errors: array}
     */
    validate() {
        try {
            return this.onValidate();
        } catch (error) {
            this.handleError(error, 'Validation failed');
            return { valid: false, errors: ['Validation error occurred'] };
        }
    }

    /**
     * Handle component validation
     * Override this method in child classes
     * @returns {object} Validation result
     */
    onValidate() {
        // Default implementation - always valid
        return { valid: true, errors: [] };
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {any} detail - Event detail data
     * @param {boolean} bubbles - Whether event should bubble
     */
    emitEvent(eventName, detail = null, bubbles = true) {
        try {
            const event = new CustomEvent(eventName, {
                detail: detail,
                bubbles: bubbles,
                composed: true
            });
            
            this.dispatchEvent(event);
            
        } catch (error) {
            console.error(`ComponentBase: Failed to emit event ${eventName} from ${this._componentName}:`, error);
        }
    }

    /**
     * Handle component errors
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context = 'Unknown') {
        console.error(`ComponentBase: ${this._componentName} error in ${context}:`, error);
        
        // Emit error event
        this.emitEvent('component-error', {
            componentId: this._componentId,
            componentName: this._componentName,
            error: error.message || String(error),
            context: context,
            timestamp: new Date().toISOString()
        });
        
        // Notify app manager if available
        if (this._appManager && typeof this._appManager.handleComponentError === 'function') {
            this._appManager.handleComponentError(this._componentId, error, context);
        }
    }

    /**
     * Cleanup component resources
     */
    cleanup() {
        try {
            // Unsubscribe from store
            if (this._storeSubscription) {
                this._storeSubscription();
                this._storeSubscription = null;
            }
            
            // Call child class cleanup
            this.onCleanup();
            
            // Unregister from app manager
            if (this._appManager && typeof this._appManager.unregisterComponent === 'function') {
                this._appManager.unregisterComponent(this._componentId);
            }
            
            this._isInitialized = false;
            
            console.log(`ComponentBase: ${this._componentName} cleanup completed`);
            
        } catch (error) {
            console.error(`ComponentBase: Error during ${this._componentName} cleanup:`, error);
        }
    }

    /**
     * Handle component cleanup
     * Override this method in child classes
     */
    onCleanup() {
        // Default implementation - can be overridden
    }

    /**
     * Generate unique component ID
     * @returns {string} Unique component ID
     */
    generateComponentId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${this._componentName.toLowerCase()}_${timestamp}_${random}`;
    }

    /**
     * Get component metadata
     * @returns {object} Component metadata
     */
    getMetadata() {
        return {
            componentName: this._componentName,
            componentId: this._componentId,
            isInitialized: this._isInitialized,
            isConnected: this._isConnected,
            hasData: this._data !== null,
            dataType: this._data ? typeof this._data : null
        };
    }

    /**
     * Update state in global store
     * @param {object} updates - State updates
     * @param {string} source - Source identifier
     */
    updateGlobalState(updates, source = null, origin = null) {
        try {
            const stateSource = source || `${this._componentName}-${this._componentId}`;
            const stateOrigin = origin || this._componentId;
            setState(updates, stateSource, stateOrigin);
        } catch (error) {
            this.handleError(error, 'Failed to update global state');
        }
    }

    /**
     * Get data from global store
     * @param {string} path - State path (optional)
     * @returns {any} State data
     */
    getGlobalState(path = null) {
        try {
            return getState(path);
        } catch (error) {
            this.handleError(error, 'Failed to get global state');
            return null;
        }
    }

    /**
     * Show toast notification via app manager
     * @param {string} message - Toast message
     * @param {string} type - Toast type (info, success, warning, error)
     */
    showToast(message, type = 'info') {
        if (this._appManager && typeof this._appManager.showToast === 'function') {
            this._appManager.showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
        }
    }

    /**
     * Check if component is ready for operations
     * @returns {boolean} True if component is ready
     */
    isReady() {
        return this._isInitialized && this._isConnected;
    }
}

/**
 * Mixin for components that need form validation
 */
export const FormValidationMixin = {
    /**
     * Validate form fields
     * @param {HTMLFormElement} form - Form element
     * @returns {object} Validation result
     */
    validateForm(form) {
        if (!form) return { valid: false, errors: ['Form not found'] };
        
        const errors = [];
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.name || field.id || 'Field'} is required`);
            }
        });
        
        // Email validation
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !this.isValidEmail(field.value)) {
                errors.push(`${field.name || field.id || 'Email field'} is not a valid email`);
            }
        });
        
        // URL validation
        const urlFields = form.querySelectorAll('input[type="url"]');
        urlFields.forEach(field => {
            if (field.value && !this.isValidURL(field.value)) {
                errors.push(`${field.name || field.id || 'URL field'} is not a valid URL`);
            }
        });
        
        return { valid: errors.length === 0, errors };
    },
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

/**
 * Mixin for components that handle modal dialogs
 */
export const ModalMixin = {
    /**
     * Show modal via app manager
     * @param {string} modalId - Modal identifier
     * @param {object} data - Modal data
     */
    showModal(modalId, data = null) {
        if (this._appManager && typeof this._appManager.showModal === 'function') {
            this._appManager.showModal(modalId, data);
        } else {
            console.warn(`ComponentBase: Cannot show modal ${modalId} - app manager not available`);
        }
    },
    
    /**
     * Close modal via app manager
     * @param {string} modalId - Modal identifier
     */
    closeModal(modalId) {
        if (this._appManager && typeof this._appManager.closeModal === 'function') {
            this._appManager.closeModal(modalId);
        } else {
            console.warn(`ComponentBase: Cannot close modal ${modalId} - app manager not available`);
        }
    }
};

/**
 * Apply mixins to ComponentBase
 */
Object.assign(ComponentBase.prototype, FormValidationMixin, ModalMixin);
