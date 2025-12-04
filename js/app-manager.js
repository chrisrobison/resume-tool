// app-manager.js - Main application coordinator
// Extracted from jobs.html embedded JavaScript

import { setState, getState } from './store.js';
import db from './database.js';
import * as sectionManager from './section-manager.js';
import * as formGenerator from './form-generator.js';
import * as modalManager from './modal-manager.js';
import * as importExportManager from './import-export-manager.js';
import * as cardRenderer from './card-renderer.js';
import { schemas } from './schema-definitions.js';
import { ComponentBase } from './component-base.js';
import * as utils from './utils.js';

/**
 * Main Application Manager
 * Coordinates all application components and provides standardized interface
 */
class AppManager {
    constructor() {
        // Application state
        this.currentSection = 'jobs';
        this.currentItem = null;
        this.data = {
            jobs: [],
            resumes: [],
            letters: [],
            ai: []
        };

        // Component registry
        this.components = new Map();

        // Bind methods
        this.init = this.init.bind(this);
        this.handleSectionSwitch = this.handleSectionSwitch.bind(this);
        this.handleItemSelection = this.handleItemSelection.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('AppManager: Initializing application...');

        try {
            this.setupEventListeners();

            // Wait for GlobalStore to be ready
            await this.waitForGlobalStore();

            // Load initial data from GlobalStore
            await this.reloadFromStore();

            // Initialize background data layer (IndexedDB) without blocking UI
            try {
                const dbReady = await db.init();
                if (dbReady) {
                    // Best-effort migration from localStorage if DB is empty
                    const mig = await db.migrateFromLocalStorage();
                    if (mig?.migrated) {
                        console.log('AppManager: Migrated localStorage snapshot to IndexedDB', mig.counts || {});
                        // Reload data after migration
                        await this.reloadFromStore();
                    }
                }
            } catch (dbErr) {
                console.warn('AppManager: Data service init skipped', dbErr);
            }

            // Listen for global store changes to sync resume components directly
            document.addEventListener('global-state-changed', async (e) => {
                try {
                    const payload = e.detail?.newState || e.detail || e;
                    const currentResume = payload?.currentResume || null;
                    if (currentResume) {
                        // derive resume data from possible shapes
                        const resumeData = currentResume.data || (currentResume.content ? (typeof currentResume.content === 'string' ? (() => { try { return JSON.parse(currentResume.content); } catch { return null; } })() : currentResume.content) : currentResume);
                        if (resumeData) {
                            // Wait for components to be defined
                            try {
                                if (customElements) {
                                    await Promise.all([
                                        customElements.whenDefined('resume-editor').catch(() => {}),
                                        customElements.whenDefined('resume-viewer').catch(() => {})
                                    ]);
                                }
                            } catch (waitErr) {
                                // ignore
                            }

                            const editor = document.querySelector('resume-editor');
                            const viewer = document.querySelector('resume-viewer');
                            try { if (editor && typeof editor.setResumeData === 'function') editor.setResumeData(resumeData); } catch (err) { console.warn(err); }
                            try { if (viewer && typeof viewer.setResumeData === 'function') viewer.setResumeData(resumeData); } catch (err) { console.warn(err); }
                        }
                    }
                } catch (err) {
                    console.warn('AppManager: Error syncing resume components from global state change', err);
                }
            });

            this.switchSection('jobs');

            console.log('AppManager: Application initialized successfully');
        } catch (error) {
            console.error('AppManager: Failed to initialize application:', error);
            this.handleError(error, 'Failed to initialize application');
        }
    }

    /**
     * Wait for GlobalStore to be ready
     */
    async waitForGlobalStore() {
        return new Promise((resolve) => {
            const checkStore = () => {
                const state = getState();
                if (state !== null && state !== undefined) {
                    console.log('AppManager: GlobalStore is ready');
                    resolve();
                } else {
                    console.log('AppManager: Waiting for GlobalStore...');
                    setTimeout(checkStore, 100);
                }
            };
            checkStore();
        });
    }

    /**
     * Load data from localStorage (temporary until IndexedDB migration)
     */
    loadData() {
        const defaultData = {
            jobs: [],
            resumes: [],
            letters: [],
            ai: []
        };

        try {
            const stored = localStorage.getItem('jobHuntData');
            return stored ? JSON.parse(stored) : defaultData;
        } catch (error) {
            console.error('AppManager: Failed to load data from localStorage:', error);
            return defaultData;
        }
    }

    /**
     * Reload data from global store (IndexedDB)
     */
    async reloadFromStore() {
        try {
            console.log('AppManager.reloadFromStore: Starting reload...');
            console.log('AppManager.reloadFromStore: Current section =', this.currentSection);
            console.log('AppManager.reloadFromStore: Current data.jobs.length =', this.data.jobs?.length || 0);

            const state = getState();
            console.log('AppManager.reloadFromStore: getState() returned:', state);

            if (state) {
                console.log('AppManager.reloadFromStore: State has jobs:', state.jobs?.length || 0);
                console.log('AppManager.reloadFromStore: State has resumes:', state.resumes?.length || 0);
                console.log('AppManager.reloadFromStore: State has coverLetters:', state.coverLetters?.length || 0);

                // Update local data from state
                this.data.jobs = state.jobs || [];
                this.data.resumes = state.resumes || [];
                this.data.letters = state.coverLetters || [];

                console.log('AppManager.reloadFromStore: Updated this.data.jobs.length =', this.data.jobs.length);

                // Refresh UI
                console.log('AppManager.reloadFromStore: Calling renderItemsList()...');
                this.renderItemsList();

                console.log(`AppManager.reloadFromStore: Complete - ${this.data.jobs.length} jobs, ${this.data.resumes.length} resumes`);
            } else {
                console.warn('AppManager.reloadFromStore: getState() returned null/undefined');
            }
        } catch (error) {
            console.error('AppManager: Failed to reload from store:', error);
        }
    }

    /**
     * Save data to global store (which persists to IndexedDB)
     */
    saveData() {
        try {
            console.log('AppManager: Saving data to GlobalStore...');

            // Save to global store (which will persist to IndexedDB)
            setState({
                jobs: this.data.jobs || [],
                resumes: this.data.resumes || [],
                coverLetters: this.data.letters || []
            }, 'app-manager-save-sync');

            console.log('AppManager: Data saved successfully');

        } catch (error) {
            console.error('AppManager: Failed to save data:', error);
            this.handleError(error, 'Failed to save data');
        }
    }

    /**
     * Sync data with global store
     */
    async syncWithGlobalStore() {
        try {
            // Wait for global store to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            setState({
                jobs: this.data.jobs || [],
                resumes: this.data.resumes || [],
                coverLetters: this.data.letters || []
            }, 'app-manager-sync');
            
        } catch (error) {
            console.error('AppManager: Failed to sync with global store:', error);
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        try {
            // Navigation events
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const section = item.dataset.section;
                    if (section) {
                        e.preventDefault();
                        this.handleSectionSwitch(section);
                    }
                });
            });

            // Main action buttons
            const addBtn = document.getElementById('add-item-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addNewItem());
            }

            const importJobBtn = document.getElementById('import-job-btn');
            if (importJobBtn) {
                importJobBtn.addEventListener('click', () => this.openImportJobModal());
            }

            const importResumeBtn = document.getElementById('import-resume-btn');
            if (importResumeBtn) {
                importResumeBtn.addEventListener('click', () => this.openImportResumeModal());
            }

            // Modal close events
            modalManager.setupModalEventListeners();

            // Listen for extension sync data updates
            window.addEventListener('jhm-data-updated', async (event) => {
                console.log('AppManager: Received jhm-data-updated event:', event.detail);

                if (event.detail?.source === 'extension-sync') {
                    console.log('AppManager: Extension sync completed, reloading data...');
                    await this.reloadFromStore();
                }
            });

            console.log('AppManager: Event listeners setup complete');
        } catch (error) {
            console.error('AppManager: Failed to setup event listeners:', error);
        }
    }

    /**
     * Switch between application sections
     */
    switchSection(section) {
        try {
            this.currentSection = section;
            this.currentItem = null;
            
            sectionManager.switchSection(section);
            this.renderItemsList();
            this.showEmptyState();
            
            console.log(`AppManager: Switched to section: ${section}`);
        } catch (error) {
            console.error(`AppManager: Failed to switch to section ${section}:`, error);
            this.handleError(error, `Failed to switch to ${section} section`);
        }
    }

    /**
     * Handle section switch events from UI elements
     * @param {string} section - Section identifier
     */
    handleSectionSwitch(section) {
        this.switchSection(section);
    }

    /**
     * Render the list of items for current section
     */
    renderItemsList() {
        try {
            console.log('AppManager.renderItemsList: Starting render...');
            console.log('AppManager.renderItemsList: Current section =', this.currentSection);

            const container = document.getElementById('items-list');
            if (!container) {
                console.warn('AppManager.renderItemsList: items-list container not found!');
                return;
            }

            const items = this.data[this.currentSection] || [];
            console.log('AppManager.renderItemsList: Items to render =', items.length);
            console.log('AppManager.renderItemsList: First few items:', items.slice(0, 3));

            cardRenderer.renderItemsList(container, items, this.currentSection, this.handleItemSelection);

            console.log('AppManager.renderItemsList: Render complete');
        } catch (error) {
            console.error('AppManager: Failed to render items list:', error);
        }
    }

    /**
     * Handle item selection
     */
    async handleItemSelection(item) {
        try {
            this.currentItem = item;
            
            // Update UI selection state
            document.querySelectorAll('.item-card').forEach(card => {
                card.classList.remove('active');
            });
            
            const selectedCard = document.querySelector(`[data-item-id="${item.id}"]`);
            if (selectedCard) {
                selectedCard.classList.add('active');
            }

            // Sync with global store
            if (this.currentSection === 'jobs') {
                setState({ currentJob: item }, 'app-manager-job-selection');
            } else if (this.currentSection === 'resumes') {
                setState({ currentResume: item }, 'app-manager-resume-selection');
            }

            this.renderItemDetails(item);
            // If selecting a resume item, set resume components directly
            try {
                if (this.currentSection === 'resumes') {
                    const resumeData = item?.data || item?.content || item || null;
                    const parsed = typeof resumeData === 'string' ? (() => { try { return JSON.parse(resumeData); } catch { return null; } })() : resumeData;
                    if (parsed) {
                        // Ensure components are defined before setting data to avoid race conditions
                        try {
                            if (customElements) {
                                await Promise.all([
                                    customElements.whenDefined('resume-editor').catch(() => {}),
                                    customElements.whenDefined('resume-viewer').catch(() => {})
                                ]);
                            }
                        } catch (waitErr) { /* ignore */ }

                        const editor = document.querySelector('resume-editor');
                        const viewer = document.querySelector('resume-viewer');
                        try { if (editor && typeof editor.setResumeData === 'function') editor.setResumeData(parsed); } catch (err) { console.warn(err); }
                        try { if (viewer && typeof viewer.setResumeData === 'function') viewer.setResumeData(parsed); } catch (err) { console.warn(err); }
                    }
                }
            } catch (e) { /* ignore */ }
            
        } catch (error) {
            console.error('AppManager: Failed to handle item selection:', error);
        }
    }

    /**
     * Render item details in the details panel
     */
    renderItemDetails(item) {
        try {
            const content = document.getElementById('details-content');
            if (!content) return;

            const schema = schemas[this.currentSection];
            if (!schema) {
                console.error(`AppManager: No schema found for section: ${this.currentSection}`);
                return;
            }

            const html = formGenerator.generateFormHTML(schema, item, this.currentSection);
            content.innerHTML = html;

            // Initialize dynamic form interactions (tabs, resume viewer/editor wiring)
            try {
                formGenerator.initializeFormInteractions(content);
            } catch (e) {
                console.warn('AppManager: Failed to initialize form interactions', e);
            }
            
        } catch (error) {
            console.error('AppManager: Failed to render item details:', error);
        }
    }

    /**
     * Show empty state when no item is selected
     */
    showEmptyState() {
        try {
            const content = document.getElementById('details-content');
            if (!content) return;

            const emptyStateConfig = {
                jobs: { icon: 'briefcase', message: 'Select a job to view details' },
                resumes: { icon: 'file-alt', message: 'Select a resume to view details' },
                letters: { icon: 'envelope', message: 'Select a letter to view details' },
                ai: { icon: 'robot', message: 'Select an AI interaction to view details' }
            };

            const config = emptyStateConfig[this.currentSection] || emptyStateConfig.jobs;
            
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-${config.icon}"></i>
                    <h3>${config.message}</h3>
                    <p>Choose an item from the list to view and edit its information</p>
                </div>
            `;
        } catch (error) {
            console.error('AppManager: Failed to show empty state:', error);
        }
    }

    /**
     * Add new item for current section
     */
    addNewItem() {
        try {
            modalManager.openFormModal(this.currentSection, null, this.saveItem.bind(this));
        } catch (error) {
            console.error('AppManager: Failed to add new item:', error);
            this.handleError(error, 'Failed to add new item');
        }
    }

    /**
     * Save item (create or update)
     * @param {Object} itemData - The item data to save
     * @param {boolean} isEdit - Whether this is an edit operation
     * @param {boolean} skipSelection - Skip selecting the item after save (useful for imports)
     */
    saveItem(itemData, isEdit = false, skipSelection = false) {
        try {
            if (!itemData.id) {
                itemData.id = this.generateId();
                itemData.dateCreated = new Date().toISOString();
            }

            itemData.dateModified = new Date().toISOString();

            // Find existing item index
            const items = this.data[this.currentSection];
            const existingIndex = items.findIndex(item => item.id === itemData.id);

            if (existingIndex >= 0) {
                // Update existing item
                items[existingIndex] = { ...items[existingIndex], ...itemData };
            } else {
                // Add new item
                items.push(itemData);
            }

            this.saveData();
            this.renderItemsList();

            // Select the saved item (unless skipped for imports)
            if (!skipSelection) {
                this.handleItemSelection(itemData);
            }

            console.log(`AppManager: ${isEdit ? 'Updated' : 'Created'} ${this.currentSection} item:`, itemData.id);

        } catch (error) {
            console.error('AppManager: Failed to save item:', error);
            this.handleError(error, 'Failed to save item');
        }
    }

    /**
     * Delete item
     */
    deleteItem(itemId) {
        try {
            const items = this.data[this.currentSection];
            const index = items.findIndex(item => item.id === itemId);
            
            if (index >= 0) {
                items.splice(index, 1);
                this.saveData();
                this.renderItemsList();
                this.showEmptyState();
                
                console.log(`AppManager: Deleted ${this.currentSection} item:`, itemId);
            }
            
        } catch (error) {
            console.error('AppManager: Failed to delete item:', error);
            this.handleError(error, 'Failed to delete item');
        }
    }

    /**
     * Open import job modal
     */
    openImportJobModal() {
        importExportManager.openImportJobModal();
    }

    /**
     * Open import resume modal  
     */
    openImportResumeModal() {
        importExportManager.openImportResumeModal();
    }

    /**
     * Generate unique ID for items
     */
    generateId() {
        return `${this.currentSection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Register a component with the app manager
     * @param {string} componentId - Unique component identifier
     * @param {ComponentBase} component - Component instance
     */
    registerComponent(componentId, component) {
        this.components.set(componentId, component);
        console.log(`AppManager: Registered component: ${componentId}`);
        
        // Emit component registration event
        this.emitEvent('component-registered', {
            componentId: componentId,
            componentName: component.constructor.name,
            metadata: component.getMetadata ? component.getMetadata() : {}
        });
    }

    /**
     * Unregister a component from the app manager
     * @param {string} componentId - Component identifier
     */
    unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            this.components.delete(componentId);
            console.log(`AppManager: Unregistered component: ${componentId}`);
            
            // Emit component unregistration event
            this.emitEvent('component-unregistered', {
                componentId: componentId
            });
        }
    }

    /**
     * Get registered component
     * @param {string} componentId - Component identifier
     * @returns {ComponentBase|null} Component instance
     */
    getComponent(componentId) {
        return this.components.get(componentId) || null;
    }

    /**
     * Get all registered components
     * @returns {Map} All registered components
     */
    getAllComponents() {
        return new Map(this.components);
    }

    /**
     * Find components by type/name
     * @param {string} componentName - Component class name
     * @returns {Array} Array of matching components
     */
    getComponentsByType(componentName) {
        const matches = [];
        this.components.forEach((component, componentId) => {
            if (component.constructor.name === componentName) {
                matches.push({ componentId, component });
            }
        });
        return matches;
    }

    /**
     * Handle component errors
     * @param {string} componentId - Component identifier
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleComponentError(componentId, error, context) {
        console.error(`AppManager: Component error [${componentId}] in ${context}:`, error);
        
        // Show user-friendly error message
        this.showToast(`Component error: ${context}`, 'error');
        
        // Could add error reporting/logging here
        this.emitEvent('component-error', {
            componentId: componentId,
            error: error.message || String(error),
            context: context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle application errors
     */
    handleError(error, userMessage = 'An error occurred') {
        console.error('AppManager Error:', error);
        
        // Show user-friendly error message
        this.showToast(userMessage, 'error');
        
        // Could add error reporting here
    }

    /**
     * Show modal via modal manager
     * @param {string} modalId - Modal identifier
     * @param {object} data - Modal data
     */
    async showModal(modalId, data = null) {
        try {
            const modalManager = await import('./modal-manager.js');
            return modalManager.showModal(modalId);
        } catch (error) {
            console.error(`AppManager: Failed to show modal ${modalId}:`, error);
            return false;
        }
    }

    /**
     * Close modal via modal manager
     * @param {string} modalId - Modal identifier
     */
    async closeModal(modalId) {
        try {
            const modalManager = await import('./modal-manager.js');
            return modalManager.closeModal(modalId);
        } catch (error) {
            console.error(`AppManager: Failed to close modal ${modalId}:`, error);
            return false;
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {any} detail - Event detail data
     */
    emitEvent(eventName, detail = null) {
        try {
            const event = new CustomEvent(eventName, {
                detail: detail,
                bubbles: true,
                composed: true
            });
            
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error(`AppManager: Failed to emit event ${eventName}:`, error);
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        try {
            // Visual toast via shared utils
            utils.showToast(message, type);
        } catch (e) {
            // Fallback to console if utils/toast not available
            console.log(`Toast (${type}): ${message}`);
        }
        
        // Emit toast event for listeners
        this.emitEvent('toast-message', {
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get current application state
     */
    getCurrentState() {
        return {
            section: this.currentSection,
            item: this.currentItem,
            data: this.data
        };
    }
}

// Create and export singleton instance
const appManager = new AppManager();

// Make available globally for components
window.appManager = appManager;

export default appManager;
