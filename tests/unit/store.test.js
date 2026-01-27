/**
 * Unit Tests for Store Module
 * Tests the global store utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import dynamically to reset module state
let StoreModule;

describe('Store Module', () => {
  let mockStore;

  beforeEach(async () => {
    // Reset modules to clear cached store instance
    vi.resetModules();

    // Re-import the module fresh
    StoreModule = await import('../../js/store.js');

    // Create mock global-store element
    mockStore = {
      getState: vi.fn(() => ({ test: 'state' })),
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
      unsubscribe: vi.fn(),
      setCurrentJob: vi.fn(),
      setCurrentResume: vi.fn(),
      addJob: vi.fn(),
      updateJob: vi.fn(),
      deleteJob: vi.fn(),
      addResume: vi.fn(),
      updateResume: vi.fn(),
      deleteResume: vi.fn(),
      addLog: vi.fn(),
      setLoading: vi.fn(),
      updateSettings: vi.fn(),
      debug: vi.fn(() => ({ state: 'debug info' }))
    };

    // Mock querySelector to return our mock store
    document.querySelector = vi.fn((selector) => {
      if (selector === 'global-store') {
        return mockStore;
      }
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStore', () => {
    it('should return the global-store element', () => {
      const store = StoreModule.getStore();
      expect(store).toBe(mockStore);
      expect(document.querySelector).toHaveBeenCalledWith('global-store');
    });

    it('should cache the store instance', () => {
      const store1 = StoreModule.getStore();
      const store2 = StoreModule.getStore();

      expect(store1).toBe(store2);
      expect(document.querySelector).toHaveBeenCalledTimes(1);
    });

    it('should return null if store not found', () => {
      document.querySelector = vi.fn(() => null);

      const store = StoreModule.getStore();

      expect(store).toBeNull();
    });

    it('should validate store interface', () => {
      const invalidStore = { someMethod: vi.fn() };
      document.querySelector = vi.fn(() => invalidStore);

      const store = StoreModule.getStore();

      expect(store).toBeNull();
    });

    it('should require getState and setState methods', () => {
      const storeWithoutSetState = { getState: vi.fn() };
      document.querySelector = vi.fn(() => storeWithoutSetState);

      const store = StoreModule.getStore();

      expect(store).toBeNull();
    });
  });

  describe('getState', () => {
    it('should call store.getState without path', () => {
      mockStore.getState.mockReturnValue({ jobs: [], resumes: [] });

      const state = StoreModule.getState();

      expect(mockStore.getState).toHaveBeenCalledWith(null);
      expect(state).toEqual({ jobs: [], resumes: [] });
    });

    it('should call store.getState with path', () => {
      mockStore.getState.mockReturnValue({ id: 1, title: 'Job' });

      const state = StoreModule.getState('currentJob');

      expect(mockStore.getState).toHaveBeenCalledWith('currentJob');
      expect(state).toEqual({ id: 1, title: 'Job' });
    });

    it('should return null if store not ready', () => {
      document.querySelector = vi.fn(() => null);

      const state = StoreModule.getState();

      expect(state).toBeNull();
    });

    it('should handle errors from store.getState', () => {
      mockStore.getState.mockImplementation(() => {
        throw new Error('State error');
      });
      const consoleSpy = vi.spyOn(console, 'warn');

      const state = StoreModule.getState();

      expect(state).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('setState', () => {
    it('should call store.setState with updates', () => {
      const updates = { currentJob: { id: 1 } };

      StoreModule.setState(updates);

      expect(mockStore.setState).toHaveBeenCalledWith(updates, 'store-utility', null);
    });

    it('should pass source parameter', () => {
      const updates = { currentJob: { id: 1 } };

      StoreModule.setState(updates, 'test-source');

      expect(mockStore.setState).toHaveBeenCalledWith(updates, 'test-source', null);
    });

    it('should pass origin parameter', () => {
      const updates = { currentJob: { id: 1 } };

      StoreModule.setState(updates, 'test-source', 'origin-id');

      expect(mockStore.setState).toHaveBeenCalledWith(updates, 'test-source', 'origin-id');
    });

    it('should do nothing if store not ready', () => {
      document.querySelector = vi.fn(() => null);

      StoreModule.setState({ test: 'value' });

      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call store.subscribe with callback', () => {
      const callback = vi.fn();
      const unsubscribeFn = vi.fn();
      mockStore.subscribe.mockReturnValue(unsubscribeFn);

      const result = StoreModule.subscribe(callback);

      expect(mockStore.subscribe).toHaveBeenCalledWith(callback, null);
      expect(result).toBe(unsubscribeFn);
    });

    it('should pass filter parameter', () => {
      const callback = vi.fn();
      const filter = { type: 'jobs' };

      StoreModule.subscribe(callback, filter);

      expect(mockStore.subscribe).toHaveBeenCalledWith(callback, filter);
    });

    it('should return null if store not ready', () => {
      document.querySelector = vi.fn(() => null);
      const callback = vi.fn();

      const result = StoreModule.subscribe(callback);

      expect(result).toBeNull();
    });
  });

  describe('unsubscribe', () => {
    it('should call store.unsubscribe', () => {
      const listener = vi.fn();

      StoreModule.unsubscribe(listener);

      expect(mockStore.unsubscribe).toHaveBeenCalledWith(listener);
    });

    it('should do nothing if store not ready', () => {
      document.querySelector = vi.fn(() => null);
      const listener = vi.fn();

      StoreModule.unsubscribe(listener);

      expect(mockStore.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    describe('setCurrentJob', () => {
      it('should call store.setCurrentJob', () => {
        const job = { id: 1, title: 'Developer' };

        StoreModule.setCurrentJob(job);

        expect(mockStore.setCurrentJob).toHaveBeenCalledWith(job);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.setCurrentJob({ id: 1 });

        expect(mockStore.setCurrentJob).not.toHaveBeenCalled();
      });
    });

    describe('setCurrentResume', () => {
      it('should call store.setCurrentResume', () => {
        const resume = { id: 1, basics: { name: 'Test' } };

        StoreModule.setCurrentResume(resume);

        expect(mockStore.setCurrentResume).toHaveBeenCalledWith(resume);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.setCurrentResume({ id: 1 });

        expect(mockStore.setCurrentResume).not.toHaveBeenCalled();
      });
    });

    describe('addJob', () => {
      it('should call store.addJob', () => {
        const job = { id: 1, title: 'Developer' };

        StoreModule.addJob(job);

        expect(mockStore.addJob).toHaveBeenCalledWith(job);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.addJob({ id: 1 });

        expect(mockStore.addJob).not.toHaveBeenCalled();
      });
    });

    describe('updateJob', () => {
      it('should call store.updateJob', () => {
        const jobId = 'job_123';
        const updates = { title: 'Senior Developer' };

        StoreModule.updateJob(jobId, updates);

        expect(mockStore.updateJob).toHaveBeenCalledWith(jobId, updates);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.updateJob('job_123', { title: 'Test' });

        expect(mockStore.updateJob).not.toHaveBeenCalled();
      });
    });

    describe('deleteJob', () => {
      it('should call store.deleteJob', () => {
        const jobId = 'job_123';

        StoreModule.deleteJob(jobId);

        expect(mockStore.deleteJob).toHaveBeenCalledWith(jobId);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.deleteJob('job_123');

        expect(mockStore.deleteJob).not.toHaveBeenCalled();
      });
    });

    describe('addResume', () => {
      it('should call store.addResume', () => {
        const resume = { id: 1, basics: { name: 'Test' } };

        StoreModule.addResume(resume);

        expect(mockStore.addResume).toHaveBeenCalledWith(resume);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.addResume({ id: 1 });

        expect(mockStore.addResume).not.toHaveBeenCalled();
      });
    });

    describe('updateResume', () => {
      it('should call store.updateResume', () => {
        const resumeId = 'resume_123';
        const updates = { basics: { name: 'Updated' } };

        StoreModule.updateResume(resumeId, updates);

        expect(mockStore.updateResume).toHaveBeenCalledWith(resumeId, updates);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.updateResume('resume_123', { test: 'value' });

        expect(mockStore.updateResume).not.toHaveBeenCalled();
      });
    });

    describe('deleteResume', () => {
      it('should call store.deleteResume', () => {
        const resumeId = 'resume_123';

        StoreModule.deleteResume(resumeId);

        expect(mockStore.deleteResume).toHaveBeenCalledWith(resumeId);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.deleteResume('resume_123');

        expect(mockStore.deleteResume).not.toHaveBeenCalled();
      });
    });

    describe('addLog', () => {
      it('should call store.addLog', () => {
        const logEntry = { message: 'Test log', timestamp: Date.now() };

        StoreModule.addLog(logEntry);

        expect(mockStore.addLog).toHaveBeenCalledWith(logEntry);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.addLog({ message: 'Test' });

        expect(mockStore.addLog).not.toHaveBeenCalled();
      });
    });

    describe('setLoading', () => {
      it('should call store.setLoading with true', () => {
        StoreModule.setLoading(true);

        expect(mockStore.setLoading).toHaveBeenCalledWith(true);
      });

      it('should call store.setLoading with false', () => {
        StoreModule.setLoading(false);

        expect(mockStore.setLoading).toHaveBeenCalledWith(false);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.setLoading(true);

        expect(mockStore.setLoading).not.toHaveBeenCalled();
      });
    });

    describe('updateSettings', () => {
      it('should call store.updateSettings', () => {
        const settings = { theme: 'dark', language: 'en' };

        StoreModule.updateSettings(settings);

        expect(mockStore.updateSettings).toHaveBeenCalledWith(settings);
      });

      it('should do nothing if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        StoreModule.updateSettings({ theme: 'dark' });

        expect(mockStore.updateSettings).not.toHaveBeenCalled();
      });
    });

    describe('debugStore', () => {
      it('should call store.debug', () => {
        const debugInfo = StoreModule.debugStore();

        expect(mockStore.debug).toHaveBeenCalled();
        expect(debugInfo).toEqual({ state: 'debug info' });
      });

      it('should return null if store not ready', () => {
        document.querySelector = vi.fn(() => null);

        const debugInfo = StoreModule.debugStore();

        expect(debugInfo).toBeNull();
      });
    });
  });

  describe('Store Instance Caching', () => {
    it('should only query DOM once', () => {
      document.querySelector = vi.fn(() => mockStore);

      StoreModule.getStore();
      StoreModule.getStore();
      StoreModule.getStore();

      expect(document.querySelector).toHaveBeenCalledTimes(1);
    });

    it('should use cached instance for all operations', () => {
      const querySpy = vi.spyOn(document, 'querySelector');

      StoreModule.getState();
      StoreModule.setState({ test: 'value' });
      StoreModule.subscribe(vi.fn());

      // Should only query once for first operation
      expect(querySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Store Interface Validation', () => {
    it('should reject store without getState method', () => {
      const invalidStore = { setState: vi.fn() };
      document.querySelector = vi.fn(() => invalidStore);

      const result = StoreModule.getState();

      expect(result).toBeNull();
    });

    it('should reject store without setState method', () => {
      const invalidStore = { getState: vi.fn() };
      document.querySelector = vi.fn(() => invalidStore);

      StoreModule.setState({ test: 'value' });

      expect(invalidStore.getState).not.toHaveBeenCalled();
    });

    it('should accept valid store interface', () => {
      const validStore = {
        getState: vi.fn(() => ({ test: 'state' })),
        setState: vi.fn()
      };
      document.querySelector = vi.fn(() => validStore);

      const state = StoreModule.getState();

      expect(state).toEqual({ test: 'state' });
    });
  });
});
