// glassdoor-parser.js - Glassdoor job posting parser
// Extracts job details from Glassdoor job pages

/**
 * Glassdoor Parser
 * Extracts job details from Glassdoor job postings
 */
class GlassdoorParser extends GenericParser {
    constructor() {
        super();
        this.name = 'glassdoor';
        this.platform = 'Glassdoor';
    }

    /**
     * Parse Glassdoor job posting
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

        // Extract using Glassdoor-specific selectors
        const job = {
            title: this.extractGlassdoorTitle(doc, structured),
            company: this.extractGlassdoorCompany(doc, structured),
            location: this.extractGlassdoorLocation(doc, structured),
            salary: this.extractGlassdoorSalary(doc, structured),
            description: this.extractGlassdoorDescription(doc, structured),
            requirements: '',
            benefits: '',
            employmentType: this.extractGlassdoorEmploymentType(doc),
            posted: this.extractGlassdoorPosted(doc, structured),
            url: url,
            logo: this.extractGlassdoorLogo(doc),
            companyInfo: this.extractGlassdoorCompanyInfo(doc)
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
    extractGlassdoorTitle(doc, structured) {
        if (structured?.title) {
            return structured.title;
        }

        // Glassdoor-specific selectors
        const selectors = [
            '[data-test="job-title"]',
            '.job-title',
            'h1[class*="JobDetails"]',
            '[class*="JobTitle"]',
            'h1'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const title = element.textContent?.trim();
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
    extractGlassdoorCompany(doc, structured) {
        if (structured?.company) {
            return structured.company;
        }

        const selectors = [
            '[data-test="employer-name"]',
            '[data-test="employerName"]',
            '.employer-name',
            '[class*="EmployerProfile_employerName"]',
            'a[data-test="employer-short-name"]'
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
    extractGlassdoorLocation(doc, structured) {
        if (structured?.location) {
            return structured.location;
        }

        const selectors = [
            '[data-test="location"]',
            '[data-test="job-location"]',
            '.location',
            '[class*="JobDetails_location"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const location = element.textContent?.trim();
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
    extractGlassdoorSalary(doc, structured) {
        if (structured?.salary) {
            return structured.salary;
        }

        const selectors = [
            '[data-test="detailSalary"]',
            '[class*="SalaryEstimate"]',
            '[data-test="salary"]',
            '.salary'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const salary = element.textContent?.trim();
                if (salary && (
                    salary.includes('$') ||
                    salary.includes('K') ||
                    salary.includes('k') ||
                    salary.toLowerCase().includes('year') ||
                    salary.toLowerCase().includes('hour')
                )) {
                    // Extract just the salary part, remove estimate labels
                    return this.cleanSalary(salary);
                }
            }
        }

        return '';
    }

    /**
     * Extract job description
     */
    extractGlassdoorDescription(doc, structured) {
        if (structured?.description && structured.description.length > 100) {
            return structured.description;
        }

        const selectors = [
            '[data-test="jobDescriptionContent"]',
            '[class*="JobDetails_jobDescription"]',
            '.jobDescriptionContent',
            '#JobDescContainer',
            '[class*="desc"]'
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
    extractGlassdoorEmploymentType(doc) {
        const selectors = [
            '[data-test="job-type"]',
            '[class*="JobType"]',
            '[class*="employmentType"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
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
     * Extract posted date
     */
    extractGlassdoorPosted(doc, structured) {
        if (structured?.posted) {
            return structured.posted;
        }

        const selectors = [
            '[data-test="job-age"]',
            '[class*="JobAge"]',
            '[class*="posted"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                if (text && (
                    text.toLowerCase().includes('posted') ||
                    text.toLowerCase().includes('ago') ||
                    text.toLowerCase().includes('day') ||
                    text.toLowerCase().includes('hour')
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
    extractGlassdoorLogo(doc) {
        const selectors = [
            '[data-test="employer-logo"] img',
            '.employer-logo img',
            '[class*="EmployerLogo"] img',
            'img[alt*="logo"]'
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
    extractGlassdoorCompanyInfo(doc) {
        const info = {};

        // Company rating
        const ratingSelectors = [
            '[data-test="rating"]',
            '[class*="rating"]',
            '.rating'
        ];

        for (const selector of ratingSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const rating = element.textContent?.trim();
                if (rating && rating.match(/\d+(\.\d+)?/)) {
                    info.rating = rating;
                    break;
                }
            }
        }

        // Company size
        const sizeSelectors = [
            '[data-test="employer-size"]',
            '[class*="Size"]'
        ];

        for (const selector of sizeSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const size = element.textContent?.trim();
                if (size && (size.includes('employees') || size.includes('to'))) {
                    info.size = this.cleanText(size);
                    break;
                }
            }
        }

        // Industry
        const industrySelectors = [
            '[data-test="employer-industry"]',
            '[class*="Industry"]'
        ];

        for (const selector of industrySelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const industry = element.textContent?.trim();
                if (industry && industry.length > 3 && industry.length < 100) {
                    info.industry = this.cleanText(industry);
                    break;
                }
            }
        }

        // Company website
        const websiteSelectors = [
            '[data-test="employer-website"]',
            'a[href*="www."]'
        ];

        for (const selector of websiteSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const href = element.getAttribute('href');
                if (href && href.startsWith('http') && !href.includes('glassdoor.com')) {
                    info.website = href;
                    break;
                }
            }
        }

        // Reviews count
        const reviewsSelectors = [
            '[data-test="employer-reviews"]',
            '[class*="ReviewsCount"]'
        ];

        for (const selector of reviewsSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const reviews = element.textContent?.trim();
                if (reviews && reviews.match(/\d+/)) {
                    info.reviewsCount = reviews;
                    break;
                }
            }
        }

        return Object.keys(info).length > 0 ? info : null;
    }

    /**
     * Helper: Clean salary text
     */
    cleanSalary(text) {
        // Remove estimate labels
        text = text.replace(/employer provided salary:/i, '')
                   .replace(/estimated:/i, '')
                   .replace(/\(glassdoor est\.\)/i, '')
                   .replace(/glassdoor estimate/i, '')
                   .trim();

        return this.cleanText(text);
    }

    /**
     * Helper: Convert HTML to readable text
     */
    htmlToText(html) {
        // Replace <br> with newlines
        html = html.replace(/<br\s*\/?>/gi, '\n');

        // Replace closing tags with newlines
        html = html.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');

        // Add bullets to list items
        html = html.replace(/<li[^>]*>/gi, '\n• ');

        // Add emphasis to headers
        html = html.replace(/<h[1-6][^>]*>/gi, '\n\n## ');

        // Remove all other HTML tags
        html = html.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        html = textarea.value;

        // Clean up multiple newlines
        html = html.replace(/\n{3,}/g, '\n\n');

        // Clean up spaces
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
            'contractor': 'Contract',
            'temporary': 'Temporary',
            'temp': 'Temporary',
            'internship': 'Internship',
            'intern': 'Internship'
        };

        for (const [key, value] of Object.entries(types)) {
            if (text.includes(key)) {
                return value;
            }
        }

        return text;
    }

    /**
     * Helper: Normalize date text
     */
    normalizeDate(text) {
        // Clean the text
        text = text.toLowerCase().replace('posted', '').replace('updated', '').trim();

        // Handle "today"
        if (text.includes('today')) {
            return new Date().toISOString().split('T')[0];
        }

        // Handle "yesterday"
        if (text.includes('yesterday')) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            return date.toISOString().split('T')[0];
        }

        // Handle "X days/hours/weeks ago"
        const match = text.match(/(\d+)[+]?\s+(day|hour|week|month)s?\s+ago/i);
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

        return text;
    }
}

// Make available globally
window.GlassdoorParser = GlassdoorParser;

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlassdoorParser;
}
