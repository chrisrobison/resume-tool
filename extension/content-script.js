// content-script.js - Content Script for Job Extraction
// Runs on job board pages to extract job details

(function() {
    'use strict';

    // State
    let isInitialized = false;
    let currentPlatform = null;
    let parser = null;

    /**
     * Initialize content script
     */
    function init() {
        if (isInitialized) return;

        console.log('Job Hunt Manager: Content script initialized');

        // Detect platform
        currentPlatform = detectPlatform();
        console.log('Platform detected:', currentPlatform);

        // Initialize parser
        initializeParser();

        // Add save button to page
        addSaveButton();

        isInitialized = true;
    }

    /**
     * Detect platform from URL
     */
    function detectPlatform() {
        const hostname = window.location.hostname;

        if (hostname.includes('linkedin.com')) {
            return 'linkedin';
        } else if (hostname.includes('indeed.com')) {
            return 'indeed';
        } else if (hostname.includes('glassdoor.com') || hostname.includes('glassdoor.ca')) {
            return 'glassdoor';
        }

        return 'unknown';
    }

    /**
     * Initialize platform-specific parser
     */
    function initializeParser() {
        if (currentPlatform === 'linkedin' && typeof LinkedInParser !== 'undefined') {
            parser = new LinkedInParser();
        } else if (currentPlatform === 'indeed' && typeof IndeedParser !== 'undefined') {
            parser = new IndeedParser();
        } else if (currentPlatform === 'glassdoor' && typeof GlassdoorParser !== 'undefined') {
            parser = new GlassdoorParser();
        } else {
            console.warn('No parser available for platform:', currentPlatform);
        }
    }

    /**
     * Extract job from current page
     */
    async function extractJob() {
        try {
            if (!parser) {
                throw new Error('No parser available for this platform');
            }

            // Get HTML
            const html = document.documentElement.outerHTML;
            const url = window.location.href;

            // Parse job data
            const jobData = await parser.parse(html, url);

            if (!jobData || !jobData.title || !jobData.company) {
                throw new Error('Failed to extract job details');
            }

            console.log('Extracted job:', jobData);

            return {
                success: true,
                job: jobData,
                platform: currentPlatform
            };

        } catch (error) {
            console.error('Extraction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add save button to page
     */
    function addSaveButton() {
        // Check if button already exists
        if (document.getElementById('jhm-save-btn')) {
            return;
        }

        // Create button
        const button = document.createElement('button');
        button.id = 'jhm-save-btn';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Save Job</span>
        `;

        // Style button
        Object.assign(button.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(52, 152, 219, 0.4)',
            zIndex: '999999',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.background = '#2980b9';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(52, 152, 219, 0.5)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#3498db';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.4)';
        });

        // Click handler
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
                <span>Saving...</span>
            `;

            // Add spinner animation
            const style = document.createElement('style');
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);

            try {
                const result = await extractJob();

                if (result.success) {
                    // Send to background script to save
                    chrome.runtime.sendMessage({
                        action: 'saveJob',
                        job: result.job
                    }, (response) => {
                        if (response && response.success) {
                            // Success
                            button.innerHTML = `
                                <span>✓</span>
                                <span>Saved!</span>
                            `;
                            button.style.background = '#27ae60';

                            // Reset after 2 seconds
                            setTimeout(() => {
                                button.innerHTML = `
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <span>Save Job</span>
                                `;
                                button.style.background = '#3498db';
                                button.disabled = false;
                            }, 2000);
                        } else {
                            // Error
                            button.innerHTML = `
                                <span>✗</span>
                                <span>${response?.error || 'Failed'}</span>
                            `;
                            button.style.background = '#e74c3c';

                            setTimeout(() => {
                                button.innerHTML = `
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <span>Save Job</span>
                                `;
                                button.style.background = '#3498db';
                                button.disabled = false;
                            }, 2000);
                        }
                    });
                } else {
                    // Extraction failed
                    button.innerHTML = `
                        <span>✗</span>
                        <span>Failed</span>
                    `;
                    button.style.background = '#e74c3c';

                    setTimeout(() => {
                        button.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>Save Job</span>
                        `;
                        button.style.background = '#3498db';
                        button.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('Error:', error);
                button.innerHTML = `
                    <span>✗</span>
                    <span>Error</span>
                `;
                button.style.background = '#e74c3c';

                setTimeout(() => {
                    button.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>Save Job</span>
                    `;
                    button.style.background = '#3498db';
                    button.disabled = false;
                }, 2000);
            }
        });

        // Add button to page
        document.body.appendChild(button);
    }

    /**
     * Listen for messages from background script
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractJob') {
            extractJob().then(sendResponse);
            return true; // Keep channel open for async response
        } else if (request.action === 'ping') {
            sendResponse({ pong: true });
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
