// mysql-db-service.js - MySQL database service for production
// Handles all database operations with connection pooling and transactions

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class MySQLDatabaseService {
    constructor(config = null) {
        // Default connection config (override with environment variables)
        this.config = config || {
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'jobtool',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            timezone: '+00:00'
        };
        
        this.pool = null;
        this.initialized = false;
    }

    /**
     * Initialize database connection pool and create tables
     */
    async initialize() {
        if (this.initialized) {
            return this;
        }

        try {
            // Create connection pool
            this.pool = mysql.createPool(this.config);

            // Test connection
            const connection = await this.pool.getConnection();
            console.log('✅ MySQL connection successful');
            connection.release();

            // Read and execute schema
            const schemaPath = path.join(__dirname, '..', 'db', 'mysql-schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                
                // Split by semicolons, but handle stored procedures correctly
                const statements = this.splitSQLStatements(schema);
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await this.pool.execute(statement);
                    }
                }
                
                console.log('✅ MySQL schema initialized');
            }

            this.initialized = true;
            return this;

        } catch (error) {
            console.error('❌ MySQL initialization error:', error);
            throw error;
        }
    }

    /**
     * Helper to split SQL statements correctly (handles procedures)
     */
    splitSQLStatements(sql) {
        const statements = [];
        let current = '';
        let inDelimiter = false;
        
        const lines = sql.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Track delimiter changes
            if (trimmed.startsWith('DELIMITER')) {
                inDelimiter = trimmed.includes('//');
                continue;
            }
            
            current += line + '\n';
            
            // Check for statement end
            if (inDelimiter) {
                if (trimmed.endsWith('//')) {
                    statements.push(current);
                    current = '';
                    inDelimiter = false;
                }
            } else {
                if (trimmed.endsWith(';')) {
                    statements.push(current);
                    current = '';
                }
            }
        }
        
        if (current.trim()) {
            statements.push(current);
        }
        
        return statements;
    }

    /**
     * Close database connection pool
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.initialized = false;
            console.log('✅ MySQL connection pool closed');
        }
    }

    /**
     * Get a connection from the pool (for transactions)
     */
    async getConnection() {
        return await this.pool.getConnection();
    }

    // ==================== USER OPERATIONS ====================

    /**
     * Create a new user
     */
    async createUser(userId, { 
        email = null, 
        passwordHash = null, 
        displayName = null, 
        isAnonymous = true,
        subscriptionTier = 'free' 
    } = {}) {
        const [result] = await this.pool.execute(
            `INSERT INTO users (id, email, password_hash, display_name, is_anonymous, subscription_tier)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, passwordHash, displayName, isAnonymous, subscriptionTier]
        );
        return result;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const [rows] = await this.pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        const [rows] = await this.pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    }

    /**
     * Update user's last login timestamp
     */
    async updateLastLogin(userId) {
        const [result] = await this.pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [userId]
        );
        return result;
    }

    /**
     * Update user's subscription tier
     */
    async updateSubscriptionTier(userId, tier, status = 'active') {
        const [result] = await this.pool.execute(
            `UPDATE users 
             SET subscription_tier = ?, 
                 subscription_status = ?,
                 subscription_started_at = IF(subscription_started_at IS NULL, NOW(), subscription_started_at)
             WHERE id = ?`,
            [tier, status, userId]
        );
        return result;
    }

    // ==================== SYNC SESSION OPERATIONS ====================

    /**
     * Create or update sync session
     */
    async upsertSyncSession(userId, deviceId, deviceName = null) {
        const [result] = await this.pool.execute(
            `INSERT INTO sync_sessions (user_id, device_id, device_name, last_sync, sync_count)
             VALUES (?, ?, ?, NOW(), 1)
             ON DUPLICATE KEY UPDATE
                 last_sync = NOW(),
                 sync_count = sync_count + 1,
                 device_name = COALESCE(VALUES(device_name), device_name)`,
            [userId, deviceId, deviceName]
        );
        return result;
    }

    /**
     * Get sync sessions for a user
     */
    async getSyncSessions(userId) {
        const [rows] = await this.pool.execute(
            'SELECT * FROM sync_sessions WHERE user_id = ? ORDER BY last_sync DESC',
            [userId]
        );
        return rows;
    }

    /**
     * Get last sync time for a user and device
     */
    async getLastSyncTime(userId, deviceId) {
        const [rows] = await this.pool.execute(
            'SELECT last_sync FROM sync_sessions WHERE user_id = ? AND device_id = ?',
            [userId, deviceId]
        );
        return rows[0]?.last_sync || null;
    }

    // ==================== JOB OPERATIONS ====================

    /**
     * Create or update a job
     */
    async upsertJob(userId, jobId, jobData, version = 1) {
        const [result] = await this.pool.execute(
            `INSERT INTO jobs (id, user_id, data, version, last_modified, created_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                 data = VALUES(data),
                 version = VALUES(version),
                 last_modified = NOW(),
                 deleted = FALSE,
                 deleted_at = NULL`,
            [jobId, userId, JSON.stringify(jobData), version]
        );
        return result;
    }

    /**
     * Get job by ID
     */
    async getJob(userId, jobId) {
        const [rows] = await this.pool.execute(
            `SELECT id, data, version, last_modified, created_at, deleted
             FROM jobs
             WHERE id = ? AND user_id = ? AND deleted = FALSE`,
            [jobId, userId]
        );
        
        if (rows[0] && rows[0].data) {
            rows[0].data = JSON.parse(rows[0].data);
        }
        
        return rows[0] || null;
    }

    /**
     * Get all jobs for a user (not deleted)
     */
    async getJobs(userId) {
        const [rows] = await this.pool.execute(
            `SELECT id, data, version, last_modified, created_at
             FROM jobs
             WHERE user_id = ? AND deleted = FALSE
             ORDER BY last_modified DESC`,
            [userId]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get jobs modified after a certain timestamp
     */
    async getJobsModifiedAfter(userId, timestamp) {
        const [rows] = await this.pool.execute(
            `SELECT id, data, version, last_modified, created_at, deleted, deleted_at
             FROM jobs
             WHERE user_id = ? AND last_modified > ?
             ORDER BY last_modified DESC`,
            [userId, timestamp]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Soft delete a job
     */
    async deleteJob(userId, jobId) {
        const [result] = await this.pool.execute(
            `UPDATE jobs
             SET deleted = TRUE, deleted_at = NOW(), last_modified = NOW()
             WHERE id = ? AND user_id = ?`,
            [jobId, userId]
        );
        return result;
    }

    /**
     * Hard delete a job (permanent)
     */
    async hardDeleteJob(userId, jobId) {
        const [result] = await this.pool.execute(
            'DELETE FROM jobs WHERE id = ? AND user_id = ?',
            [jobId, userId]
        );
        return result;
    }

    /**
     * Get job count for user (for tier enforcement)
     */
    async getJobCount(userId) {
        const [rows] = await this.pool.execute(
            'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND deleted = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    // ==================== RESUME OPERATIONS ====================

    /**
     * Create or update a resume
     */
    async upsertResume(userId, resumeId, resumeData, version = 1) {
        const name = resumeData.name || resumeData.basics?.name || 'Untitled Resume';

        const [result] = await this.pool.execute(
            `INSERT INTO resumes (id, user_id, name, data, version, last_modified, created_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                 name = VALUES(name),
                 data = VALUES(data),
                 version = VALUES(version),
                 last_modified = NOW(),
                 deleted = FALSE,
                 deleted_at = NULL`,
            [resumeId, userId, name, JSON.stringify(resumeData), version]
        );
        return result;
    }

    /**
     * Get resume by ID
     */
    async getResume(userId, resumeId) {
        const [rows] = await this.pool.execute(
            `SELECT id, name, data, version, last_modified, created_at, deleted
             FROM resumes
             WHERE id = ? AND user_id = ? AND deleted = FALSE`,
            [resumeId, userId]
        );
        
        if (rows[0] && rows[0].data) {
            rows[0].data = JSON.parse(rows[0].data);
        }
        
        return rows[0] || null;
    }

    /**
     * Get all resumes for a user
     */
    async getResumes(userId) {
        const [rows] = await this.pool.execute(
            `SELECT id, name, data, version, last_modified, created_at
             FROM resumes
             WHERE user_id = ? AND deleted = FALSE
             ORDER BY last_modified DESC`,
            [userId]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get resumes modified after a certain timestamp
     */
    async getResumesModifiedAfter(userId, timestamp) {
        const [rows] = await this.pool.execute(
            `SELECT id, name, data, version, last_modified, created_at, deleted, deleted_at
             FROM resumes
             WHERE user_id = ? AND last_modified > ?
             ORDER BY last_modified DESC`,
            [userId, timestamp]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Soft delete a resume
     */
    async deleteResume(userId, resumeId) {
        const [result] = await this.pool.execute(
            `UPDATE resumes
             SET deleted = TRUE, deleted_at = NOW(), last_modified = NOW()
             WHERE id = ? AND user_id = ?`,
            [resumeId, userId]
        );
        return result;
    }

    /**
     * Get resume count for user (for tier enforcement)
     */
    async getResumeCount(userId) {
        const [rows] = await this.pool.execute(
            'SELECT COUNT(*) as count FROM resumes WHERE user_id = ? AND deleted = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    // ==================== COVER LETTER OPERATIONS ====================

    /**
     * Create or update a cover letter
     */
    async upsertCoverLetter(userId, letterId, letterData, version = 1) {
        const [result] = await this.pool.execute(
            `INSERT INTO cover_letters (id, user_id, job_id, resume_id, name, type, data, version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 job_id = VALUES(job_id),
                 resume_id = VALUES(resume_id),
                 name = VALUES(name),
                 type = VALUES(type),
                 data = VALUES(data),
                 version = VALUES(version),
                 last_modified = NOW(),
                 deleted = FALSE,
                 deleted_at = NULL`,
            [
                letterId,
                userId,
                letterData.jobId || null,
                letterData.resumeId || null,
                letterData.name || 'Untitled',
                letterData.type || 'cover_letter',
                JSON.stringify(letterData),
                version
            ]
        );
        return result;
    }

    /**
     * Get cover letters modified after a certain timestamp
     */
    async getCoverLettersModifiedAfter(userId, timestamp) {
        const [rows] = await this.pool.execute(
            `SELECT id, job_id, resume_id, name, type, data, version, last_modified, created_at, deleted, deleted_at
             FROM cover_letters
             WHERE user_id = ? AND last_modified > ?
             ORDER BY last_modified DESC`,
            [userId, timestamp]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    /**
     * Get all cover letters for a user
     */
    async getCoverLetters(userId) {
        const [rows] = await this.pool.execute(
            `SELECT id, job_id, resume_id, name, type, data, version, last_modified, created_at
             FROM cover_letters
             WHERE user_id = ? AND deleted = FALSE
             ORDER BY last_modified DESC`,
            [userId]
        );
        
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data)
        }));
    }

    // ==================== SETTINGS OPERATIONS ====================

    /**
     * Create or update settings
     */
    async upsertSettings(userId, settingsData) {
        const [result] = await this.pool.execute(
            `INSERT INTO settings (user_id, data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
                 data = VALUES(data),
                 last_modified = NOW()`,
            [userId, JSON.stringify(settingsData)]
        );
        return result;
    }

    /**
     * Get settings for a user
     */
    async getSettings(userId) {
        const [rows] = await this.pool.execute(
            'SELECT data, last_modified FROM settings WHERE user_id = ?',
            [userId]
        );
        
        if (rows[0] && rows[0].data) {
            rows[0].data = JSON.parse(rows[0].data);
        }
        
        return rows[0] || null;
    }

    // ==================== SYNC OPERATIONS ====================

    /**
     * Get all changes for a user since a timestamp
     */
    async getChangesSince(userId, timestamp) {
        return {
            jobs: await this.getJobsModifiedAfter(userId, timestamp),
            resumes: await this.getResumesModifiedAfter(userId, timestamp),
            coverLetters: await this.getCoverLettersModifiedAfter(userId, timestamp)
        };
    }

    /**
     * Batch upsert entities (with transaction)
     */
    async batchUpsert(userId, entities) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
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
                            await this.deleteJob(userId, job.id);
                        } else {
                            await this.upsertJob(userId, job.id, job.data, job.version || 1);
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
                            await this.deleteResume(userId, resume.id);
                        } else {
                            await this.upsertResume(userId, resume.id, resume.data, resume.version || 1);
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
                            await connection.execute(
                                `UPDATE cover_letters
                                 SET deleted = TRUE, deleted_at = NOW(), last_modified = NOW()
                                 WHERE id = ? AND user_id = ?`,
                                [letter.id, userId]
                            );
                        } else {
                            await this.upsertCoverLetter(userId, letter.id, letter.data, letter.version || 1);
                        }
                        results.coverLetters.success++;
                    } catch (error) {
                        results.coverLetters.failed++;
                        results.errors.push({ entity: 'coverLetter', id: letter.id, error: error.message });
                    }
                }
            }

            await connection.commit();
            return results;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ==================== USAGE TRACKING ====================

    /**
     * Get or create usage tracking for user
     */
    async getUsageTracking(userId) {
        let [rows] = await this.pool.execute(
            'SELECT * FROM usage_tracking WHERE user_id = ?',
            [userId]
        );
        
        if (!rows[0]) {
            // Create initial usage tracking
            await this.pool.execute(
                'INSERT INTO usage_tracking (user_id) VALUES (?)',
                [userId]
            );
            [rows] = await this.pool.execute(
                'SELECT * FROM usage_tracking WHERE user_id = ?',
                [userId]
            );
        }
        
        return rows[0];
    }

    /**
     * Update usage counts
     */
    async updateUsageCounts(userId) {
        const jobCount = await this.getJobCount(userId);
        const resumeCount = await this.getResumeCount(userId);
        
        const [result] = await this.pool.execute(
            `UPDATE usage_tracking
             SET jobs_count = ?,
                 resumes_count = ?
             WHERE user_id = ?`,
            [jobCount, resumeCount, userId]
        );
        
        return result;
    }

    /**
     * Check if user can create more jobs (tier enforcement)
     */
    async canCreateJob(userId) {
        const usage = await this.getUsageTracking(userId);
        
        // -1 means unlimited
        if (usage.jobs_limit === -1) {
            return true;
        }
        
        return usage.jobs_count < usage.jobs_limit;
    }

    /**
     * Check if user can create more resumes (tier enforcement)
     */
    async canCreateResume(userId) {
        const usage = await this.getUsageTracking(userId);
        
        // -1 means unlimited
        if (usage.resumes_limit === -1) {
            return true;
        }
        
        return usage.resumes_count < usage.resumes_limit;
    }

    // ==================== SUBSCRIPTION OPERATIONS ====================

    /**
     * Create a subscription record
     */
    async createSubscription(userId, subscriptionData) {
        const [result] = await this.pool.execute(
            `INSERT INTO subscriptions (
                user_id, tier, status, stripe_subscription_id, stripe_customer_id,
                stripe_price_id, billing_cycle, amount_cents, currency,
                started_at, current_period_start, current_period_end
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                subscriptionData.tier,
                subscriptionData.status,
                subscriptionData.stripeSubscriptionId,
                subscriptionData.stripeCustomerId,
                subscriptionData.stripePriceId,
                subscriptionData.billingCycle || 'monthly',
                subscriptionData.amountCents,
                subscriptionData.currency || 'USD',
                subscriptionData.startedAt || new Date(),
                subscriptionData.currentPeriodStart,
                subscriptionData.currentPeriodEnd
            ]
        );
        return result;
    }

    /**
     * Get active subscription for user
     */
    async getActiveSubscription(userId) {
        const [rows] = await this.pool.execute(
            `SELECT * FROM subscriptions
             WHERE user_id = ? AND status = 'active' AND ended_at IS NULL
             ORDER BY started_at DESC
             LIMIT 1`,
            [userId]
        );
        return rows[0] || null;
    }

    /**
     * Update subscription status
     */
    async updateSubscriptionStatus(stripeSubscriptionId, status, updates = {}) {
        const fields = ['status = ?'];
        const values = [status];
        
        if (updates.canceledAt) {
            fields.push('canceled_at = ?');
            values.push(updates.canceledAt);
        }
        
        if (updates.endedAt) {
            fields.push('ended_at = ?');
            values.push(updates.endedAt);
        }
        
        if (updates.currentPeriodEnd) {
            fields.push('current_period_end = ?');
            values.push(updates.currentPeriodEnd);
        }
        
        values.push(stripeSubscriptionId);
        
        const [result] = await this.pool.execute(
            `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = ?`,
            values
        );
        
        return result;
    }

    // ==================== PAYMENT OPERATIONS ====================

    /**
     * Record a payment transaction
     */
    async createPaymentTransaction(userId, transactionData) {
        const [result] = await this.pool.execute(
            `INSERT INTO payment_transactions (
                user_id, subscription_id, stripe_payment_intent_id, stripe_charge_id,
                stripe_invoice_id, amount_cents, currency, status, payment_method, description
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                transactionData.subscriptionId || null,
                transactionData.stripePaymentIntentId,
                transactionData.stripeChargeId || null,
                transactionData.stripeInvoiceId || null,
                transactionData.amountCents,
                transactionData.currency || 'USD',
                transactionData.status,
                transactionData.paymentMethod || null,
                transactionData.description || null
            ]
        );
        return result;
    }

    /**
     * Get payment history for user
     */
    async getPaymentHistory(userId, limit = 50) {
        const [rows] = await this.pool.execute(
            `SELECT * FROM payment_transactions
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    // ==================== UTILITY OPERATIONS ====================

    /**
     * Get database statistics
     */
    async getStats(userId = null) {
        if (userId) {
            const [rows] = await this.pool.execute(
                `SELECT
                    (SELECT COUNT(*) FROM jobs WHERE user_id = ? AND deleted = FALSE) as jobs,
                    (SELECT COUNT(*) FROM resumes WHERE user_id = ? AND deleted = FALSE) as resumes,
                    (SELECT COUNT(*) FROM cover_letters WHERE user_id = ? AND deleted = FALSE) as cover_letters,
                    (SELECT COUNT(*) FROM activity_logs WHERE user_id = ?) as logs,
                    (SELECT COUNT(*) FROM ai_history WHERE user_id = ?) as ai_history`,
                [userId, userId, userId, userId, userId]
            );
            return rows[0];
        } else {
            const [rows] = await this.pool.execute(
                `SELECT
                    (SELECT COUNT(*) FROM users) as users,
                    (SELECT COUNT(*) FROM jobs WHERE deleted = FALSE) as jobs,
                    (SELECT COUNT(*) FROM resumes WHERE deleted = FALSE) as resumes,
                    (SELECT COUNT(*) FROM cover_letters WHERE deleted = FALSE) as cover_letters`
            );
            return rows[0];
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const [rows] = await this.pool.execute('SELECT 1 as health');
            return rows[0].health === 1;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
let instance = null;

module.exports = {
    MySQLDatabaseService,
    getInstance: (config = null) => {
        if (!instance) {
            instance = new MySQLDatabaseService(config);
        }
        return instance;
    }
};
