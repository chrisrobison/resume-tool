// bridge-script.js - Bridge between Chrome Extension and Web App
// Runs on localhost:3000 to sync data between chrome.storage.local and IndexedDB

(function() {
    'use strict';

    console.log('JHM Bridge: Initializing on web app page');

    // Wait for IndexedDB service to be available
    function waitForServices() {
        return new Promise((resolve) => {
            const checkServices = () => {
                if (window.indexedDBService && window.extensionSync) {
                    console.log('JHM Bridge: Services available');
                    resolve();
                } else {
                    console.log('JHM Bridge: Waiting for services...');
                    setTimeout(checkServices, 100);
                }
            };
            checkServices();
        });
    }

    // Initialize bridge
    async function init() {
        try {
            // Wait for services to load
            await waitForServices();

            console.log('JHM Bridge: Starting auto-sync');

            // Run initial sync
            await syncFromExtension();

            // Set up periodic sync (every 30 seconds)
            setInterval(async () => {
                await syncFromExtension();
            }, 30000);

            // Listen for storage changes in extension
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.jobs) {
                    console.log('JHM Bridge: Extension storage changed, syncing...');
                    syncFromExtension();
                }
            });

            console.log('JHM Bridge: Initialization complete');

        } catch (error) {
            console.error('JHM Bridge: Initialization failed:', error);
        }
    }

    // Sync jobs from extension to IndexedDB
    async function syncFromExtension() {
        try {
            console.log('JHM Bridge: Syncing from extension...');

            // Get jobs from extension storage
            const result = await chrome.storage.local.get(['jobs']);
            const extensionJobs = result.jobs || [];

            if (extensionJobs.length === 0) {
                console.log('JHM Bridge: No jobs in extension storage');
                return;
            }

            console.log(`JHM Bridge: Found ${extensionJobs.length} jobs in extension`);

            // Get existing jobs from IndexedDB
            const idbJobs = await window.indexedDBService.getJobs();

            // Find new jobs (not in IndexedDB)
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

            console.log(`JHM Bridge: Syncing ${newJobs.length} new jobs to IndexedDB`);

            // Save new jobs to IndexedDB
            let synced = 0;
            for (const job of newJobs) {
                try {
                    // Mark as synced from extension
                    job.source = 'extension';
                    job.syncedAt = new Date().toISOString();

                    await window.indexedDBService.saveJob(job);
                    synced++;
                } catch (error) {
                    console.error(`JHM Bridge: Failed to sync job ${job.id}:`, error);
                }
            }

            console.log(`JHM Bridge: Successfully synced ${synced} jobs`);

            // Trigger global store to reload
            if (window.globalStore && synced > 0) {
                const event = new CustomEvent('jhm-data-updated', {
                    detail: { source: 'extension-sync', count: synced }
                });
                window.dispatchEvent(event);
            }

        } catch (error) {
            console.error('JHM Bridge: Sync failed:', error);
        }
    }

    // Add marker that bridge is active
    const marker = document.createElement('div');
    marker.setAttribute('data-jhm-bridge', 'active');
    marker.style.display = 'none';
    document.documentElement.appendChild(marker);

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
