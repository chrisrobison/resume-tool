#!/usr/bin/env node
// migrate-sqlite-to-mysql.js - Migrate data from SQLite to MySQL
// Usage: node server/scripts/migrate-sqlite-to-mysql.js [--dry-run] [--batch-size=100]

const { DatabaseService } = require('../services/db-service');
const { MySQLDatabaseService } = require('../services/mysql-db-service');
const path = require('path');

class DataMigration {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.batchSize = options.batchSize || 100;
        this.sqliteDb = null;
        this.mysqlDb = null;
        this.stats = {
            users: { total: 0, migrated: 0, failed: 0 },
            jobs: { total: 0, migrated: 0, failed: 0 },
            resumes: { total: 0, migrated: 0, failed: 0 },
            coverLetters: { total: 0, migrated: 0, failed: 0 },
            syncSessions: { total: 0, migrated: 0, failed: 0 },
            settings: { total: 0, migrated: 0, failed: 0 },
            aiHistory: { total: 0, migrated: 0, failed: 0 },
            activityLogs: { total: 0, migrated: 0, failed: 0 }
        };
        this.errors = [];
    }

    /**
     * Initialize database connections
     */
    async initialize() {
        console.log('🔄 Initializing database connections...\n');

        // Initialize SQLite (source)
        const sqlitePath = path.join(__dirname, '..', 'db', 'jobtool.db');
        this.sqliteDb = new DatabaseService(sqlitePath);
        await this.sqliteDb.initialize();
        console.log('✅ SQLite connection established');

        // Initialize MySQL (destination)
        this.mysqlDb = new MySQLDatabaseService();
        await this.mysqlDb.initialize();
        console.log('✅ MySQL connection established\n');

        if (this.dryRun) {
            console.log('⚠️  DRY RUN MODE - No data will be written to MySQL\n');
        }
    }

    /**
     * Close database connections
     */
    async close() {
        if (this.sqliteDb) {
            this.sqliteDb.close();
        }
        if (this.mysqlDb) {
            await this.mysqlDb.close();
        }
    }

    /**
     * Migrate all data
     */
    async migrate() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  SQLite → MySQL Migration');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        try {
            await this.initialize();

            // Migrate in order (respecting foreign keys)
            await this.migrateUsers();
            await this.migrateSyncSessions();
            await this.migrateJobs();
            await this.migrateResumes();
            await this.migrateCoverLetters();
            await this.migrateSettings();
            await this.migrateAIHistory();
            await this.migrateActivityLogs();

            await this.close();

            // Print summary
            this.printSummary();

            // Exit with error if there were failures
            const totalFailed = Object.values(this.stats).reduce((sum, s) => sum + s.failed, 0);
            if (totalFailed > 0) {
                console.error('\n❌ Migration completed with errors');
                process.exit(1);
            } else {
                console.log('\n✅ Migration completed successfully!');
                process.exit(0);
            }

        } catch (error) {
            console.error('\n❌ Fatal migration error:', error);
            await this.close();
            process.exit(1);
        }
    }

    /**
     * Migrate users table
     */
    async migrateUsers() {
        console.log('📋 Migrating users...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM users');
        const users = stmt.all();
        this.stats.users.total = users.length;

        for (const user of users) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.createUser(user.id, {
                        email: user.email,
                        passwordHash: user.password_hash,
                        displayName: user.display_name,
                        isAnonymous: user.is_anonymous === 1,
                        subscriptionTier: 'free' // Default to free tier
                    });

                    // Update timestamps
                    await this.mysqlDb.pool.execute(
                        'UPDATE users SET created_at = ?, last_login = ? WHERE id = ?',
                        [user.created_at, user.last_login, user.id]
                    );
                }

                this.stats.users.migrated++;
                process.stdout.write(`\r   ✓ Users: ${this.stats.users.migrated}/${this.stats.users.total}`);

            } catch (error) {
                this.stats.users.failed++;
                this.errors.push({ entity: 'user', id: user.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.users.migrated} users\n`);
    }

    /**
     * Migrate sync sessions
     */
    async migrateSyncSessions() {
        console.log('📋 Migrating sync sessions...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM sync_sessions');
        const sessions = stmt.all();
        this.stats.syncSessions.total = sessions.length;

        for (const session of sessions) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO sync_sessions (user_id, device_id, device_name, last_sync, sync_count, created_at)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            session.user_id,
                            session.device_id,
                            session.device_name,
                            session.last_sync,
                            session.sync_count,
                            session.last_sync // Use last_sync as created_at
                        ]
                    );
                }

                this.stats.syncSessions.migrated++;
                process.stdout.write(`\r   ✓ Sync sessions: ${this.stats.syncSessions.migrated}/${this.stats.syncSessions.total}`);

            } catch (error) {
                this.stats.syncSessions.failed++;
                this.errors.push({ entity: 'sync_session', id: session.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.syncSessions.migrated} sync sessions\n`);
    }

    /**
     * Migrate jobs
     */
    async migrateJobs() {
        console.log('📋 Migrating jobs...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM jobs');
        const jobs = stmt.all();
        this.stats.jobs.total = jobs.length;

        for (const job of jobs) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO jobs (id, user_id, data, version, last_modified, created_at, deleted, deleted_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            job.id,
                            job.user_id,
                            job.data,
                            job.version,
                            job.last_modified,
                            job.created_at,
                            job.deleted === 1,
                            job.deleted_at
                        ]
                    );
                }

                this.stats.jobs.migrated++;
                process.stdout.write(`\r   ✓ Jobs: ${this.stats.jobs.migrated}/${this.stats.jobs.total}`);

            } catch (error) {
                this.stats.jobs.failed++;
                this.errors.push({ entity: 'job', id: job.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.jobs.migrated} jobs\n`);
    }

    /**
     * Migrate resumes
     */
    async migrateResumes() {
        console.log('📋 Migrating resumes...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM resumes');
        const resumes = stmt.all();
        this.stats.resumes.total = resumes.length;

        for (const resume of resumes) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO resumes (id, user_id, name, data, version, last_modified, created_at, deleted, deleted_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            resume.id,
                            resume.user_id,
                            resume.name,
                            resume.data,
                            resume.version,
                            resume.last_modified,
                            resume.created_at,
                            resume.deleted === 1,
                            resume.deleted_at
                        ]
                    );
                }

                this.stats.resumes.migrated++;
                process.stdout.write(`\r   ✓ Resumes: ${this.stats.resumes.migrated}/${this.stats.resumes.total}`);

            } catch (error) {
                this.stats.resumes.failed++;
                this.errors.push({ entity: 'resume', id: resume.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.resumes.migrated} resumes\n`);
    }

    /**
     * Migrate cover letters
     */
    async migrateCoverLetters() {
        console.log('📋 Migrating cover letters...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM cover_letters');
        const letters = stmt.all();
        this.stats.coverLetters.total = letters.length;

        for (const letter of letters) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO cover_letters (id, user_id, job_id, resume_id, name, type, data, version, last_modified, created_at, deleted, deleted_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            letter.id,
                            letter.user_id,
                            letter.job_id,
                            letter.resume_id,
                            letter.name,
                            letter.type,
                            letter.data,
                            letter.version,
                            letter.last_modified,
                            letter.created_at,
                            letter.deleted === 1,
                            letter.deleted_at
                        ]
                    );
                }

                this.stats.coverLetters.migrated++;
                process.stdout.write(`\r   ✓ Cover letters: ${this.stats.coverLetters.migrated}/${this.stats.coverLetters.total}`);

            } catch (error) {
                this.stats.coverLetters.failed++;
                this.errors.push({ entity: 'cover_letter', id: letter.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.coverLetters.migrated} cover letters\n`);
    }

    /**
     * Migrate settings
     */
    async migrateSettings() {
        console.log('📋 Migrating settings...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM settings');
        const settings = stmt.all();
        this.stats.settings.total = settings.length;

        for (const setting of settings) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO settings (user_id, data, last_modified)
                         VALUES (?, ?, ?)`,
                        [setting.user_id, setting.data, setting.last_modified]
                    );
                }

                this.stats.settings.migrated++;
                process.stdout.write(`\r   ✓ Settings: ${this.stats.settings.migrated}/${this.stats.settings.total}`);

            } catch (error) {
                this.stats.settings.failed++;
                this.errors.push({ entity: 'settings', id: setting.user_id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.settings.migrated} settings\n`);
    }

    /**
     * Migrate AI history
     */
    async migrateAIHistory() {
        console.log('📋 Migrating AI history...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM ai_history');
        const history = stmt.all();
        this.stats.aiHistory.total = history.length;

        for (const record of history) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO ai_history (user_id, data, timestamp, operation, provider, deleted)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            record.user_id,
                            record.data,
                            record.timestamp,
                            record.operation,
                            record.provider,
                            record.deleted === 1
                        ]
                    );
                }

                this.stats.aiHistory.migrated++;
                process.stdout.write(`\r   ✓ AI history: ${this.stats.aiHistory.migrated}/${this.stats.aiHistory.total}`);

            } catch (error) {
                this.stats.aiHistory.failed++;
                this.errors.push({ entity: 'ai_history', id: record.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.aiHistory.migrated} AI history records\n`);
    }

    /**
     * Migrate activity logs
     */
    async migrateActivityLogs() {
        console.log('📋 Migrating activity logs...');

        const stmt = this.sqliteDb.db.prepare('SELECT * FROM activity_logs');
        const logs = stmt.all();
        this.stats.activityLogs.total = logs.length;

        for (const log of logs) {
            try {
                if (!this.dryRun) {
                    await this.mysqlDb.pool.execute(
                        `INSERT INTO activity_logs (user_id, data, timestamp, type, action, deleted)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            log.user_id,
                            log.data,
                            log.timestamp,
                            log.type,
                            log.action,
                            log.deleted === 1
                        ]
                    );
                }

                this.stats.activityLogs.migrated++;
                process.stdout.write(`\r   ✓ Activity logs: ${this.stats.activityLogs.migrated}/${this.stats.activityLogs.total}`);

            } catch (error) {
                this.stats.activityLogs.failed++;
                this.errors.push({ entity: 'activity_log', id: log.id, error: error.message });
            }
        }

        console.log(`\n   ✅ Migrated ${this.stats.activityLogs.migrated} activity logs\n`);
    }

    /**
     * Print migration summary
     */
    printSummary() {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Migration Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const entities = [
            'users',
            'syncSessions',
            'jobs',
            'resumes',
            'coverLetters',
            'settings',
            'aiHistory',
            'activityLogs'
        ];

        const labelMap = {
            users: 'Users',
            syncSessions: 'Sync Sessions',
            jobs: 'Jobs',
            resumes: 'Resumes',
            coverLetters: 'Cover Letters',
            settings: 'Settings',
            aiHistory: 'AI History',
            activityLogs: 'Activity Logs'
        };

        let totalMigrated = 0;
        let totalFailed = 0;

        for (const entity of entities) {
            const stat = this.stats[entity];
            const label = labelMap[entity].padEnd(20);
            const status = stat.failed > 0 ? '⚠️' : '✅';
            
            console.log(`${status} ${label} ${stat.migrated}/${stat.total} (${stat.failed} failed)`);
            
            totalMigrated += stat.migrated;
            totalFailed += stat.failed;
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total:                ${totalMigrated} migrated, ${totalFailed} failed`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (this.errors.length > 0) {
            console.log('\n⚠️  Errors:');
            for (const error of this.errors.slice(0, 10)) {
                console.log(`   - ${error.entity} (${error.id}): ${error.error}`);
            }
            if (this.errors.length > 10) {
                console.log(`   ... and ${this.errors.length - 10} more errors`);
            }
        }
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: false,
        batchSize: 100
    };

    for (const arg of args) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg.startsWith('--batch-size=')) {
            options.batchSize = parseInt(arg.split('=')[1], 10);
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
SQLite to MySQL Migration Tool

Usage: node server/scripts/migrate-sqlite-to-mysql.js [options]

Options:
  --dry-run           Run migration without writing to MySQL
  --batch-size=N      Process records in batches of N (default: 100)
  --help, -h          Show this help message

Examples:
  node server/scripts/migrate-sqlite-to-mysql.js
  node server/scripts/migrate-sqlite-to-mysql.js --dry-run
  node server/scripts/migrate-sqlite-to-mysql.js --batch-size=50
            `);
            process.exit(0);
        }
    }

    return options;
}

// Main execution
if (require.main === module) {
    const options = parseArgs();
    const migration = new DataMigration(options);
    migration.migrate();
}

module.exports = DataMigration;
