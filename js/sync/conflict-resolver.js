// conflict-resolver.js - Handles sync conflicts between client and server
// Provides strategies for resolving conflicts when same entity modified on both sides

import { getDataService } from '../data-service.js';

// Conflict resolution strategies
export const RESOLUTION_STRATEGIES = {
  SERVER_WINS: 'server_wins',     // Use server version
  CLIENT_WINS: 'client_wins',     // Use client version
  MERGE: 'merge',                 // Merge both versions
  MANUAL: 'manual',               // Let user decide
  NEWEST_WINS: 'newest_wins'      // Use most recently modified
};

class ConflictResolver {
  constructor() {
    this.conflicts = [];
    this.resolutions = [];
    this.listeners = [];
  }

  /**
   * Detect conflicts between client and server data
   */
  detectConflicts(localEntities, serverEntities, entityType) {
    const conflicts = [];

    if (!serverEntities || !Array.isArray(serverEntities)) {
      return conflicts;
    }

    // Create maps for quick lookup
    const localMap = new Map();
    if (localEntities && Array.isArray(localEntities)) {
      localEntities.forEach(entity => {
        localMap.set(entity.id, entity);
      });
    }

    // Check each server entity
    serverEntities.forEach(serverEntity => {
      const localEntity = localMap.get(serverEntity.id);

      if (localEntity) {
        // Both exist - check if there's a conflict
        const serverModified = new Date(serverEntity.last_modified || serverEntity.lastModified);
        const localModified = new Date(localEntity.last_modified || localEntity.lastModified);

        // Conflict if both modified after last sync and timestamps differ
        if (Math.abs(serverModified - localModified) > 1000) { // More than 1 second difference
          conflicts.push({
            entityType,
            entityId: serverEntity.id,
            serverVersion: serverEntity,
            clientVersion: localEntity,
            serverModified: serverModified.toISOString(),
            clientModified: localModified.toISOString(),
            detected: new Date().toISOString()
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Add conflicts to resolution queue
   */
  addConflicts(conflicts) {
    conflicts.forEach(conflict => {
      // Check if conflict already exists
      const existing = this.conflicts.find(
        c => c.entityType === conflict.entityType && c.entityId === conflict.entityId
      );

      if (!existing) {
        this.conflicts.push(conflict);
      }
    });

    if (conflicts.length > 0) {
      this.notifyListeners('conflictsDetected', { count: conflicts.length });
    }
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolved() {
    return this.conflicts.filter(c => !c.resolved);
  }

  /**
   * Get conflicts by entity type
   */
  getByType(entityType) {
    return this.conflicts.filter(c => c.entityType === entityType && !c.resolved);
  }

  /**
   * Get conflict by ID
   */
  getById(entityId) {
    return this.conflicts.find(c => c.entityId === entityId && !c.resolved);
  }

  /**
   * Get conflict count
   */
  getCount() {
    return this.conflicts.filter(c => !c.resolved).length;
  }

  /**
   * Auto-resolve conflict using strategy
   */
  async autoResolve(conflict, strategy = RESOLUTION_STRATEGIES.NEWEST_WINS) {
    let resolvedData = null;

    switch (strategy) {
      case RESOLUTION_STRATEGIES.SERVER_WINS:
        resolvedData = conflict.serverVersion.data;
        break;

      case RESOLUTION_STRATEGIES.CLIENT_WINS:
        resolvedData = conflict.clientVersion.data;
        break;

      case RESOLUTION_STRATEGIES.NEWEST_WINS:
        const serverTime = new Date(conflict.serverModified);
        const clientTime = new Date(conflict.clientModified);
        resolvedData = serverTime > clientTime
          ? conflict.serverVersion.data
          : conflict.clientVersion.data;
        break;

      case RESOLUTION_STRATEGIES.MERGE:
        resolvedData = await this.mergeData(
          conflict.clientVersion.data,
          conflict.serverVersion.data,
          conflict.entityType
        );
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    return this.resolve(conflict.entityId, strategy, resolvedData);
  }

  /**
   * Manually resolve conflict with user-provided data
   */
  async resolve(entityId, strategy, resolvedData) {
    const conflict = this.conflicts.find(c => c.entityId === entityId);

    if (!conflict) {
      throw new Error(`Conflict not found: ${entityId}`);
    }

    // Mark conflict as resolved
    conflict.resolved = true;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolution = strategy;
    conflict.resolvedData = resolvedData;

    // Save resolution
    this.resolutions.push({
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      strategy,
      timestamp: conflict.resolvedAt,
      serverVersion: conflict.serverVersion.version,
      clientVersion: conflict.clientVersion.version
    });

    // Update local data with resolved version
    await this.updateLocalData(conflict.entityType, entityId, resolvedData);

    this.notifyListeners('conflictResolved', {
      entityId,
      strategy,
      remaining: this.getCount()
    });

    return resolvedData;
  }

  /**
   * Merge client and server data
   */
  async mergeData(clientData, serverData, entityType) {
    // Basic merge strategy: prefer newer fields, merge arrays
    const merged = { ...clientData };

    Object.keys(serverData).forEach(key => {
      if (Array.isArray(serverData[key]) && Array.isArray(clientData[key])) {
        // Merge arrays (combine unique items)
        merged[key] = this.mergeArrays(clientData[key], serverData[key]);
      } else if (typeof serverData[key] === 'object' && serverData[key] !== null &&
                 typeof clientData[key] === 'object' && clientData[key] !== null) {
        // Recursively merge objects
        merged[key] = { ...clientData[key], ...serverData[key] };
      } else {
        // For simple values, use server version if client doesn't have it
        if (clientData[key] === undefined || clientData[key] === null) {
          merged[key] = serverData[key];
        }
        // Otherwise keep client version
      }
    });

    return merged;
  }

  /**
   * Merge two arrays (keep unique items based on ID or value)
   */
  mergeArrays(clientArray, serverArray) {
    const merged = [...clientArray];
    const ids = new Set(clientArray.filter(item => item.id).map(item => item.id));

    serverArray.forEach(serverItem => {
      if (serverItem.id) {
        // If has ID, only add if not already in client array
        if (!ids.has(serverItem.id)) {
          merged.push(serverItem);
        }
      } else {
        // If no ID, add if not duplicate
        const isDuplicate = clientArray.some(clientItem =>
          JSON.stringify(clientItem) === JSON.stringify(serverItem)
        );

        if (!isDuplicate) {
          merged.push(serverItem);
        }
      }
    });

    return merged;
  }

  /**
   * Update local data with resolved version
   */
  async updateLocalData(entityType, entityId, data) {
    try {
      const dataService = await getDataService();

      switch (entityType) {
        case 'job':
          await dataService.saveJob({
            ...data,
            id: entityId,
            lastModified: new Date().toISOString()
          });
          break;

        case 'resume':
          await dataService.saveResume({
            ...data,
            id: entityId,
            lastModified: new Date().toISOString()
          });
          break;

        case 'coverLetter':
          // Assuming similar save method exists
          await dataService.saveCoverLetter({
            ...data,
            id: entityId,
            lastModified: new Date().toISOString()
          });
          break;

        case 'settings':
          await dataService.saveSettings({
            ...data,
            id: entityId
          });
          break;

        default:
          console.warn(`Unknown entity type for update: ${entityType}`);
      }
    } catch (error) {
      console.error(`Error updating local data for ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Resolve all conflicts using a strategy
   */
  async resolveAll(strategy = RESOLUTION_STRATEGIES.NEWEST_WINS) {
    const unresolved = this.getUnresolved();
    const results = [];

    for (const conflict of unresolved) {
      try {
        const resolved = await this.autoResolve(conflict, strategy);
        results.push({ success: true, entityId: conflict.entityId, data: resolved });
      } catch (error) {
        results.push({ success: false, entityId: conflict.entityId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Clear all conflicts
   */
  clear() {
    this.conflicts = [];
    this.notifyListeners('conflictsCleared');
  }

  /**
   * Clear resolved conflicts
   */
  clearResolved() {
    this.conflicts = this.conflicts.filter(c => !c.resolved);
  }

  /**
   * Get conflict resolution history
   */
  getResolutionHistory() {
    return [...this.resolutions];
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
   * Notify listeners of conflict events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({
          event,
          conflictCount: this.getCount(),
          ...data
        });
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }

  /**
   * Get conflict statistics
   */
  getStats() {
    const stats = {
      total: this.conflicts.length,
      resolved: this.conflicts.filter(c => c.resolved).length,
      unresolved: this.conflicts.filter(c => !c.resolved).length,
      byType: {
        jobs: 0,
        resumes: 0,
        coverLetters: 0,
        settings: 0
      },
      byStrategy: {
        server_wins: 0,
        client_wins: 0,
        newest_wins: 0,
        merge: 0,
        manual: 0
      }
    };

    this.conflicts.forEach(conflict => {
      // Count by type
      if (conflict.entityType === 'job') stats.byType.jobs++;
      else if (conflict.entityType === 'resume') stats.byType.resumes++;
      else if (conflict.entityType === 'coverLetter') stats.byType.coverLetters++;
      else if (conflict.entityType === 'settings') stats.byType.settings++;

      // Count by strategy (if resolved)
      if (conflict.resolved && conflict.resolution) {
        stats.byStrategy[conflict.resolution]++;
      }
    });

    return stats;
  }
}

// Export singleton instance
let conflictResolverInstance = null;

export function getConflictResolver() {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver();
  }
  return conflictResolverInstance;
}

export default ConflictResolver;
