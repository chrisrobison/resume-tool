// job-extractor.js - Service for extracting job details from various job boards
// Supports LinkedIn, Indeed, Glassdoor, and generic job pages

/**
 * Job Extractor Service
 * Main service that routes extraction requests to platform-specific parsers
 */
class JobExtractorService {
    constructor() {
        this.parsers = new Map();
        this.proxyUrl = null; // Optional CORS proxy
        this.initParsers();
    }

    /**
     * Initialize platform-specific parsers
     */
    initParsers() {
        // Parsers will be registered dynamically
        // This allows lazy loading of parser modules
        this.parserModules = {
            'linkedin': './js/parsers/linkedin-parser.js',
            'indeed': './js/parsers/indeed-parser.js',
            'glassdoor': './js/parsers/glassdoor-parser.js',
            'generic': './js/parsers/generic-parser.js'
        };
    }

    /**
     * Detect platform from URL
     * @param {string} url - Job posting URL
     * @returns {string} - Platform identifier
     */
    detectPlatform(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // Use exact domain matching to prevent subdomain spoofing attacks
            // (e.g., malicious-linkedin.com or linkedin.com.evil.com)
            if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) {
                return 'linkedin';
            } else if (hostname === 'indeed.com' || hostname.endsWith('.indeed.com')) {
                return 'indeed';
            } else if (hostname === 'glassdoor.com' || hostname.endsWith('.glassdoor.com') ||
                       hostname === 'glassdoor.ca' || hostname.endsWith('.glassdoor.ca')) {
                return 'glassdoor';
            } else {
                return 'generic';
            }
        } catch (error) {
            console.error('Invalid URL:', error);
            throw new Error('Invalid URL format');
        }
    }

    /**
     * Load parser module dynamically
     * @param {string} platform - Platform identifier
     * @returns {Promise<Object>} - Parser instance
     */
    async loadParser(platform) {
        // Check if parser is already loaded
        if (this.parsers.has(platform)) {
            return this.parsers.get(platform);
        }

        // For MVP, we'll use inline parsers instead of dynamic imports
        // to avoid module loading complexity
        const parserClass = this.getParserClass(platform);
        const parser = new parserClass();
        this.parsers.set(platform, parser);
        return parser;
    }

    /**
     * Get parser class by platform
     * @param {string} platform - Platform identifier
     * @returns {Class} - Parser class
     */
    getParserClass(platform) {
        // This will be implemented when we create the parser classes
        // For now, return a placeholder
        switch (platform) {
            case 'linkedin':
                return window.LinkedInParser || GenericParser;
            case 'indeed':
                return window.IndeedParser || GenericParser;
            case 'glassdoor':
                return window.GlassdoorParser || GenericParser;
            default:
                return GenericParser;
        }
    }

    /**
     * Extract job details from URL
     * @param {string} url - Job posting URL
     * @param {Object} options - Extraction options
     * @returns {Promise<Object>} - Extracted job data
     */
    async extractFromUrl(url, options = {}) {
        try {
            // Detect platform
            const platform = this.detectPlatform(url);
            console.log(`Detected platform: ${platform} for URL: ${url}`);

            // Load appropriate parser
            const parser = await this.loadParser(platform);

            // Fetch HTML content
            let html;
            try {
                html = await this.fetchContent(url, options);
            } catch (fetchError) {
                // If fetching fails (CORS), try alternative methods
                console.warn('Direct fetch failed, trying alternative extraction:', fetchError);

                // Try to extract from current page if URL matches
                if (window.location.href === url) {
                    html = document.documentElement.outerHTML;
                } else {
                    throw new Error('Unable to fetch job posting. Please use the browser extension or copy job details manually.');
                }
            }

            // Parse HTML to extract job details
            const jobData = await parser.parse(html, url);

            // Validate extracted data
            this.validateJobData(jobData);

            // Add metadata
            jobData.metadata = {
                source: platform,
                sourceUrl: url,
                extractedAt: new Date().toISOString(),
                extractor: 'job-extractor-service',
                version: '1.0.0'
            };

            return {
                success: true,
                platform,
                job: jobData
            };

        } catch (error) {
            console.error('Job extraction failed:', error);
            return {
                success: false,
                error: error.message,
                url
            };
        }
    }

    /**
     * Fetch content from URL
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<string>} - HTML content
     */
    async fetchContent(url, options = {}) {
        const fetchUrl = this.proxyUrl ? `${this.proxyUrl}${encodeURIComponent(url)}` : url;

        const response = await fetch(fetchUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (compatible; JobHuntManager/1.0)',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    }

    /**
     * Extract job details from HTML content
     * Useful when HTML is already available (e.g., from browser extension)
     * @param {string} html - HTML content
     * @param {string} url - Original URL (for platform detection)
     * @returns {Promise<Object>} - Extracted job data
     */
    async extractFromHtml(html, url) {
        try {
            const platform = this.detectPlatform(url);
            const parser = await this.loadParser(platform);
            const jobData = await parser.parse(html, url);

            this.validateJobData(jobData);

            jobData.metadata = {
                source: platform,
                sourceUrl: url,
                extractedAt: new Date().toISOString(),
                extractor: 'job-extractor-service',
                version: '1.0.0'
            };

            return {
                success: true,
                platform,
                job: jobData
            };

        } catch (error) {
            console.error('HTML extraction failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract job details from structured data (JSON-LD)
     * Many job boards include structured data in their pages
     * @param {string} html - HTML content
     * @returns {Object|null} - Extracted structured data
     */
    extractStructuredData(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Find JSON-LD script tags
            const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.textContent);

                    // Check if it's a JobPosting schema
                    if (data['@type'] === 'JobPosting' ||
                        (Array.isArray(data['@graph']) &&
                         data['@graph'].some(item => item['@type'] === 'JobPosting'))) {
                        return this.normalizeStructuredData(data);
                    }
                } catch (parseError) {
                    console.warn('Failed to parse JSON-LD:', parseError);
                }
            }

            return null;
        } catch (error) {
            console.error('Structured data extraction failed:', error);
            return null;
        }
    }

    /**
     * Normalize structured data to our job format
     * @param {Object} data - Structured data
     * @returns {Object} - Normalized job data
     */
    normalizeStructuredData(data) {
        // Handle @graph format
        if (data['@graph']) {
            const jobPosting = data['@graph'].find(item => item['@type'] === 'JobPosting');
            if (jobPosting) {
                data = jobPosting;
            }
        }

        return {
            title: data.title || data.name || '',
            company: data.hiringOrganization?.name || '',
            location: this.extractLocation(data),
            salary: this.extractSalary(data),
            description: data.description || '',
            requirements: data.qualifications || data.responsibilities || '',
            employmentType: data.employmentType || '',
            posted: data.datePosted || '',
            validThrough: data.validThrough || '',
            url: data.url || data.jobLocation?.url || ''
        };
    }

    /**
     * Extract location from structured data
     */
    extractLocation(data) {
        if (!data.jobLocation) return '';

        const loc = data.jobLocation;
        if (typeof loc === 'string') return loc;

        if (loc.address) {
            const addr = loc.address;
            return [
                addr.streetAddress,
                addr.addressLocality,
                addr.addressRegion,
                addr.postalCode,
                addr.addressCountry
            ].filter(Boolean).join(', ');
        }

        return loc.name || '';
    }

    /**
     * Extract salary from structured data
     */
    extractSalary(data) {
        if (!data.baseSalary) return '';

        const salary = data.baseSalary;
        if (typeof salary === 'string') return salary;

        if (salary.value) {
            const value = salary.value;
            const currency = salary.currency || '$';

            if (value.minValue && value.maxValue) {
                return `${currency}${value.minValue} - ${currency}${value.maxValue} ${value.unitText || ''}`;
            } else if (value.value) {
                return `${currency}${value.value} ${value.unitText || ''}`;
            }
        }

        return '';
    }

    /**
     * Validate extracted job data
     * @param {Object} jobData - Extracted job data
     * @throws {Error} - If validation fails
     */
    validateJobData(jobData) {
        if (!jobData) {
            throw new Error('No job data extracted');
        }

        const requiredFields = ['title', 'company'];
        const missingFields = requiredFields.filter(field => !jobData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate data types
        if (typeof jobData.title !== 'string' || jobData.title.trim().length === 0) {
            throw new Error('Invalid job title');
        }

        if (typeof jobData.company !== 'string' || jobData.company.trim().length === 0) {
            throw new Error('Invalid company name');
        }
    }

    /**
     * Set CORS proxy URL (optional)
     * @param {string} proxyUrl - CORS proxy URL
     */
    setProxyUrl(proxyUrl) {
        this.proxyUrl = proxyUrl;
    }

    /**
     * Test extraction on a URL
     * @param {string} url - Job posting URL
     * @returns {Promise<Object>} - Test results
     */
    async test(url) {
        console.log('Testing job extraction for:', url);

        const startTime = Date.now();
        const result = await this.extractFromUrl(url);
        const duration = Date.now() - startTime;

        return {
            ...result,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Generic Parser (Base Class)
 * All platform-specific parsers extend this
 */
class GenericParser {
    constructor() {
        this.name = 'generic';
    }

    /**
     * Parse HTML to extract job details
     * @param {string} html - HTML content
     * @param {string} url - Original URL
     * @returns {Promise<Object>} - Extracted job data
     */
    async parse(html, url) {
        // First try structured data
        const extractor = new JobExtractorService();
        const structured = extractor.extractStructuredData(html);

        if (structured && structured.title && structured.company) {
            console.log('Using structured data extraction');
            return structured;
        }

        // Fallback to generic extraction
        console.log('Using generic HTML extraction');
        return this.parseGeneric(html, url);
    }

    /**
     * Generic parsing using common HTML patterns
     * @param {string} html - HTML content
     * @param {string} url - Original URL
     * @returns {Object} - Extracted job data
     */
    parseGeneric(html, url) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Common selectors for job details
        const job = {
            title: this.extractTitle(doc),
            company: this.extractCompany(doc),
            location: this.extractLocationGeneric(doc),
            salary: this.extractSalaryGeneric(doc),
            description: this.extractDescription(doc),
            requirements: '',
            benefits: '',
            employmentType: '',
            posted: '',
            url: url
        };

        return job;
    }

    /**
     * Extract job title using common patterns
     */
    extractTitle(doc) {
        // Try common selectors
        const selectors = [
            'h1[class*="job"][class*="title"]',
            'h1[class*="title"]',
            '[data-test="job-title"]',
            '[class*="job-title"]',
            'h1',
            'meta[property="og:title"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const content = selector.includes('meta')
                    ? element.getAttribute('content')
                    : element.textContent;

                const title = content?.trim();
                if (title && title.length > 3 && title.length < 200) {
                    return title;
                }
            }
        }

        return '';
    }

    /**
     * Extract company name using common patterns
     */
    extractCompany(doc) {
        const selectors = [
            '[class*="company"][class*="name"]',
            '[data-test="company-name"]',
            '[class*="employer"]',
            'meta[property="og:site_name"]',
            '[class*="company"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const content = selector.includes('meta')
                    ? element.getAttribute('content')
                    : element.textContent;

                const company = content?.trim();
                if (company && company.length > 1 && company.length < 100) {
                    return company;
                }
            }
        }

        return '';
    }

    /**
     * Extract location using common patterns
     */
    extractLocationGeneric(doc) {
        const selectors = [
            '[class*="job"][class*="location"]',
            '[class*="location"]',
            '[data-test="job-location"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const location = element.textContent?.trim();
                if (location && location.length > 2 && location.length < 200) {
                    return location;
                }
            }
        }

        return '';
    }

    /**
     * Extract salary using common patterns
     */
    extractSalaryGeneric(doc) {
        const selectors = [
            '[class*="salary"]',
            '[class*="compensation"]',
            '[data-test="salary"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const salary = element.textContent?.trim();
                if (salary && (salary.includes('$') || salary.includes('k') || salary.includes('K'))) {
                    return salary;
                }
            }
        }

        return '';
    }

    /**
     * Extract job description
     */
    extractDescription(doc) {
        const selectors = [
            '[class*="job"][class*="description"]',
            '[class*="description"]',
            '[data-test="job-description"]',
            'article',
            '[role="article"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const description = element.textContent?.trim();
                if (description && description.length > 50) {
                    return description;
                }
            }
        }

        return '';
    }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JobExtractorService, GenericParser };
}

// Make available globally
window.JobExtractorService = JobExtractorService;
window.GenericParser = GenericParser;
