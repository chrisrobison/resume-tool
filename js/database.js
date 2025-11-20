// database.js - IndexedDB worker interface (scaffold)
// Provides a thin, promise-based API to a background data worker.

const DEFAULT_DB_NAME = 'jobHuntDB';
const DEFAULT_DB_VERSION = 1;

class DataService {
    constructor() {
        this.worker = null;
        this.requestId = 0;
        this.pending = new Map();
        this.ready = false;
        this.dbName = DEFAULT_DB_NAME;
        this.dbVersion = DEFAULT_DB_VERSION;
    }

    init(options = {}) {
        if (this.ready) return Promise.resolve(true);
        this.dbName = options.dbName || DEFAULT_DB_NAME;
        this.dbVersion = options.dbVersion || DEFAULT_DB_VERSION;

        try {
            // Use a simple version for cache control (change when updating worker)
            this.worker = new Worker(`../workers/data-worker.js?v=1`);
        } catch (e) {
            console.warn('DataService: Worker not available, skipping IndexedDB init.', e);
            return Promise.resolve(false);
        }

        this.worker.onmessage = (e) => this.#onMessage(e.data);
        this.worker.onerror = (err) => {
            console.error('DataService worker error:', err);
            // Fail all pending requests
            for (const [, req] of this.pending) req.reject?.(new Error('data-worker error'));
            this.pending.clear();
        };

        return this.#send('init', { dbName: this.dbName, dbVersion: this.dbVersion })
            .then((ok) => {
                this.ready = !!ok;
                return this.ready;
            })
            .catch((err) => {
                console.warn('DataService: init failed, continuing without IndexedDB', err);
                return false;
            });
    }

    // Collections
    jobs = this.#collection('jobs');
    resumes = this.#collection('resumes');
    coverLetters = this.#collection('coverLetters');
    settings = this.#collection('settings');
    logs = this.#collection('logs');

    // Migration helper: persist localStorage snapshot to DB (no overwrite if already present)
    async migrateFromLocalStorage() {
        if (!this.ready) return { migrated: false };
        try {
            const existingJobs = await this.jobs.count();
            const existingResumes = await this.resumes.count();
            if (existingJobs > 0 || existingResumes > 0) {
                return { migrated: false, reason: 'db-not-empty' };
            }
        } catch (_) { /* ignore */ }

        let snapshot = null;
        try {
            snapshot = JSON.parse(localStorage.getItem('jobHuntData') || '{}');
        } catch (_) {}
        if (!snapshot) return { migrated: false };

        const jobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : [];
        const resumes = Array.isArray(snapshot.resumes) ? snapshot.resumes : [];
        const letters = Array.isArray(snapshot.letters) ? snapshot.letters : [];
        const logs = Array.isArray(snapshot.ai) ? snapshot.ai : [];

        await this.jobs.bulkPut(jobs);
        await this.resumes.bulkPut(resumes);
        await this.coverLetters.bulkPut(letters);
        await this.logs.bulkPut(logs);

        return { migrated: true, counts: { jobs: jobs.length, resumes: resumes.length, letters: letters.length, logs: logs.length } };
    }

    // Internal helpers
    #collection(name) {
        return {
            getAll: () => this.#send('getAll', { store: name }),
            get: (key) => this.#send('get', { store: name, key }),
            add: (value) => this.#send('add', { store: name, value }),
            put: (value) => this.#send('put', { store: name, value }),
            delete: (key) => this.#send('delete', { store: name, key }),
            clear: () => this.#send('clear', { store: name }),
            count: () => this.#send('count', { store: name }),
            bulkPut: (values) => this.#send('bulkPut', { store: name, values: Array.isArray(values) ? values : [] })
        };
    }

    #onMessage(msg) {
        const { type, requestId, result, error } = msg || {};
        if (type !== 'response') return;
        const req = this.pending.get(requestId);
        if (!req) return;
        this.pending.delete(requestId);
        if (error) req.reject?.(new Error(error));
        else req.resolve?.(result);
    }

    #send(action, data = {}) {
        if (!this.worker) return Promise.reject(new Error('data-worker not initialized'));
        const id = ++this.requestId;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'request', requestId: id, action, data });
            // Safety timeout
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error('data-worker timeout'));
                }
            }, 20000);
        });
    }
}

const db = new DataService();
export default db;

