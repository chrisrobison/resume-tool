// bridge-script.js - Extension Content Script Bridge
// Injects bridge code into page context where it can access both chrome.storage and window objects

(function() {
    'use strict';

    console.log('JHM Extension: Bridge content script loaded');

    // Inject the actual bridge code into the page context
    const script = document.createElement('script');
    script.textContent = `
        (async function() {
            console.log('JHM Bridge: Injected into page context');

            // Wait for IndexedDB service
            let attempts = 0;
            while (!window.indexedDBService && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.indexedDBService) {
                console.log('JHM Bridge: IndexedDB service not available');
                return;
            }

            console.log('JHM Bridge: IndexedDB service found');

            // Request sync from extension content script
            function requestSync() {
                window.postMessage({ type: 'JHM_REQUEST_SYNC' }, '*');
            }

            // Listen for sync data from content script
            window.addEventListener('message', async (event) => {
                if (event.source !== window) return;

                if (event.data.type === 'JHM_SYNC_DATA') {
                    const extensionJobs = event.data.jobs || [];

                    if (extensionJobs.length === 0) {
                        console.log('JHM Bridge: No jobs in extension');
                        return;
                    }

                    console.log(\`JHM Bridge: Received \${extensionJobs.length} jobs from extension\`);

                    // Get existing jobs
                    const idbJobs = await window.indexedDBService.getJobs();

                    // Find new jobs
                    const newJobs = extensionJobs.filter(extJob => {
                        return !idbJobs.some(idbJob =>
                            idbJob.id === extJob.id ||
                            (extJob.url && idbJob.url === extJob.url) ||
                            (idbJob.title === extJob.title && idbJob.company === extJob.company)
                        );
                    });

                    if (newJobs.length === 0) {
                        console.log('JHM Bridge: No new jobs to sync');
                        return;
                    }

                    console.log(\`JHM Bridge: Syncing \${newJobs.length} new jobs\`);

                    // Save new jobs
                    let synced = 0;
                    for (const job of newJobs) {
                        try {
                            job.source = 'extension';
                            job.syncedAt = new Date().toISOString();
                            await window.indexedDBService.saveJob(job);
                            synced++;
                        } catch (error) {
                            console.error('JHM Bridge: Failed to sync job:', error);
                        }
                    }

                    console.log(\`JHM Bridge: Synced \${synced} jobs\`);

                    // Trigger refresh
                    if (window.globalStore && synced > 0) {
                        window.dispatchEvent(new CustomEvent('jhm-data-updated', {
                            detail: { source: 'extension-sync', count: synced }
                        }));
                    }
                }
            });

            // Initial sync
            requestSync();

            // Periodic sync every 30 seconds
            setInterval(requestSync, 30000);

            // Add marker
            const marker = document.createElement('div');
            marker.setAttribute('data-jhm-bridge', 'active');
            marker.style.display = 'none';
            document.documentElement.appendChild(marker);

            console.log('JHM Bridge: Initialized');
        })();
    `;

    (document.head || document.documentElement).appendChild(script);
    script.remove(); // Clean up

    // Listen for sync requests from page context
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'JHM_REQUEST_SYNC') {
            try {
                // Get jobs from extension storage
                const result = await chrome.storage.local.get(['jobs']);

                // Send back to page context
                window.postMessage({
                    type: 'JHM_SYNC_DATA',
                    jobs: result.jobs || []
                }, '*');
            } catch (error) {
                console.error('JHM Bridge: Failed to get extension data:', error);
            }
        }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.jobs) {
            console.log('JHM Bridge: Storage changed, triggering sync');
            // Trigger sync by sending current data
            chrome.storage.local.get(['jobs'], (result) => {
                window.postMessage({
                    type: 'JHM_SYNC_DATA',
                    jobs: result.jobs || []
                }, '*');
            });
        }
    });

    console.log('JHM Extension: Bridge ready');

})();
