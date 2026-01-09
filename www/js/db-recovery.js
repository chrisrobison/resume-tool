// Database Recovery Utilities
// Provides health monitoring, error recovery, and database maintenance tools

import dataService from './data-service.js';

/**
 * Database health check
 * @returns {Promise<Object>} Health status
 */
export async function checkDatabaseHealth() {
    const health = {
        isHealthy: true,
        checks: {},
        errors: [],
        warnings: []
    };

    try {
        // Check if worker is ready
        health.checks.workerReady = dataService.isWorkerReady();
        if (!health.checks.workerReady) {
            health.isHealthy = false;
            health.errors.push('Database worker is not ready');
        }

        // Check if we can perform basic operations
        try {
            const testId = `health_check_${Date.now()}`;
            const testData = { id: testId, test: true, timestamp: new Date().toISOString() };

            // Test write
            await dataService.put('settings', testData);
            health.checks.canWrite = true;

            // Test read
            const readData = await dataService.get('settings', testId);
            health.checks.canRead = readData?.id === testId;

            // Test delete
            await dataService.delete('settings', testId);
            health.checks.canDelete = true;

            if (!health.checks.canRead || !health.checks.canWrite || !health.checks.canDelete) {
                health.isHealthy = false;
                health.errors.push('Basic database operations failed');
            }
        } catch (error) {
            health.isHealthy = false;
            health.checks.canWrite = false;
            health.checks.canRead = false;
            health.checks.canDelete = false;
            health.errors.push(`Basic operations test failed: ${error.message}`);
        }

        // Check record counts (should not throw errors)
        try {
            health.checks.resumeCount = await dataService.count('resumes');
            health.checks.jobCount = await dataService.count('jobs');
            health.checks.logCount = await dataService.count('logs');
        } catch (error) {
            health.warnings.push(`Failed to count records: ${error.message}`);
        }

        // Check for excessive log entries (performance warning)
        if (health.checks.logCount > 10000) {
            health.warnings.push('Log count exceeds 10,000 entries. Consider clearing old logs.');
        }

    } catch (error) {
        health.isHealthy = false;
        health.errors.push(`Health check failed: ${error.message}`);
    }

    return health;
}

/**
 * Attempt to recover from database errors
 * @param {Error} error - The error to recover from
 * @returns {Promise<Object>} Recovery result
 */
export async function attemptRecovery(error) {
    const result = {
        success: false,
        actions: [],
        message: ''
    };

    try {
        // Classify the error
        const errorType = classifyDatabaseError(error);

        switch (errorType) {
            case 'quota_exceeded':
                result.actions.push('Clearing old logs');
                await clearOldLogs(30);
                result.actions.push('Compacting database');
                // IndexedDB doesn't have explicit compaction, but clearing helps
                result.success = true;
                result.message = 'Freed up storage space by clearing old data';
                break;

            case 'worker_not_ready':
                result.actions.push('Reinitializing database worker');
                // The worker should auto-initialize, just need to wait
                await waitForWorker(10000);
                result.success = dataService.isWorkerReady();
                result.message = result.success
                    ? 'Worker reinitialized successfully'
                    : 'Worker reinitialization failed';
                break;

            case 'transaction_failed':
                result.actions.push('Retrying operation');
                // Caller should retry the operation
                result.success = false;
                result.message = 'Transaction failed. Please retry the operation.';
                break;

            case 'corruption':
                result.actions.push('Database may be corrupted');
                result.actions.push('Recommend exporting data and clearing database');
                result.success = false;
                result.message = 'Database corruption detected. Export your data and clear the database.';
                break;

            default:
                result.actions.push('Unknown error type');
                result.success = false;
                result.message = `Unable to recover from error: ${error.message}`;
        }

    } catch (recoveryError) {
        result.success = false;
        result.message = `Recovery attempt failed: ${recoveryError.message}`;
    }

    return result;
}

/**
 * Classify database errors for recovery strategies
 * @param {Error} error - The error to classify
 * @returns {string} Error type
 */
function classifyDatabaseError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('quota') || message.includes('storage') || message.includes('disk')) {
        return 'quota_exceeded';
    }

    if (message.includes('worker') || message.includes('not ready')) {
        return 'worker_not_ready';
    }

    if (message.includes('transaction') || message.includes('aborted')) {
        return 'transaction_failed';
    }

    if (message.includes('corrupt') || message.includes('invalid') || message.includes('malformed')) {
        return 'corruption';
    }

    if (message.includes('timeout')) {
        return 'timeout';
    }

    return 'unknown';
}

/**
 * Clear old log entries to free up space
 * @param {number} daysToKeep - Keep logs from last N days
 * @returns {Promise<number>} Number of logs deleted
 */
export async function clearOldLogs(daysToKeep = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffISO = cutoffDate.toISOString();

        // Get all logs older than cutoff
        const result = await dataService.query('logs', {
            timestamp: (ts) => ts < cutoffISO
        });
        const oldLogs = result.results || result;

        if (oldLogs.length > 0) {
            const keys = oldLogs.map(log => log.id);
            await dataService.bulkDelete('logs', keys);
            return keys.length;
        }

        return 0;
    } catch (error) {
        console.error('Failed to clear old logs:', error);
        return 0;
    }
}

/**
 * Wait for database worker to be ready
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>} True if ready
 */
async function waitForWorker(timeout = 5000) {
    const startTime = Date.now();
    while (!dataService.isWorkerReady() && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return dataService.isWorkerReady();
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
export async function getDatabaseStats() {
    const stats = {
        timestamp: new Date().toISOString(),
        stores: {},
        totalRecords: 0,
        estimatedSize: 0
    };

    try {
        const stores = ['resumes', 'jobs', 'logs', 'settings', 'coverLetters', 'aiHistory'];

        for (const store of stores) {
            try {
                const count = await dataService.count(store);
                stats.stores[store] = {
                    count,
                    lastUpdated: null
                };
                stats.totalRecords += count;

                // Get latest item to determine last update
                if (count > 0) {
                    const items = await dataService.getAll(store, null, null, 1);
                    if (items.results && items.results.length > 0) {
                        const latest = items.results[0];
                        stats.stores[store].lastUpdated = latest.timestamp || latest.lastModified || latest.dateCreated;
                    }
                }
            } catch (error) {
                stats.stores[store] = { error: error.message };
            }
        }

        // Estimate size (rough calculation)
        stats.estimatedSize = stats.totalRecords * 5000; // Assume ~5KB per record

    } catch (error) {
        stats.error = error.message;
    }

    return stats;
}

/**
 * Perform database maintenance
 * @returns {Promise<Object>} Maintenance result
 */
export async function performMaintenance() {
    const result = {
        actions: [],
        errors: [],
        stats: {
            logsCleared: 0,
            orphanedRecordsRemoved: 0
        }
    };

    try {
        // Clear old logs
        result.actions.push('Clearing logs older than 30 days');
        result.stats.logsCleared = await clearOldLogs(30);

        // Remove orphaned cover letters (whose job doesn't exist)
        result.actions.push('Checking for orphaned cover letters');
        try {
            const coverLetters = await dataService.getAll('coverLetters');
            const jobs = await dataService.getJobs();
            const jobIds = new Set(jobs.map(j => j.id));

            const orphaned = (coverLetters.results || coverLetters).filter(
                cl => cl.jobId && !jobIds.has(cl.jobId)
            );

            if (orphaned.length > 0) {
                const keys = orphaned.map(cl => cl.id);
                await dataService.bulkDelete('coverLetters', keys);
                result.stats.orphanedRecordsRemoved = keys.length;
            }
        } catch (error) {
            result.errors.push(`Failed to remove orphaned records: ${error.message}`);
        }

        result.actions.push('Maintenance completed');

    } catch (error) {
        result.errors.push(`Maintenance failed: ${error.message}`);
    }

    return result;
}

/**
 * Create a backup of all database data
 * @returns {Promise<Object>} Backup data
 */
export async function createBackup() {
    try {
        const backup = await dataService.export();
        backup.metadata = {
            backupDate: new Date().toISOString(),
            version: '1.0',
            source: 'db-recovery-utility'
        };
        return backup;
    } catch (error) {
        throw new Error(`Backup failed: ${error.message}`);
    }
}

/**
 * Restore from a backup
 * @param {Object} backupData - Backup data to restore
 * @returns {Promise<Object>} Restore result
 */
export async function restoreBackup(backupData) {
    try {
        // Validate backup data
        if (!backupData.data || typeof backupData.data !== 'object') {
            throw new Error('Invalid backup data format');
        }

        // Clear existing data
        const stores = ['resumes', 'jobs', 'logs', 'coverLetters', 'aiHistory'];
        for (const store of stores) {
            await dataService.clear(store);
        }

        // Import backup
        const result = await dataService.import(backupData);

        return {
            success: true,
            imported: result.imported,
            errors: result.errors
        };
    } catch (error) {
        throw new Error(`Restore failed: ${error.message}`);
    }
}

/**
 * Repair database by rebuilding indexes
 * Note: IndexedDB doesn't support explicit index rebuilding,
 * but we can simulate it by re-putting all records
 * @param {string} store - Store name to repair
 * @returns {Promise<Object>} Repair result
 */
export async function repairStore(store) {
    try {
        const records = await dataService.getAll(store);
        const allRecords = records.results || records;

        if (allRecords.length === 0) {
            return { success: true, message: 'No records to repair', count: 0 };
        }

        // Re-put all records (this forces index updates)
        await dataService.bulkPut(store, allRecords);

        return {
            success: true,
            message: `Repaired ${allRecords.length} records in ${store}`,
            count: allRecords.length
        };
    } catch (error) {
        throw new Error(`Repair failed for ${store}: ${error.message}`);
    }
}

/**
 * Validate data integrity
 * @returns {Promise<Object>} Validation result
 */
export async function validateDataIntegrity() {
    const validation = {
        isValid: true,
        issues: [],
        warnings: []
    };

    try {
        // Check resumes
        const resumes = await dataService.getResumes();
        for (const resume of resumes) {
            if (!resume.id) {
                validation.isValid = false;
                validation.issues.push('Found resume without ID');
            }
            if (!resume.basics || typeof resume.basics !== 'object') {
                validation.warnings.push(`Resume ${resume.id} has invalid basics structure`);
            }
        }

        // Check jobs
        const jobs = await dataService.getJobs();
        for (const job of jobs) {
            if (!job.id) {
                validation.isValid = false;
                validation.issues.push('Found job without ID');
            }
            if (!job.title) {
                validation.warnings.push(`Job ${job.id} missing title`);
            }
        }

        // Check for duplicate IDs in resumes
        const resumeIds = resumes.map(r => r.id);
        const uniqueResumeIds = new Set(resumeIds);
        if (resumeIds.length !== uniqueResumeIds.size) {
            validation.isValid = false;
            validation.issues.push('Found duplicate resume IDs');
        }

        // Check for duplicate IDs in jobs
        const jobIds = jobs.map(j => j.id);
        const uniqueJobIds = new Set(jobIds);
        if (jobIds.length !== uniqueJobIds.size) {
            validation.isValid = false;
            validation.issues.push('Found duplicate job IDs');
        }

    } catch (error) {
        validation.isValid = false;
        validation.issues.push(`Validation failed: ${error.message}`);
    }

    return validation;
}

export default {
    checkDatabaseHealth,
    attemptRecovery,
    clearOldLogs,
    getDatabaseStats,
    performMaintenance,
    createBackup,
    restoreBackup,
    repairStore,
    validateDataIntegrity
};
