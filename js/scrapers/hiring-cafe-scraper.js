// hiring-cafe-scraper.js - Scraper for hiring.cafe job board
// This scraper extracts job listings from hiring.cafe search results

/**
 * Scrape job listings from hiring.cafe
 * This function is designed to run in the browser console or as a bookmarklet
 * when viewing a hiring.cafe search results page
 *
 * @returns {Array} Array of job objects in the format expected by job-tool
 */
export function scrapeHiringCafe() {
    const jobs = [];

    // hiring.cafe uses a React-based SPA structure
    // We need to find the job cards in the DOM

    // Try multiple selectors to handle different page structures
    const selectors = [
        '[class*="JobCard"]',
        '[class*="job-card"]',
        '[class*="job-item"]',
        '[data-testid*="job"]',
        'article',
        '[role="article"]'
    ];

    let jobElements = [];

    for (const selector of selectors) {
        jobElements = document.querySelectorAll(selector);
        if (jobElements.length > 0) {
            console.log(`Found ${jobElements.length} job elements using selector: ${selector}`);
            break;
        }
    }

    if (jobElements.length === 0) {
        console.warn('No job elements found. The page structure may have changed.');
        return jobs;
    }

    jobElements.forEach((element, index) => {
        try {
            const job = extractJobFromElement(element, index);
            if (job && job.title && job.company) {
                jobs.push(job);
            }
        } catch (error) {
            console.error(`Error extracting job at index ${index}:`, error);
        }
    });

    return jobs;
}

/**
 * Extract job data from a single job card element
 * @param {HTMLElement} element - The job card element
 * @param {number} index - Index of the job in the list
 * @returns {Object|null} Job object or null if extraction failed
 */
function extractJobFromElement(element, index) {
    // Helper function to safely get text content
    const getText = (selector, fallback = '') => {
        const el = element.querySelector(selector);
        return el ? el.textContent.trim() : fallback;
    };

    // Helper function to get href attribute
    const getHref = (selector, fallback = '') => {
        const el = element.querySelector(selector);
        return el ? el.href : fallback;
    };

    // Try multiple strategies to find the job title
    let title =
        getText('h2') ||
        getText('h3') ||
        getText('[class*="title"]') ||
        getText('[class*="Title"]') ||
        getText('[class*="job-title"]') ||
        getText('[class*="position"]');

    // Try multiple strategies to find the company name
    let company =
        getText('[class*="company"]') ||
        getText('[class*="Company"]') ||
        getText('[class*="employer"]') ||
        getText('[data-testid*="company"]');

    // Try to find location
    let location =
        getText('[class*="location"]') ||
        getText('[class*="Location"]') ||
        getText('[class*="city"]') ||
        getText('[data-testid*="location"]');

    // Try to find job URL/link
    let url =
        getHref('a[href*="/job/"]') ||
        getHref('a[href*="/jobs/"]') ||
        getHref('a') ||
        '';

    // Make URL absolute if it's relative
    if (url && !url.startsWith('http')) {
        url = new URL(url, window.location.origin).href;
    }

    // Try to extract description or summary
    let description =
        getText('[class*="description"]') ||
        getText('[class*="summary"]') ||
        getText('p') ||
        '';

    // Try to find salary if available
    let salary =
        getText('[class*="salary"]') ||
        getText('[class*="compensation"]') ||
        getText('[class*="pay"]') ||
        '';

    // Create job object in job-tool format
    const job = {
        id: `job_hiringcafe_${Date.now()}_${index}`,
        title: title || 'Untitled Position',
        company: company || 'Unknown Company',
        location: location || '',
        url: url || window.location.href,
        description: description || '',
        salary: salary || '',
        source: 'hiring.cafe',
        sourceUrl: window.location.href,
        status: 'saved',
        dateCreated: new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
        dateApplied: null,
        statusHistory: [],
        resumeId: null,
        logs: [],
        notes: `Imported from hiring.cafe on ${new Date().toLocaleDateString()}`
    };

    return job;
}

/**
 * Download jobs as JSON file
 * @param {Array} jobs - Array of job objects
 */
export function downloadJobsAsJson(jobs) {
    const jsonData = JSON.stringify(jobs, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `hiring-cafe-jobs-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    return jobs.length;
}

/**
 * Copy jobs to clipboard as JSON
 * @param {Array} jobs - Array of job objects
 */
export function copyJobsToClipboard(jobs) {
    const jsonData = JSON.stringify(jobs, null, 2);

    return navigator.clipboard.writeText(jsonData)
        .then(() => jobs.length)
        .catch(error => {
            console.error('Error copying to clipboard:', error);
            throw error;
        });
}

/**
 * Main function to run the scraper and provide user feedback
 * This is the function to call from the bookmarklet or console
 */
export function runHiringCafeScraper() {
    console.log('🔍 Starting hiring.cafe scraper...');

    // Check if we're on hiring.cafe
    if (!window.location.hostname.includes('hiring.cafe')) {
        alert('This scraper only works on hiring.cafe. Please navigate to hiring.cafe first.');
        return;
    }

    // Scrape the jobs
    const jobs = scrapeHiringCafe();

    if (jobs.length === 0) {
        alert('No jobs found on this page. Make sure you\'re on a search results page with job listings.');
        return;
    }

    console.log(`✅ Found ${jobs.length} jobs!`);
    console.table(jobs.map(j => ({ title: j.title, company: j.company, location: j.location })));

    // Create a UI to let user choose what to do with the data
    createScraperUI(jobs);
}

/**
 * Create a simple UI overlay for scraper actions
 * @param {Array} jobs - Scraped jobs array
 */
function createScraperUI(jobs) {
    // Remove existing UI if present
    const existing = document.getElementById('hiring-cafe-scraper-ui');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'hiring-cafe-scraper-ui';
    overlay.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 999999;
            max-width: 500px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px;">
                🎉 Found ${jobs.length} Jobs!
            </h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.5;">
                Jobs have been scraped from hiring.cafe. Choose an option below:
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="scraper-download" style="
                    padding: 12px 20px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                ">
                    📥 Download as JSON
                </button>
                <button id="scraper-copy" style="
                    padding: 12px 20px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                ">
                    📋 Copy to Clipboard
                </button>
                <button id="scraper-view" style="
                    padding: 12px 20px;
                    background: #9C27B0;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                ">
                    👁️ View in Console
                </button>
                <button id="scraper-close" style="
                    padding: 12px 20px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                ">
                    ✕ Close
                </button>
            </div>
            <p style="
                margin: 20px 0 0 0;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 6px;
                font-size: 13px;
                color: #666;
                line-height: 1.5;
            ">
                💡 <strong>Tip:</strong> After downloading or copying, import the jobs into your job-tool using the Import feature.
            </p>
        </div>
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999998;
        "></div>
    `;

    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('scraper-download').addEventListener('click', () => {
        downloadJobsAsJson(jobs);
        alert(`Downloaded ${jobs.length} jobs! Import the file in your job-tool.`);
        overlay.remove();
    });

    document.getElementById('scraper-copy').addEventListener('click', () => {
        copyJobsToClipboard(jobs)
            .then(count => {
                alert(`Copied ${count} jobs to clipboard! Paste into your job-tool import.`);
                overlay.remove();
            })
            .catch(error => {
                alert('Failed to copy to clipboard. Please try downloading instead.');
            });
    });

    document.getElementById('scraper-view').addEventListener('click', () => {
        console.log('📊 Scraped Jobs Data:');
        console.table(jobs);
        console.log('Full JSON:', jobs);
        alert('Jobs data logged to console. Press F12 to view.');
        overlay.remove();
    });

    document.getElementById('scraper-close').addEventListener('click', () => {
        overlay.remove();
    });

    // Close on background click
    overlay.querySelector('div:last-child').addEventListener('click', () => {
        overlay.remove();
    });
}

// Make functions available globally for bookmarklet use
if (typeof window !== 'undefined') {
    window.hiringCafeScraper = {
        scrape: scrapeHiringCafe,
        run: runHiringCafeScraper,
        download: downloadJobsAsJson,
        copy: copyJobsToClipboard
    };
}
