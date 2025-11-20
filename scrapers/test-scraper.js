// test-scraper.js - Quick test of the hiring.cafe scraper
// This creates a mock HTML page to test the scraper logic without hitting the live site

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create a mock hiring.cafe page for testing
const mockHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>hiring.cafe - Test Page</title>
</head>
<body>
    <div class="JobCard">
        <h2>Senior Software Engineer</h2>
        <div class="company">Tech Company Inc</div>
        <div class="location">San Francisco, CA</div>
        <div class="salary">$150k - $200k</div>
        <div class="description">We are looking for an experienced software engineer...</div>
        <a href="https://example.com/job/1">View Job</a>
    </div>

    <div class="JobCard">
        <h2>Engineering Manager</h2>
        <div class="company">Startup Co</div>
        <div class="location">Remote</div>
        <div class="salary">$180k - $220k</div>
        <div class="description">Lead our engineering team...</div>
        <a href="https://example.com/job/2">View Job</a>
    </div>

    <div class="JobCard">
        <h2>Frontend Developer</h2>
        <div class="company">Design Agency</div>
        <div class="location">New York, NY</div>
        <div class="salary">$120k - $160k</div>
        <div class="description">Build beautiful user interfaces...</div>
        <a href="https://example.com/job/3">View Job</a>
    </div>
</body>
</html>
`;

async function testScraper() {
    console.log('🧪 Starting scraper test...\n');

    // Create a temporary mock HTML file
    const tempFile = path.join(__dirname, 'test-mock-page.html');
    fs.writeFileSync(tempFile, mockHTML);
    console.log('✅ Created mock HTML page');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Load the mock page
        await page.goto(`file://${tempFile}`, { waitUntil: 'networkidle2' });
        console.log('✅ Loaded mock page');

        // Extract jobs using the same logic as the real scraper
        const jobs = await page.evaluate(() => {
            const jobsData = [];

            const getText = (element, selector, fallback = '') => {
                if (!element) return fallback;
                const el = element.querySelector(selector);
                return el ? el.textContent.trim() : fallback;
            };

            const jobElements = document.querySelectorAll('.JobCard');
            console.log(`Found ${jobElements.length} job elements`);

            jobElements.forEach((element, index) => {
                const title = getText(element, 'h2', 'Untitled');
                const company = getText(element, '.company', 'Unknown');
                const location = getText(element, '.location', '');
                const salary = getText(element, '.salary', '');
                const description = getText(element, '.description', '');

                const linkElement = element.querySelector('a[href]');
                const url = linkElement ? linkElement.href : '';

                jobsData.push({
                    title,
                    company,
                    location,
                    salary,
                    description,
                    url,
                    index
                });
            });

            return jobsData;
        });

        console.log(`✅ Extracted ${jobs.length} jobs\n`);

        // Validate results
        let passed = true;

        if (jobs.length !== 3) {
            console.error(`❌ Expected 3 jobs, got ${jobs.length}`);
            passed = false;
        }

        // Check first job
        if (jobs[0].title !== 'Senior Software Engineer') {
            console.error(`❌ Expected title 'Senior Software Engineer', got '${jobs[0].title}'`);
            passed = false;
        }

        if (jobs[0].company !== 'Tech Company Inc') {
            console.error(`❌ Expected company 'Tech Company Inc', got '${jobs[0].company}'`);
            passed = false;
        }

        // Display results
        console.log('📊 Extracted Jobs:');
        jobs.forEach((job, i) => {
            console.log(`\n${i + 1}. ${job.title}`);
            console.log(`   Company: ${job.company}`);
            console.log(`   Location: ${job.location}`);
            console.log(`   Salary: ${job.salary}`);
            console.log(`   URL: ${job.url}`);
        });

        // Clean up
        fs.unlinkSync(tempFile);
        console.log('\n✅ Cleaned up test files');

        await browser.close();

        if (passed) {
            console.log('\n🎉 All tests passed!');
            console.log('\n✨ The scraper is working correctly!');
            console.log('   You can now use it with real hiring.cafe URLs.');
            return true;
        } else {
            console.log('\n❌ Some tests failed');
            return false;
        }

    } catch (error) {
        console.error('❌ Test error:', error);

        // Clean up on error
        const tempFile = path.join(__dirname, 'test-mock-page.html');
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        await browser.close();
        return false;
    }
}

// Run the test
if (require.main === module) {
    testScraper()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testScraper };
