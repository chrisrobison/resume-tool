// app-manager.js - Main application coordinator
// Extracted from jobs.html embedded JavaScript

import { setState, getState } from './store.js';
import * as sectionManager from './section-manager.js';
import * as formGenerator from './form-generator.js';
import * as modalManager from './modal-manager.js';
import * as importExportManager from './import-export-manager.js';
import * as cardRenderer from './card-renderer.js';
import { schemas } from './schema-definitions.js';

/**
 * Main Application Manager
 * Coordinates all application components and provides standardized interface
 */
class AppManager {
    constructor() {
        // Application state
        this.currentSection = 'jobs';
        this.currentItem = null;
        this.data = this.loadData();
        
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
            await this.syncWithGlobalStore();
            this.switchSection('jobs');
            
            console.log('AppManager: Application initialized successfully');
        } catch (error) {
            console.error('AppManager: Failed to initialize application:', error);
            this.handleError(error, 'Failed to initialize application');
        }
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
     * Save data to localStorage and sync with global store
     */
    saveData() {
        try {
            localStorage.setItem('jobHuntData', JSON.stringify(this.data));
            
            // Sync with global store
            setState({
                jobs: this.data.jobs || [],
                resumes: this.data.resumes || [],
                coverLetters: this.data.letters || []
            }, 'app-manager-save-sync');
            
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
                        this.switchSection(section);
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
     * Render the list of items for current section
     */
    renderItemsList() {
        try {
            const container = document.getElementById('items-list');
            if (!container) return;

            const items = this.data[this.currentSection] || [];
            cardRenderer.renderItemsList(container, items, this.currentSection, this.handleItemSelection);
            
        } catch (error) {
            console.error('AppManager: Failed to render items list:', error);
        }
    }

    /**
     * Handle item selection
     */
    handleItemSelection(item) {
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
     */
    saveItem(itemData, isEdit = false) {
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
            
            // Select the saved item
            this.handleItemSelection(itemData);
            
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
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`AppManager: Registered component: ${name}`);
    }

    /**
     * Get registered component
     */
    getComponent(name) {
        return this.components.get(name);
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
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // TODO: Implement toast notification system
        console.log(`Toast (${type}): ${message}`);
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