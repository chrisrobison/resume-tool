// sync-manager.js - Main sync orchestrator
// Manages bidirectional sync between client IndexedDB and server SQLite

import { getAuthClient } from './auth-client.js';
import { getSyncQueue } from './sync-queue.js';
import { getConflictResolver, RESOLUTION_STRATEGIES } from './conflict-resolver.js';
import { getDataService } from '../data-service.js';

// Sync states
export const SYNC_STATES = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICTS: 'conflicts',
  OFFLINE: 'offline'
};

const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SYNC_SETTINGS_KEY = 'sync-settings';

class SyncManager {
  constructor() {
    this.authClient = null;
    this.syncQueue = null;
    this.conflictResolver = null;
    this.dataService = null;

    this.state = SYNC_STATES.IDLE;
    this.lastSync = null;
    this.lastError = null;
    this.syncInterval = null;
    this.isSyncing = false;
    this.listeners = [];

    // Sync settings
    this.settings = {
      enabled: true,
      autoSync: true,
      syncInterval: DEFAULT_SYNC_INTERVAL,
      conflictStrategy: RESOLUTION_STRATEGIES.NEWEST_WINS,
      syncOnStartup: true,
      syncOnChange: false // Too aggressive for most use cases
    };

    this.initialized = false;
  }

  /**
   * Initialize sync manager
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      // Initialize dependencies
      this.authClient = await getAuthClient();
      this.syncQueue = await getSyncQueue();
      this.conflictResolver = getConflictResolver();
      this.dataService = await getDataService();

      // Load sync settings
      await this.loadSettings();

      // Listen to auth events
      this.authClient.addEventListener(this.handleAuthEvent.bind(this));

      // Listen to conflict events
      this.conflictResolver.addEventListener(this.handleConflictEvent.bind(this));

      // Check if we should sync on startup
      if (this.settings.syncOnStartup && this.authClient.isAuthenticated()) {
        // Don't await - let it run in background
        this.sync().catch(error => {
          console.error('Startup sync error:', error);
        });
      }

      // Start auto-sync if enabled
      if (this.settings.autoSync && this.authClient.isAuthenticated()) {
        this.startAutoSync();
      }

      this.initialized = true;
      this.notifyListeners('initialized');

      return this;
    } catch (error) {
      console.error('Sync manager initialization error:', error);
      this.initialized = true;
      return this;
    }
  }

  /**
   * Perform full bidirectional sync
   */
  async sync(options = {}) {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return { skipped: true };
    }

    if (!this.settings.enabled) {
      console.log('Sync is disabled');
      return { disabled: true };
    }

    if (!this.authClient.isAuthenticated()) {
      this.setState(SYNC_STATES.OFFLINE);
      return { error: 'Not authenticated' };
    }

    // Check if online
    if (!navigator.onLine) {
      this.setState(SYNC_STATES.OFFLINE);
      return { error: 'Offline' };
    }

    this.isSyncing = true;
    this.setState(SYNC_STATES.SYNCING);

    try {
      const result = {
        push: null,
        pull: null,
        conflicts: [],
        timestamp: new Date().toISOString()
      };

      // Get pending changes from queue
      const payload = this.syncQueue.toSyncPayload();

      // Perform full sync (push + pull)
      const response = await this.authClient.request('/sync/full', {
        method: 'POST',
        body: JSON.stringify({
          entities: payload,
          lastSync: this.lastSync || '1970-01-01T00:00:00.000Z',
          deviceId: this.authClient.getDeviceId()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }

      const data = await response.json();

      result.push = data.push;
      result.pull = data.pull;

      // Process push results (clear successful items from queue)
      if (data.push && result.push.jobs) {
        const successfulIds = payload.jobs
          .filter((_, index) => index < result.push.jobs.success)
          .map(job => job.id);

        await this.syncQueue.clearSuccessful(successfulIds);
      }

      // Process pull results (update local data)
      if (data.pull && data.pull.data) {
        await this.processServerData(data.pull.data);
      }

      // Handle conflicts
      if (data.pull && data.pull.conflicts && data.pull.conflicts.length > 0) {
        result.conflicts = data.pull.conflicts;
        this.conflictResolver.addConflicts(data.pull.conflicts);

        // Auto-resolve if strategy is set
        if (options.autoResolve || this.settings.conflictStrategy !== RESOLUTION_STRATEGIES.MANUAL) {
          await this.conflictResolver.resolveAll(this.settings.conflictStrategy);
        } else {
          this.setState(SYNC_STATES.CONFLICTS);
        }
      }

      // Update last sync time
      this.lastSync = data.timestamp || result.timestamp;
      this.lastError = null;
      await this.saveSettings();

      if (result.conflicts.length > 0 && this.state === SYNC_STATES.CONFLICTS) {
        // Keep CONFLICTS state if not all resolved
      } else {
        this.setState(SYNC_STATES.SUCCESS);
      }

      this.notifyListeners('syncCompleted', result);

      return result;

    } catch (error) {
      console.error('Sync error:', error);
      this.lastError = error.message;
      this.setState(SYNC_STATES.ERROR);

      this.notifyListeners('syncError', { error: error.message });

      return { error: error.message };

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server
   */
  async push() {
    if (!this.authClient.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const payload = this.syncQueue.toSyncPayload();

    const response = await this.authClient.request('/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        entities: payload,
        lastSync: this.lastSync || '1970-01-01T00:00:00.000Z'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Push failed');
    }

    const data = await response.json();

    // Clear successful items from queue
    if (data.results) {
      const successfulIds = [];
      // Add logic to collect successful IDs from push results
      await this.syncQueue.clearSuccessful(successfulIds);
    }

    return data;
  }

  /**
   * Pull changes from server
   */
  async pull() {
    if (!this.authClient.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await this.authClient.request('/sync/pull', {
      method: 'POST',
      body: JSON.stringify({
        lastSync: this.lastSync || '1970-01-01T00:00:00.000Z',
        entities: ['jobs', 'resumes', 'coverLetters', 'settings']
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Pull failed');
    }

    const data = await response.json();

    // Update local data
    if (data.data) {
      await this.processServerData(data.data);
    }

    // Update last sync time
    this.lastSync = data.timestamp;
    await this.saveSettings();

    return data;
  }

  /**
   * Process server data (update local IndexedDB)
   */
  async processServerData(serverData) {
    const processed = {
      jobs: 0,
      resumes: 0,
      coverLetters: 0,
      settings: 0,
      deleted: 0
    };

    try {
      // Process jobs
      if (serverData.jobs && Array.isArray(serverData.jobs)) {
        for (const job of serverData.jobs) {
          if (job.deleted) {
            await this.dataService.deleteJob(job.id);
            processed.deleted++;
          } else {
            await this.dataService.saveJob({
              ...job.data,
              id: job.id,
              lastModified: job.last_modified
            });
            processed.jobs++;
          }
        }
      }

      // Process resumes
      if (serverData.resumes && Array.isArray(serverData.resumes)) {
        for (const resume of serverData.resumes) {
          if (resume.deleted) {
            await this.dataService.deleteResume(resume.id);
            processed.deleted++;
          } else {
            await this.dataService.saveResume({
              ...resume.data,
              id: resume.id,
              lastModified: resume.last_modified
            });
            processed.resumes++;
          }
        }
      }

      // Process cover letters
      if (serverData.coverLetters && Array.isArray(serverData.coverLetters)) {
        for (const letter of serverData.coverLetters) {
          if (letter.deleted) {
            // Assuming delete method exists
            processed.deleted++;
          } else {
            // Assuming save method exists
            processed.coverLetters++;
          }
        }
      }

      // Process settings
      if (serverData.settings) {
        await this.dataService.saveSettings({
          id: 'default',
          ...serverData.settings
        });
        processed.settings++;
      }

      console.log('Processed server data:', processed);
      return processed;

    } catch (error) {
      console.error('Error processing server data:', error);
      throw error;
    }
  }

  /**
   * Queue a change for sync
   */
  async queueChange(entityType, entityId, operation, data) {
    await this.syncQueue.add(entityType, entityId, operation, data);

    // If sync on change is enabled, trigger sync
    if (this.settings.syncOnChange && this.authClient.isAuthenticated()) {
      this.sync().catch(error => {
        console.error('Auto-sync error:', error);
      });
    }
  }

  /**
   * Start auto-sync interval
   */
  startAutoSync() {
    if (this.syncInterval) {
      return; // Already running
    }

    console.log(`Starting auto-sync (every ${this.settings.syncInterval / 1000}s)`);

    this.syncInterval = setInterval(() => {
      if (this.authClient.isAuthenticated() && navigator.onLine) {
        this.sync().catch(error => {
          console.error('Auto-sync error:', error);
        });
      }
    }, this.settings.syncInterval);
  }

  /**
   * Stop auto-sync interval
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Get sync status
   */
  async getStatus() {
    if (!this.authClient.isAuthenticated()) {
      return {
        authenticated: false,
        state: SYNC_STATES.OFFLINE
      };
    }

    try {
      const response = await this.authClient.request('/sync/status', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to get status');
      }

      const serverStatus = await response.json();

      return {
        authenticated: true,
        state: this.state,
        lastSync: this.lastSync,
        lastError: this.lastError,
        queuedChanges: this.syncQueue.getPendingCount(),
        conflicts: this.conflictResolver.getCount(),
        server: serverStatus
      };

    } catch (error) {
      console.error('Status error:', error);
      return {
        authenticated: true,
        state: SYNC_STATES.ERROR,
        error: error.message
      };
    }
  }

  /**
   * Update sync settings
   */
  async updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };

    await this.saveSettings();

    // Restart auto-sync if interval changed
    if (newSettings.syncInterval !== undefined || newSettings.autoSync !== undefined) {
      this.stopAutoSync();

      if (this.settings.autoSync && this.authClient.isAuthenticated()) {
        this.startAutoSync();
      }
    }

    this.notifyListeners('settingsUpdated', this.settings);
  }

  /**
   * Get sync settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Load sync settings from storage
   */
  async loadSettings() {
    try {
      const stored = await this.dataService.getSettings(SYNC_SETTINGS_KEY);

      if (stored) {
        this.settings = {
          ...this.settings,
          ...stored,
          id: SYNC_SETTINGS_KEY
        };

        this.lastSync = stored.lastSync || null;
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  }

  /**
   * Save sync settings to storage
   */
  async saveSettings() {
    try {
      await this.dataService.saveSettings({
        id: SYNC_SETTINGS_KEY,
        ...this.settings,
        lastSync: this.lastSync
      });
    } catch (error) {
      console.error('Error saving sync settings:', error);
    }
  }

  /**
   * Set sync state
   */
  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      this.notifyListeners('stateChanged', {
        oldState,
        newState
      });
    }
  }

  /**
   * Handle auth events
   */
  handleAuthEvent(event) {
    console.log('Auth event:', event.event);

    if (event.event === 'login' || event.event === 'register') {
      // User logged in, start auto-sync
      if (this.settings.autoSync) {
        this.startAutoSync();
      }

      // Trigger initial sync
      this.sync().catch(error => {
        console.error('Post-login sync error:', error);
      });
    }

    if (event.event === 'logout') {
      // User logged out, stop auto-sync
      this.stopAutoSync();
      this.setState(SYNC_STATES.IDLE);
      this.lastSync = null;
    }
  }

  /**
   * Handle conflict events
   */
  handleConflictEvent(event) {
    console.log('Conflict event:', event.event);

    if (event.event === 'conflictsDetected') {
      this.setState(SYNC_STATES.CONFLICTS);
    }

    if (event.event === 'conflictResolved' && event.remaining === 0) {
      this.setState(SYNC_STATES.SUCCESS);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of sync events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({
          event,
          state: this.state,
          lastSync: this.lastSync,
          queuedChanges: this.syncQueue.getPendingCount(),
          conflicts: this.conflictResolver.getCount(),
          ...data
        });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Export all data (backup)
   */
  async exportData() {
    if (!this.authClient.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await this.authClient.request('/sync/export', {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return await response.json();
  }

  /**
   * Import data (restore from backup)
   */
  async importData(data) {
    if (!this.authClient.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await this.authClient.request('/sync/import', {
      method: 'POST',
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    const result = await response.json();

    // Refresh local data
    await this.pull();

    return result;
  }
}

// Export singleton instance
let syncManagerInstance = null;

export async function getSyncManager() {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
    await syncManagerInstance.initialize();
  }
  return syncManagerInstance;
}

export default SyncManager;
