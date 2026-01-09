// mobile-navigation.js - Handle mobile navigation and responsive behaviors
// Professional mobile-first navigation system

/**
 * Mobile Navigation Manager
 * Handles hamburger menu, drawer navigation, and responsive behaviors
 */
class MobileNavigationManager {
    constructor() {
        this.isMenuOpen = false;
        this.init();
    }

    init() {
        console.log('MobileNavigationManager: Initializing...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.setupMobileNav();
        this.setupResponsiveBehaviors();
        this.setupTouchHandlers();
        this.setupResizeHandler();

        console.log('MobileNavigationManager: Setup complete');
    }

    /**
     * Setup mobile navigation elements and handlers
     */
    setupMobileNav() {
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.menu-backdrop');
        const navItems = document.querySelectorAll('.nav-item');

        if (!hamburger || !sidebar || !backdrop) {
            console.warn('MobileNavigationManager: Mobile nav elements not found');
            return;
        }

        // Hamburger menu click
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Backdrop click closes menu
        backdrop.addEventListener('click', () => {
            this.closeMenu();
        });

        // Nav item clicks close menu on mobile
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (this.isMobileView()) {
                    this.closeMenu();
                }
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });

        console.log('MobileNavigationManager: Mobile nav handlers attached');
    }

    /**
     * Toggle mobile menu open/closed
     */
    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.menu-backdrop');

        if (!sidebar || !backdrop) return;

        this.isMenuOpen = true;
        sidebar.classList.add('open');
        backdrop.classList.add('show');
        hamburger?.classList.add('open');

        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';

        // Announce to screen readers
        this.announceToScreenReader('Navigation menu opened');
    }

    /**
     * Close mobile menu
     */
    closeMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.menu-backdrop');

        if (!sidebar || !backdrop) return;

        this.isMenuOpen = false;
        sidebar.classList.remove('open');
        backdrop.classList.remove('show');
        hamburger?.classList.remove('open');

        // Restore body scroll
        document.body.style.overflow = '';

        // Announce to screen readers
        this.announceToScreenReader('Navigation menu closed');
    }

    /**
     * Setup responsive behaviors (viewport-dependent features)
     */
    setupResponsiveBehaviors() {
        // Auto-close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (!this.isMobileView() && this.isMenuOpen) {
                this.closeMenu();
            }
        });

        // Detect orientation changes
        if (window.matchMedia) {
            const orientationQuery = window.matchMedia('(orientation: portrait)');
            orientationQuery.addListener((mq) => {
                console.log('MobileNavigationManager: Orientation changed:', mq.matches ? 'portrait' : 'landscape');
                // Could adjust layout here if needed
            });
        }
    }

    /**
     * Setup touch-specific handlers
     */
    setupTouchHandlers() {
        // Swipe to close menu (on sidebar)
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        let touchStartX = 0;
        let touchEndX = 0;

        sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sidebar.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });

        // Swipe to open menu (on edge of screen)
        document.addEventListener('touchstart', (e) => {
            if (e.touches[0].clientX < 20 && !this.isMenuOpen) {
                // Start swipe from left edge
                this.touchStartX = e.touches[0].screenX;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (this.touchStartX && !this.isMenuOpen) {
                const touchX = e.touches[0].screenX;
                const diff = touchX - this.touchStartX;

                // If swiped right more than 50px, open menu
                if (diff > 50) {
                    this.openMenu();
                    this.touchStartX = null;
                }
            }
        }, { passive: true });

        console.log('MobileNavigationManager: Touch handlers attached');
    }

    /**
     * Handle swipe gestures
     */
    handleSwipe(startX, endX) {
        const swipeThreshold = 50;
        const diff = startX - endX;

        // Swipe left to close
        if (diff > swipeThreshold && this.isMenuOpen) {
            this.closeMenu();
        }
    }

    /**
     * Setup window resize handler with debouncing
     */
    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        console.log(`MobileNavigationManager: Window resized to ${width}px`);

        // Adjust layout based on viewport
        if (width >= 768) {
            // Tablet/Desktop: ensure menu is closed
            this.closeMenu();
        }
    }

    /**
     * Check if current view is mobile
     */
    isMobileView() {
        return window.innerWidth < 768;
    }

    /**
     * Check if current view is tablet
     */
    isTabletView() {
        const width = window.innerWidth;
        return width >= 768 && width < 1024;
    }

    /**
     * Check if current view is desktop
     */
    isDesktopView() {
        return window.innerWidth >= 1024;
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Get current viewport size category
     */
    getViewportSize() {
        if (this.isMobileView()) return 'mobile';
        if (this.isTabletView()) return 'tablet';
        return 'desktop';
    }
}

/**
 * Enhanced Modal Manager for Mobile
 * Handles modal behaviors across different viewport sizes
 */
class MobileModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        console.log('MobileModalManager: Initializing...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.setupModalHandlers();
        this.setupSwipeToClose();
        console.log('MobileModalManager: Setup complete');
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers() {
        // Listen for modal open events
        document.addEventListener('modal-opened', (e) => {
            this.activeModal = e.detail?.modalId;
            this.handleModalOpen();
        });

        // Listen for modal close events
        document.addEventListener('modal-closed', () => {
            this.handleModalClose();
        });

        // Handle backdrop clicks
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeModal(backdrop);
                }
            });
        });
    }

    /**
     * Handle modal opened
     */
    handleModalOpen() {
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Add padding to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
    }

    /**
     * Handle modal closed
     */
    handleModalClose() {
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        this.activeModal = null;
    }

    /**
     * Setup swipe-to-close for mobile modals
     */
    setupSwipeToClose() {
        document.querySelectorAll('.modal').forEach(modal => {
            let touchStartY = 0;
            let touchEndY = 0;

            modal.addEventListener('touchstart', (e) => {
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            modal.addEventListener('touchend', (e) => {
                touchEndY = e.changedTouches[0].screenY;
                const diff = touchStartY - touchEndY;

                // Swipe down to close (threshold: 100px)
                if (diff < -100 && modal.scrollTop === 0) {
                    const backdrop = modal.closest('.modal-backdrop');
                    if (backdrop) {
                        this.closeModal(backdrop);
                    }
                }
            }, { passive: true });
        });
    }

    /**
     * Close a modal
     */
    closeModal(backdrop) {
        backdrop.classList.add('hidden');

        // Emit close event
        document.dispatchEvent(new CustomEvent('modal-closed', {
            detail: { modalId: this.activeModal }
        }));
    }
}

/**
 * Touch Feedback Manager
 * Adds visual feedback for touch interactions
 */
class TouchFeedbackManager {
    constructor() {
        this.init();
    }

    init() {
        console.log('TouchFeedbackManager: Initializing...');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.addTouchFeedback();
        console.log('TouchFeedbackManager: Setup complete');
    }

    /**
     * Add touch feedback to interactive elements
     */
    addTouchFeedback() {
        const interactiveSelectors = [
            '.btn',
            '.nav-item',
            '.item-card',
            '.tab-btn',
            '.icon-button'
        ];

        interactiveSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.addEventListener('touchstart', function() {
                    this.classList.add('touch-active');
                }, { passive: true });

                element.addEventListener('touchend', function() {
                    this.classList.remove('touch-active');
                }, { passive: true });

                element.addEventListener('touchcancel', function() {
                    this.classList.remove('touch-active');
                }, { passive: true });
            });
        });
    }
}

/**
 * Viewport Height Manager
 * Handles 100vh issues on mobile browsers with dynamic toolbars
 */
class ViewportHeightManager {
    constructor() {
        this.init();
    }

    init() {
        this.setVH();
        window.addEventListener('resize', () => this.setVH());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setVH(), 100);
        });
    }

    /**
     * Set custom CSS variable for accurate viewport height
     */
    setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
}

// Initialize all mobile managers
let mobileNavManager;
let mobileModalManager;
let touchFeedbackManager;
let viewportHeightManager;

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMobileManagers);
    } else {
        initializeMobileManagers();
    }
}

function initializeMobileManagers() {
    try {
        mobileNavManager = new MobileNavigationManager();
        mobileModalManager = new MobileModalManager();
        touchFeedbackManager = new TouchFeedbackManager();
        viewportHeightManager = new ViewportHeightManager();

        console.log('Mobile managers initialized successfully');

        // Expose to window for debugging
        if (typeof window !== 'undefined') {
            window.mobileNavManager = mobileNavManager;
            window.mobileModalManager = mobileModalManager;
        }
    } catch (error) {
        console.error('Failed to initialize mobile managers:', error);
    }
}

// Export for use as ES6 module
export {
    MobileNavigationManager,
    MobileModalManager,
    TouchFeedbackManager,
    ViewportHeightManager,
    mobileNavManager,
    mobileModalManager,
    touchFeedbackManager,
    viewportHeightManager
};

// Also export as default
export default {
    MobileNavigationManager,
    MobileModalManager,
    TouchFeedbackManager,
    ViewportHeightManager,
    getInstance: () => ({
        nav: mobileNavManager,
        modal: mobileModalManager,
        touch: touchFeedbackManager,
        viewport: viewportHeightManager
    })
};
