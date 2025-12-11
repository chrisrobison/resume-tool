// empty-state.js - Beautiful, Helpful Empty State Component
// Professional empty states with illustrations and clear CTAs

/**
 * Empty State Component
 * Displays helpful empty states with icons, messages, and action buttons
 */
class EmptyState extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    /**
     * Escape HTML to prevent XSS attacks
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static get observedAttributes() {
        return ['type', 'title', 'message', 'cta-text', 'cta-action', 'icon'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.shadowRoot.innerHTML) {
            this.render();
        }
    }

    /**
     * Get empty state configuration by type
     */
    getConfig() {
        const type = this.getAttribute('type') || 'default';

        const configs = {
            'jobs-empty': {
                icon: '💼',
                title: 'No Jobs Yet',
                message: 'Start your job search by adding your first opportunity. Import from a URL or add manually.',
                primaryAction: {
                    text: 'Add First Job',
                    action: 'add-job',
                    icon: 'fas fa-plus'
                },
                secondaryAction: {
                    text: 'Import Job',
                    action: 'import-job',
                    icon: 'fas fa-download'
                },
                tips: [
                    'Track applications in one place',
                    'Update status as you progress',
                    'Add notes and contacts'
                ]
            },
            'resumes-empty': {
                icon: '📄',
                title: 'No Resumes Yet',
                message: 'Create your first resume or import an existing one. You can tailor different versions for specific jobs.',
                primaryAction: {
                    text: 'Create Resume',
                    action: 'create-resume',
                    icon: 'fas fa-file-alt'
                },
                secondaryAction: {
                    text: 'Import Resume',
                    action: 'import-resume',
                    icon: 'fas fa-file-import'
                },
                tips: [
                    'Store multiple resume versions',
                    'Tailor for each job with AI',
                    'Export to PDF anytime'
                ]
            },
            'letters-empty': {
                icon: '✉️',
                title: 'No Cover Letters',
                message: 'Generate personalized cover letters for your job applications using AI or create them manually.',
                primaryAction: {
                    text: 'Create Letter',
                    action: 'create-letter',
                    icon: 'fas fa-pen'
                },
                secondaryAction: {
                    text: 'Generate with AI',
                    action: 'ai-letter',
                    icon: 'fas fa-magic'
                },
                tips: [
                    'Customize for each job',
                    'Use AI for first draft',
                    'Save templates for reuse'
                ]
            },
            'no-selection': {
                icon: '👈',
                title: 'Select an Item',
                message: 'Choose an item from the list to view and edit details.',
                primaryAction: null,
                secondaryAction: null,
                tips: []
            },
            'search-empty': {
                icon: '🔍',
                title: 'No Results Found',
                message: 'Try adjusting your search terms or filters to find what you\'re looking for.',
                primaryAction: {
                    text: 'Clear Filters',
                    action: 'clear-filters',
                    icon: 'fas fa-times'
                },
                secondaryAction: null,
                tips: []
            },
            'ai-empty': {
                icon: '🤖',
                title: 'No AI History',
                message: 'Use AI features to tailor resumes and generate cover letters. Your AI activity will appear here.',
                primaryAction: {
                    text: 'Open AI Assistant',
                    action: 'open-ai',
                    icon: 'fas fa-magic'
                },
                secondaryAction: {
                    text: 'Configure API Key',
                    action: 'setup-ai',
                    icon: 'fas fa-cog'
                },
                tips: [
                    'Tailor resumes to jobs',
                    'Generate cover letters',
                    'Get match analysis'
                ]
            },
            'error': {
                icon: '⚠️',
                title: 'Something Went Wrong',
                message: 'We encountered an error. Please try again or contact support if the problem persists.',
                primaryAction: {
                    text: 'Try Again',
                    action: 'retry',
                    icon: 'fas fa-redo'
                },
                secondaryAction: {
                    text: 'Go Back',
                    action: 'back',
                    icon: 'fas fa-arrow-left'
                },
                tips: []
            },
            'loading': {
                icon: '⏳',
                title: 'Loading...',
                message: 'Please wait while we load your data.',
                primaryAction: null,
                secondaryAction: null,
                tips: [],
                showSpinner: true
            }
        };

        // Get config or use default
        const config = configs[type] || configs['no-selection'];

        // Override with custom attributes if provided
        if (this.hasAttribute('title')) {
            config.title = this.getAttribute('title');
        }
        if (this.hasAttribute('message')) {
            config.message = this.getAttribute('message');
        }
        if (this.hasAttribute('icon')) {
            config.icon = this.getAttribute('icon');
        }
        if (this.hasAttribute('cta-text') && this.hasAttribute('cta-action')) {
            config.primaryAction = {
                text: this.getAttribute('cta-text'),
                action: this.getAttribute('cta-action'),
                icon: this.getAttribute('cta-icon') || 'fas fa-arrow-right'
            };
        }

        return config;
    }

    /**
     * Handle action button clicks
     */
    handleAction(action) {
        // Emit custom event that parent can listen to
        this.dispatchEvent(new CustomEvent('empty-state-action', {
            bubbles: true,
            composed: true,
            detail: { action }
        }));
    }

    /**
     * Render the component
     */
    render() {
        const config = this.getConfig();

        const tipsHTML = config.tips && config.tips.length > 0 ? `
            <div class="tips">
                <div class="tips-title">💡 Quick Tips:</div>
                <ul class="tips-list">
                    ${config.tips.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        const primaryButtonHTML = config.primaryAction ? `
            <button class="btn btn-primary" data-action="${this.escapeHtml(config.primaryAction.action)}">
                <i class="${this.escapeHtml(config.primaryAction.icon)}"></i>
                ${this.escapeHtml(config.primaryAction.text)}
            </button>
        ` : '';

        const secondaryButtonHTML = config.secondaryAction ? `
            <button class="btn btn-secondary" data-action="${this.escapeHtml(config.secondaryAction.action)}">
                <i class="${this.escapeHtml(config.secondaryAction.icon)}"></i>
                ${this.escapeHtml(config.secondaryAction.text)}
            </button>
        ` : '';

        const spinnerHTML = config.showSpinner ? `
            <div class="spinner"></div>
        ` : '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    padding: 40px 20px;
                }

                .empty-state {
                    text-align: center;
                    max-width: 500px;
                    animation: fadeIn 0.5s ease;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .icon {
                    font-size: 5rem;
                    margin-bottom: 24px;
                    animation: bounce 1s ease infinite;
                }

                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .title {
                    font-size: 1.75rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 12px;
                }

                .message {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: #6c757d;
                    margin-bottom: 32px;
                }

                .actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin-bottom: 32px;
                }

                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 140px;
                    justify-content: center;
                }

                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .btn:active {
                    transform: translateY(0);
                }

                .btn-primary {
                    background: linear-gradient(135deg, #3498db, #2ecc71);
                    color: white;
                }

                .btn-primary:hover {
                    background: linear-gradient(135deg, #2980b9, #27ae60);
                }

                .btn-secondary {
                    background: #e9ecef;
                    color: #6c757d;
                }

                .btn-secondary:hover {
                    background: #dee2e6;
                    color: #495057;
                }

                .tips {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: left;
                    border-left: 4px solid #3498db;
                }

                .tips-title {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 12px;
                    font-size: 0.95rem;
                }

                .tips-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .tips-list li {
                    padding: 8px 0;
                    color: #6c757d;
                    font-size: 0.9rem;
                    position: relative;
                    padding-left: 24px;
                }

                .tips-list li:before {
                    content: "✓";
                    position: absolute;
                    left: 0;
                    color: #27ae60;
                    font-weight: bold;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e9ecef;
                    border-top-color: #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    :host {
                        min-height: 300px;
                        padding: 32px 16px;
                    }

                    .icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                    }

                    .title {
                        font-size: 1.5rem;
                    }

                    .message {
                        font-size: 0.95rem;
                    }

                    .actions {
                        flex-direction: column;
                        width: 100%;
                    }

                    .btn {
                        width: 100%;
                    }
                }
            </style>

            <div class="empty-state">
                <div class="icon">${this.escapeHtml(config.icon)}</div>
                ${spinnerHTML}
                <h2 class="title">${this.escapeHtml(config.title)}</h2>
                <p class="message">${this.escapeHtml(config.message)}</p>

                <div class="actions">
                    ${primaryButtonHTML}
                    ${secondaryButtonHTML}
                </div>

                ${tipsHTML}
            </div>
        `;

        // Attach event listeners to buttons
        this.shadowRoot.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                this.handleAction(action);
            });
        });
    }
}

// Register the custom element
customElements.define('empty-state', EmptyState);

// Export for use as module
export default EmptyState;
