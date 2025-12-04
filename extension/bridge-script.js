// bridge-script.js - Extension Content Script Bridge (CSP-Safe Version)
// Syncs jobs from chrome.storage to web app's IndexedDB without inline scripts

(function() {
    'use strict';

    console.log('JHM Bridge: Content script loaded');

    // Listen for messages from page (web app)
    window.addEventListener('message', async (event) => {
        // Only process messages from same window
        if (event.source !== window) return;

        const message = event.data;

        switch (message.type) {
            case 'JHM_EXTENSION_PING':
                // Respond to ping
                console.log('JHM Bridge: Received ping, sending pong');
                window.postMessage({
                    type: 'JHM_EXTENSION_PONG',
                    version: chrome.runtime.getManifest().version
                }, '*');
                break;

            case 'JHM_GET_JOBS':
            case 'JHM_REQUEST_SYNC':
                // Get jobs from extension storage and send to web app
                console.log('JHM Bridge: Sync requested');
                try {
                    const result = await chrome.storage.local.get(['jobs']);
                    const jobs = result.jobs || [];
                    console.log(`JHM Bridge: Sending ${jobs.length} jobs to web app`);

                    window.postMessage({
                        type: 'JHM_EXTENSION_DATA',
                        jobs: jobs
                    }, '*');
                } catch (error) {
                    console.error('JHM Bridge: Failed to get jobs:', error);
                }
                break;
        }
    });

    // Listen for storage changes in extension
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.jobs) {
            console.log('JHM Bridge: Extension storage changed, syncing...');

            // Get updated jobs and notify web app
            chrome.storage.local.get(['jobs'], (result) => {
                const jobs = result.jobs || [];
                console.log(`JHM Bridge: Sending ${jobs.length} updated jobs to web app`);

                window.postMessage({
                    type: 'JHM_EXTENSION_DATA',
                    jobs: jobs
                }, '*');
            });
        }
    });

    // Add extension marker for detection
    const marker = document.createElement('div');
    marker.setAttribute('data-jhm-bridge', 'active');
    marker.setAttribute('data-jhm-bridge-version', '2.0');
    marker.style.display = 'none';
    document.documentElement.appendChild(marker);

    // Initial sync on load
    setTimeout(async () => {
        try {
            const result = await chrome.storage.local.get(['jobs']);
            const jobs = result.jobs || [];
            console.log(`JHM Bridge: Initial sync - ${jobs.length} jobs available`);

            if (jobs.length > 0) {
                window.postMessage({
                    type: 'JHM_EXTENSION_DATA',
                    jobs: jobs
                }, '*');
            }
        } catch (error) {
            console.error('JHM Bridge: Initial sync failed:', error);
        }
    }, 1000);

    // Periodic sync every 30 seconds
    setInterval(async () => {
        try {
            const result = await chrome.storage.local.get(['jobs']);
            const jobs = result.jobs || [];

            // Only send if there are jobs
            if (jobs.length > 0) {
                console.log(`JHM Bridge: Periodic sync - ${jobs.length} jobs`);
                window.postMessage({
                    type: 'JHM_EXTENSION_DATA',
                    jobs: jobs
                }, '*');
            }
        } catch (error) {
            console.error('JHM Bridge: Periodic sync failed:', error);
        }
    }, 30000);

    console.log('JHM Bridge: Ready (CSP-safe mode)');
})();
