// sync-queue.js - Queue manager for pending sync operations
// Tracks changes that need to be synced to server (offline support)

import { getDataService } from '../data-service.js';

const QUEUE_STORE_KEY = 'sync-queue';

class SyncQueue {
  constructor() {
    this.queue = [];
    this.initialized = false;
  }

  /**
   * Initialize sync queue - load from IndexedDB
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      const dataService = await getDataService();
      const settings = await dataService.getSettings(QUEUE_STORE_KEY);

      if (settings && settings.queue && Array.isArray(settings.queue)) {
        this.queue = settings.queue;
      }

      this.initialized = true;
      return this;
    } catch (error) {
      console.error('Sync queue initialization error:', error);
      this.initialized = true;
      return this;
    }
  }

  /**
   * Add operation to queue
   */
  async add(entityType, entityId, operation, data) {
    if (!this.initialized) {
      await this.initialize();
    }

    const queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType, // 'job', 'resume', 'coverLetter', 'settings'
      entityId,
      operation, // 'create', 'update', 'delete'
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      lastError: null
    };

    // Check if this entity is already in queue
    const existingIndex = this.queue.findIndex(
      item => item.entityType === entityType && item.entityId === entityId
    );

    if (existingIndex >= 0) {
      // Update existing queue item
      this.queue[existingIndex] = {
        ...this.queue[existingIndex],
        operation,
        data,
        timestamp: queueItem.timestamp,
        retries: 0,
        lastError: null
      };
    } else {
      // Add new queue item
      this.queue.push(queueItem);
    }

    await this.save();

    return queueItem;
  }

  /**
   * Get all queue items
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Get queue items by entity type
   */
  getByType(entityType) {
    return this.queue.filter(item => item.entityType === entityType);
  }

  /**
   * Get queue item by ID
   */
  getById(queueId) {
    return this.queue.find(item => item.id === queueId);
  }

  /**
   * Get pending count
   */
  getPendingCount() {
    return this.queue.length;
  }

  /**
   * Get pending items grouped by type
   */
  getGroupedByType() {
    const grouped = {
      jobs: [],
      resumes: [],
      coverLetters: [],
      settings: []
    };

    this.queue.forEach(item => {
      const type = item.entityType === 'coverLetter' ? 'coverLetters' : `${item.entityType}s`;
      if (grouped[type]) {
        grouped[type].push(item);
      }
    });

    return grouped;
  }

  /**
   * Remove item from queue
   */
  async remove(queueId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const index = this.queue.findIndex(item => item.id === queueId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Remove items by entity
   */
  async removeByEntity(entityType, entityId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const initialLength = this.queue.length;
    this.queue = this.queue.filter(
      item => !(item.entityType === entityType && item.entityId === entityId)
    );

    if (this.queue.length !== initialLength) {
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Mark item as failed (increment retries)
   */
  async markFailed(queueId, error) {
    if (!this.initialized) {
      await this.initialize();
    }

    const item = this.queue.find(item => item.id === queueId);
    if (item) {
      item.retries++;
      item.lastError = error;
      item.lastRetry = new Date().toISOString();
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Clear all queue items
   */
  async clear() {
    if (!this.initialized) {
      await this.initialize();
    }

    this.queue = [];
    await this.save();
  }

  /**
   * Clear successful syncs (items that were confirmed by server)
   */
  async clearSuccessful(entityIds) {
    if (!this.initialized) {
      await this.initialize();
    }

    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => !entityIds.includes(item.entityId));

    if (this.queue.length !== initialLength) {
      await this.save();
      return initialLength - this.queue.length;
    }

    return 0;
  }

  /**
   * Get items that should be retried (failed < 3 times)
   */
  getRetryable() {
    return this.queue.filter(item => item.retries < 3);
  }

  /**
   * Get failed items (retries >= 3)
   */
  getFailed() {
    return this.queue.filter(item => item.retries >= 3);
  }

  /**
   * Convert queue to sync payload format
   */
  toSyncPayload() {
    const payload = {
      jobs: [],
      resumes: [],
      coverLetters: [],
      settings: null
    };

    this.queue.forEach(item => {
      const syncItem = {
        id: item.entityId,
        data: item.data,
        version: item.data.version || 1,
        deleted: item.operation === 'delete' ? 1 : 0,
        last_modified: item.timestamp
      };

      if (item.entityType === 'job') {
        payload.jobs.push(syncItem);
      } else if (item.entityType === 'resume') {
        payload.resumes.push(syncItem);
      } else if (item.entityType === 'coverLetter') {
        payload.coverLetters.push(syncItem);
      } else if (item.entityType === 'settings') {
        payload.settings = item.data;
      }
    });

    return payload;
  }

  /**
   * Save queue to IndexedDB
   */
  async save() {
    try {
      const dataService = await getDataService();
      await dataService.saveSettings({
        id: QUEUE_STORE_KEY,
        queue: this.queue,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const stats = {
      total: this.queue.length,
      byType: {
        jobs: 0,
        resumes: 0,
        coverLetters: 0,
        settings: 0
      },
      byOperation: {
        create: 0,
        update: 0,
        delete: 0
      },
      failed: 0,
      retryable: 0
    };

    this.queue.forEach(item => {
      // Count by type
      if (item.entityType === 'job') stats.byType.jobs++;
      else if (item.entityType === 'resume') stats.byType.resumes++;
      else if (item.entityType === 'coverLetter') stats.byType.coverLetters++;
      else if (item.entityType === 'settings') stats.byType.settings++;

      // Count by operation
      if (item.operation === 'create') stats.byOperation.create++;
      else if (item.operation === 'update') stats.byOperation.update++;
      else if (item.operation === 'delete') stats.byOperation.delete++;

      // Count failed/retryable
      if (item.retries >= 3) stats.failed++;
      else if (item.retries > 0) stats.retryable++;
    });

    return stats;
  }
}

// Export singleton instance
let syncQueueInstance = null;

export async function getSyncQueue() {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue();
    await syncQueueInstance.initialize();
  }
  return syncQueueInstance;
}

export default SyncQueue;
