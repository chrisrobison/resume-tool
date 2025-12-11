// indeed-parser.js - Indeed job posting parser
// Extracts job details from Indeed job pages

/**
 * Indeed Parser
 * Extracts job details from Indeed job postings
 */
class IndeedParser extends GenericParser {
    constructor() {
        super();
        this.name = 'indeed';
        this.platform = 'Indeed';
    }

    /**
     * Parse Indeed job posting
     * @param {string} html - HTML content
     * @param {string} url - Original URL
     * @returns {Promise<Object>} - Extracted job data
     */
    async parse(html, url) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Try structured data first
        const extractor = new JobExtractorService();
        const structured = extractor.extractStructuredData(html);

        // Extract using Indeed-specific selectors
        const job = {
            title: this.extractIndeedTitle(doc, structured),
            company: this.extractIndeedCompany(doc, structured),
            location: this.extractIndeedLocation(doc, structured),
            salary: this.extractIndeedSalary(doc, structured),
            description: this.extractIndeedDescription(doc, structured),
            requirements: '',
            benefits: '',
            employmentType: this.extractIndeedEmploymentType(doc, structured),
            posted: this.extractIndeedPosted(doc, structured),
            url: url,
            logo: this.extractIndeedLogo(doc),
            jobType: this.extractIndeedJobType(doc),
            shift: this.extractIndeedShift(doc),
            companyInfo: this.extractIndeedCompanyInfo(doc)
        };

        // Clean up empty fields
        Object.keys(job).forEach(key => {
            if (job[key] === '' || job[key] === null || job[key] === undefined) {
                delete job[key];
            }
        });

        return job;
    }

    /**
     * Extract job title
     */
    extractIndeedTitle(doc, structured) {
        if (structured?.title) {
            return structured.title;
        }

        // Indeed-specific selectors
        const selectors = [
            'h1.jobsearch-JobInfoHeader-title',
            'h1[data-testid="jobsearch-JobInfoHeader-title"]',
            '.jobsearch-JobInfoHeader-title-container h1',
            'h1.icl-u-xs-mb--xs',
            '[data-job-title]',
            'h1'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                let title = element.textContent?.trim();

                // Sometimes title is in data attribute
                if (!title) {
                    title = element.getAttribute('data-job-title');
                }

                if (title && title.length > 3) {
                    return this.cleanText(title);
                }
            }
        }

        return this.extractTitle(doc);
    }

    /**
     * Extract company name
     */
    extractIndeedCompany(doc, structured) {
        if (structured?.company) {
            return structured.company;
        }

        const selectors = [
            '[data-testid="inlineHeader-companyName"]',
            '[data-company-name="true"]',
            '.jobsearch-InlineCompanyRating',
            '.jobsearch-CompanyInfoContainer a',
            '[data-testid="company-name"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                let company = element.textContent?.trim();

                // Remove rating if present
                company = company?.replace(/\d+(\.\d+)?\s*★?/g, '').trim();

                if (company && company.length > 1) {
                    return this.cleanText(company);
                }
            }
        }

        return this.extractCompany(doc);
    }

    /**
     * Extract location
     */
    extractIndeedLocation(doc, structured) {
        if (structured?.location) {
            return structured.location;
        }

        const selectors = [
            '[data-testid="inlineHeader-companyLocation"]',
            '[data-testid="job-location"]',
            '.jobsearch-JobInfoHeader-subtitle div',
            '[class*="location"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const location = element.textContent?.trim();
                // Location usually has city, state pattern
                if (location && (location.includes(',') || location.length > 5)) {
                    return this.cleanText(location);
                }
            }
        }

        return this.extractLocationGeneric(doc);
    }

    /**
     * Extract salary
     */
    extractIndeedSalary(doc, structured) {
        if (structured?.salary) {
            return structured.salary;
        }

        const selectors = [
            '#salaryInfoAndJobType',
            '[data-testid="attribute-snippet-salary"]',
            '.jobsearch-JobMetadataHeader-item span',
            '[id*="salary"]',
            '[class*="salary"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const salary = element.textContent?.trim();
                if (salary && (
                    salary.includes('$') ||
                    salary.includes('hour') ||
                    salary.includes('year') ||
                    salary.includes('k') ||
                    salary.includes('K')
                )) {
                    return this.cleanText(salary);
                }
            }
        }

        return '';
    }

    /**
     * Extract job description
     */
    extractIndeedDescription(doc, structured) {
        if (structured?.description && structured.description.length > 100) {
            return structured.description;
        }

        const selectors = [
            '#jobDescriptionText',
            '[data-testid="jobsearch-JobComponent-description"]',
            '.jobsearch-jobDescriptionText',
            '.jobDescriptionContent',
            '[id*="description"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                let description = element.innerHTML || element.textContent;

                // Convert to readable format
                description = this.htmlToText(description);

                if (description && description.length > 50) {
                    return description.trim();
                }
            }
        }

        return this.extractDescription(doc);
    }

    /**
     * Extract employment type
     */
    extractIndeedEmploymentType(doc, structured) {
        if (structured?.employmentType) {
            return structured.employmentType;
        }

        const selectors = [
            '#salaryInfoAndJobType',
            '[data-testid="attribute-snippet-jobtype"]',
            '.jobsearch-JobMetadataHeader-item'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase().trim();
                if (text && (
                    text.includes('full-time') ||
                    text.includes('part-time') ||
                    text.includes('contract') ||
                    text.includes('temporary') ||
                    text.includes('internship')
                )) {
                    return this.normalizeEmploymentType(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract job type (remote, hybrid, etc.)
     */
    extractIndeedJobType(doc) {
        const selectors = [
            '[data-testid="attribute-snippet-jobtype"]',
            '.jobsearch-JobMetadataHeader-item'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase().trim();
                if (text && (
                    text.includes('remote') ||
                    text.includes('hybrid') ||
                    text.includes('on-site')
                )) {
                    return this.normalizeJobType(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract shift information
     */
    extractIndeedShift(doc) {
        const selectors = [
            '[data-testid="attribute-snippet"]',
            '.jobsearch-JobMetadataHeader-item'
        ];

        const shiftPatterns = [
            'day shift',
            'night shift',
            'evening shift',
            'overnight',
            '8 hour shift',
            '10 hour shift',
            '12 hour shift'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase().trim();
                for (const pattern of shiftPatterns) {
                    if (text && text.includes(pattern)) {
                        return this.normalizeShift(pattern);
                    }
                }
            }
        }

        return '';
    }

    /**
     * Extract posted date
     */
    extractIndeedPosted(doc, structured) {
        if (structured?.posted) {
            return structured.posted;
        }

        const selectors = [
            '.jobsearch-JobMetadataFooter',
            '[data-testid="jobsearch-JobMetadataFooter"]',
            '[class*="posted"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                // Look for date patterns
                if (text && (
                    text.toLowerCase().includes('posted') ||
                    text.toLowerCase().includes('ago') ||
                    text.toLowerCase().includes('today') ||
                    text.toLowerCase().includes('yesterday')
                )) {
                    return this.normalizeDate(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract company logo
     */
    extractIndeedLogo(doc) {
        const selectors = [
            '.jobsearch-InlineCompanyRating img',
            '[data-testid="company-logo"] img',
            'img[alt*="logo"]',
            'img[alt*="Logo"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const src = element.getAttribute('src') || element.getAttribute('data-src');
                if (src && (src.startsWith('http') || src.startsWith('//'))) {
                    return src.startsWith('//') ? `https:${src}` : src;
                }
            }
        }

        return '';
    }

    /**
     * Extract company information
     */
    extractIndeedCompanyInfo(doc) {
        const info = {};

        // Company rating
        const ratingSelectors = ['.icl-Ratings-starsCountWrapper', '[data-testid="company-rating"]'];
        for (const selector of ratingSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const rating = element.textContent?.trim();
                if (rating && rating.match(/\d+(\.\d+)?/)) {
                    info.rating = rating;
                }
            }
        }

        // Company reviews count
        const reviewsSelectors = ['.icl-Ratings-count'];
        for (const selector of reviewsSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const reviews = element.textContent?.trim();
                if (reviews) {
                    info.reviewsCount = reviews.replace(/[()]/g, '');
                }
            }
        }

        // Company website
        const websiteSelectors = ['[data-testid="company-website"]', 'a[rel="nofollow"]'];
        for (const selector of websiteSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const href = element.getAttribute('href');
                if (href && href.startsWith('http') && !href.includes('indeed.com')) {
                    info.website = href;
                }
            }
        }

        return Object.keys(info).length > 0 ? info : null;
    }

    /**
     * Helper: Convert HTML to readable text
     * Uses robust tag stripping to handle malformed/nested HTML
     */
    htmlToText(html) {
        // Replace <br> with newlines
        html = html.replace(/<br\s*\/?>/gi, '\n');

        // Replace </p>, </div>, </li> with newlines
        html = html.replace(/<\/(p|div|li)>/gi, '\n');

        // Add bullets to list items
        html = html.replace(/<li[^>]*>/gi, '\n• ');

        // Remove script and style elements entirely (content included)
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Robust HTML tag removal - loop until no more tags found
        // This handles nested and malformed tags
        let previousHtml;
        do {
            previousHtml = html;
            html = html.replace(/<[^>]*>/g, '');
        } while (html !== previousHtml);

        // Also remove any remaining angle brackets that might indicate malformed HTML
        html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        html = textarea.value;

        // Clean up multiple newlines
        html = html.replace(/\n{3,}/g, '\n\n');

        // Clean up extra spaces
        html = html.replace(/[ \t]+/g, ' ');

        return html.trim();
    }

    /**
     * Helper: Clean text
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    /**
     * Helper: Normalize employment type
     */
    normalizeEmploymentType(text) {
        const types = {
            'full-time': 'Full-time',
            'full time': 'Full-time',
            'part-time': 'Part-time',
            'part time': 'Part-time',
            'contract': 'Contract',
            'temporary': 'Temporary',
            'internship': 'Internship',
            'volunteer': 'Volunteer'
        };

        for (const [key, value] of Object.entries(types)) {
            if (text.includes(key)) {
                return value;
            }
        }

        return text;
    }

    /**
     * Helper: Normalize job type (remote/hybrid/on-site)
     */
    normalizeJobType(text) {
        const types = {
            'remote': 'Remote',
            'work from home': 'Remote',
            'hybrid': 'Hybrid',
            'on-site': 'On-site',
            'in-person': 'On-site'
        };

        for (const [key, value] of Object.entries(types)) {
            if (text.includes(key)) {
                return value;
            }
        }

        return text;
    }

    /**
     * Helper: Normalize shift
     */
    normalizeShift(text) {
        const shifts = {
            'day shift': 'Day Shift',
            'night shift': 'Night Shift',
            'evening shift': 'Evening Shift',
            'overnight': 'Overnight Shift',
            '8 hour shift': '8 Hour Shift',
            '10 hour shift': '10 Hour Shift',
            '12 hour shift': '12 Hour Shift'
        };

        return shifts[text] || text;
    }

    /**
     * Helper: Normalize date text
     */
    normalizeDate(text) {
        // Clean the text first
        text = text.toLowerCase().replace('posted', '').replace('updated', '').trim();

        // Handle "today"
        if (text.includes('today') || text.includes('just posted')) {
            return new Date().toISOString().split('T')[0];
        }

        // Handle "yesterday"
        if (text.includes('yesterday')) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            return date.toISOString().split('T')[0];
        }

        // Handle "X days/hours/weeks ago"
        const match = text.match(/(\d+)\s+(day|hour|week|month)s?\s+ago/i);
        if (match) {
            const amount = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            const date = new Date();
            if (unit === 'hour') {
                date.setHours(date.getHours() - amount);
            } else if (unit === 'day') {
                date.setDate(date.getDate() - amount);
            } else if (unit === 'week') {
                date.setDate(date.getDate() - (amount * 7));
            } else if (unit === 'month') {
                date.setMonth(date.getMonth() - amount);
            }

            return date.toISOString().split('T')[0];
        }

        // Handle "30+ days ago"
        if (text.includes('30+ days ago')) {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            return date.toISOString().split('T')[0];
        }

        return text;
    }
}

// Make available globally
window.IndeedParser = IndeedParser;

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndeedParser;
}
