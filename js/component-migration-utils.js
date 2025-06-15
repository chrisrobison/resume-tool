// component-migration-utils.js - Utilities to help migrate existing components to ComponentBase
// This provides helper functions and migration patterns

/**
 * Component Migration Utilities
 * Provides helper functions to assist in migrating existing components to ComponentBase
 */

/**
 * Create a migration report for an existing component
 * @param {HTMLElement} component - Component instance to analyze
 * @returns {object} Migration report
 */
export function analyzeComponent(component) {
    const report = {
        componentName: component.constructor.name,
        needsMigration: true,
        issues: [],
        recommendations: [],
        complexity: 'low'
    };

    // Check if already using ComponentBase
    if (component.constructor.prototype.constructor.name === 'ComponentBase') {
        report.needsMigration = false;
        report.issues.push('Component already uses ComponentBase');
        return report;
    }

    // Analyze component structure
    const proto = component.constructor.prototype;
    const methods = Object.getOwnPropertyNames(proto);

    // Check for standard lifecycle methods
    if (methods.includes('connectedCallback')) {
        report.issues.push('Has connectedCallback - needs conversion to onInitialize()');
    }
    
    if (methods.includes('disconnectedCallback')) {
        report.issues.push('Has disconnectedCallback - needs conversion to onCleanup()');
    }

    // Check for data handling
    if (component._data || component.data) {
        report.issues.push('Has direct data properties - should use setData()/getData()');
    }

    // Check for store usage
    if (methods.some(m => m.includes('store') || m.includes('State'))) {
        report.issues.push('Has manual store handling - can use ComponentBase store methods');
    }

    // Check for event handling
    if (methods.some(m => m.includes('event') || m.includes('Event'))) {
        report.issues.push('Has manual event handling - can use ComponentBase event methods');
    }

    // Check complexity
    if (methods.length > 20) {
        report.complexity = 'high';
        report.recommendations.push('Consider breaking down into smaller components');
    } else if (methods.length > 10) {
        report.complexity = 'medium';
    }

    // Generate recommendations
    report.recommendations.push('Import ComponentBase and extend it instead of HTMLElement');
    report.recommendations.push('Move initialization logic to onInitialize() method');
    report.recommendations.push('Move cleanup logic to onCleanup() method');
    report.recommendations.push('Use standardized data handling methods');
    report.recommendations.push('Use standardized error handling');

    return report;
}

/**
 * Generate migration template code for a component
 * @param {string} componentName - Name of the component
 * @param {object} options - Migration options
 * @returns {string} Template code
 */
export function generateMigrationTemplate(componentName, options = {}) {
    const {
        usesShadowDOM = true,
        hasFormValidation = false,
        hasModalHandling = false,
        customMethods = []
    } = options;

    return `// ${componentName} - Migrated to use ComponentBase
import { ComponentBase } from '../js/component-base.js';

class ${componentName} extends ComponentBase {
    constructor() {
        super();
        
        // Component-specific properties
        ${usesShadowDOM ? 'this.attachShadow({ mode: \'open\' });' : ''}
        
        // Initialize component-specific state here
        // this._someProperty = null;
    }

    /**
     * Component initialization after dependencies are ready
     * Replaces connectedCallback()
     */
    async onInitialize() {
        console.log('${componentName}: Initializing');
        
        // Move your connectedCallback logic here
        this.render();
        this.setupEventListeners();
        
        // Load initial data if needed
        // await this.loadInitialData();
    }

    /**
     * Handle data changes
     * Called when setData() is used
     */
    onDataChange(newData, previousData, source) {
        console.log('${componentName}: Data changed from', source);
        
        // Re-render when data changes
        if (this.isReady()) {
            this.render();
        }
    }

    /**
     * Handle component refresh
     * Called when refresh() is used
     */
    async onRefresh(force = false) {
        console.log('${componentName}: Refreshing');
        
        // Re-render the component
        this.render();
    }

    /**
     * Component validation
     * Override to add custom validation logic
     */
    onValidate() {
        const errors = [];
        
        // Add your validation logic here
        // if (!this._someProperty) {
        //     errors.push('Some property is required');
        // }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Handle global store changes
     * Called when store state changes
     */
    handleStoreChange(event) {
        // Handle relevant store changes
        // Example:
        // if (event.detail?.source?.includes('job')) {
        //     const currentJob = this.getGlobalState('currentJob');
        //     this.setData(currentJob, 'store-sync');
        // }
    }

    /**
     * Component cleanup
     * Replaces disconnectedCallback()
     */
    onCleanup() {
        console.log('${componentName}: Cleaning up');
        
        // Move your disconnectedCallback logic here
        this.removeEventListeners();
    }

    /**
     * Render the component
     */
    render() {
        ${usesShadowDOM ? `
        if (!this.shadowRoot) return;
        
        this.shadowRoot.innerHTML = \`
            <style>
                :host {
                    display: block;
                }
                
                /* Add your styles here */
            </style>
            
            <div class="component-container">
                <!-- Add your HTML here -->
                <h3>${componentName}</h3>
                <p>Data: \${this.getData() ? 'Present' : 'None'}</p>
            </div>
        \`;
        ` : `
        this.innerHTML = \`
            <div class="component-container">
                <!-- Add your HTML here -->
                <h3>${componentName}</h3>
                <p>Data: \${this.getData() ? 'Present' : 'None'}</p>
            </div>
        \`;
        `}
    }

    /**
     * Setup component event listeners
     */
    setupEventListeners() {
        // Add your event listeners here
        // Example:
        // const button = this.${usesShadowDOM ? 'shadowRoot' : ''}.querySelector('#my-button');
        // if (button) {
        //     button.addEventListener('click', this.handleButtonClick.bind(this));
        // }
    }

    /**
     * Remove component event listeners
     */
    removeEventListeners() {
        // Clean up event listeners if needed
        // (Shadow DOM listeners are automatically cleaned up)
    }

    ${customMethods.map(method => `
    /**
     * ${method} - Custom component method
     */
    ${method}() {
        // Add your custom logic here
    }
    `).join('')}

    ${hasFormValidation ? `
    /**
     * Validate component forms using built-in validation
     */
    validateForms() {
        const form = this.${usesShadowDOM ? 'shadowRoot' : ''}.querySelector('form');
        if (form) {
            return this.validateForm(form);
        }
        return { valid: true, errors: [] };
    }
    ` : ''}

    ${hasModalHandling ? `
    /**
     * Show component modal
     */
    showComponentModal(modalId, data = null) {
        this.showModal(modalId, data);
    }

    /**
     * Close component modal
     */
    closeComponentModal(modalId) {
        this.closeModal(modalId);
    }
    ` : ''}
}

// Register the component
customElements.define('${componentName.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1)}', ${componentName});

export { ${componentName} };
`;
}

/**
 * Migration checklist for manual conversion
 */
export const MIGRATION_CHECKLIST = [
    {
        step: 1,
        title: 'Import ComponentBase',
        description: 'Add import statement for ComponentBase',
        code: "import { ComponentBase } from '../js/component-base.js';"
    },
    {
        step: 2,
        title: 'Change class declaration',
        description: 'Extend ComponentBase instead of HTMLElement',
        code: 'class MyComponent extends ComponentBase {'
    },
    {
        step: 3,
        title: 'Update constructor',
        description: 'Call super() and remove manual initialization',
        code: `constructor() {
    super();
    // Component-specific properties only
}`
    },
    {
        step: 4,
        title: 'Convert connectedCallback',
        description: 'Rename to onInitialize() and make async',
        code: `async onInitialize() {
    // Move connectedCallback logic here
}`
    },
    {
        step: 5,
        title: 'Convert disconnectedCallback',
        description: 'Rename to onCleanup()',
        code: `onCleanup() {
    // Move disconnectedCallback logic here
}`
    },
    {
        step: 6,
        title: 'Add data handling',
        description: 'Override onDataChange for data updates',
        code: `onDataChange(newData, previousData, source) {
    // Handle data changes
    this.render();
}`
    },
    {
        step: 7,
        title: 'Add refresh handling',
        description: 'Override onRefresh for component updates',
        code: `async onRefresh(force = false) {
    // Handle refresh
    this.render();
}`
    },
    {
        step: 8,
        title: 'Add validation',
        description: 'Override onValidate for component validation',
        code: `onValidate() {
    return { valid: true, errors: [] };
}`
    },
    {
        step: 9,
        title: 'Use standardized methods',
        description: 'Replace manual implementations with ComponentBase methods',
        code: `// Use this.showToast(), this.emitEvent(), etc.`
    },
    {
        step: 10,
        title: 'Handle store changes',
        description: 'Override handleStoreChange instead of manual subscription',
        code: `handleStoreChange(event) {
    // React to store changes
}`
    }
];

/**
 * Get migration priority for components
 * @param {Array} components - Array of component names
 * @returns {Array} Prioritized component list
 */
export function getMigrationPriority(components) {
    // Priority order: simple components first, complex ones later
    const priorities = {
        'high': ['settings-manager', 'global-store'],
        'medium': ['resume-viewer', 'resume-analytics', 'api-settings'],
        'low': ['resume-editor', 'ai-assistant-worker', 'job-manager']
    };

    const prioritized = [];
    
    Object.entries(priorities).forEach(([priority, componentNames]) => {
        componentNames.forEach(name => {
            if (components.includes(name)) {
                prioritized.push({ name, priority });
            }
        });
    });

    return prioritized;
}

/**
 * Generate migration instructions for a specific component
 * @param {string} componentName - Name of component to migrate
 * @returns {object} Migration instructions
 */
export function getMigrationInstructions(componentName) {
    const instructions = {
        componentName,
        steps: [...MIGRATION_CHECKLIST],
        estimatedTime: '30-60 minutes',
        difficulty: 'medium',
        specificNotes: []
    };

    // Add component-specific notes
    switch (componentName.toLowerCase()) {
        case 'global-store':
            instructions.difficulty = 'low';
            instructions.estimatedTime = '15-30 minutes';
            instructions.specificNotes.push('Already has good state management structure');
            instructions.specificNotes.push('Focus on standardizing event emission');
            break;

        case 'resume-editor':
            instructions.difficulty = 'high';
            instructions.estimatedTime = '2-3 hours';
            instructions.specificNotes.push('Large component with complex form handling');
            instructions.specificNotes.push('Consider breaking into smaller sub-components');
            instructions.specificNotes.push('Has extensive localStorage logic to migrate');
            break;

        case 'ai-assistant-worker':
            instructions.difficulty = 'medium';
            instructions.estimatedTime = '45-90 minutes';
            instructions.specificNotes.push('Already uses modern patterns with store integration');
            instructions.specificNotes.push('Focus on standardizing worker communication');
            break;

        case 'settings-manager':
            instructions.difficulty = 'low';
            instructions.estimatedTime = '20-45 minutes';
            instructions.specificNotes.push('Good candidate for first migration');
            instructions.specificNotes.push('Has clear data flow patterns');
            break;
    }

    return instructions;
}

/**
 * Validate migrated component
 * @param {ComponentBase} component - Migrated component instance
 * @returns {object} Validation result
 */
export function validateMigration(component) {
    const result = {
        valid: true,
        issues: [],
        warnings: [],
        score: 100
    };

    // Check if component extends ComponentBase
    if (!(component instanceof ComponentBase)) {
        result.valid = false;
        result.issues.push('Component does not extend ComponentBase');
        result.score -= 50;
    }

    // Check for required methods
    const requiredMethods = ['onInitialize', 'onDataChange', 'onRefresh', 'onValidate'];
    requiredMethods.forEach(method => {
        if (typeof component[method] !== 'function') {
            result.warnings.push(`Missing or not overridden: ${method}`);
            result.score -= 10;
        }
    });

    // Check component metadata
    if (!component.getMetadata) {
        result.issues.push('Component missing getMetadata method');
        result.score -= 20;
    }

    // Check initialization
    if (!component.isReady()) {
        result.warnings.push('Component is not ready - may need initialization');
        result.score -= 5;
    }

    return result;
}

/**
 * Generate migration report for all components
 * @param {Array} componentFiles - Array of component file paths
 * @returns {object} Complete migration report
 */
export async function generateMigrationReport(componentFiles) {
    const report = {
        totalComponents: componentFiles.length,
        migrated: 0,
        needsMigration: 0,
        components: [],
        recommendations: []
    };

    // This would analyze actual component files
    // For now, providing a template structure
    
    report.recommendations = [
        'Start with simple components (settings-manager, global-store)',
        'Migrate components in order of dependency (global-store first)',
        'Test each component after migration',
        'Update documentation as you migrate',
        'Consider component splitting for large components'
    ];

    return report;
}