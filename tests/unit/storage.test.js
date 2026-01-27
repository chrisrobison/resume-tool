/**
 * Unit Tests for Storage Module
 * Tests localStorage and IndexedDB storage operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import dynamically to reset module state
let StorageModule;

describe('Storage Module', () => {
  let mockIndexedDBService;
  let mockStorageMigration;

  beforeEach(async () => {
    // Reset modules
    vi.resetModules();

    // Import fresh module
    StorageModule = await import('../../js/storage.js');

    // Create mock IndexedDB service
    mockIndexedDBService = {
      isInitialized: true,
      save: vi.fn(async () => true),
      get: vi.fn(async () => null),
      getAll: vi.fn(async () => []),
      delete: vi.fn(async () => true),
      clear: vi.fn(async () => true)
    };

    // Create mock storage migration service
    mockStorageMigration = {
      isMigrationComplete: vi.fn(async () => true),
      migrate: vi.fn(async () => true)
    };

    // Setup global mocks
    global.window.indexedDBService = mockIndexedDBService;
    global.window.storageMigration = mockStorageMigration;

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.window.indexedDBService;
    delete global.window.storageMigration;
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      const result = StorageModule.isLocalStorageAvailable();
      expect(result).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const result = StorageModule.isLocalStorageAvailable();

      expect(result).toBe(false);
      setItemSpy.mockRestore();
    });
  });

  describe('initLocalStorage', () => {
    it('should return true when localStorage is available', () => {
      const result = StorageModule.initLocalStorage();
      expect(result).toBe(true);
    });

    it('should return false and warn when localStorage unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Not available');
      });
      const consoleSpy = vi.spyOn(console, 'warn');

      const result = StorageModule.initLocalStorage();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('initStorage', () => {
    it('should initialize with IndexedDB when available', async () => {
      const result = await StorageModule.initStorage();

      expect(result).toBe(true);
      expect(StorageModule.getStorageMode()).toBe('indexeddb');
    });

    it('should check migration status', async () => {
      await StorageModule.initStorage();

      expect(mockStorageMigration.isMigrationComplete).toHaveBeenCalled();
    });

    it('should fallback to localStorage when IndexedDB unavailable', async () => {
      delete global.window.indexedDBService;

      const result = await StorageModule.initStorage();

      expect(result).toBe(true);
      expect(StorageModule.getStorageMode()).toBe('localstorage');
    });

    it('should wait for IndexedDB initialization', async () => {
      // Start with IndexedDB not available
      delete global.window.indexedDBService;

      // Initialize IndexedDB after delay
      setTimeout(() => {
        global.window.indexedDBService = mockIndexedDBService;
      }, 100);

      const result = await StorageModule.initStorage();

      expect(result).toBe(true);
    });
  });

  describe('getStorageMode', () => {
    it('should return current storage mode', async () => {
      await StorageModule.initStorage();
      const mode = StorageModule.getStorageMode();

      expect(mode).toMatch(/indexeddb|localstorage/);
    });
  });

  describe('saveResumeToStorage', () => {
    it('should save resume to IndexedDB', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        basics: { name: 'Test User' },
        work: []
      };

      await StorageModule.saveResumeToStorage(resumeData);

      expect(mockIndexedDBService.save).toHaveBeenCalled();
      expect(mockIndexedDBService.save.mock.calls[0][1]).toHaveProperty('basics');
    });

    it('should add ID if not present', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        basics: { name: 'Test User' }
      };

      await StorageModule.saveResumeToStorage(resumeData);

      const savedData = mockIndexedDBService.save.mock.calls[0][1];
      expect(savedData.id).toMatch(/^resume_\d+_[a-z0-9]+$/);
    });

    it('should add timestamps', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        basics: { name: 'Test User' }
      };

      await StorageModule.saveResumeToStorage(resumeData);

      const savedData = mockIndexedDBService.save.mock.calls[0][1];
      expect(savedData.updatedAt).toBeTruthy();
      expect(savedData.createdAt).toBeTruthy();
    });

    it('should preserve existing ID', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        id: 'resume_123',
        basics: { name: 'Test User' }
      };

      await StorageModule.saveResumeToStorage(resumeData);

      const savedData = mockIndexedDBService.save.mock.calls[0][1];
      expect(savedData.id).toBe('resume_123');
    });

    it('should fallback to localStorage', async () => {
      delete global.window.indexedDBService;
      await StorageModule.initStorage();

      const resumeData = {
        id: 'resume_123',
        basics: { name: 'Test User' }
      };

      await StorageModule.saveResumeToStorage(resumeData);

      const stored = localStorage.getItem('resumeData');
      expect(stored).toBeTruthy();
    });
  });

  describe('loadResumeFromStorage', () => {
    it('should load resume from IndexedDB by ID', async () => {
      await StorageModule.initStorage();

      const mockResume = {
        id: 'resume_123',
        basics: { name: 'Test User' }
      };
      mockIndexedDBService.get.mockResolvedValue(mockResume);

      const result = await StorageModule.loadResumeFromStorage('resume_123');

      expect(mockIndexedDBService.get).toHaveBeenCalledWith('resumes', 'resume_123');
      expect(result).toEqual(mockResume);
    });

    it('should load default resume when no ID provided', async () => {
      await StorageModule.initStorage();

      const mockResume = {
        id: 'default',
        basics: { name: 'Default User' }
      };
      mockIndexedDBService.get.mockResolvedValue(mockResume);

      const result = await StorageModule.loadResumeFromStorage();

      expect(mockIndexedDBService.get).toHaveBeenCalledWith('resumes', 'default');
      expect(result).toEqual(mockResume);
    });

    it('should return null if resume not found', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.get.mockResolvedValue(null);

      const result = await StorageModule.loadResumeFromStorage('nonexistent');

      expect(result).toBeNull();
    });

    it('should fallback to localStorage', async () => {
      delete global.window.indexedDBService;
      await StorageModule.initStorage();

      const mockResume = {
        basics: { name: 'Test User' }
      };
      localStorage.setItem('resumeData', JSON.stringify(mockResume));

      const result = await StorageModule.loadResumeFromStorage();

      expect(result).toEqual(mockResume);
    });
  });

  describe('saveNamedResume', () => {
    it('should save resume with custom name', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        basics: { name: 'Test User' }
      };

      await StorageModule.saveNamedResume(resumeData, 'my-resume');

      expect(mockIndexedDBService.save).toHaveBeenCalledWith(
        'resumes',
        expect.objectContaining({
          name: 'my-resume',
          basics: { name: 'Test User' }
        })
      );
    });

    it('should generate ID from name', async () => {
      await StorageModule.initStorage();

      const resumeData = {
        basics: { name: 'Test User' }
      };

      await StorageModule.saveNamedResume(resumeData, 'My Custom Resume');

      const savedData = mockIndexedDBService.save.mock.calls[0][1];
      expect(savedData.id).toMatch(/resume_/);
    });
  });

  describe('loadNamedResume', () => {
    it('should load resume by name', async () => {
      await StorageModule.initStorage();

      const mockResume = {
        id: 'resume_123',
        name: 'my-resume',
        basics: { name: 'Test User' }
      };
      mockIndexedDBService.getAll.mockResolvedValue([mockResume]);

      const result = await StorageModule.loadNamedResume('my-resume');

      expect(result).toEqual(mockResume);
    });

    it('should return null if not found', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.getAll.mockResolvedValue([]);

      const result = await StorageModule.loadNamedResume('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('loadSavedResumesList', () => {
    it('should return list of all resumes', async () => {
      await StorageModule.initStorage();

      const mockResumes = [
        { id: 'resume_1', name: 'Resume 1' },
        { id: 'resume_2', name: 'Resume 2' }
      ];
      mockIndexedDBService.getAll.mockResolvedValue(mockResumes);

      const result = await StorageModule.loadSavedResumesList();

      expect(result).toEqual(mockResumes);
      expect(mockIndexedDBService.getAll).toHaveBeenCalledWith('resumes');
    });

    it('should return empty array if none found', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.getAll.mockResolvedValue([]);

      const result = await StorageModule.loadSavedResumesList();

      expect(result).toEqual([]);
    });
  });

  describe('deleteNamedResume', () => {
    it('should delete resume by name', async () => {
      await StorageModule.initStorage();

      const mockResume = {
        id: 'resume_123',
        name: 'my-resume'
      };
      mockIndexedDBService.getAll.mockResolvedValue([mockResume]);

      await StorageModule.deleteNamedResume('my-resume');

      expect(mockIndexedDBService.delete).toHaveBeenCalledWith('resumes', 'resume_123');
    });

    it('should return false if resume not found', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.getAll.mockResolvedValue([]);

      const result = await StorageModule.deleteNamedResume('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to IndexedDB', async () => {
      await StorageModule.initStorage();

      const settings = {
        theme: 'dark',
        language: 'en'
      };

      await StorageModule.saveSettings(settings);

      expect(mockIndexedDBService.save).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({
          id: 'app-settings',
          ...settings
        })
      );
    });

    it('should add timestamp', async () => {
      await StorageModule.initStorage();

      const settings = { theme: 'dark' };

      await StorageModule.saveSettings(settings);

      const savedData = mockIndexedDBService.save.mock.calls[0][1];
      expect(savedData.updatedAt).toBeTruthy();
    });
  });

  describe('loadSettings', () => {
    it('should load settings from IndexedDB', async () => {
      await StorageModule.initStorage();

      const mockSettings = {
        id: 'app-settings',
        theme: 'dark',
        language: 'en'
      };
      mockIndexedDBService.get.mockResolvedValue(mockSettings);

      const result = await StorageModule.loadSettings();

      expect(mockIndexedDBService.get).toHaveBeenCalledWith('settings', 'app-settings');
      expect(result).toEqual(mockSettings);
    });

    it('should return null if no settings found', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.get.mockResolvedValue(null);

      const result = await StorageModule.loadSettings();

      expect(result).toBeNull();
    });

    it('should fallback to localStorage', async () => {
      delete global.window.indexedDBService;
      await StorageModule.initStorage();

      const mockSettings = { theme: 'dark' };
      localStorage.setItem('app-settings', JSON.stringify(mockSettings));

      const result = await StorageModule.loadSettings();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('getIndexedDBService', () => {
    it('should return IndexedDB service', () => {
      const service = StorageModule.getIndexedDBService();
      expect(service).toBe(mockIndexedDBService);
    });

    it('should return null if not available', () => {
      delete global.window.indexedDBService;
      const service = StorageModule.getIndexedDBService();
      expect(service).toBeNull();
    });
  });

  describe('getStorageMigrationService', () => {
    it('should return storage migration service', () => {
      const service = StorageModule.getStorageMigrationService();
      expect(service).toBe(mockStorageMigration);
    });

    it('should return null if not available', () => {
      delete global.window.storageMigration;
      const service = StorageModule.getStorageMigrationService();
      expect(service).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle IndexedDB save errors gracefully', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.save.mockRejectedValue(new Error('Save failed'));

      await expect(StorageModule.saveResumeToStorage({ basics: {} }))
        .rejects.toThrow('Save failed');
    });

    it('should handle IndexedDB load errors gracefully', async () => {
      await StorageModule.initStorage();
      mockIndexedDBService.get.mockRejectedValue(new Error('Load failed'));

      await expect(StorageModule.loadResumeFromStorage('test'))
        .rejects.toThrow('Load failed');
    });
  });
});
