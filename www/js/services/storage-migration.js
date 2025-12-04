// storage-migration.js - Migration utility for moving from localStorage to IndexedDB
// Handles safe migration with rollback capabilities

/**
 * Storage Migration Service
 * Migrates data from localStorage to IndexedDB
 */
class StorageMigration {
    constructor() {
        this.idbService = window.indexedDBService;
        this.migrationKey = 'storage_migration_status';
    }

    /**
     * Check if migration has been completed
     * @returns {Promise<boolean>}
     */
    async isMigrationComplete() {
        try {
            const status = await this.idbService.getMetadata(this.migrationKey);
            return status && status.completed === true;
        } catch (error) {
            console.error('Error checking migration status:', error);
            return false;
        }
    }

    /**
     * Get migration status details
     * @returns {Promise<Object>}
     */
    async getMigrationStatus() {
        try {
            const status = await this.idbService.getMetadata(this.migrationKey);
            return status || {
                completed: false,
                inProgress: false,
                lastAttempt: null,
                error: null
            };
        } catch (error) {
            console.error('Error getting migration status:', error);
            return {
                completed: false,
                inProgress: false,
                error: error.message
            };
        }
    }

    /**
     * Migrate all data from localStorage to IndexedDB
     * @param {Object} options - Migration options
     * @returns {Promise<Object>} - Migration results
     */
    async migrate(options = {}) {
        const {
            clearLocalStorageAfter = false,
            backupLocalStorage = true,
            force = false
        } = options;

        // Check if migration already completed
        const isComplete = await this.isMigrationComplete();
        if (isComplete && !force) {
            console.log('Migration already completed. Use force:true to re-migrate.');
            return {
                success: true,
                skipped: true,
                message: 'Migration already completed'
            };
        }

        // Mark migration as in progress
        await this.idbService.saveMetadata(this.migrationKey, {
            completed: false,
            inProgress: true,
            startedAt: new Date().toISOString()
        });

        const results = {
            success: false,
            jobs: { migrated: 0, failed: 0, errors: [] },
            resumes: { migrated: 0, failed: 0, errors: [] },
            letters: { migrated: 0, failed: 0, errors: [] },
            settings: { migrated: 0, failed: 0, errors: [] },
            backup: null,
            startTime: Date.now(),
            endTime: null
        };

        try {
            console.log('🔄 Starting migration from localStorage to IndexedDB...');

            // Backup localStorage if requested
            if (backupLocalStorage) {
                results.backup = this.backupLocalStorage();
                console.log('✅ Created localStorage backup');
            }

            // Migrate jobs
            await this.migrateJobs(results);

            // Migrate resumes
            await this.migrateResumes(results);

            // Migrate letters
            await this.migrateLetters(results);

            // Migrate settings
            await this.migrateSettings(results);

            // Mark migration as complete
            await this.idbService.saveMetadata(this.migrationKey, {
                completed: true,
                inProgress: false,
                completedAt: new Date().toISOString(),
                results: results
            });

            results.success = true;
            results.endTime = Date.now();

            console.log('✅ Migration completed successfully!');
            console.log('Migration results:', results);

            // Clear localStorage if requested
            if (clearLocalStorageAfter) {
                this.clearMigratedData();
                console.log('🗑️ Cleared localStorage after successful migration');
            }

            return results;

        } catch (error) {
            console.error('❌ Migration failed:', error);

            // Mark migration as failed
            await this.idbService.saveMetadata(this.migrationKey, {
                completed: false,
                inProgress: false,
                failedAt: new Date().toISOString(),
                error: error.message
            });

            results.success = false;
            results.error = error.message;
            results.endTime = Date.now();

            throw error;
        }
    }

    /**
     * Migrate jobs from localStorage to IndexedDB
     * @param {Object} results - Results object to update
     */
    async migrateJobs(results) {
        try {
            const jobsJson = localStorage.getItem('jobs');
            if (!jobsJson) {
                console.log('No jobs found in localStorage');
                return;
            }

            const jobs = JSON.parse(jobsJson);
            if (!Array.isArray(jobs) || jobs.length === 0) {
                console.log('No jobs to migrate');
                return;
            }

            console.log(`Migrating ${jobs.length} jobs...`);

            for (const job of jobs) {
                try {
                    await this.idbService.saveJob(job);
                    results.jobs.migrated++;
                } catch (error) {
                    results.jobs.failed++;
                    results.jobs.errors.push({
                        id: job.id,
                        error: error.message
                    });
                    console.error(`Failed to migrate job ${job.id}:`, error);
                }
            }

            console.log(`✅ Migrated ${results.jobs.migrated} jobs (${results.jobs.failed} failed)`);

        } catch (error) {
            console.error('Error migrating jobs:', error);
            throw error;
        }
    }

    /**
     * Migrate resumes from localStorage to IndexedDB
     * @param {Object} results - Results object to update
     */
    async migrateResumes(results) {
        try {
            const resumesJson = localStorage.getItem('resumes');
            if (!resumesJson) {
                console.log('No resumes found in localStorage');
                return;
            }

            const resumes = JSON.parse(resumesJson);
            if (!Array.isArray(resumes) || resumes.length === 0) {
                console.log('No resumes to migrate');
                return;
            }

            console.log(`Migrating ${resumes.length} resumes...`);

            for (const resume of resumes) {
                try {
                    await this.idbService.saveResume(resume);
                    results.resumes.migrated++;
                } catch (error) {
                    results.resumes.failed++;
                    results.resumes.errors.push({
                        id: resume.id,
                        error: error.message
                    });
                    console.error(`Failed to migrate resume ${resume.id}:`, error);
                }
            }

            console.log(`✅ Migrated ${results.resumes.migrated} resumes (${results.resumes.failed} failed)`);

        } catch (error) {
            console.error('Error migrating resumes:', error);
            throw error;
        }
    }

    /**
     * Migrate cover letters from localStorage to IndexedDB
     * @param {Object} results - Results object to update
     */
    async migrateLetters(results) {
        try {
            const lettersJson = localStorage.getItem('letters');
            if (!lettersJson) {
                console.log('No letters found in localStorage');
                return;
            }

            const letters = JSON.parse(lettersJson);
            if (!Array.isArray(letters) || letters.length === 0) {
                console.log('No letters to migrate');
                return;
            }

            console.log(`Migrating ${letters.length} letters...`);

            for (const letter of letters) {
                try {
                    await this.idbService.saveLetter(letter);
                    results.letters.migrated++;
                } catch (error) {
                    results.letters.failed++;
                    results.letters.errors.push({
                        id: letter.id,
                        error: error.message
                    });
                    console.error(`Failed to migrate letter ${letter.id}:`, error);
                }
            }

            console.log(`✅ Migrated ${results.letters.migrated} letters (${results.letters.failed} failed)`);

        } catch (error) {
            console.error('Error migrating letters:', error);
            throw error;
        }
    }

    /**
     * Migrate settings from localStorage to IndexedDB
     * @param {Object} results - Results object to update
     */
    async migrateSettings(results) {
        try {
            const settingsKeys = ['userSettings', 'appSettings', 'preferences'];

            for (const key of settingsKeys) {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        await this.idbService.saveSetting(key, parsed);
                        results.settings.migrated++;
                    } catch (error) {
                        results.settings.failed++;
                        results.settings.errors.push({
                            key: key,
                            error: error.message
                        });
                        console.error(`Failed to migrate setting ${key}:`, error);
                    }
                }
            }

            if (results.settings.migrated > 0) {
                console.log(`✅ Migrated ${results.settings.migrated} settings (${results.settings.failed} failed)`);
            }

        } catch (error) {
            console.error('Error migrating settings:', error);
        }
    }

    /**
     * Backup localStorage data
     * @returns {Object} - Backup data
     */
    backupLocalStorage() {
        const backup = {
            jobs: localStorage.getItem('jobs'),
            resumes: localStorage.getItem('resumes'),
            letters: localStorage.getItem('letters'),
            userSettings: localStorage.getItem('userSettings'),
            appSettings: localStorage.getItem('appSettings'),
            preferences: localStorage.getItem('preferences'),
            timestamp: new Date().toISOString()
        };

        // Store backup in sessionStorage temporarily
        try {
            sessionStorage.setItem('localStorage_backup', JSON.stringify(backup));
        } catch (error) {
            console.warn('Could not save backup to sessionStorage:', error);
        }

        return backup;
    }

    /**
     * Restore from backup
     * @param {Object} backup - Backup data
     */
    restoreFromBackup(backup) {
        if (!backup) {
            console.error('No backup data provided');
            return false;
        }

        try {
            Object.keys(backup).forEach(key => {
                if (backup[key] && key !== 'timestamp') {
                    localStorage.setItem(key, backup[key]);
                }
            });

            console.log('✅ Restored from backup');
            return true;

        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Clear migrated data from localStorage
     */
    clearMigratedData() {
        const keysToRemove = ['jobs', 'resumes', 'letters', 'userSettings', 'appSettings', 'preferences'];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('Cleared migrated data from localStorage');
    }

    /**
     * Get localStorage size estimate
     * @returns {Object}
     */
    getLocalStorageSize() {
        let total = 0;
        const sizes = {};

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const size = value ? value.length * 2 : 0; // UTF-16 encoding
                sizes[key] = size;
                total += size;
            }
        }

        return {
            total: total,
            totalKB: (total / 1024).toFixed(2),
            totalMB: (total / 1024 / 1024).toFixed(2),
            items: sizes
        };
    }

    /**
     * Check if migration is needed
     * @returns {Promise<boolean>}
     */
    async needsMigration() {
        const isComplete = await this.isMigrationComplete();
        if (isComplete) {
            return false;
        }

        // Check if there's data in localStorage
        const hasJobs = !!localStorage.getItem('jobs');
        const hasResumes = !!localStorage.getItem('resumes');
        const hasLetters = !!localStorage.getItem('letters');

        return hasJobs || hasResumes || hasLetters;
    }
}

// Create singleton instance
const storageMigration = new StorageMigration();

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageMigration;
}

// Make available globally
window.StorageMigration = StorageMigration;
window.storageMigration = storageMigration;
