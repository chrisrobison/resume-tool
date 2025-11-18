// Database Worker - Handles all IndexedDB operations in a separate thread
// This prevents UI blocking during database operations and provides efficient data management

class DatabaseWorker {
    constructor() {
        this.db = null;
        this.dbName = 'JobToolDB';
        this.dbVersion = 1;
        this.pendingRequests = new Map();
        this.requestId = 0;

        // Listen for messages from main thread
        self.addEventListener('message', this.handleMessage.bind(this));

        // Initialize database
        this.initDatabase().then(() => {
            // Send ready signal
            self.postMessage({ type: 'ready' });
        }).catch(error => {
            self.postMessage({
                type: 'error',
                error: `Failed to initialize database: ${error.message}`
            });
        });
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                this.createObjectStores(db);

                console.log('Database schema created/upgraded');
            };
        });
    }

    createObjectStores(db) {
        // Resumes store
        if (!db.objectStoreNames.contains('resumes')) {
            const resumeStore = db.createObjectStore('resumes', { keyPath: 'id' });
            resumeStore.createIndex('name', 'name', { unique: false });
            resumeStore.createIndex('timestamp', 'timestamp', { unique: false });
            resumeStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Jobs store
        if (!db.objectStoreNames.contains('jobs')) {
            const jobStore = db.createObjectStore('jobs', { keyPath: 'id' });
            jobStore.createIndex('status', 'status', { unique: false });
            jobStore.createIndex('company', 'company', { unique: false });
            jobStore.createIndex('title', 'title', { unique: false });
            jobStore.createIndex('dateCreated', 'dateCreated', { unique: false });
            jobStore.createIndex('dateApplied', 'dateApplied', { unique: false });
            jobStore.createIndex('resumeId', 'resumeId', { unique: false });
        }

        // Logs store
        if (!db.objectStoreNames.contains('logs')) {
            const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
            logStore.createIndex('type', 'type', { unique: false });
            logStore.createIndex('operation', 'operation', { unique: false });
        }

        // Settings store (single record)
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Cover Letters store
        if (!db.objectStoreNames.contains('coverLetters')) {
            const coverLetterStore = db.createObjectStore('coverLetters', { keyPath: 'id' });
            coverLetterStore.createIndex('jobId', 'jobId', { unique: false });
            coverLetterStore.createIndex('resumeId', 'resumeId', { unique: false });
            coverLetterStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // AI History store
        if (!db.objectStoreNames.contains('aiHistory')) {
            const aiHistoryStore = db.createObjectStore('aiHistory', { keyPath: 'id', autoIncrement: true });
            aiHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
            aiHistoryStore.createIndex('operation', 'operation', { unique: false });
            aiHistoryStore.createIndex('provider', 'provider', { unique: false });
        }
    }

    handleMessage(event) {
        const { type, data, requestId } = event.data;

        switch (type) {
            // Generic CRUD operations
            case 'get':
                this.handleGet(data, requestId);
                break;
            case 'getAll':
                this.handleGetAll(data, requestId);
                break;
            case 'query':
                this.handleQuery(data, requestId);
                break;
            case 'put':
                this.handlePut(data, requestId);
                break;
            case 'add':
                this.handleAdd(data, requestId);
                break;
            case 'delete':
                this.handleDelete(data, requestId);
                break;
            case 'clear':
                this.handleClear(data, requestId);
                break;
            case 'count':
                this.handleCount(data, requestId);
                break;

            // Bulk operations
            case 'bulkPut':
                this.handleBulkPut(data, requestId);
                break;
            case 'bulkDelete':
                this.handleBulkDelete(data, requestId);
                break;

            // Special operations
            case 'migrate':
                this.handleMigrate(data, requestId);
                break;
            case 'export':
                this.handleExport(data, requestId);
                break;
            case 'import':
                this.handleImport(data, requestId);
                break;

            default:
                this.postError(`Unknown message type: ${type}`, requestId);
        }
    }

    async handleGet(data, requestId) {
        try {
            const { store, key } = data;
            this.postProgress(`Getting ${key} from ${store}...`, requestId);

            const result = await this.get(store, key);

            this.postSuccess({
                type: 'get',
                store,
                key,
                result
            }, requestId);
        } catch (error) {
            this.postError(`Get failed: ${error.message}`, requestId);
        }
    }

    async handleGetAll(data, requestId) {
        try {
            const { store, index, query, limit } = data;
            this.postProgress(`Getting all from ${store}...`, requestId);

            const results = await this.getAll(store, index, query, limit);

            this.postSuccess({
                type: 'getAll',
                store,
                results,
                count: results.length
            }, requestId);
        } catch (error) {
            this.postError(`GetAll failed: ${error.message}`, requestId);
        }
    }

    async handleQuery(data, requestId) {
        try {
            const { store, filter, sort, limit, offset } = data;
            this.postProgress(`Querying ${store}...`, requestId);

            const results = await this.query(store, filter, sort, limit, offset);

            this.postSuccess({
                type: 'query',
                store,
                results,
                count: results.length
            }, requestId);
        } catch (error) {
            this.postError(`Query failed: ${error.message}`, requestId);
        }
    }

    async handlePut(data, requestId) {
        try {
            const { store, value } = data;
            this.postProgress(`Saving to ${store}...`, requestId);

            const key = await this.put(store, value);

            this.postSuccess({
                type: 'put',
                store,
                key,
                value
            }, requestId);
        } catch (error) {
            this.postError(`Put failed: ${error.message}`, requestId);
        }
    }

    async handleAdd(data, requestId) {
        try {
            const { store, value } = data;
            this.postProgress(`Adding to ${store}...`, requestId);

            const key = await this.add(store, value);

            this.postSuccess({
                type: 'add',
                store,
                key,
                value
            }, requestId);
        } catch (error) {
            this.postError(`Add failed: ${error.message}`, requestId);
        }
    }

    async handleDelete(data, requestId) {
        try {
            const { store, key } = data;
            this.postProgress(`Deleting from ${store}...`, requestId);

            await this.delete(store, key);

            this.postSuccess({
                type: 'delete',
                store,
                key
            }, requestId);
        } catch (error) {
            this.postError(`Delete failed: ${error.message}`, requestId);
        }
    }

    async handleClear(data, requestId) {
        try {
            const { store } = data;
            this.postProgress(`Clearing ${store}...`, requestId);

            await this.clear(store);

            this.postSuccess({
                type: 'clear',
                store
            }, requestId);
        } catch (error) {
            this.postError(`Clear failed: ${error.message}`, requestId);
        }
    }

    async handleCount(data, requestId) {
        try {
            const { store, index, query } = data;
            this.postProgress(`Counting ${store}...`, requestId);

            const count = await this.count(store, index, query);

            this.postSuccess({
                type: 'count',
                store,
                count
            }, requestId);
        } catch (error) {
            this.postError(`Count failed: ${error.message}`, requestId);
        }
    }

    async handleBulkPut(data, requestId) {
        try {
            const { store, values } = data;
            this.postProgress(`Bulk saving ${values.length} items to ${store}...`, requestId);

            const keys = await this.bulkPut(store, values);

            this.postSuccess({
                type: 'bulkPut',
                store,
                keys,
                count: keys.length
            }, requestId);
        } catch (error) {
            this.postError(`Bulk put failed: ${error.message}`, requestId);
        }
    }

    async handleBulkDelete(data, requestId) {
        try {
            const { store, keys } = data;
            this.postProgress(`Bulk deleting ${keys.length} items from ${store}...`, requestId);

            await this.bulkDelete(store, keys);

            this.postSuccess({
                type: 'bulkDelete',
                store,
                count: keys.length
            }, requestId);
        } catch (error) {
            this.postError(`Bulk delete failed: ${error.message}`, requestId);
        }
    }

    async handleMigrate(data, requestId) {
        try {
            const { localStorageData } = data;
            this.postProgress('Starting migration from localStorage...', requestId);

            const result = await this.migrateFromLocalStorage(localStorageData);

            this.postSuccess({
                type: 'migrate',
                result
            }, requestId);
        } catch (error) {
            this.postError(`Migration failed: ${error.message}`, requestId);
        }
    }

    async handleExport(data, requestId) {
        try {
            const { stores } = data;
            this.postProgress('Exporting database...', requestId);

            const exportData = await this.exportData(stores);

            this.postSuccess({
                type: 'export',
                data: exportData
            }, requestId);
        } catch (error) {
            this.postError(`Export failed: ${error.message}`, requestId);
        }
    }

    async handleImport(data, requestId) {
        try {
            const { importData } = data;
            this.postProgress('Importing database...', requestId);

            const result = await this.importData(importData);

            this.postSuccess({
                type: 'import',
                result
            }, requestId);
        } catch (error) {
            this.postError(`Import failed: ${error.message}`, requestId);
        }
    }

    // Core database operations

    get(store, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(request.error));
        });
    }

    getAll(store, index = null, query = null, limit = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const source = index ? objectStore.index(index) : objectStore;
            const request = limit ? source.getAll(query, limit) : source.getAll(query);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(request.error));
        });
    }

    query(store, filter = null, sort = null, limit = null, offset = 0) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.openCursor();
            const results = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;

                if (cursor) {
                    const value = cursor.value;

                    // Apply filter
                    if (!filter || this.matchesFilter(value, filter)) {
                        if (count >= offset) {
                            results.push(value);
                        }
                        count++;

                        // Check limit
                        if (limit && results.length >= limit) {
                            resolve(this.applySorting(results, sort));
                            return;
                        }
                    }

                    cursor.continue();
                } else {
                    resolve(this.applySorting(results, sort));
                }
            };

            request.onerror = () => reject(new Error(request.error));
        });
    }

    put(store, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.put(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(request.error));
        });
    }

    add(store, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.add(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(request.error));
        });
    }

    delete(store, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(request.error));
        });
    }

    clear(store) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(request.error));
        });
    }

    count(store, index = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const source = index ? objectStore.index(index) : objectStore;
            const request = source.count(query);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(request.error));
        });
    }

    async bulkPut(store, values) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            const keys = [];

            let completed = 0;
            const total = values.length;

            values.forEach(value => {
                const request = objectStore.put(value);

                request.onsuccess = () => {
                    keys.push(request.result);
                    completed++;

                    if (completed === total) {
                        resolve(keys);
                    }
                };

                request.onerror = () => reject(new Error(request.error));
            });
        });
    }

    async bulkDelete(store, keys) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);

            let completed = 0;
            const total = keys.length;

            keys.forEach(key => {
                const request = objectStore.delete(key);

                request.onsuccess = () => {
                    completed++;

                    if (completed === total) {
                        resolve();
                    }
                };

                request.onerror = () => reject(new Error(request.error));
            });
        });
    }

    async migrateFromLocalStorage(localStorageData) {
        const result = {
            resumes: 0,
            jobs: 0,
            logs: 0,
            settings: 0,
            errors: []
        };

        try {
            // Migrate resumes
            if (localStorageData.resumes) {
                const resumes = Array.isArray(localStorageData.resumes)
                    ? localStorageData.resumes
                    : [localStorageData.resumes];

                await this.bulkPut('resumes', resumes);
                result.resumes = resumes.length;
            }

            // Migrate saved resumes (convert to array)
            if (localStorageData.savedResumes) {
                const savedResumes = Object.entries(localStorageData.savedResumes).map(([name, data]) => ({
                    ...data.data,
                    id: data.id,
                    name: name,
                    timestamp: data.timestamp,
                    lastModified: data.timestamp
                }));

                await this.bulkPut('resumes', savedResumes);
                result.resumes += savedResumes.length;
            }

            // Migrate jobs
            if (localStorageData.jobs) {
                const jobs = Array.isArray(localStorageData.jobs)
                    ? localStorageData.jobs
                    : Object.values(localStorageData.jobs);

                await this.bulkPut('jobs', jobs);
                result.jobs = jobs.length;
            }

            // Migrate logs
            if (localStorageData.logs) {
                const logs = Array.isArray(localStorageData.logs)
                    ? localStorageData.logs
                    : Object.values(localStorageData.logs);

                await this.bulkPut('logs', logs);
                result.logs = logs.length;
            }

            // Migrate settings
            if (localStorageData.settings) {
                await this.put('settings', {
                    id: 'default',
                    ...localStorageData.settings
                });
                result.settings = 1;
            }
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    async exportData(stores = null) {
        const exportData = {
            version: this.dbVersion,
            timestamp: new Date().toISOString(),
            data: {}
        };

        const storeNames = stores || ['resumes', 'jobs', 'logs', 'settings', 'coverLetters', 'aiHistory'];

        for (const store of storeNames) {
            try {
                exportData.data[store] = await this.getAll(store);
            } catch (error) {
                console.error(`Failed to export ${store}:`, error);
            }
        }

        return exportData;
    }

    async importData(importData) {
        const result = {
            imported: {},
            errors: []
        };

        for (const [store, data] of Object.entries(importData.data || {})) {
            try {
                if (Array.isArray(data) && data.length > 0) {
                    await this.bulkPut(store, data);
                    result.imported[store] = data.length;
                }
            } catch (error) {
                result.errors.push(`${store}: ${error.message}`);
            }
        }

        return result;
    }

    // Helper methods

    matchesFilter(value, filter) {
        for (const [key, filterValue] of Object.entries(filter)) {
            if (typeof filterValue === 'function') {
                if (!filterValue(value[key])) return false;
            } else if (value[key] !== filterValue) {
                return false;
            }
        }
        return true;
    }

    applySorting(results, sort) {
        if (!sort) return results;

        const { field, direction = 'asc' } = sort;

        return results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Message helpers

    postProgress(message, requestId) {
        self.postMessage({
            type: 'progress',
            requestId,
            message,
            timestamp: new Date().toISOString()
        });
    }

    postSuccess(data, requestId) {
        self.postMessage({
            type: 'success',
            requestId,
            data,
            timestamp: new Date().toISOString()
        });
    }

    postError(error, requestId) {
        self.postMessage({
            type: 'error',
            requestId,
            error: typeof error === 'string' ? error : error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Initialize the worker
new DatabaseWorker();
