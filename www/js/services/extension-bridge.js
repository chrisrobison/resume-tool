// extension-bridge.js - Bridge Service that runs in page context
// Syncs data between Chrome extension storage and IndexedDB

/**
 * Extension Bridge Service
 * Runs in page context and can access both IndexedDB and extension storage
 */
class ExtensionBridge {
    constructor() {
        this.idbService = null;
        this.isInitialized = false;
        this.syncInterval = null;
        this.syncIntervalMs = 30000; // 30 seconds
    }

    /**
     * Initialize the bridge
     * @returns {Promise<boolean>}
     */
    async init() {
        console.log('ExtensionBridge: Initializing...');

        // Wait for IndexedDB service
        if (!window.indexedDBService) {
            console.log('ExtensionBridge: IndexedDB service not available yet');
            return false;
        }

        this.idbService = window.indexedDBService;

        // Check if we're running in a context with chrome.storage access
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.log('ExtensionBridge: Chrome extension API not available');
            return false;
        }

        console.log('ExtensionBridge: Chrome extension API available');

        // Setup storage change listener
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.jobs) {
                console.log('ExtensionBridge: Extension storage changed, syncing...');
                this.sync();
            }
        });

        // Run initial sync
        await this.sync();

        // Setup periodic sync
        this.syncInterval = setInterval(() => {
            this.sync();
        }, this.syncIntervalMs);

        this.isInitialized = true;
        console.log('ExtensionBridge: Initialization complete');

        // Add marker for detection
        const marker = document.createElement('div');
        marker.setAttribute('data-jhm-bridge', 'active');
        marker.style.display = 'none';
        document.documentElement.appendChild(marker);

        return true;
    }

    /**
     * Sync jobs from extension storage to IndexedDB
     * @returns {Promise<Object>}
     */
    async sync() {
        try {
            console.log('ExtensionBridge: Starting sync...');

            // Get jobs from extension storage
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['jobs'], resolve);
            });

            const extensionJobs = result.jobs || [];

            if (extensionJobs.length === 0) {
                console.log('ExtensionBridge: No jobs in extension storage');
                return { synced: 0, total: 0 };
            }

            console.log(`ExtensionBridge: Found ${extensionJobs.length} jobs in extension`);

            // Get existing jobs from IndexedDB
            const idbJobs = await this.idbService.getJobs();
            console.log(`ExtensionBridge: Found ${idbJobs.length} jobs in IndexedDB`);

            // Find new jobs (not in IndexedDB)
            const newJobs = extensionJobs.filter(extJob => {
                return !idbJobs.some(idbJob =>
                    idbJob.id === extJob.id ||
                    (extJob.url && idbJob.url === extJob.url) ||
                    (idbJob.title === extJob.title && idbJob.company === extJob.company)
                );
            });

            if (newJobs.length === 0) {
                console.log('ExtensionBridge: No new jobs to sync');
                return { synced: 0, total: extensionJobs.length };
            }

            console.log(`ExtensionBridge: Syncing ${newJobs.length} new jobs to IndexedDB`);

            // Save new jobs to IndexedDB
            let synced = 0;
            for (const job of newJobs) {
                try {
                    // Mark as synced from extension
                    job.source = 'extension';
                    job.syncedAt = new Date().toISOString();

                    await this.idbService.saveJob(job);
                    synced++;
                    console.log(`ExtensionBridge: Synced job: ${job.title} at ${job.company}`);
                } catch (error) {
                    console.error(`ExtensionBridge: Failed to sync job ${job.id}:`, error);
                }
            }

            console.log(`ExtensionBridge: Successfully synced ${synced} jobs`);

            // Trigger global store to reload
            if (window.globalStore && synced > 0) {
                const event = new CustomEvent('jhm-data-updated', {
                    detail: { source: 'extension-sync', count: synced }
                });
                window.dispatchEvent(event);
            }

            return { synced, total: extensionJobs.length };

        } catch (error) {
            console.error('ExtensionBridge: Sync failed:', error);
            return { synced: 0, total: 0, error: error.message };
        }
    }

    /**
     * Stop the bridge
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isInitialized = false;
        console.log('ExtensionBridge: Stopped');
    }
}

// Auto-initialize when DOM is ready
async function initExtensionBridge() {
    // Wait for IndexedDB service to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    while (!window.indexedDBService && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.indexedDBService) {
        console.log('ExtensionBridge: IndexedDB service not available after 5s');
        return;
    }

    // Check if chrome.storage is available (we're in extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const bridge = new ExtensionBridge();
        await bridge.init();
        window.extensionBridge = bridge;
    } else {
        console.log('ExtensionBridge: Not in extension context, bridge not needed');
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtensionBridge);
} else {
    initExtensionBridge();
}

// Export
window.ExtensionBridge = ExtensionBridge;
