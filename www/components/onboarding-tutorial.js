// onboarding-tutorial.js - Interactive User Onboarding System
// Professional first-time user experience with guided walkthrough

/**
 * Onboarding Tutorial Component
 * Provides interactive step-by-step guidance for new users
 */
class OnboardingTutorial extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Onboarding state
        this.currentStep = 0;
        this.isActive = false;
        this.hasCompleted = false;

        // Steps configuration
        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome to Job Hunt Manager! 👋',
                content: 'Your privacy-first, AI-powered job search companion. Let\'s take a quick tour to get you started.',
                target: null,
                position: 'center',
                actions: [
                    { text: 'Start Tour', action: 'next', style: 'primary' },
                    { text: 'Skip Tour', action: 'skip', style: 'secondary' }
                ]
            },
            {
                id: 'add-first-job',
                title: 'Add Your First Job',
                content: 'Click this button to add a job manually, or use Import Job to extract details from a URL or job description.',
                target: '#add-item-btn',
                position: 'bottom',
                highlight: true,
                actions: [
                    { text: 'Next', action: 'next', style: 'primary' },
                    { text: 'Back', action: 'back', style: 'secondary' }
                ]
            },
            {
                id: 'job-list',
                title: 'Your Job Pipeline',
                content: 'All your job opportunities appear here. Click any job to view details, update status, and take notes.',
                target: '#items-panel',
                position: 'right',
                highlight: true,
                actions: [
                    { text: 'Next', action: 'next', style: 'primary' },
                    { text: 'Back', action: 'back', style: 'secondary' }
                ]
            },
            {
                id: 'navigation',
                title: 'Navigate Sections',
                content: 'Switch between Jobs, Resumes, Cover Letters, AI Assistant, and more. On mobile, tap the ☰ menu.',
                target: '.sidebar-nav',
                position: 'right',
                highlight: true,
                actions: [
                    { text: 'Next', action: 'next', style: 'primary' },
                    { text: 'Back', action: 'back', style: 'secondary' }
                ]
            },
            {
                id: 'ai-features',
                title: 'AI-Powered Tools 🤖',
                content: 'Use AI to tailor resumes for specific jobs, generate cover letters, and analyze job matches. Set up your API key in Settings.',
                target: '[data-section="ai-assistant"]',
                position: 'right',
                highlight: true,
                actions: [
                    { text: 'Next', action: 'next', style: 'primary' },
                    { text: 'Back', action: 'back', style: 'secondary' }
                ]
            },
            {
                id: 'settings',
                title: 'Configure Settings',
                content: 'Set up your AI API keys, customize preferences, and manage your data privacy settings.',
                target: '[data-section="settings"]',
                position: 'right',
                highlight: true,
                actions: [
                    { text: 'Next', action: 'next', style: 'primary' },
                    { text: 'Back', action: 'back', style: 'secondary' }
                ]
            },
            {
                id: 'complete',
                title: 'You\'re All Set! 🎉',
                content: 'Start by adding your first job opportunity. Your data stays private in your browser. Happy job hunting!',
                target: null,
                position: 'center',
                actions: [
                    { text: 'Get Started', action: 'complete', style: 'primary' },
                    { text: 'Restart Tour', action: 'restart', style: 'secondary' }
                ]
            }
        ];
    }

    connectedCallback() {
        this.render();
        this.checkOnboardingStatus();
    }

    /**
     * Check if user has completed onboarding
     */
    checkOnboardingStatus() {
        try {
            const completed = localStorage.getItem('onboarding_completed');
            const skipped = localStorage.getItem('onboarding_skipped');

            this.hasCompleted = completed === 'true';

            // Show onboarding if not completed and not skipped
            if (!this.hasCompleted && skipped !== 'true') {
                // Show after a brief delay for better UX
                setTimeout(() => this.start(), 1000);
            }
        } catch (error) {
            console.warn('Onboarding: Could not check status:', error);
        }
    }

    /**
     * Start the onboarding tutorial
     */
    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
        this.addBackdrop();

        // Announce to screen readers
        this.announceToScreenReader('Onboarding tutorial started');

        // Emit event
        this.dispatchEvent(new CustomEvent('onboarding-started', {
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Show a specific step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // Remove previous highlights
        this.removeHighlights();

        // Show tooltip
        this.showTooltip(step);

        // Highlight target if specified
        if (step.target && step.highlight) {
            this.highlightElement(step.target);
        }

        // Scroll target into view
        if (step.target) {
            this.scrollToTarget(step.target);
        }

        // Update progress
        this.updateProgress();

        // Announce to screen readers
        this.announceToScreenReader(`Step ${stepIndex + 1} of ${this.steps.length}: ${step.title}`);
    }

    /**
     * Show tooltip for current step
     */
    showTooltip(step) {
        const tooltip = this.shadowRoot.querySelector('.onboarding-tooltip');
        if (!tooltip) return;

        // Update content
        tooltip.querySelector('.tooltip-title').textContent = step.title;
        tooltip.querySelector('.tooltip-content').textContent = step.content;

        // Update actions
        const actionsContainer = tooltip.querySelector('.tooltip-actions');
        actionsContainer.innerHTML = '';

        step.actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `btn btn-${action.style}`;
            button.textContent = action.text;
            button.onclick = () => this.handleAction(action.action);
            actionsContainer.appendChild(button);
        });

        // Position tooltip
        tooltip.classList.remove('hidden');
        this.positionTooltip(tooltip, step);
    }

    /**
     * Position tooltip relative to target or center
     */
    positionTooltip(tooltip, step) {
        if (step.position === 'center' || !step.target) {
            // Center on screen
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.style.maxWidth = '500px';
            return;
        }

        // Position relative to target
        const target = document.querySelector(step.target);
        if (!target) {
            // Fallback to center if target not found
            this.positionTooltip(tooltip, { ...step, position: 'center', target: null });
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (step.position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 20;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + 20;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 20;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 20;
                break;
            default:
                top = targetRect.bottom + 20;
                left = targetRect.left;
        }

        // Keep tooltip within viewport
        const padding = 20;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.transform = 'none';
    }

    /**
     * Highlight a target element
     */
    highlightElement(selector) {
        const target = document.querySelector(selector);
        if (!target) return;

        // Add highlight class
        target.classList.add('onboarding-highlight');

        // Create highlight overlay
        const rect = target.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'onboarding-spotlight';
        highlight.style.cssText = `
            position: fixed;
            top: ${rect.top - 8}px;
            left: ${rect.left - 8}px;
            width: ${rect.width + 16}px;
            height: ${rect.height + 16}px;
            border: 3px solid var(--primary-color, #3498db);
            border-radius: 8px;
            pointer-events: none;
            z-index: 10001;
            animation: pulse 2s infinite;
        `;

        document.body.appendChild(highlight);
    }

    /**
     * Remove all highlights
     */
    removeHighlights() {
        // Remove highlight classes
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });

        // Remove spotlight elements
        document.querySelectorAll('.onboarding-spotlight').forEach(el => {
            el.remove();
        });
    }

    /**
     * Scroll target into view
     */
    scrollToTarget(selector) {
        const target = document.querySelector(selector);
        if (!target) return;

        target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }

    /**
     * Add backdrop overlay
     */
    addBackdrop() {
        const backdrop = this.shadowRoot.querySelector('.onboarding-backdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
        }
    }

    /**
     * Remove backdrop overlay
     */
    removeBackdrop() {
        const backdrop = this.shadowRoot.querySelector('.onboarding-backdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
        }
    }

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progress = this.shadowRoot.querySelector('.progress-bar-fill');
        if (progress) {
            const percentage = ((this.currentStep + 1) / this.steps.length) * 100;
            progress.style.width = `${percentage}%`;
        }

        const progressText = this.shadowRoot.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
        }
    }

    /**
     * Handle action buttons
     */
    handleAction(action) {
        switch (action) {
            case 'next':
                if (this.currentStep < this.steps.length - 1) {
                    this.showStep(this.currentStep + 1);
                }
                break;
            case 'back':
                if (this.currentStep > 0) {
                    this.showStep(this.currentStep - 1);
                }
                break;
            case 'skip':
                this.skip();
                break;
            case 'complete':
                this.complete();
                break;
            case 'restart':
                this.start();
                break;
        }
    }

    /**
     * Skip the tutorial
     */
    skip() {
        this.isActive = false;
        localStorage.setItem('onboarding_skipped', 'true');
        this.hide();

        this.dispatchEvent(new CustomEvent('onboarding-skipped', {
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Complete the tutorial
     */
    complete() {
        this.isActive = false;
        this.hasCompleted = true;
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.removeItem('onboarding_skipped');
        this.hide();

        // Show completion message
        this.showCompletionMessage();

        this.dispatchEvent(new CustomEvent('onboarding-completed', {
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Hide the tutorial
     */
    hide() {
        const tooltip = this.shadowRoot.querySelector('.onboarding-tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
        this.removeBackdrop();
        this.removeHighlights();
    }

    /**
     * Show completion message
     */
    showCompletionMessage() {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast show success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Tutorial completed! You're ready to start your job search.
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Restart tutorial (for testing or user request)
     */
    restart() {
        localStorage.removeItem('onboarding_completed');
        localStorage.removeItem('onboarding_skipped');
        this.hasCompleted = false;
        this.start();
    }

    /**
     * Announce to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }

    /**
     * Render the component
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .onboarding-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 10000;
                    transition: opacity 0.3s ease;
                }

                .onboarding-backdrop.hidden {
                    display: none;
                }

                .onboarding-tooltip {
                    position: fixed;
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    z-index: 10002;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
                    }
                    50% {
                        box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
                    }
                }

                .onboarding-tooltip.hidden {
                    display: none;
                }

                .tooltip-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 12px;
                }

                .tooltip-content {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: #6c757d;
                    margin-bottom: 20px;
                }

                .progress-container {
                    margin-bottom: 16px;
                }

                .progress-bar {
                    height: 4px;
                    background: #e9ecef;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3498db, #2ecc71);
                    transition: width 0.3s ease;
                    width: 0%;
                }

                .progress-text {
                    font-size: 0.75rem;
                    color: #95a5a6;
                    text-align: right;
                }

                .tooltip-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: #3498db;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2980b9;
                    transform: translateY(-1px);
                }

                .btn-secondary {
                    background: #e9ecef;
                    color: #6c757d;
                }

                .btn-secondary:hover {
                    background: #dee2e6;
                }

                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }

                @media (max-width: 768px) {
                    .onboarding-tooltip {
                        max-width: calc(100vw - 40px);
                        padding: 20px;
                    }

                    .tooltip-title {
                        font-size: 1.1rem;
                    }

                    .tooltip-content {
                        font-size: 0.95rem;
                    }

                    .tooltip-actions {
                        flex-direction: column-reverse;
                    }

                    .btn {
                        width: 100%;
                    }
                }
            </style>

            <div class="onboarding-backdrop hidden"></div>

            <div class="onboarding-tooltip hidden">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill"></div>
                    </div>
                    <div class="progress-text">0 / 0</div>
                </div>

                <h3 class="tooltip-title"></h3>
                <p class="tooltip-content"></p>

                <div class="tooltip-actions"></div>
            </div>
        `;
    }
}

// Register the custom element
customElements.define('onboarding-tutorial', OnboardingTutorial);

// Export for use as module
export default OnboardingTutorial;

// Global styles for highlighted elements (injected into document)
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        .onboarding-highlight {
            position: relative;
            z-index: 10001 !important;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
            }
            50% {
                box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
            }
        }
    `;
    document.head.appendChild(style);
}
