// extension-sync.js - Sync service for Chrome Extension integration
// Syncs jobs from extension's chrome.storage.local to web app's IndexedDB

/**
 * Extension Sync Service
 * Syncs job data between Chrome extension and web app
 */
class ExtensionSync {
    constructor() {
        this.extensionId = null; // Will be detected or configured
        this.idbService = window.indexedDBService;
        this.syncKey = 'extension_sync_status';
        this.isExtensionAvailable = false;
    }

    /**
     * Initialize sync service and detect extension
     * @returns {Promise<boolean>}
     */
    async init() {
        console.log('ExtensionSync: Initializing...');

        // Always setup message listener (even if extension not detected yet)
        this.setupMessageListener();

        // Try to detect extension
        await this.detectExtension();

        if (this.isExtensionAvailable) {
            console.log('ExtensionSync: Extension detected, requesting initial sync');

            // Run initial sync
            await this.syncFromExtension();

            return true;
        } else {
            console.log('ExtensionSync: Extension not detected yet (will keep listening)');
            return false;
        }
    }

    /**
     * Detect if extension is installed
     * @returns {Promise<boolean>}
     */
    async detectExtension() {
        // Try common extension detection methods

        // Method 1: Check for extension-injected elements
        const extensionMarker = document.querySelector('[data-jhm-extension]');
        if (extensionMarker) {
            this.isExtensionAvailable = true;
            return true;
        }

        // Method 2: Try to communicate with extension via window events
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.isExtensionAvailable = false;
                resolve(false);
            }, 1000);

            // Listen for extension response
            window.addEventListener('message', function handler(event) {
                if (event.data && event.data.type === 'JHM_EXTENSION_PONG') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    this.isExtensionAvailable = true;
                    resolve(true);
                }
            }.bind(this));

            // Send ping to extension
            window.postMessage({ type: 'JHM_EXTENSION_PING' }, '*');
        });
    }

    /**
     * Setup message listener for extension communication
     */
    setupMessageListener() {
        window.addEventListener('message', async (event) => {
            // Only accept messages from same origin
            if (event.origin !== window.location.origin) {
                return;
            }

            const message = event.data;

            switch (message.type) {
                case 'JHM_SYNC_REQUEST':
                    console.log('ExtensionSync: Sync requested by extension');
                    await this.syncFromExtension();
                    break;

                case 'JHM_JOB_SAVED':
                    console.log('ExtensionSync: New job saved by extension');
                    await this.importJob(message.job);
                    break;

                case 'JHM_EXTENSION_DATA':
                    console.log('ExtensionSync: Received data from extension');
                    await this.importJobs(message.jobs);
                    break;
            }
        });

        console.log('ExtensionSync: Message listener setup complete');
    }

    /**
     * Request sync from extension
     * @returns {Promise<Object>}
     */
    async syncFromExtension() {
        console.log('ExtensionSync: Requesting jobs from extension...');

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('ExtensionSync: Sync request timed out');
                resolve({ success: false, error: 'Timeout' });
            }, 5000);

            // Listen for response
            const handler = async (event) => {
                if (event.data && event.data.type === 'JHM_EXTENSION_DATA') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);

                    const jobs = event.data.jobs || [];
                    console.log(`ExtensionSync: Received ${jobs.length} jobs from extension`);

                    const result = await this.importJobs(jobs);
                    resolve(result);
                }
            };

            window.addEventListener('message', handler);

            // Request data from extension
            window.postMessage({ type: 'JHM_GET_JOBS' }, '*');
        });
    }

    /**
     * Import multiple jobs from extension
     * @param {Array} jobs - Jobs to import
     * @returns {Promise<Object>}
     */
    async importJobs(jobs) {
        if (!jobs || jobs.length === 0) {
            console.log('ExtensionSync: No jobs to import');
            return { imported: 0, skipped: 0, failed: 0 };
        }

        console.log(`ExtensionSync: Importing ${jobs.length} jobs...`);

        const results = {
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (const job of jobs) {
            try {
                const imported = await this.importJob(job);
                if (imported) {
                    results.imported++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    job: job.id || job.title,
                    error: error.message
                });
                console.error('ExtensionSync: Failed to import job:', error);
            }
        }

        console.log(`ExtensionSync: Import complete - ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`);

        // Update sync status
        await this.updateSyncStatus({
            lastSync: new Date().toISOString(),
            ...results
        });

        // Trigger global store refresh
        if (window.globalStore && results.imported > 0) {
            window.globalStore.dispatch({
                type: 'EXTENSION_SYNC_COMPLETE',
                payload: results
            });

            // Also trigger a general data refresh event
            window.dispatchEvent(new CustomEvent('jhm-data-updated', {
                detail: {
                    source: 'extension-sync',
                    count: results.imported,
                    results: results
                }
            }));

            console.log(`ExtensionSync: Triggered UI refresh for ${results.imported} new jobs`);
        }

        return results;
    }

    /**
     * Import single job from extension
     * @param {Object} job - Job to import
     * @returns {Promise<boolean>} - True if imported, false if skipped
     */
    async importJob(job) {
        // Check if job already exists in IndexedDB
        const existingJobs = await this.idbService.getJobs();

        // Check for duplicate by ID, URL, or title+company
        const isDuplicate = existingJobs.some(existing =>
            existing.id === job.id ||
            (job.url && existing.url === job.url) ||
            (existing.title === job.title && existing.company === job.company)
        );

        if (isDuplicate) {
            console.log(`ExtensionSync: Skipping duplicate job: ${job.title} at ${job.company}`);
            return false;
        }

        // Import job to IndexedDB
        console.log(`ExtensionSync: Importing job: ${job.title} at ${job.company}`);

        // Ensure job has required fields
        if (!job.id) {
            job.id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!job.createdAt) {
            job.createdAt = new Date().toISOString();
        }

        // Mark as imported from extension
        job.source = 'extension';
        job.syncedAt = new Date().toISOString();

        await this.idbService.saveJob(job);
        return true;
    }

    /**
     * Get sync status
     * @returns {Promise<Object>}
     */
    async getSyncStatus() {
        try {
            const status = await this.idbService.getMetadata(this.syncKey);
            return status || {
                lastSync: null,
                imported: 0,
                skipped: 0,
                failed: 0
            };
        } catch (error) {
            console.error('ExtensionSync: Error getting sync status:', error);
            return null;
        }
    }

    /**
     * Update sync status
     * @param {Object} status - Status to save
     */
    async updateSyncStatus(status) {
        try {
            await this.idbService.saveMetadata(this.syncKey, status);
        } catch (error) {
            console.error('ExtensionSync: Error updating sync status:', error);
        }
    }

    /**
     * Manually trigger sync
     * @returns {Promise<Object>}
     */
    async manualSync() {
        console.log('ExtensionSync: Manual sync triggered');

        if (!this.isExtensionAvailable) {
            const detected = await this.detectExtension();
            if (!detected) {
                return {
                    success: false,
                    error: 'Extension not available'
                };
            }
        }

        return await this.syncFromExtension();
    }

    /**
     * Clear sync status (for testing)
     */
    async clearSyncStatus() {
        await this.idbService.delete('metadata', this.syncKey);
        console.log('ExtensionSync: Sync status cleared');
    }
}

// Create singleton instance
const extensionSync = new ExtensionSync();

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionSync;
}

// Make available globally
window.ExtensionSync = ExtensionSync;
window.extensionSync = extensionSync;
