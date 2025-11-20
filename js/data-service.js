// Data Service - Main thread interface for Database Worker
// Provides a clean API for components to interact with IndexedDB

class DataService {
    constructor() {
        this.worker = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.isReady = false;
        this.migrated = false;

        this.initWorker();
    }

    initWorker() {
        try {
            // Use a simple version for cache control (change when updating worker)
            this.worker = new Worker(`../workers/db-worker.js?v=1`);

            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event.data);
            };

            this.worker.onerror = (error) => {
                console.error('Database Worker error:', error);
                this.handleWorkerError(error);
            };

        } catch (error) {
            console.error('Failed to initialize Database Worker:', error);
            throw new Error('Database Worker not supported in this browser');
        }
    }

    handleWorkerMessage(data) {
        const { type, requestId, message, data: responseData, error } = data;

        switch (type) {
            case 'ready':
                this.isReady = true;
                console.log('Database Worker ready');
                break;

            case 'progress':
                this.handleProgress(requestId, message);
                break;

            case 'success':
                this.handleSuccess(requestId, responseData);
                break;

            case 'error':
                this.handleError(requestId, error);
                break;

            default:
                console.warn('Unknown message type from Database Worker:', type);
        }
    }

    handleWorkerError(error) {
        console.error('Worker error:', error);

        // Reject all pending requests
        for (const [requestId, request] of this.pendingRequests) {
            if (request.reject) {
                request.reject(new Error('Database Worker encountered an error'));
            }
        }
        this.pendingRequests.clear();
    }

    handleProgress(requestId, message) {
        const request = this.pendingRequests.get(requestId);
        if (request && request.onProgress) {
            request.onProgress(message);
        }
    }

    handleSuccess(requestId, data) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            this.pendingRequests.delete(requestId);
            if (request.resolve) {
                request.resolve(data);
            }
        }
    }

    handleError(requestId, error) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            this.pendingRequests.delete(requestId);
            if (request.reject) {
                request.reject(new Error(error));
            }
        }
    }

    // Public API - Generic CRUD Operations

    /**
     * Get a single record by key
     * @param {string} store - Object store name
     * @param {any} key - Record key
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<any>} The record
     */
    async get(store, key, onProgress) {
        return this.makeRequest('get', { store, key }, onProgress);
    }

    /**
     * Get all records from a store
     * @param {string} store - Object store name
     * @param {string} index - Index name (optional)
     * @param {any} query - Query value (optional)
     * @param {number} limit - Max number of records (optional)
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of records
     */
    async getAll(store, index = null, query = null, limit = null, onProgress) {
        return this.makeRequest('getAll', { store, index, query, limit }, onProgress);
    }

    /**
     * Query records with filtering and sorting
     * @param {string} store - Object store name
     * @param {Object} filter - Filter criteria
     * @param {Object} sort - Sort configuration { field, direction }
     * @param {number} limit - Max number of records
     * @param {number} offset - Skip records
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of records
     */
    async query(store, filter = null, sort = null, limit = null, offset = 0, onProgress) {
        return this.makeRequest('query', { store, filter, sort, limit, offset }, onProgress);
    }

    /**
     * Put (insert or update) a record
     * @param {string} store - Object store name
     * @param {any} value - Record to save
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<any>} The key of the saved record
     */
    async put(store, value, onProgress) {
        return this.makeRequest('put', { store, value }, onProgress);
    }

    /**
     * Add a new record (fails if key exists)
     * @param {string} store - Object store name
     * @param {any} value - Record to add
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<any>} The key of the added record
     */
    async add(store, value, onProgress) {
        return this.makeRequest('add', { store, value }, onProgress);
    }

    /**
     * Delete a record
     * @param {string} store - Object store name
     * @param {any} key - Record key
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    async delete(store, key, onProgress) {
        return this.makeRequest('delete', { store, key }, onProgress);
    }

    /**
     * Clear all records from a store
     * @param {string} store - Object store name
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    async clear(store, onProgress) {
        return this.makeRequest('clear', { store }, onProgress);
    }

    /**
     * Count records in a store
     * @param {string} store - Object store name
     * @param {string} index - Index name (optional)
     * @param {any} query - Query value (optional)
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<number>} Record count
     */
    async count(store, index = null, query = null, onProgress) {
        return this.makeRequest('count', { store, index, query }, onProgress);
    }

    // Public API - Bulk Operations

    /**
     * Bulk put (insert/update) multiple records
     * @param {string} store - Object store name
     * @param {Array} values - Array of records
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Array>} Array of keys
     */
    async bulkPut(store, values, onProgress) {
        return this.makeRequest('bulkPut', { store, values }, onProgress);
    }

    /**
     * Bulk delete multiple records
     * @param {string} store - Object store name
     * @param {Array} keys - Array of keys
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<void>}
     */
    async bulkDelete(store, keys, onProgress) {
        return this.makeRequest('bulkDelete', { store, keys }, onProgress);
    }

    // Public API - Special Operations

    /**
     * Migrate data from localStorage to IndexedDB
     * @param {Object} localStorageData - Data from localStorage
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Migration result
     */
    async migrate(localStorageData, onProgress) {
        const result = await this.makeRequest('migrate', { localStorageData }, onProgress);
        this.migrated = true;
        return result;
    }

    /**
     * Export database to JSON
     * @param {Array<string>} stores - Store names to export (optional, defaults to all)
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Export data
     */
    async export(stores = null, onProgress) {
        return this.makeRequest('export', { stores }, onProgress);
    }

    /**
     * Import data from JSON
     * @param {Object} importData - Data to import
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Import result
     */
    async import(importData, onProgress) {
        return this.makeRequest('import', { importData }, onProgress);
    }

    // High-level domain-specific methods

    /**
     * Get all resumes
     * @returns {Promise<Array>} Array of resumes
     */
    async getResumes() {
        const result = await this.getAll('resumes', 'lastModified', null, null);
        return result.results || result;
    }

    /**
     * Get a single resume
     * @param {string} id - Resume ID
     * @returns {Promise<Object>} Resume object
     */
    async getResume(id) {
        const result = await this.get('resumes', id);
        return result.result || result;
    }

    /**
     * Save a resume
     * @param {Object} resume - Resume data
     * @returns {Promise<string>} Resume ID
     */
    async saveResume(resume) {
        // Ensure ID and timestamp
        if (!resume.id) {
            resume.id = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        resume.lastModified = new Date().toISOString();

        const result = await this.put('resumes', resume);
        return result.key || resume.id;
    }

    /**
     * Delete a resume
     * @param {string} id - Resume ID
     * @returns {Promise<void>}
     */
    async deleteResume(id) {
        await this.delete('resumes', id);
    }

    /**
     * Get all jobs
     * @param {string} status - Filter by status (optional)
     * @returns {Promise<Array>} Array of jobs
     */
    async getJobs(status = null) {
        if (status) {
            const result = await this.getAll('jobs', 'status', status);
            return result.results || result;
        }
        const result = await this.getAll('jobs', 'dateCreated', null, null);
        return result.results || result;
    }

    /**
     * Get a single job
     * @param {string} id - Job ID
     * @returns {Promise<Object>} Job object
     */
    async getJob(id) {
        const result = await this.get('jobs', id);
        return result.result || result;
    }

    /**
     * Save a job
     * @param {Object} job - Job data
     * @returns {Promise<string>} Job ID
     */
    async saveJob(job) {
        // Ensure ID and timestamp
        if (!job.id) {
            job.id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        if (!job.dateCreated) {
            job.dateCreated = new Date().toISOString();
        }

        const result = await this.put('jobs', job);
        return result.key || job.id;
    }

    /**
     * Delete a job
     * @param {string} id - Job ID
     * @returns {Promise<void>}
     */
    async deleteJob(id) {
        await this.delete('jobs', id);
    }

    /**
     * Get logs with optional filtering
     * @param {Object} filter - Filter criteria
     * @param {number} limit - Max number of logs
     * @returns {Promise<Array>} Array of logs
     */
    async getLogs(filter = null, limit = 100) {
        const result = await this.query('logs', filter, { field: 'timestamp', direction: 'desc' }, limit);
        return result.results || result;
    }

    /**
     * Add a log entry
     * @param {Object} log - Log data
     * @returns {Promise<number>} Log ID
     */
    async addLog(log) {
        log.timestamp = new Date().toISOString();
        const result = await this.add('logs', log);
        return result.key;
    }

    /**
     * Clear old logs
     * @param {number} daysToKeep - Keep logs from last N days
     * @returns {Promise<void>}
     */
    async clearOldLogs(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffISO = cutoffDate.toISOString();

        // Get all logs older than cutoff
        const result = await this.query('logs', {
            timestamp: (ts) => ts < cutoffISO
        });
        const oldLogs = result.results || result;

        if (oldLogs.length > 0) {
            const keys = oldLogs.map(log => log.id);
            await this.bulkDelete('logs', keys);
        }
    }

    /**
     * Get settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        const result = await this.get('settings', 'default');
        return result.result || result || {};
    }

    /**
     * Save settings
     * @param {Object} settings - Settings data
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
        settings.id = 'default';
        await this.put('settings', settings);
    }

    /**
     * Get cover letters for a job
     * @param {string} jobId - Job ID
     * @returns {Promise<Array>} Array of cover letters
     */
    async getCoverLetters(jobId) {
        const result = await this.getAll('coverLetters', 'jobId', jobId);
        return result.results || result;
    }

    /**
     * Save a cover letter
     * @param {Object} coverLetter - Cover letter data
     * @returns {Promise<string>} Cover letter ID
     */
    async saveCoverLetter(coverLetter) {
        if (!coverLetter.id) {
            coverLetter.id = `cover_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        coverLetter.timestamp = new Date().toISOString();

        const result = await this.put('coverLetters', coverLetter);
        return result.key || coverLetter.id;
    }

    /**
     * Get AI history
     * @param {number} limit - Max number of entries
     * @returns {Promise<Array>} Array of AI history entries
     */
    async getAIHistory(limit = 50) {
        const result = await this.query('aiHistory', null, { field: 'timestamp', direction: 'desc' }, limit);
        return result.results || result;
    }

    /**
     * Add AI history entry
     * @param {Object} entry - History entry
     * @returns {Promise<number>} Entry ID
     */
    async addAIHistory(entry) {
        entry.timestamp = new Date().toISOString();
        const result = await this.add('aiHistory', entry);
        return result.key;
    }

    // Utility methods

    /**
     * Make a request to the Database Worker
     * @private
     */
    async makeRequest(type, data, onProgress) {
        if (!this.isReady) {
            // Wait for worker to be ready (max 5 seconds)
            const startTime = Date.now();
            while (!this.isReady && (Date.now() - startTime) < 5000) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!this.isReady) {
                throw new Error('Database Worker not ready');
            }
        }

        const requestId = ++this.requestId;

        return new Promise((resolve, reject) => {
            // Store request for response handling
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                onProgress
            });

            // Send request to worker
            this.worker.postMessage({
                type,
                requestId,
                data
            });

            // Set timeout for request (30 seconds)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Database request timed out'));
                }
            }, 30000);
        });
    }

    /**
     * Check if worker is ready
     */
    isWorkerReady() {
        return this.isReady;
    }

    /**
     * Check if data has been migrated
     */
    isMigrated() {
        return this.migrated;
    }

    /**
     * Get the number of pending requests
     */
    getPendingRequestCount() {
        return this.pendingRequests.size;
    }

    /**
     * Terminate the worker (cleanup)
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            this.pendingRequests.clear();
        }
    }
}

// Create singleton instance
const dataService = new DataService();

// Export both the class and singleton instance
export { DataService, dataService as default };
