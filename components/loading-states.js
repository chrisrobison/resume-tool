// loading-states.js - Beautiful Loading States and Skeleton Screens
// Professional loading indicators for better perceived performance

/**
 * Loading Spinner Component
 * Simple, customizable loading spinner
 */
class LoadingSpinner extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['size', 'color', 'message'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.shadowRoot.innerHTML) {
            this.render();
        }
    }

    render() {
        const size = this.getAttribute('size') || 'medium';
        const color = this.getAttribute('color') || '#3498db';
        const message = this.getAttribute('message') || '';

        const sizes = {
            small: '20px',
            medium: '40px',
            large: '60px'
        };

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                }

                .spinner {
                    width: ${sizes[size]};
                    height: ${sizes[size]};
                    border: 3px solid rgba(0, 0, 0, 0.1);
                    border-top-color: ${color};
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .message {
                    color: #6c757d;
                    font-size: 0.9rem;
                    text-align: center;
                }
            </style>

            <div class="spinner"></div>
            ${message ? `<div class="message">${message}</div>` : ''}
        `;
    }
}

/**
 * Skeleton Loader Component
 * Animated skeleton for content placeholders
 */
class SkeletonLoader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['type', 'count'];
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
     * Get skeleton template by type
     */
    getTemplate(type) {
        switch (type) {
            case 'job-card':
                return `
                    <div class="skeleton-card">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-subtitle"></div>
                        <div class="skeleton-meta">
                            <div class="skeleton-line skeleton-small"></div>
                            <div class="skeleton-badge"></div>
                        </div>
                    </div>
                `;
            case 'resume-card':
                return `
                    <div class="skeleton-card">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-text"></div>
                        <div class="skeleton-line skeleton-text short"></div>
                    </div>
                `;
            case 'form':
                return `
                    <div class="skeleton-form">
                        <div class="skeleton-line skeleton-label"></div>
                        <div class="skeleton-input"></div>
                        <div class="skeleton-line skeleton-label"></div>
                        <div class="skeleton-input"></div>
                        <div class="skeleton-line skeleton-label"></div>
                        <div class="skeleton-textarea"></div>
                    </div>
                `;
            case 'detail-view':
                return `
                    <div class="skeleton-detail">
                        <div class="skeleton-line skeleton-title large"></div>
                        <div class="skeleton-line skeleton-text"></div>
                        <div class="skeleton-line skeleton-text"></div>
                        <div class="skeleton-line skeleton-text short"></div>
                        <div class="skeleton-section">
                            <div class="skeleton-line skeleton-subtitle"></div>
                            <div class="skeleton-line skeleton-text"></div>
                            <div class="skeleton-line skeleton-text"></div>
                        </div>
                    </div>
                `;
            case 'list':
                return `
                    <div class="skeleton-list-item">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                `;
            default:
                return `
                    <div class="skeleton-line"></div>
                `;
        }
    }

    render() {
        const type = this.getAttribute('type') || 'line';
        const count = parseInt(this.getAttribute('count') || '3');

        let items = '';
        for (let i = 0; i < count; i++) {
            items += this.getTemplate(type);
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .skeleton-line,
                .skeleton-card,
                .skeleton-input,
                .skeleton-textarea,
                .skeleton-badge {
                    background: linear-gradient(
                        90deg,
                        #f0f0f0 25%,
                        #e0e0e0 50%,
                        #f0f0f0 75%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                }

                @keyframes shimmer {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }

                .skeleton-line {
                    height: 16px;
                    margin-bottom: 12px;
                }

                .skeleton-line.short {
                    width: 60%;
                }

                .skeleton-title {
                    height: 20px;
                    width: 70%;
                    margin-bottom: 8px;
                }

                .skeleton-title.large {
                    height: 28px;
                    width: 80%;
                }

                .skeleton-subtitle {
                    height: 18px;
                    width: 50%;
                }

                .skeleton-text {
                    height: 14px;
                    margin-bottom: 8px;
                }

                .skeleton-label {
                    height: 14px;
                    width: 30%;
                    margin-bottom: 8px;
                }

                .skeleton-small {
                    height: 12px;
                    width: 40%;
                }

                .skeleton-input {
                    height: 44px;
                    margin-bottom: 16px;
                }

                .skeleton-textarea {
                    height: 120px;
                    margin-bottom: 16px;
                }

                .skeleton-badge {
                    height: 24px;
                    width: 80px;
                    border-radius: 12px;
                }

                .skeleton-card {
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                }

                .skeleton-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 12px;
                }

                .skeleton-form {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                }

                .skeleton-detail {
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                }

                .skeleton-section {
                    margin-top: 24px;
                    padding-top: 24px;
                    border-top: 1px solid #e9ecef;
                }

                .skeleton-list-item {
                    padding: 12px 0;
                    border-bottom: 1px solid #e9ecef;
                }
            </style>

            <div class="skeleton-container">
                ${items}
            </div>
        `;
    }
}

/**
 * Progress Bar Component
 * Determinate and indeterminate progress bars
 */
class ProgressBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['value', 'max', 'indeterminate', 'label'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.shadowRoot.innerHTML) {
            this.render();
        }
    }

    render() {
        const value = parseFloat(this.getAttribute('value') || '0');
        const max = parseFloat(this.getAttribute('max') || '100');
        const indeterminate = this.hasAttribute('indeterminate');
        const label = this.getAttribute('label') || '';

        const percentage = indeterminate ? 0 : Math.min((value / max) * 100, 100);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .progress-container {
                    width: 100%;
                }

                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 0.85rem;
                    color: #6c757d;
                }

                .progress-bar {
                    height: 8px;
                    background: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3498db, #2ecc71);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                    width: ${percentage}%;
                }

                .progress-fill.indeterminate {
                    width: 30%;
                    animation: indeterminate 1.5s infinite;
                }

                @keyframes indeterminate {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(400%);
                    }
                }
            </style>

            <div class="progress-container">
                ${label ? `
                    <div class="progress-label">
                        <span>${label}</span>
                        ${!indeterminate ? `<span>${Math.round(percentage)}%</span>` : ''}
                    </div>
                ` : ''}
                <div class="progress-bar">
                    <div class="progress-fill ${indeterminate ? 'indeterminate' : ''}"></div>
                </div>
            </div>
        `;
    }
}

/**
 * Loading Overlay Component
 * Full-screen loading overlay
 */
class LoadingOverlay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['message', 'visible'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.shadowRoot.innerHTML) {
            this.render();
        }
    }

    show(message = '') {
        this.setAttribute('visible', '');
        if (message) {
            this.setAttribute('message', message);
        }
    }

    hide() {
        this.removeAttribute('visible');
    }

    render() {
        const message = this.getAttribute('message') || 'Loading...';
        const visible = this.hasAttribute('visible');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: ${visible ? 'flex' : 'none'};
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    z-index: 10000;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 20px;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(52, 152, 219, 0.2);
                    border-top-color: #3498db;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .message {
                    color: #2c3e50;
                    font-size: 1rem;
                    font-weight: 500;
                }
            </style>

            <div class="spinner"></div>
            <div class="message">${message}</div>
        `;
    }
}

// Register all custom elements
customElements.define('loading-spinner', LoadingSpinner);
customElements.define('skeleton-loader', SkeletonLoader);
customElements.define('progress-bar', ProgressBar);
customElements.define('loading-overlay', LoadingOverlay);

// Export for use as modules
export { LoadingSpinner, SkeletonLoader, ProgressBar, LoadingOverlay };

export default {
    LoadingSpinner,
    SkeletonLoader,
    ProgressBar,
    LoadingOverlay
};
