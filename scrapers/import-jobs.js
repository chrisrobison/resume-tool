// import-jobs.js - Batch import jobs from scraper output into job-tool
// Run with: node scrapers/import-jobs.js <json-file>

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Import jobs into job-tool via browser automation
 * @param {string} jsonFilePath - Path to the JSON file with jobs
 * @param {string} appUrl - URL of the job-tool app
 */
async function importJobs(jsonFilePath, appUrl = 'file://' + path.join(__dirname, '..', 'app.html')) {
    console.log('📦 Starting job import...');
    console.log('📄 File:', jsonFilePath);
    console.log('🌐 App:', appUrl);

    // Read and validate the JSON file
    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`File not found: ${jsonFilePath}`);
    }

    const jobsData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    if (!Array.isArray(jobsData)) {
        throw new Error('JSON file must contain an array of jobs');
    }

    console.log(`✅ Loaded ${jobsData.length} jobs from file`);

    const browser = await puppeteer.launch({
        headless: false, // Show browser so user can see the import
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Navigate to the app
        console.log('🌐 Opening job-tool...');
        await page.goto(appUrl, { waitUntil: 'networkidle2' });

        // Wait for app to initialize
        await page.waitForTimeout(2000);

        // Import jobs by directly manipulating localStorage
        console.log('💾 Importing jobs into localStorage...');

        const result = await page.evaluate((jobs) => {
            // Get existing jobs
            const savedJobs = JSON.parse(localStorage.getItem('saved_jobs') || '{}');

            let imported = 0;
            let duplicates = 0;
            let errors = 0;

            jobs.forEach(job => {
                try {
                    // Check if job already exists (by URL or title+company combination)
                    const isDuplicate = Object.values(savedJobs).some(existingJob =>
                        (job.url && existingJob.url === job.url) ||
                        (existingJob.title === job.title && existingJob.company === job.company)
                    );

                    if (isDuplicate) {
                        duplicates++;
                        return;
                    }

                    // Add job
                    savedJobs[job.id] = job;
                    imported++;
                } catch (error) {
                    console.error('Error importing job:', job, error);
                    errors++;
                }
            });

            // Save back to localStorage
            localStorage.setItem('saved_jobs', JSON.stringify(savedJobs));

            return { imported, duplicates, errors, total: jobs.length };
        }, jobsData);

        console.log('\n📊 Import Results:');
        console.log(`  ✅ Imported: ${result.imported}`);
        console.log(`  ⏭️  Duplicates skipped: ${result.duplicates}`);
        console.log(`  ❌ Errors: ${result.errors}`);
        console.log(`  📦 Total processed: ${result.total}`);

        // Refresh the page to show the new jobs
        console.log('\n🔄 Refreshing page to display imported jobs...');
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);

        console.log('\n✨ Import complete! You can now close the browser or continue using the app.');
        console.log('⚠️  Browser will stay open for 30 seconds so you can verify the import.');

        // Keep browser open for 30 seconds
        await page.waitForTimeout(30000);

        await browser.close();
        return result;

    } catch (error) {
        console.error('❌ Import error:', error.message);
        await browser.close();
        throw error;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
Usage: node scrapers/import-jobs.js [options] <json-file>

Arguments:
  <json-file>           Path to JSON file with scraped jobs

Options:
  --app=url             URL of the job-tool app (default: file://app.html)
  --help, -h            Show this help message

Examples:
  # Import jobs from scraper output
  node scrapers/import-jobs.js scrapers/hiring-cafe-jobs-2025-01-15.json

  # Import with custom app URL
  node scrapers/import-jobs.js --app=https://cdr2.com/job-tool/app.html jobs.json

Notes:
  - The browser will open visibly so you can see the import process
  - Duplicate jobs (by URL or title+company) will be skipped
  - The browser will stay open for 30 seconds after import for verification
        `);
        process.exit(0);
    }

    // Parse arguments
    let jsonFile = null;
    let appUrl = 'file://' + path.join(__dirname, '..', 'app.html');

    args.forEach(arg => {
        if (arg.startsWith('--app=')) {
            appUrl = arg.split('=')[1];
        } else if (!arg.startsWith('--')) {
            jsonFile = arg;
        }
    });

    if (!jsonFile) {
        console.error('❌ Error: JSON file path is required');
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    // Make path absolute if relative
    if (!path.isAbsolute(jsonFile)) {
        jsonFile = path.join(process.cwd(), jsonFile);
    }

    // Run the import
    importJobs(jsonFile, appUrl)
        .then(result => {
            console.log('\n🎉 Import completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importJobs };
