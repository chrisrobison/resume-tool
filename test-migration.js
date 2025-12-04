// test-migration.js - Comprehensive test script for IndexedDB migration and extension sync
// Copy and paste this entire script into the browser console at localhost:3000

(async function testMigrationAndSync() {
    console.log('='.repeat(60));
    console.log('🧪 TESTING INDEXEDDB MIGRATION & EXTENSION SYNC');
    console.log('='.repeat(60));

    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };

    function test(name, fn) {
        return async function() {
            try {
                console.log(`\n▶️  ${name}`);
                const result = await fn();
                if (result.pass) {
                    console.log(`✅ PASS: ${name}`);
                    results.passed++;
                } else if (result.warning) {
                    console.warn(`⚠️  WARNING: ${name}`, result.message);
                    results.warnings++;
                } else {
                    console.error(`❌ FAIL: ${name}`, result.message);
                    results.failed++;
                }
                results.tests.push({ name, ...result });
                return result;
            } catch (error) {
                console.error(`❌ ERROR: ${name}`, error);
                results.failed++;
                results.tests.push({ name, pass: false, error: error.message });
                return { pass: false, error: error.message };
            }
        };
    }

    // Test 1: Check if services are loaded
    await test('Services Loaded', async () => {
        const services = {
            indexedDBService: typeof window.indexedDBService !== 'undefined',
            storageMigration: typeof window.storageMigration !== 'undefined',
            extensionSync: typeof window.extensionSync !== 'undefined',
            globalStore: typeof window.globalStore !== 'undefined'
        };

        console.log('Services:', services);

        if (!services.indexedDBService) {
            return { pass: false, message: 'indexedDBService not loaded' };
        }
        if (!services.storageMigration) {
            return { pass: false, message: 'storageMigration not loaded' };
        }

        return { pass: true, data: services };
    })();

    // Test 2: Check IndexedDB initialization
    await test('IndexedDB Initialization', async () => {
        await window.indexedDBService.init();
        const isInit = window.indexedDBService.isInitialized;
        console.log('IndexedDB Initialized:', isInit);

        if (!isInit) {
            return { pass: false, message: 'IndexedDB failed to initialize' };
        }

        return { pass: true };
    })();

    // Test 3: Check migration status
    await test('Migration Status', async () => {
        const status = await window.storageMigration.getMigrationStatus();
        console.log('Migration Status:', status);

        if (!status) {
            return { pass: false, message: 'Could not get migration status' };
        }

        if (status.completed) {
            console.log(`✓ Migration completed at ${status.completedAt}`);
        } else if (status.inProgress) {
            console.log('⏳ Migration in progress...');
        } else {
            console.log('⚪ Migration not yet run');
        }

        return { pass: true, data: status };
    })();

    // Test 4: Check database stats
    await test('Database Statistics', async () => {
        const stats = await window.indexedDBService.getStats();
        console.log('Database Stats:', stats);

        if (!stats) {
            return { pass: false, message: 'Could not get database stats' };
        }

        console.log(`📊 Jobs: ${stats.jobs}, Resumes: ${stats.resumes}, Letters: ${stats.letters}`);

        return { pass: true, data: stats };
    })();

    // Test 5: List all jobs
    await test('List Jobs', async () => {
        const jobs = await window.indexedDBService.getJobs();
        console.log(`Found ${jobs.length} jobs:`, jobs);

        // Show first 3 jobs with details
        if (jobs.length > 0) {
            console.log('\n📝 Job Details:');
            jobs.slice(0, 3).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title} at ${job.company}`);
                console.log(`     Status: ${job.status}, Source: ${job.source || 'manual'}`);
                console.log(`     Created: ${job.createdAt}`);
            });
        }

        return { pass: true, data: { count: jobs.length, jobs } };
    })();

    // Test 6: Check localStorage data (for migration comparison)
    await test('Check localStorage', async () => {
        const localJobs = localStorage.getItem('jobs');
        const localResumes = localStorage.getItem('resumes');
        const localLetters = localStorage.getItem('letters');

        let jobCount = 0, resumeCount = 0, letterCount = 0;

        if (localJobs) {
            try {
                const jobs = JSON.parse(localJobs);
                jobCount = Array.isArray(jobs) ? jobs.length : 0;
            } catch (e) {}
        }

        if (localResumes) {
            try {
                const resumes = JSON.parse(localResumes);
                resumeCount = Array.isArray(resumes) ? resumes.length : 0;
            } catch (e) {}
        }

        if (localLetters) {
            try {
                const letters = JSON.parse(localLetters);
                letterCount = Array.isArray(letters) ? letters.length : 0;
            } catch (e) {}
        }

        console.log(`localStorage: ${jobCount} jobs, ${resumeCount} resumes, ${letterCount} letters`);

        if (jobCount > 0 || resumeCount > 0 || letterCount > 0) {
            return {
                warning: true,
                message: 'Data still in localStorage (backup copy)',
                data: { jobs: jobCount, resumes: resumeCount, letters: letterCount }
            };
        }

        return { pass: true, data: { jobs: jobCount, resumes: resumeCount, letters: letterCount } };
    })();

    // Test 7: Check extension bridge
    await test('Extension Bridge Status', async () => {
        const bridgeMarker = document.querySelector('[data-jhm-bridge]');
        const extensionMarker = document.querySelector('[data-jhm-extension]');

        console.log('Bridge Active:', !!bridgeMarker);
        console.log('Extension Detected:', !!extensionMarker);

        if (!bridgeMarker && !extensionMarker) {
            return {
                warning: true,
                message: 'Extension not detected - install and reload extension',
                data: { bridgeActive: false, extensionDetected: false }
            };
        }

        if (extensionMarker && !bridgeMarker) {
            return {
                warning: true,
                message: 'Extension detected but bridge not active - reload page',
                data: { bridgeActive: false, extensionDetected: true }
            };
        }

        return {
            pass: true,
            data: { bridgeActive: !!bridgeMarker, extensionDetected: !!extensionMarker }
        };
    })();

    // Test 8: Check for extension-sourced jobs
    await test('Extension Sync Status', async () => {
        const jobs = await window.indexedDBService.getJobs();
        const extensionJobs = jobs.filter(j => j.source === 'extension');

        console.log(`Extension Jobs: ${extensionJobs.length} of ${jobs.length} total`);

        if (extensionJobs.length > 0) {
            console.log('\n📥 Jobs from Extension:');
            extensionJobs.slice(0, 3).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title} at ${job.company}`);
                console.log(`     Synced: ${job.syncedAt || 'legacy'}`);
            });
        }

        return {
            pass: true,
            data: { extensionJobs: extensionJobs.length, totalJobs: jobs.length }
        };
    })();

    // Test 9: Test saving a new job
    await test('Test Save Job', async () => {
        const testJob = {
            title: 'Test Software Engineer',
            company: 'Test Company',
            location: 'Remote',
            status: 'wishlist',
            description: 'This is a test job created by the test script',
            url: 'https://example.com/test-job-' + Date.now(),
            source: 'test'
        };

        const jobId = await window.indexedDBService.saveJob(testJob);
        console.log('Test job saved with ID:', jobId);

        // Verify it was saved
        const savedJob = await window.indexedDBService.getJob(jobId);
        if (!savedJob) {
            return { pass: false, message: 'Job was not saved correctly' };
        }

        console.log('Verified test job:', savedJob.title);

        // Clean up - delete test job
        await window.indexedDBService.deleteJob(jobId);
        console.log('Test job cleaned up');

        return { pass: true, data: { testJobId: jobId } };
    })();

    // Test 10: Check IndexedDB storage usage
    await test('Storage Usage', async () => {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const used = (estimate.usage / 1024 / 1024).toFixed(2);
            const quota = (estimate.quota / 1024 / 1024).toFixed(2);
            const percent = ((estimate.usage / estimate.quota) * 100).toFixed(2);

            console.log(`Storage: ${used} MB / ${quota} MB (${percent}%)`);

            return {
                pass: true,
                data: {
                    usedMB: used,
                    quotaMB: quota,
                    percentUsed: percent
                }
            };
        } else {
            return {
                warning: true,
                message: 'Storage estimation API not available',
                data: null
            };
        }
    })();

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total Tests: ${results.tests.length}`);

    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Migration and sync are working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Review the errors above.');
    }

    console.log('\n' + '='.repeat(60));

    return results;
})();
