// test-scraper-page.js - Test the scraper page loading
const puppeteer = require('puppeteer');

async function testScraperPage() {
    console.log('Starting browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Capture console messages
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            console.log(`[BROWSER ${type.toUpperCase()}]`, text);
        });

        // Capture errors
        page.on('pageerror', error => {
            console.error('[PAGE ERROR]', error.message);
        });

        // Capture network errors
        page.on('requestfailed', request => {
            console.error('[REQUEST FAILED]', request.url(), request.failure().errorText);
        });

        console.log('Navigating to app.html...');
        await page.goto('https://cdr2.com/job-tool/app.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('Page loaded, waiting 2 seconds...');
        await page.waitForTimeout(2000);

        // Click on Job Scraper nav item
        console.log('Looking for Job Scraper nav item...');
        const scraperNav = await page.$('[data-section="scraper"]');
        if (!scraperNav) {
            console.error('ERROR: Job Scraper nav item not found!');
        } else {
            console.log('Found Job Scraper nav, clicking...');
            await scraperNav.click();
            await page.waitForTimeout(1000);
        }

        // Check if scraper panel is visible
        console.log('Checking scraper panel...');
        const scraperPanel = await page.$('#scraper-panel');
        if (scraperPanel) {
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none';
            }, scraperPanel);
            console.log('Scraper panel visible:', isVisible);
        } else {
            console.error('ERROR: Scraper panel not found!');
        }

        // Check if job-scraper component exists
        console.log('Checking job-scraper component...');
        const jobScraper = await page.$('job-scraper');
        if (jobScraper) {
            console.log('✓ job-scraper component found');

            // Check shadow root
            const hasShadowRoot = await page.evaluate(el => {
                return el.shadowRoot !== null;
            }, jobScraper);
            console.log('Has shadow root:', hasShadowRoot);

            if (hasShadowRoot) {
                // Check content in shadow root
                const shadowContent = await page.evaluate(el => {
                    const shadowRoot = el.shadowRoot;
                    if (!shadowRoot) return 'No shadow root';
                    const container = shadowRoot.querySelector('.scraper-container');
                    if (!container) return 'No container';
                    return container.innerHTML.substring(0, 200);
                }, jobScraper);
                console.log('Shadow content preview:', shadowContent);
            }
        } else {
            console.error('ERROR: job-scraper component not found!');
        }

        // Take a screenshot
        console.log('Taking screenshot...');
        await page.screenshot({
            path: '/home/cdr/domains/cdr2.com/www/job-tool/tests/scraper-page-test.png',
            fullPage: true
        });
        console.log('Screenshot saved to: tests/scraper-page-test.png');

        // Get page HTML for debugging
        const html = await page.content();
        const scraperPanelHTML = html.match(/<div id="scraper-panel"[^>]*>.*?<\/div>/s);
        if (scraperPanelHTML) {
            console.log('\nScraper panel HTML:', scraperPanelHTML[0].substring(0, 300));
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
        console.log('Browser closed');
    }
}

testScraperPage();
