// scrape-hiring-cafe.js - Puppeteer-based scraper for hiring.cafe
// Run with: node scrapers/scrape-hiring-cafe.js [search_url]

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Main scraper function
 * @param {string} url - The hiring.cafe search URL to scrape
 * @param {object} options - Scraper options
 */
async function scrapeHiringCafe(url, options = {}) {
    const {
        headless = true,
        waitTime = 5000,
        scrollDelay = 1000,
        maxScrolls = 5,
        outputPath = null
    } = options;

    console.log('🚀 Starting hiring.cafe scraper...');
    console.log('📍 URL:', url);

    const browser = await puppeteer.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set viewport and user agent to appear more like a real browser
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error' && options.verbose) {
                console.error('PAGE ERROR:', msg.text());
            }
        });

        console.log('🌐 Navigating to hiring.cafe...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏳ Waiting for page to render...');
        await page.waitForTimeout(waitTime);

        // Try to detect and scroll to load more jobs
        console.log('📜 Scrolling to load more jobs...');
        await autoScroll(page, maxScrolls, scrollDelay);

        console.log('🔍 Extracting job data...');
        const jobs = await page.evaluate(() => {
            const jobsData = [];

            // Helper function to safely get text content
            const getText = (element, selector, fallback = '') => {
                if (!element) return fallback;
                const el = element.querySelector(selector);
                return el ? el.textContent.trim() : fallback;
            };

            // Helper function to get attribute
            const getAttr = (element, selector, attr, fallback = '') => {
                if (!element) return fallback;
                const el = element.querySelector(selector);
                return el ? (el.getAttribute(attr) || fallback) : fallback;
            };

            // Multiple selectors to try for job cards
            const selectors = [
                '[class*="JobCard"]',
                '[class*="job-card"]',
                '[class*="JobListing"]',
                '[class*="job-listing"]',
                'article[class*="job"]',
                '[data-testid*="job-card"]',
                '[data-testid*="job-item"]',
                'div[class*="search-result"]',
                'a[href*="/jobs/"]',
                'div[role="listitem"]'
            ];

            let jobElements = [];
            for (const selector of selectors) {
                jobElements = document.querySelectorAll(selector);
                if (jobElements.length > 0) {
                    console.log(`Found ${jobElements.length} elements with selector: ${selector}`);
                    break;
                }
            }

            if (jobElements.length === 0) {
                console.warn('No job elements found with known selectors. Trying generic approach...');
                // Try to find all links that might be job links
                const allLinks = document.querySelectorAll('a[href]');
                jobElements = Array.from(allLinks).filter(link =>
                    link.href.includes('/job') || link.href.includes('/position')
                );
            }

            jobElements.forEach((element, index) => {
                try {
                    // Extract job data with multiple fallback strategies
                    const title =
                        getText(element, 'h2') ||
                        getText(element, 'h3') ||
                        getText(element, '[class*="title"]') ||
                        getText(element, '[class*="Title"]') ||
                        getText(element, '[class*="position"]') ||
                        getText(element, '[class*="Position"]') ||
                        element.textContent.split('\n')[0]?.trim() ||
                        'Untitled Position';

                    const company =
                        getText(element, '[class*="company"]') ||
                        getText(element, '[class*="Company"]') ||
                        getText(element, '[class*="employer"]') ||
                        getText(element, '[class*="Employer"]') ||
                        getText(element, '[data-testid*="company"]') ||
                        'Unknown Company';

                    const location =
                        getText(element, '[class*="location"]') ||
                        getText(element, '[class*="Location"]') ||
                        getText(element, '[class*="city"]') ||
                        getText(element, '[data-testid*="location"]') ||
                        getText(element, 'svg + span') || // Often location has an icon
                        '';

                    // Extract URL
                    let jobUrl = '';
                    const linkElement = element.tagName === 'A' ? element : element.querySelector('a[href]');
                    if (linkElement) {
                        jobUrl = linkElement.href;
                    }

                    // Extract description/summary
                    const description =
                        getText(element, '[class*="description"]') ||
                        getText(element, '[class*="summary"]') ||
                        getText(element, '[class*="snippet"]') ||
                        getText(element, 'p') ||
                        '';

                    // Extract salary if available
                    const salary =
                        getText(element, '[class*="salary"]') ||
                        getText(element, '[class*="Salary"]') ||
                        getText(element, '[class*="compensation"]') ||
                        getText(element, '[class*="pay"]') ||
                        '';

                    // Extract job type (remote, hybrid, onsite)
                    const jobType =
                        getText(element, '[class*="job-type"]') ||
                        getText(element, '[class*="workplace"]') ||
                        getText(element, '[class*="remote"]') ||
                        '';

                    // Only add if we have at least a title
                    if (title && title !== 'Untitled Position') {
                        jobsData.push({
                            title,
                            company,
                            location,
                            url: jobUrl,
                            description,
                            salary,
                            jobType,
                            index
                        });
                    }
                } catch (error) {
                    console.error(`Error extracting job at index ${index}:`, error);
                }
            });

            return jobsData;
        });

        console.log(`✅ Found ${jobs.length} jobs!`);

        // Convert to job-tool format
        const formattedJobs = jobs.map((job, index) => ({
            id: `job_hiringcafe_${Date.now()}_${index}`,
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url || url,
            description: job.description,
            salary: job.salary,
            jobType: job.jobType,
            source: 'hiring.cafe',
            sourceUrl: url,
            status: 'saved',
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
            dateApplied: null,
            statusHistory: [],
            resumeId: null,
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            notes: `Scraped from hiring.cafe on ${new Date().toLocaleDateString()}`,
            logs: []
        }));

        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = outputPath || path.join(__dirname, `hiring-cafe-jobs-${timestamp}.json`);

        fs.writeFileSync(filename, JSON.stringify(formattedJobs, null, 2));
        console.log(`💾 Saved ${formattedJobs.length} jobs to: ${filename}`);

        // Also save a summary
        const summary = {
            scrapedAt: new Date().toISOString(),
            sourceUrl: url,
            jobCount: formattedJobs.length,
            jobs: formattedJobs.map(j => ({
                title: j.title,
                company: j.company,
                location: j.location
            }))
        };

        const summaryFile = filename.replace('.json', '-summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`📊 Summary saved to: ${summaryFile}`);

        await browser.close();
        return formattedJobs;

    } catch (error) {
        console.error('❌ Scraper error:', error.message);
        await browser.close();
        throw error;
    }
}

/**
 * Auto-scroll the page to load lazy-loaded content
 */
async function autoScroll(page, maxScrolls = 5, delay = 1000) {
    for (let i = 0; i < maxScrolls; i++) {
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        console.log(`  Scroll ${i + 1}/${maxScrolls}...`);
        await page.waitForTimeout(delay);
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
Usage: node scrapers/scrape-hiring-cafe.js [options] <url>

Arguments:
  <url>                  hiring.cafe search URL to scrape

Options:
  --headless=false      Run with visible browser (default: true)
  --wait=5000           Wait time for page load in ms (default: 5000)
  --scroll-delay=1000   Delay between scrolls in ms (default: 1000)
  --max-scrolls=5       Maximum number of scrolls (default: 5)
  --output=path         Output file path (default: auto-generated)
  --verbose             Enable verbose logging

Examples:
  # Basic scrape
  node scrapers/scrape-hiring-cafe.js "https://hiring.cafe/?searchState=..."

  # With visible browser and custom output
  node scrapers/scrape-hiring-cafe.js --headless=false --output=jobs.json "https://hiring.cafe/..."

  # Quick scrape with less waiting
  node scrapers/scrape-hiring-cafe.js --wait=3000 --max-scrolls=3 "https://hiring.cafe/..."
        `);
        process.exit(0);
    }

    // Parse arguments
    const options = {
        headless: true,
        waitTime: 5000,
        scrollDelay: 1000,
        maxScrolls: 5,
        outputPath: null,
        verbose: false
    };

    let url = null;

    args.forEach(arg => {
        if (arg.startsWith('--headless=')) {
            options.headless = arg.split('=')[1] !== 'false';
        } else if (arg.startsWith('--wait=')) {
            options.waitTime = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--scroll-delay=')) {
            options.scrollDelay = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--max-scrolls=')) {
            options.maxScrolls = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--output=')) {
            options.outputPath = arg.split('=')[1];
        } else if (arg === '--verbose') {
            options.verbose = true;
        } else if (!arg.startsWith('--')) {
            url = arg;
        }
    });

    if (!url) {
        console.error('❌ Error: URL is required');
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    // Run the scraper
    scrapeHiringCafe(url, options)
        .then(jobs => {
            console.log('✨ Scraping completed successfully!');
            console.log(`📦 Import the JSON file into your job-tool to use the scraped jobs.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeHiringCafe };
