// sync.js - Sync endpoints for client-server data synchronization
// Handles push, pull, and bidirectional sync operations

const express = require('express');
const { authenticateToken, getDeviceId, getDeviceName } = require('../middleware/auth');
const { getInstance: getDbInstance } = require('../services/db-service');

const router = express.Router();

/**
 * POST /api/sync/push
 * Upload changes from client to server
 *
 * Request body:
 * {
 *   entities: {
 *     jobs: [{ id, data, version, deleted, last_modified }],
 *     resumes: [...],
 *     coverLetters: [...],
 *     settings: {...}
 *   },
 *   lastSync: '2025-01-15T10:30:00.000Z',
 *   deviceId: 'browser-uuid'
 * }
 */
router.post('/push', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const { entities, lastSync, deviceId } = req.body;

        if (!entities) {
            return res.status(400).json({
                error: 'Missing entities',
                message: 'Request must include entities to sync'
            });
        }

        // Update sync session
        const actualDeviceId = deviceId || getDeviceId(req);
        const deviceName = getDeviceName(req);
        db.upsertSyncSession(userId, actualDeviceId, deviceName);

        // Batch upsert all entities
        const results = db.batchUpsert(userId, entities);

        // Handle settings separately (single record)
        if (entities.settings) {
            try {
                db.upsertSettings(userId, entities.settings);
                results.settings = { success: 1, failed: 0 };
            } catch (error) {
                results.settings = { success: 0, failed: 1 };
                results.errors.push({ entity: 'settings', error: error.message });
            }
        }

        res.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Push error:', error);
        res.status(500).json({
            error: 'Sync push failed',
            message: error.message
        });
    }
});

/**
 * POST /api/sync/pull
 * Download changes from server to client
 *
 * Request body:
 * {
 *   lastSync: '2025-01-15T10:30:00.000Z',
 *   entities: ['jobs', 'resumes', 'coverLetters', 'settings']
 * }
 */
router.post('/pull', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const { lastSync, entities } = req.body;

        const timestamp = lastSync || '1970-01-01T00:00:00.000Z';
        const response = {
            success: true,
            data: {},
            timestamp: new Date().toISOString()
        };

        // Default to all entities if not specified
        const entitiesToSync = entities || ['jobs', 'resumes', 'coverLetters', 'settings'];

        // Get changes since last sync
        if (entitiesToSync.includes('jobs')) {
            response.data.jobs = db.getJobsModifiedAfter(userId, timestamp);
        }

        if (entitiesToSync.includes('resumes')) {
            response.data.resumes = db.getResumesModifiedAfter(userId, timestamp);
        }

        if (entitiesToSync.includes('coverLetters')) {
            response.data.coverLetters = db.getCoverLettersModifiedAfter(userId, timestamp);
        }

        if (entitiesToSync.includes('settings')) {
            const settings = db.getSettings(userId);
            response.data.settings = settings || null;
        }

        res.json(response);

    } catch (error) {
        console.error('Pull error:', error);
        res.status(500).json({
            error: 'Sync pull failed',
            message: error.message
        });
    }
});

/**
 * POST /api/sync/full
 * Bidirectional sync - push local changes and pull server changes
 *
 * Request body:
 * {
 *   entities: {
 *     jobs: [...],
 *     resumes: [...],
 *     coverLetters: [...]
 *   },
 *   lastSync: '2025-01-15T10:30:00.000Z',
 *   deviceId: 'browser-uuid'
 * }
 */
router.post('/full', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const { entities, lastSync, deviceId } = req.body;

        const timestamp = lastSync || '1970-01-01T00:00:00.000Z';
        const actualDeviceId = deviceId || getDeviceId(req);
        const deviceName = getDeviceName(req);

        // Update sync session
        db.upsertSyncSession(userId, actualDeviceId, deviceName);

        // PUSH: Upload client changes
        const pushResults = entities ? db.batchUpsert(userId, entities) : null;

        // Handle settings push
        if (entities?.settings) {
            try {
                db.upsertSettings(userId, entities.settings);
                if (pushResults) {
                    pushResults.settings = { success: 1, failed: 0 };
                }
            } catch (error) {
                if (pushResults) {
                    pushResults.settings = { success: 0, failed: 1 };
                    pushResults.errors.push({ entity: 'settings', error: error.message });
                }
            }
        }

        // PULL: Download server changes
        const serverData = {
            jobs: db.getJobsModifiedAfter(userId, timestamp),
            resumes: db.getResumesModifiedAfter(userId, timestamp),
            coverLetters: db.getCoverLettersModifiedAfter(userId, timestamp),
            settings: db.getSettings(userId)?.data || null
        };

        // Detect conflicts (entities modified both locally and on server)
        const conflicts = detectConflicts(entities, serverData, timestamp);

        res.json({
            success: true,
            push: pushResults,
            pull: {
                data: serverData,
                conflicts
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Full sync error:', error);
        res.status(500).json({
            error: 'Full sync failed',
            message: error.message
        });
    }
});

/**
 * GET /api/sync/status
 * Get sync status for current user
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const deviceId = getDeviceId(req);

        // Get sync sessions
        const sessions = db.getSyncSessions(userId);
        const lastSync = db.getLastSyncTime(userId, deviceId);

        // Get entity counts
        const stats = db.getStats(userId);

        res.json({
            success: true,
            userId,
            deviceId,
            lastSync,
            sessions: sessions.map(s => ({
                deviceId: s.device_id,
                deviceName: s.device_name,
                lastSync: s.last_sync,
                syncCount: s.sync_count
            })),
            stats
        });

    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            error: 'Failed to get sync status',
            message: error.message
        });
    }
});

/**
 * POST /api/sync/reset
 * Reset/clear all data for current user (for testing/development)
 * WARNING: This is destructive!
 */
router.post('/reset', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const { confirm } = req.body;

        if (confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({
                error: 'Confirmation required',
                message: 'To reset data, send { confirm: "DELETE_ALL_DATA" }'
            });
        }

        // Delete all user data (hard delete for reset)
        const deleteStmt = db.db.transaction(() => {
            db.db.prepare('DELETE FROM jobs WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM resumes WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM cover_letters WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM ai_history WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM settings WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM sync_sessions WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM sync_metadata WHERE user_id = ?').run(userId);
        });

        deleteStmt();

        res.json({
            success: true,
            message: 'All data deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({
            error: 'Reset failed',
            message: error.message
        });
    }
});

/**
 * GET /api/sync/export
 * Export all user data as JSON (for backup)
 */
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;

        const exportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            userId,
            data: {
                jobs: db.getJobs(userId),
                resumes: db.getResumes(userId),
                coverLetters: db.getCoverLetters(userId),
                settings: db.getSettings(userId)?.data || null
            }
        };

        res.json(exportData);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            error: 'Export failed',
            message: error.message
        });
    }
});

/**
 * POST /api/sync/import
 * Import data from backup/export file
 */
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const db = getDbInstance();
        await db.initialize();

        const { userId } = req.user;
        const { data, overwrite } = req.body;

        if (!data) {
            return res.status(400).json({
                error: 'Missing data',
                message: 'Request must include data to import'
            });
        }

        // Prepare entities for batch upsert
        const entities = {};

        if (data.jobs && Array.isArray(data.jobs)) {
            entities.jobs = data.jobs.map(job => ({
                id: job.id,
                data: job.data,
                version: job.version || 1,
                deleted: job.deleted || 0
            }));
        }

        if (data.resumes && Array.isArray(data.resumes)) {
            entities.resumes = data.resumes.map(resume => ({
                id: resume.id,
                data: resume.data,
                version: resume.version || 1,
                deleted: resume.deleted || 0
            }));
        }

        if (data.coverLetters && Array.isArray(data.coverLetters)) {
            entities.coverLetters = data.coverLetters.map(letter => ({
                id: letter.id,
                data: letter.data,
                version: letter.version || 1,
                deleted: letter.deleted || 0
            }));
        }

        // Import entities
        const results = db.batchUpsert(userId, entities);

        // Import settings
        if (data.settings) {
            db.upsertSettings(userId, data.settings);
            results.settings = { success: 1, failed: 0 };
        }

        res.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({
            error: 'Import failed',
            message: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Detect conflicts between client and server data
 * A conflict occurs when the same entity was modified both locally and on server
 */
function detectConflicts(clientEntities, serverData, lastSync) {
    const conflicts = [];

    if (!clientEntities || !serverData) {
        return conflicts;
    }

    // Check jobs for conflicts
    if (clientEntities.jobs && serverData.jobs) {
        const clientJobIds = new Set(clientEntities.jobs.map(j => j.id));

        for (const serverJob of serverData.jobs) {
            if (clientJobIds.has(serverJob.id)) {
                const clientJob = clientEntities.jobs.find(j => j.id === serverJob.id);

                // Conflict if both were modified after last sync
                if (clientJob && new Date(serverJob.last_modified) > new Date(lastSync)) {
                    conflicts.push({
                        entityType: 'job',
                        entityId: serverJob.id,
                        clientVersion: clientJob.version,
                        serverVersion: serverJob.version,
                        clientModified: clientJob.last_modified,
                        serverModified: serverJob.last_modified
                    });
                }
            }
        }
    }

    // Same logic for resumes and cover letters
    if (clientEntities.resumes && serverData.resumes) {
        const clientResumeIds = new Set(clientEntities.resumes.map(r => r.id));

        for (const serverResume of serverData.resumes) {
            if (clientResumeIds.has(serverResume.id)) {
                const clientResume = clientEntities.resumes.find(r => r.id === serverResume.id);

                if (clientResume && new Date(serverResume.last_modified) > new Date(lastSync)) {
                    conflicts.push({
                        entityType: 'resume',
                        entityId: serverResume.id,
                        clientVersion: clientResume.version,
                        serverVersion: serverResume.version,
                        clientModified: clientResume.last_modified,
                        serverModified: serverResume.last_modified
                    });
                }
            }
        }
    }

    return conflicts;
}

module.exports = router;
