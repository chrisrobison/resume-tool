// data-worker.js - IndexedDB operations in a Web Worker (scaffold)

// Log worker initialization
console.log('[data-worker] Starting initialization...');

let db = null;
let dbName = 'jobHuntDB';
let dbVersion = 1;

const STORES = [
    { name: 'jobs', keyPath: 'id' },
    { name: 'resumes', keyPath: 'id' },
    { name: 'coverLetters', keyPath: 'id' },
    { name: 'settings', keyPath: 'key' },
    { name: 'logs', keyPath: 'id', autoIncrement: false }
];

// Global error handler
self.onerror = (error) => {
    console.error('[data-worker] Global error:', error);
    return true; // Prevents the error from bubbling
};

// Send ready signal
self.postMessage({ type: 'ready' });
console.log('[data-worker] Ready signal sent');

self.onmessage = async (e) => {
    const { type, requestId, action, data } = e.data || {};
    console.log('[data-worker] Received message:', { type, requestId, action });
    if (type !== 'request') return;
    try {
        let result;
        switch (action) {
            case 'init':
                console.log('[data-worker] Initializing DB:', data);
                result = await initDB(data?.dbName, data?.dbVersion);
                console.log('[data-worker] DB initialized successfully');
                break;
            case 'getAll':
                result = await getAll(data.store);
                break;
            case 'get':
                result = await withStore(data.store, 'readonly', (store) => store.get(data.key));
                break;
            case 'add':
                result = await withStore(data.store, 'readwrite', (store) => store.add(data.value));
                break;
            case 'put':
                result = await withStore(data.store, 'readwrite', (store) => store.put(data.value));
                break;
            case 'delete':
                result = await withStore(data.store, 'readwrite', (store) => store.delete(data.key));
                break;
            case 'clear':
                result = await withStore(data.store, 'readwrite', (store) => store.clear());
                break;
            case 'count':
                result = await withStore(data.store, 'readonly', (store) => store.count());
                break;
            case 'bulkPut':
                result = await bulkPut(data.store, data.values || []);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        postResponse(requestId, result, null);
    } catch (err) {
        postResponse(requestId, null, err?.message || String(err));
    }
};

function postResponse(requestId, result, error) {
    self.postMessage({ type: 'response', requestId, result, error });
}

function initDB(name, version) {
    dbName = name || dbName;
    dbVersion = version || dbVersion;
    console.log('[data-worker] initDB called with:', { dbName, dbVersion });
    return new Promise((resolve, reject) => {
        try {
            console.log('[data-worker] Opening IndexedDB...');
            const openReq = indexedDB.open(dbName, dbVersion);
            openReq.onupgradeneeded = () => {
                console.log('[data-worker] Upgrade needed, creating stores...');
                const database = openReq.result;
                STORES.forEach(({ name, keyPath, autoIncrement }) => {
                    if (!database.objectStoreNames.contains(name)) {
                        console.log(`[data-worker] Creating store: ${name}`);
                        database.createObjectStore(name, { keyPath, autoIncrement: !!autoIncrement });
                    }
                });
            };
            openReq.onsuccess = () => {
                console.log('[data-worker] IndexedDB opened successfully');
                db = openReq.result;
                resolve(true);
            };
            openReq.onerror = () => {
                console.error('[data-worker] IndexedDB open error:', openReq.error);
                reject(openReq.error);
            };
        } catch (e) {
            console.error('[data-worker] initDB exception:', e);
            reject(e);
        }
    });
}

function withStore(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('DB not initialized'));
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error || req?.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function getAll(storeName) {
    return withStore(storeName, 'readonly', (store) => store.getAll());
}

async function bulkPut(storeName, values) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('DB not initialized'));
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        try {
            (values || []).forEach((v) => store.put(v));
        } catch (e) {
            reject(e);
            return;
        }
        tx.oncomplete = () => resolve(values?.length || 0);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

