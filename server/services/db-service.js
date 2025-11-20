// db-service.js - SQLite database service for job-tool
// Handles all database operations with transaction support

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseService {
    constructor(dbPath = null) {
        // Default to server/db/jobtool.db
        this.dbPath = dbPath || path.join(__dirname, '..', 'db', 'jobtool.db');
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize database connection and create tables
     */
    async initialize() {
        if (this.initialized) {
            return this;
        }

        try {
            // Ensure db directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath, {
                verbose: process.env.NODE_ENV === 'development' ? console.log : null
            });

            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');

            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');

            // Read and execute schema
            const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Execute schema (split by semicolon and execute each statement)
            this.db.exec(schema);

            this.initialized = true;
            console.log('✅ Database initialized:', this.dbPath);

            return this;
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
        }
    }

    /**
     * Begin a transaction
     */
    beginTransaction() {
        return this.db.prepare('BEGIN').run();
    }

    /**
     * Commit a transaction
     */
    commit() {
        return this.db.prepare('COMMIT').run();
    }

    /**
     * Rollback a transaction
     */
    rollback() {
        return this.db.prepare('ROLLBACK').run();
    }

    // ==================== USER OPERATIONS ====================

    /**
     * Create a new user (authenticated or anonymous)
     */
    createUser(userId, { email = null, passwordHash = null, displayName = null, isAnonymous = true } = {}) {
        const stmt = this.db.prepare(`
            INSERT INTO users (id, email, password_hash, display_name, is_anonymous)
            VALUES (?, ?, ?, ?, ?)
        `);

        return stmt.run(userId, email, passwordHash, displayName, isAnonymous ? 1 : 0);
    }

    /**
     * Get user by ID
     */
    getUserById(userId) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(userId);
    }

    /**
     * Get user by email
     */
    getUserByEmail(email) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }

    /**
     * Update user's last login timestamp
     */
    updateLastLogin(userId) {
        const stmt = this.db.prepare(`
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
        `);
        return stmt.run(userId);
    }

    // ==================== SYNC SESSION OPERATIONS ====================

    /**
     * Create or update sync session
     */
    upsertSyncSession(userId, deviceId, deviceName = null) {
        const stmt = this.db.prepare(`
            INSERT INTO sync_sessions (user_id, device_id, device_name, last_sync, sync_count)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(user_id, device_id) DO UPDATE SET
                last_sync = CURRENT_TIMESTAMP,
                sync_count = sync_count + 1,
                device_name = COALESCE(excluded.device_name, device_name)
        `);

        return stmt.run(userId, deviceId, deviceName);
    }

    /**
     * Get sync sessions for a user
     */
    getSyncSessions(userId) {
        const stmt = this.db.prepare(`
            SELECT * FROM sync_sessions
            WHERE user_id = ?
            ORDER BY last_sync DESC
        `);
        return stmt.all(userId);
    }

    /**
     * Get last sync time for a user and device
     */
    getLastSyncTime(userId, deviceId) {
        const stmt = this.db.prepare(`
            SELECT last_sync FROM sync_sessions
            WHERE user_id = ? AND device_id = ?
        `);
        const result = stmt.get(userId, deviceId);
        return result ? result.last_sync : null;
    }

    // ==================== JOB OPERATIONS ====================

    /**
     * Create or update a job
     */
    upsertJob(userId, jobId, jobData, version = 1) {
        const stmt = this.db.prepare(`
            INSERT INTO jobs (id, user_id, data, version, last_modified, created_at)
            VALUES (?, ?, json(?), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                data = json(excluded.data),
                version = excluded.version,
                last_modified = CURRENT_TIMESTAMP,
                deleted = 0,
                deleted_at = NULL
            WHERE user_id = excluded.user_id
        `);

        return stmt.run(jobId, userId, JSON.stringify(jobData), version);
    }

    /**
     * Get job by ID
     */
    getJob(userId, jobId) {
        const stmt = this.db.prepare(`
            SELECT id, data, version, last_modified, created_at, deleted
            FROM jobs
            WHERE id = ? AND user_id = ? AND deleted = 0
        `);
        const result = stmt.get(jobId, userId);
        if (result && result.data) {
            result.data = JSON.parse(result.data);
        }
        return result;
    }

    /**
     * Get all jobs for a user (not deleted)
     */
    getJobs(userId) {
        const stmt = this.db.prepare(`
            SELECT id, data, version, last_modified, created_at
            FROM jobs
            WHERE user_id = ? AND deleted = 0
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get jobs modified after a certain timestamp
     */
    getJobsModifiedAfter(userId, timestamp) {
        const stmt = this.db.prepare(`
            SELECT id, data, version, last_modified, created_at, deleted, deleted_at
            FROM jobs
            WHERE user_id = ? AND last_modified > ?
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId, timestamp);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Soft delete a job
     */
    deleteJob(userId, jobId) {
        const stmt = this.db.prepare(`
            UPDATE jobs
            SET deleted = 1, deleted_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `);
        return stmt.run(jobId, userId);
    }

    /**
     * Hard delete a job (permanent)
     */
    hardDeleteJob(userId, jobId) {
        const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?');
        return stmt.run(jobId, userId);
    }

    // ==================== RESUME OPERATIONS ====================

    /**
     * Create or update a resume
     */
    upsertResume(userId, resumeId, resumeData, version = 1) {
        const name = resumeData.name || resumeData.basics?.name || 'Untitled Resume';

        const stmt = this.db.prepare(`
            INSERT INTO resumes (id, user_id, name, data, version, last_modified, created_at)
            VALUES (?, ?, ?, json(?), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                data = json(excluded.data),
                version = excluded.version,
                last_modified = CURRENT_TIMESTAMP,
                deleted = 0,
                deleted_at = NULL
            WHERE user_id = excluded.user_id
        `);

        return stmt.run(resumeId, userId, name, JSON.stringify(resumeData), version);
    }

    /**
     * Get resume by ID
     */
    getResume(userId, resumeId) {
        const stmt = this.db.prepare(`
            SELECT id, name, data, version, last_modified, created_at, deleted
            FROM resumes
            WHERE id = ? AND user_id = ? AND deleted = 0
        `);
        const result = stmt.get(resumeId, userId);
        if (result && result.data) {
            result.data = JSON.parse(result.data);
        }
        return result;
    }

    /**
     * Get all resumes for a user
     */
    getResumes(userId) {
        const stmt = this.db.prepare(`
            SELECT id, name, data, version, last_modified, created_at
            FROM resumes
            WHERE user_id = ? AND deleted = 0
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get resumes modified after a certain timestamp
     */
    getResumesModifiedAfter(userId, timestamp) {
        const stmt = this.db.prepare(`
            SELECT id, name, data, version, last_modified, created_at, deleted, deleted_at
            FROM resumes
            WHERE user_id = ? AND last_modified > ?
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId, timestamp);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Soft delete a resume
     */
    deleteResume(userId, resumeId) {
        const stmt = this.db.prepare(`
            UPDATE resumes
            SET deleted = 1, deleted_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `);
        return stmt.run(resumeId, userId);
    }

    // ==================== COVER LETTER OPERATIONS ====================

    /**
     * Create or update a cover letter
     */
    upsertCoverLetter(userId, letterId, letterData, version = 1) {
        const stmt = this.db.prepare(`
            INSERT INTO cover_letters (id, user_id, job_id, resume_id, name, type, data, version)
            VALUES (?, ?, ?, ?, ?, ?, json(?), ?)
            ON CONFLICT(id) DO UPDATE SET
                job_id = excluded.job_id,
                resume_id = excluded.resume_id,
                name = excluded.name,
                type = excluded.type,
                data = json(excluded.data),
                version = excluded.version,
                last_modified = CURRENT_TIMESTAMP,
                deleted = 0,
                deleted_at = NULL
            WHERE user_id = excluded.user_id
        `);

        return stmt.run(
            letterId,
            userId,
            letterData.jobId || null,
            letterData.resumeId || null,
            letterData.name || 'Untitled',
            letterData.type || 'cover_letter',
            JSON.stringify(letterData),
            version
        );
    }

    /**
     * Get cover letters modified after a certain timestamp
     */
    getCoverLettersModifiedAfter(userId, timestamp) {
        const stmt = this.db.prepare(`
            SELECT id, job_id, resume_id, name, type, data, version, last_modified, created_at, deleted, deleted_at
            FROM cover_letters
            WHERE user_id = ? AND last_modified > ?
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId, timestamp);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get all cover letters for a user
     */
    getCoverLetters(userId) {
        const stmt = this.db.prepare(`
            SELECT id, job_id, resume_id, name, type, data, version, last_modified, created_at
            FROM cover_letters
            WHERE user_id = ? AND deleted = 0
            ORDER BY last_modified DESC
        `);
        const results = stmt.all(userId);
        return results.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    // ==================== SETTINGS OPERATIONS ====================

    /**
     * Create or update settings
     */
    upsertSettings(userId, settingsData) {
        const stmt = this.db.prepare(`
            INSERT INTO settings (user_id, data)
            VALUES (?, json(?))
            ON CONFLICT(user_id) DO UPDATE SET
                data = json(excluded.data),
                last_modified = CURRENT_TIMESTAMP
        `);

        return stmt.run(userId, JSON.stringify(settingsData));
    }

    /**
     * Get settings for a user
     */
    getSettings(userId) {
        const stmt = this.db.prepare('SELECT data, last_modified FROM settings WHERE user_id = ?');
        const result = stmt.get(userId);
        if (result && result.data) {
            result.data = JSON.parse(result.data);
        }
        return result;
    }

    // ==================== SYNC OPERATIONS ====================

    /**
     * Get all changes for a user since a timestamp
     */
    getChangesSince(userId, timestamp) {
        return {
            jobs: this.getJobsModifiedAfter(userId, timestamp),
            resumes: this.getResumesModifiedAfter(userId, timestamp),
            coverLetters: this.getCoverLettersModifiedAfter(userId, timestamp)
        };
    }

    /**
     * Batch upsert entities (with transaction)
     */
    batchUpsert(userId, entities) {
        const transaction = this.db.transaction((userId, entities) => {
            const results = {
                jobs: { success: 0, failed: 0 },
                resumes: { success: 0, failed: 0 },
                coverLetters: { success: 0, failed: 0 },
                errors: []
            };

            // Upsert jobs
            if (entities.jobs && Array.isArray(entities.jobs)) {
                for (const job of entities.jobs) {
                    try {
                        if (job.deleted) {
                            this.deleteJob(userId, job.id);
                        } else {
                            this.upsertJob(userId, job.id, job.data, job.version || 1);
                        }
                        results.jobs.success++;
                    } catch (error) {
                        results.jobs.failed++;
                        results.errors.push({ entity: 'job', id: job.id, error: error.message });
                    }
                }
            }

            // Upsert resumes
            if (entities.resumes && Array.isArray(entities.resumes)) {
                for (const resume of entities.resumes) {
                    try {
                        if (resume.deleted) {
                            this.deleteResume(userId, resume.id);
                        } else {
                            this.upsertResume(userId, resume.id, resume.data, resume.version || 1);
                        }
                        results.resumes.success++;
                    } catch (error) {
                        results.resumes.failed++;
                        results.errors.push({ entity: 'resume', id: resume.id, error: error.message });
                    }
                }
            }

            // Upsert cover letters
            if (entities.coverLetters && Array.isArray(entities.coverLetters)) {
                for (const letter of entities.coverLetters) {
                    try {
                        if (letter.deleted) {
                            const stmt = this.db.prepare(`
                                UPDATE cover_letters
                                SET deleted = 1, deleted_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
                                WHERE id = ? AND user_id = ?
                            `);
                            stmt.run(letter.id, userId);
                        } else {
                            this.upsertCoverLetter(userId, letter.id, letter.data, letter.version || 1);
                        }
                        results.coverLetters.success++;
                    } catch (error) {
                        results.coverLetters.failed++;
                        results.errors.push({ entity: 'coverLetter', id: letter.id, error: error.message });
                    }
                }
            }

            return results;
        });

        return transaction(userId, entities);
    }

    // ==================== CONFLICT LOGGING ====================

    /**
     * Log a conflict
     */
    logConflict(userId, entityType, entityId, clientVersion, serverVersion, clientModified, serverModified) {
        const stmt = this.db.prepare(`
            INSERT INTO conflict_log (
                user_id, entity_type, entity_id,
                client_version, server_version,
                client_modified, server_modified,
                resolution
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'unresolved')
        `);

        return stmt.run(userId, entityType, entityId, clientVersion, serverVersion, clientModified, serverModified);
    }

    /**
     * Resolve a conflict
     */
    resolveConflict(conflictId, resolution, resolvedBy) {
        const stmt = this.db.prepare(`
            UPDATE conflict_log
            SET resolution = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
            WHERE id = ?
        `);

        return stmt.run(resolution, resolvedBy, conflictId);
    }

    // ==================== UTILITY OPERATIONS ====================

    /**
     * Get database statistics
     */
    getStats(userId = null) {
        if (userId) {
            const stmt = this.db.prepare(`
                SELECT
                    (SELECT COUNT(*) FROM jobs WHERE user_id = ? AND deleted = 0) as jobs,
                    (SELECT COUNT(*) FROM resumes WHERE user_id = ? AND deleted = 0) as resumes,
                    (SELECT COUNT(*) FROM cover_letters WHERE user_id = ? AND deleted = 0) as cover_letters,
                    (SELECT COUNT(*) FROM activity_logs WHERE user_id = ?) as logs,
                    (SELECT COUNT(*) FROM ai_history WHERE user_id = ?) as ai_history
            `);
            return stmt.get(userId, userId, userId, userId, userId);
        } else {
            const stmt = this.db.prepare(`
                SELECT
                    (SELECT COUNT(*) FROM users) as users,
                    (SELECT COUNT(*) FROM jobs WHERE deleted = 0) as jobs,
                    (SELECT COUNT(*) FROM resumes WHERE deleted = 0) as resumes,
                    (SELECT COUNT(*) FROM cover_letters WHERE deleted = 0) as cover_letters
            `);
            return stmt.get();
        }
    }

    /**
     * Vacuum database (cleanup and optimize)
     */
    vacuum() {
        this.db.exec('VACUUM');
    }
}

// Export singleton instance
let instance = null;

module.exports = {
    DatabaseService,
    getInstance: (dbPath = null) => {
        if (!instance) {
            instance = new DatabaseService(dbPath);
        }
        return instance;
    }
};
