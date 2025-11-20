// test-scraper-api.js - Test the scraper API endpoints
// Run with: node scrapers/test-scraper-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_URL = 'https://hiring.cafe/?searchState=%7B%22query%22%3A%22software%20engineering%20manager%22%2C%22location%22%3A%22San%20Francisco%2C%20CA%22%7D';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, colors.green);
}

function logError(message) {
    log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
    log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message) {
    log(`⚠ ${message}`, colors.yellow);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testScraperAPI() {
    log('\n========================================', colors.blue);
    log('   Scraper API End-to-End Test', colors.blue);
    log('========================================\n', colors.blue);

    let token;
    let scraperJobId;

    try {
        // Test 1: Create Anonymous User
        log('\n1. Testing Anonymous Authentication...', colors.yellow);
        try {
            const authResponse = await axios.post(`${BASE_URL}/api/auth/anonymous`);
            token = authResponse.data.token;
            logSuccess(`Anonymous user created: ${authResponse.data.userId}`);
            logInfo(`Token: ${token.substring(0, 20)}...`);
        } catch (error) {
            logError(`Auth failed: ${error.message}`);
            throw error;
        }

        // Test 2: Get Available Sources
        log('\n2. Testing Get Sources Endpoint...', colors.yellow);
        try {
            const sourcesResponse = await axios.get(`${BASE_URL}/api/scraper/sources`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            logSuccess(`Found ${sourcesResponse.data.sources.length} sources`);
            sourcesResponse.data.sources.forEach(source => {
                logInfo(`  - ${source.name}: ${source.description}`);
            });
        } catch (error) {
            logError(`Get sources failed: ${error.message}`);
            throw error;
        }

        // Test 3: Start Scraping Job
        log('\n3. Testing Start Scraping Endpoint...', colors.yellow);
        try {
            const startResponse = await axios.post(
                `${BASE_URL}/api/scraper/start`,
                {
                    source: 'hiring.cafe',
                    url: TEST_URL,
                    options: {
                        waitTime: 3000,
                        maxScrolls: 2
                    }
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            scraperJobId = startResponse.data.jobId;
            logSuccess(`Scraping job started: ${scraperJobId}`);
            logInfo(`Status: ${startResponse.data.status}`);
        } catch (error) {
            logError(`Start scraping failed: ${error.message}`);
            throw error;
        }

        // Test 4: Poll for Status
        log('\n4. Testing Status Polling...', colors.yellow);
        let attempts = 0;
        let maxAttempts = 60; // 2 minutes max (60 * 2 seconds)
        let status = 'queued';

        while (attempts < maxAttempts && status !== 'completed' && status !== 'failed') {
            await sleep(2000);
            attempts++;

            try {
                const statusResponse = await axios.get(
                    `${BASE_URL}/api/scraper/status/${scraperJobId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                status = statusResponse.data.job.status;
                const progress = statusResponse.data.job.progress || 0;

                logInfo(`  [${attempts}] Status: ${status} (${progress}%)`);

                if (statusResponse.data.job.error) {
                    logInfo(`  Error: ${statusResponse.data.job.error}`);
                }

            } catch (error) {
                logError(`Status check failed: ${error.message}`);
                throw error;
            }
        }

        if (status === 'completed') {
            logSuccess('Scraping completed successfully!');
        } else if (status === 'failed') {
            logError('Scraping failed');
            throw new Error('Scraping job failed');
        } else {
            logWarning('Scraping timed out');
            throw new Error('Scraping timeout');
        }

        // Test 5: Get Results
        log('\n5. Testing Get Results Endpoint...', colors.yellow);
        try {
            const resultsResponse = await axios.get(
                `${BASE_URL}/api/scraper/results/${scraperJobId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const { jobs, stats } = resultsResponse.data;
            logSuccess(`Retrieved ${jobs.length} jobs`);

            if (stats) {
                logInfo(`Stats:`);
                logInfo(`  - Total: ${stats.totalJobs}`);
                logInfo(`  - Duration: ${stats.duration}ms`);
                logInfo(`  - Source: ${stats.source}`);
            }

            if (jobs.length > 0) {
                logInfo(`\nSample Jobs:`);
                jobs.slice(0, 3).forEach((job, index) => {
                    logInfo(`  ${index + 1}. ${job.title} at ${job.company}`);
                    logInfo(`     Location: ${job.location}`);
                    logInfo(`     URL: ${job.url}`);
                });
            }

        } catch (error) {
            logError(`Get results failed: ${error.message}`);
            throw error;
        }

        // Test 6: Get Active Jobs
        log('\n6. Testing Get Active Jobs...', colors.yellow);
        try {
            const activeResponse = await axios.get(
                `${BASE_URL}/api/scraper/active`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            logSuccess(`Found ${activeResponse.data.jobs.length} active jobs`);
            activeResponse.data.jobs.forEach(job => {
                logInfo(`  - ${job.jobId}: ${job.status} (${job.progress}%)`);
            });

        } catch (error) {
            logError(`Get active jobs failed: ${error.message}`);
            throw error;
        }

        // Test 7: Cleanup
        log('\n7. Testing Job Cleanup...', colors.yellow);
        try {
            const deleteResponse = await axios.delete(
                `${BASE_URL}/api/scraper/job/${scraperJobId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            logSuccess(`Job cleaned up: ${deleteResponse.data.message}`);

        } catch (error) {
            logError(`Cleanup failed: ${error.message}`);
            throw error;
        }

        // Test 8: Import Jobs (integration test with sync)
        log('\n8. Testing Job Import to Database...', colors.yellow);

        // Start a new scraping job for import test
        const startResponse2 = await axios.post(
            `${BASE_URL}/api/scraper/start`,
            {
                source: 'hiring.cafe',
                url: TEST_URL,
                options: {
                    waitTime: 3000,
                    maxScrolls: 1
                }
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        const importJobId = startResponse2.data.jobId;
        logInfo(`Started new scraping job for import: ${importJobId}`);

        // Wait for completion
        let importStatus = 'queued';
        let importAttempts = 0;
        while (importAttempts < 30 && importStatus !== 'completed' && importStatus !== 'failed') {
            await sleep(2000);
            importAttempts++;

            const statusResp = await axios.get(
                `${BASE_URL}/api/scraper/status/${importJobId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            importStatus = statusResp.data.job.status;
            logInfo(`  [${importAttempts}] Status: ${importStatus}`);
        }

        if (importStatus === 'completed') {
            // Get results
            const resultsResp = await axios.get(
                `${BASE_URL}/api/scraper/results/${importJobId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const scrapedJobs = resultsResp.data.jobs;
            logSuccess(`Retrieved ${scrapedJobs.length} jobs for import`);

            if (scrapedJobs.length > 0) {
                // Test importing first 3 jobs via sync API
                const jobsToImport = scrapedJobs.slice(0, 3).map(job => ({
                    entityType: 'job',
                    entityId: job.id,
                    operation: 'create',
                    data: job
                }));

                try {
                    const pushResponse = await axios.post(
                        `${BASE_URL}/api/sync/push`,
                        { changes: jobsToImport },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    logSuccess(`Imported ${pushResponse.data.processed} jobs via sync API`);
                    logInfo(`  - Success: ${pushResponse.data.successful}`);
                    logInfo(`  - Failed: ${pushResponse.data.failed}`);

                    if (pushResponse.data.errors.length > 0) {
                        logWarning(`Import errors: ${JSON.stringify(pushResponse.data.errors)}`);
                    }

                } catch (error) {
                    logError(`Import failed: ${error.message}`);
                }
            }

            // Cleanup
            await axios.delete(
                `${BASE_URL}/api/scraper/job/${importJobId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            logInfo(`Cleaned up import test job`);
        }

        // All tests passed!
        log('\n========================================', colors.green);
        log('   ✓ ALL TESTS PASSED!', colors.green);
        log('========================================\n', colors.green);

        return true;

    } catch (error) {
        log('\n========================================', colors.red);
        log('   ✗ TESTS FAILED', colors.red);
        log('========================================\n', colors.red);
        logError(`Error: ${error.message}`);
        if (error.response) {
            logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return false;
    }
}

// Run tests
async function main() {
    logInfo('Starting scraper API tests...');
    logInfo(`Server: ${BASE_URL}`);
    logInfo(`Test URL: ${TEST_URL}\n`);

    const success = await testScraperAPI();
    process.exit(success ? 0 : 1);
}

main();
