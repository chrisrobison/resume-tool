// indexeddb-service.js - IndexedDB Service for Job Hunt Manager
// Provides persistent storage with large capacity and async operations

/**
 * IndexedDB Service
 * Manages all database operations for jobs, resumes, letters, and settings
 */
class IndexedDBService {
    constructor() {
        this.dbName = 'JobHuntManagerDB';
        this.version = 1;
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize database connection
     * Creates object stores if they don't exist
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }

        // Return db if already initialized
        if (this.isInitialized && this.db) {
            return this.db;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Upgrading IndexedDB schema...');

                // Jobs store
                if (!db.objectStoreNames.contains('jobs')) {
                    const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
                    jobsStore.createIndex('company', 'company', { unique: false });
                    jobsStore.createIndex('status', 'status', { unique: false });
                    jobsStore.createIndex('dateApplied', 'dateApplied', { unique: false });
                    jobsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Created jobs store');
                }

                // Resumes store
                if (!db.objectStoreNames.contains('resumes')) {
                    const resumesStore = db.createObjectStore('resumes', { keyPath: 'id' });
                    resumesStore.createIndex('name', 'basics.name', { unique: false });
                    resumesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    resumesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('Created resumes store');
                }

                // Cover letters store
                if (!db.objectStoreNames.contains('letters')) {
                    const lettersStore = db.createObjectStore('letters', { keyPath: 'id' });
                    lettersStore.createIndex('jobId', 'jobId', { unique: false });
                    lettersStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Created letters store');
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Created settings store');
                }

                // Metadata store (for sync info, migration status, etc.)
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                    console.log('Created metadata store');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Generic get operation
     * @param {string} storeName - Name of object store
     * @param {string} key - Key to retrieve
     * @returns {Promise<any>}
     */
    async get(storeName, key) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic get all operation
     * @param {string} storeName - Name of object store
     * @returns {Promise<Array>}
     */
    async getAll(storeName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic put operation (add or update)
     * @param {string} storeName - Name of object store
     * @param {any} data - Data to store
     * @returns {Promise<any>}
     */
    async put(storeName, data) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete operation
     * @param {string} storeName - Name of object store
     * @param {string} key - Key to delete
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data from a store
     * @param {string} storeName - Name of object store
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query by index
     * @param {string} storeName - Name of object store
     * @param {string} indexName - Name of index
     * @param {any} query - Query value
     * @returns {Promise<Array>}
     */
    async getByIndex(storeName, indexName, query) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== Jobs Operations ====================

    /**
     * Get all jobs
     * @returns {Promise<Array>}
     */
    async getJobs() {
        return this.getAll('jobs');
    }

    /**
     * Get single job by ID
     * @param {string} id - Job ID
     * @returns {Promise<Object>}
     */
    async getJob(id) {
        return this.get('jobs', id);
    }

    /**
     * Save job (add or update)
     * @param {Object} job - Job data
     * @returns {Promise<string>} - Job ID
     */
    async saveJob(job) {
        // Ensure job has required fields
        if (!job.id) {
            job.id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!job.createdAt) {
            job.createdAt = new Date().toISOString();
        }
        job.updatedAt = new Date().toISOString();

        await this.put('jobs', job);
        return job.id;
    }

    /**
     * Delete job
     * @param {string} id - Job ID
     * @returns {Promise<void>}
     */
    async deleteJob(id) {
        return this.delete('jobs', id);
    }

    /**
     * Get jobs by status
     * @param {string} status - Job status
     * @returns {Promise<Array>}
     */
    async getJobsByStatus(status) {
        return this.getByIndex('jobs', 'status', status);
    }

    /**
     * Get jobs by company
     * @param {string} company - Company name
     * @returns {Promise<Array>}
     */
    async getJobsByCompany(company) {
        return this.getByIndex('jobs', 'company', company);
    }

    // ==================== Resumes Operations ====================

    /**
     * Get all resumes
     * @returns {Promise<Array>}
     */
    async getResumes() {
        return this.getAll('resumes');
    }

    /**
     * Get single resume by ID
     * @param {string} id - Resume ID
     * @returns {Promise<Object>}
     */
    async getResume(id) {
        return this.get('resumes', id);
    }

    /**
     * Save resume (add or update)
     * @param {Object} resume - Resume data
     * @returns {Promise<string>} - Resume ID
     */
    async saveResume(resume) {
        if (!resume.id) {
            resume.id = `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!resume.createdAt) {
            resume.createdAt = new Date().toISOString();
        }
        resume.updatedAt = new Date().toISOString();

        await this.put('resumes', resume);
        return resume.id;
    }

    /**
     * Delete resume
     * @param {string} id - Resume ID
     * @returns {Promise<void>}
     */
    async deleteResume(id) {
        return this.delete('resumes', id);
    }

    // ==================== Cover Letters Operations ====================

    /**
     * Get all cover letters
     * @returns {Promise<Array>}
     */
    async getLetters() {
        return this.getAll('letters');
    }

    /**
     * Get single letter by ID
     * @param {string} id - Letter ID
     * @returns {Promise<Object>}
     */
    async getLetter(id) {
        return this.get('letters', id);
    }

    /**
     * Save letter (add or update)
     * @param {Object} letter - Letter data
     * @returns {Promise<string>} - Letter ID
     */
    async saveLetter(letter) {
        if (!letter.id) {
            letter.id = `letter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!letter.createdAt) {
            letter.createdAt = new Date().toISOString();
        }
        letter.updatedAt = new Date().toISOString();

        await this.put('letters', letter);
        return letter.id;
    }

    /**
     * Delete letter
     * @param {string} id - Letter ID
     * @returns {Promise<void>}
     */
    async deleteLetter(id) {
        return this.delete('letters', id);
    }

    /**
     * Get letters for a specific job
     * @param {string} jobId - Job ID
     * @returns {Promise<Array>}
     */
    async getLettersByJob(jobId) {
        return this.getByIndex('letters', 'jobId', jobId);
    }

    // ==================== Settings Operations ====================

    /**
     * Get setting by key
     * @param {string} key - Setting key
     * @param {any} defaultValue - Default value if not found
     * @returns {Promise<any>}
     */
    async getSetting(key, defaultValue = null) {
        const setting = await this.get('settings', key);
        return setting ? setting.value : defaultValue;
    }

    /**
     * Save setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<void>}
     */
    async saveSetting(key, value) {
        await this.put('settings', { key, value, updatedAt: new Date().toISOString() });
    }

    /**
     * Delete setting
     * @param {string} key - Setting key
     * @returns {Promise<void>}
     */
    async deleteSetting(key) {
        return this.delete('settings', key);
    }

    // ==================== Metadata Operations ====================

    /**
     * Get metadata by key
     * @param {string} key - Metadata key
     * @returns {Promise<any>}
     */
    async getMetadata(key) {
        const metadata = await this.get('metadata', key);
        return metadata ? metadata.value : null;
    }

    /**
     * Save metadata
     * @param {string} key - Metadata key
     * @param {any} value - Metadata value
     * @returns {Promise<void>}
     */
    async saveMetadata(key, value) {
        await this.put('metadata', { key, value, updatedAt: new Date().toISOString() });
    }

    // ==================== Utility Operations ====================

    /**
     * Get database statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        await this.init();

        const jobs = await this.getJobs();
        const resumes = await this.getResumes();
        const letters = await this.getLetters();

        return {
            jobs: jobs.length,
            resumes: resumes.length,
            letters: letters.length,
            totalRecords: jobs.length + resumes.length + letters.length,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Export all data
     * @returns {Promise<Object>}
     */
    async exportAll() {
        await this.init();

        return {
            jobs: await this.getJobs(),
            resumes: await this.getResumes(),
            letters: await this.getLetters(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import data (replaces existing)
     * @param {Object} data - Data to import
     * @returns {Promise<Object>} - Import results
     */
    async importAll(data) {
        await this.init();

        const results = {
            jobs: 0,
            resumes: 0,
            letters: 0,
            errors: []
        };

        // Import jobs
        if (data.jobs && Array.isArray(data.jobs)) {
            for (const job of data.jobs) {
                try {
                    await this.saveJob(job);
                    results.jobs++;
                } catch (error) {
                    results.errors.push({ type: 'job', id: job.id, error: error.message });
                }
            }
        }

        // Import resumes
        if (data.resumes && Array.isArray(data.resumes)) {
            for (const resume of data.resumes) {
                try {
                    await this.saveResume(resume);
                    results.resumes++;
                } catch (error) {
                    results.errors.push({ type: 'resume', id: resume.id, error: error.message });
                }
            }
        }

        // Import letters
        if (data.letters && Array.isArray(data.letters)) {
            for (const letter of data.letters) {
                try {
                    await this.saveLetter(letter);
                    results.letters++;
                } catch (error) {
                    results.errors.push({ type: 'letter', id: letter.id, error: error.message });
                }
            }
        }

        return results;
    }

    /**
     * Clear all data (use with caution!)
     * @returns {Promise<void>}
     */
    async clearAll() {
        await this.init();

        await this.clear('jobs');
        await this.clear('resumes');
        await this.clear('letters');
        await this.clear('settings');
        await this.clear('metadata');

        console.log('All data cleared from IndexedDB');
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            console.log('IndexedDB connection closed');
        }
    }
}

// Create singleton instance
const indexedDBService = new IndexedDBService();

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBService;
}

// Make available globally
window.IndexedDBService = IndexedDBService;
window.indexedDBService = indexedDBService;
