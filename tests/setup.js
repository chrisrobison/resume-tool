/**
 * Vitest Setup File
 * Runs before all tests to configure the test environment
 */

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Set up JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.CustomEvent = dom.window.CustomEvent;
global.Event = dom.window.Event;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.MouseEvent = dom.window.MouseEvent;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

global.sessionStorage = sessionStorageMock;

// Mock IndexedDB (basic implementation)
class IDBRequestMock {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }

  _triggerSuccess(result) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  _triggerError(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class IDBDatabaseMock {
  constructor(name) {
    this.name = name;
    this.objectStoreNames = [];
  }

  createObjectStore(name, options) {
    this.objectStoreNames.push(name);
    return new IDBObjectStoreMock(name, options);
  }

  transaction(storeNames, mode) {
    return new IDBTransactionMock(this, storeNames, mode);
  }
}

class IDBObjectStoreMock {
  constructor(name, options) {
    this.name = name;
    this.keyPath = options?.keyPath;
    this.autoIncrement = options?.autoIncrement || false;
    this._data = new Map();
  }

  add(value, key) {
    const request = new IDBRequestMock();
    setTimeout(() => {
      const id = key || value[this.keyPath] || Date.now();
      this._data.set(id, value);
      request._triggerSuccess(id);
    }, 0);
    return request;
  }

  put(value, key) {
    const request = new IDBRequestMock();
    setTimeout(() => {
      const id = key || value[this.keyPath] || Date.now();
      this._data.set(id, value);
      request._triggerSuccess(id);
    }, 0);
    return request;
  }

  get(key) {
    const request = new IDBRequestMock();
    setTimeout(() => {
      request._triggerSuccess(this._data.get(key));
    }, 0);
    return request;
  }

  delete(key) {
    const request = new IDBRequestMock();
    setTimeout(() => {
      this._data.delete(key);
      request._triggerSuccess();
    }, 0);
    return request;
  }

  clear() {
    const request = new IDBRequestMock();
    setTimeout(() => {
      this._data.clear();
      request._triggerSuccess();
    }, 0);
    return request;
  }

  getAll() {
    const request = new IDBRequestMock();
    setTimeout(() => {
      request._triggerSuccess(Array.from(this._data.values()));
    }, 0);
    return request;
  }
}

class IDBTransactionMock {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this.oncomplete = null;
    this.onerror = null;
    this._stores = new Map();
  }

  objectStore(name) {
    if (!this._stores.has(name)) {
      this._stores.set(name, new IDBObjectStoreMock(name, {}));
    }
    return this._stores.get(name);
  }
}

global.indexedDB = {
  open: vi.fn((name, version) => {
    const request = new IDBRequestMock();
    setTimeout(() => {
      const db = new IDBDatabaseMock(name);
      request.result = db;
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request, oldVersion: 0, newVersion: version });
      }
      request._triggerSuccess(db);
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn((name) => {
    const request = new IDBRequestMock();
    setTimeout(() => request._triggerSuccess(), 0);
    return request;
  })
};

// Mock fetch API
global.fetch = vi.fn((url, options) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Map()
  });
});

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  error: vi.fn(console.error),
  warn: vi.fn(console.warn),
  log: vi.fn(console.log)
};

// Helper function to create mock elements
export function createMockElement(tag, attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}

// Helper function to simulate events
export function simulateEvent(element, eventType, options = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...options });
  element.dispatchEvent(event);
  return event;
}

// Helper function to wait for async operations
export function waitFor(callback, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      try {
        const result = callback();
        if (result) {
          clearInterval(interval);
          resolve(result);
        }
      } catch (error) {
        // Continue waiting
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 50);
  });
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});
