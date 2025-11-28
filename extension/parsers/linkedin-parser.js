// linkedin-parser.js - LinkedIn job posting parser
// Extracts job details from LinkedIn job pages

/**
 * LinkedIn Parser
 * Extracts job details from LinkedIn job postings
 */
class LinkedInParser extends GenericParser {
    constructor() {
        super();
        this.name = 'linkedin';
        this.platform = 'LinkedIn';
    }

    /**
     * Parse LinkedIn job posting
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

        // Extract using LinkedIn-specific selectors
        const job = {
            title: this.extractLinkedInTitle(doc, structured),
            company: this.extractLinkedInCompany(doc, structured),
            location: this.extractLinkedInLocation(doc, structured),
            salary: this.extractLinkedInSalary(doc, structured),
            description: this.extractLinkedInDescription(doc, structured),
            requirements: this.extractLinkedInRequirements(doc),
            benefits: this.extractLinkedInBenefits(doc),
            employmentType: this.extractLinkedInEmploymentType(doc, structured),
            seniority: this.extractLinkedInSeniority(doc),
            industry: this.extractLinkedInIndustry(doc),
            posted: this.extractLinkedInPosted(doc, structured),
            applicants: this.extractLinkedInApplicants(doc),
            url: url,
            logo: this.extractLinkedInLogo(doc),
            companyInfo: this.extractLinkedInCompanyInfo(doc)
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
    extractLinkedInTitle(doc, structured) {
        // Try structured data
        if (structured?.title) {
            return structured.title;
        }

        // LinkedIn-specific selectors (as of 2025)
        const selectors = [
            '.top-card-layout__title',
            '.topcard__title',
            'h1.t-24',
            'h1[class*="job-title"]',
            '.jobs-unified-top-card__job-title',
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

        // Fallback to generic extraction
        return this.extractTitle(doc);
    }

    /**
     * Extract company name
     */
    extractLinkedInCompany(doc, structured) {
        if (structured?.company) {
            return structured.company;
        }

        const selectors = [
            '.topcard__org-name-link',
            '.topcard__flavor--black-link',
            '.jobs-unified-top-card__company-name',
            'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
            '.company-name'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const company = element.textContent?.trim();
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
    extractLinkedInLocation(doc, structured) {
        if (structured?.location) {
            return structured.location;
        }

        const selectors = [
            '.topcard__flavor--bullet',
            '.jobs-unified-top-card__bullet',
            '.jobs-unified-top-card__workplace-type',
            '[class*="job-location"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                // Location usually contains city/state names
                if (text && (text.includes(',') || text.length > 5)) {
                    return this.cleanText(text);
                }
            }
        }

        return this.extractLocationGeneric(doc);
    }

    /**
     * Extract salary
     */
    extractLinkedInSalary(doc, structured) {
        if (structured?.salary) {
            return structured.salary;
        }

        const selectors = [
            '.salary',
            '[class*="compensation"]',
            '[class*="salary"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const salary = element.textContent?.trim();
                if (salary && (salary.includes('$') || salary.toLowerCase().includes('year'))) {
                    return this.cleanText(salary);
                }
            }
        }

        return '';
    }

    /**
     * Extract job description
     */
    extractLinkedInDescription(doc, structured) {
        if (structured?.description && structured.description.length > 100) {
            return structured.description;
        }

        const selectors = [
            '.show-more-less-html__markup',
            '.description__text',
            '.jobs-description__content',
            '[class*="job-description"]',
            '.jobs-box__html-content'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                // Get inner HTML to preserve formatting
                let description = element.innerHTML || element.textContent;

                // Convert to markdown-like format
                description = this.htmlToText(description);

                if (description && description.length > 50) {
                    return description.trim();
                }
            }
        }

        return this.extractDescription(doc);
    }

    /**
     * Extract requirements section
     */
    extractLinkedInRequirements(doc) {
        // Look for qualifications/requirements section
        const text = doc.body.textContent || '';
        const sections = this.extractSections(text);

        const requirementKeywords = [
            'qualifications',
            'requirements',
            'required skills',
            'what you bring',
            'you have',
            'what we\'re looking for'
        ];

        for (const keyword of requirementKeywords) {
            if (sections[keyword]) {
                return sections[keyword];
            }
        }

        return '';
    }

    /**
     * Extract benefits section
     */
    extractLinkedInBenefits(doc) {
        const text = doc.body.textContent || '';
        const sections = this.extractSections(text);

        const benefitKeywords = [
            'benefits',
            'perks',
            'what we offer',
            'why join us',
            'compensation and benefits'
        ];

        for (const keyword of benefitKeywords) {
            if (sections[keyword]) {
                return sections[keyword];
            }
        }

        return '';
    }

    /**
     * Extract employment type
     */
    extractLinkedInEmploymentType(doc, structured) {
        if (structured?.employmentType) {
            return structured.employmentType;
        }

        const selectors = [
            '.jobs-unified-top-card__job-insight',
            '[class*="employment-type"]'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase().trim();
                if (text && (
                    text.includes('full-time') ||
                    text.includes('part-time') ||
                    text.includes('contract') ||
                    text.includes('freelance') ||
                    text.includes('internship')
                )) {
                    return this.normalizeEmploymentType(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract seniority level
     */
    extractLinkedInSeniority(doc) {
        const selectors = [
            '.jobs-unified-top-card__job-insight',
            '[class*="seniority"]'
        ];

        const seniorityLevels = [
            'entry level',
            'associate',
            'mid-senior level',
            'senior',
            'director',
            'executive',
            'internship'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.toLowerCase().trim();
                for (const level of seniorityLevels) {
                    if (text && text.includes(level)) {
                        return this.normalizeSeniority(level);
                    }
                }
            }
        }

        return '';
    }

    /**
     * Extract industry
     */
    extractLinkedInIndustry(doc) {
        const selectors = [
            '.jobs-unified-top-card__job-insight',
            '[class*="industry"]'
        ];

        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.trim();
                // Industry names are usually capitalized and specific
                if (text && text.length > 5 && text.length < 50 &&
                    !text.toLowerCase().includes('full-time') &&
                    !text.toLowerCase().includes('applicant')) {
                    return this.cleanText(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract posted date
     */
    extractLinkedInPosted(doc, structured) {
        if (structured?.posted) {
            return structured.posted;
        }

        const selectors = [
            '.jobs-unified-top-card__posted-date',
            '[class*="posted-time"]',
            'time'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const datetime = element.getAttribute('datetime');
                if (datetime) {
                    return datetime;
                }

                const text = element.textContent?.trim();
                if (text) {
                    return this.normalizeDate(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract applicant count
     */
    extractLinkedInApplicants(doc) {
        const selectors = [
            '.jobs-unified-top-card__applicant-count',
            '[class*="applicant"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                if (text && text.match(/\d+/)) {
                    return this.cleanText(text);
                }
            }
        }

        return '';
    }

    /**
     * Extract company logo
     */
    extractLinkedInLogo(doc) {
        const selectors = [
            '.jobs-unified-top-card__company-logo img',
            '.topcard__org-logo-link img',
            'img[alt*="logo"]'
        ];

        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const src = element.getAttribute('src') || element.getAttribute('data-delayed-url');
                if (src && src.startsWith('http')) {
                    return src;
                }
            }
        }

        return '';
    }

    /**
     * Extract company information
     */
    extractLinkedInCompanyInfo(doc) {
        const info = {};

        // Company size
        const sizeSelectors = ['.jobs-unified-top-card__job-insight'];
        for (const selector of sizeSelectors) {
            const elements = doc.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.trim();
                if (text && text.includes('employees')) {
                    info.size = this.cleanText(text);
                }
            }
        }

        // Company link
        const linkSelectors = ['.topcard__org-name-link', 'a[data-tracking-control-name*="company"]'];
        for (const selector of linkSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const href = element.getAttribute('href');
                if (href && href.includes('linkedin.com/company')) {
                    info.linkedinUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
                }
            }
        }

        return Object.keys(info).length > 0 ? info : null;
    }

    /**
     * Helper: Extract sections from description text
     */
    extractSections(text) {
        const sections = {};
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let currentSection = '';
        let currentContent = [];

        for (const line of lines) {
            // Check if line is a section header
            if (this.isSectionHeader(line)) {
                // Save previous section
                if (currentSection && currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n');
                }

                // Start new section
                currentSection = line.toLowerCase().replace(/[:\-]/g, '').trim();
                currentContent = [];
            } else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n');
        }

        return sections;
    }

    /**
     * Helper: Check if line is a section header
     */
    isSectionHeader(line) {
        const headerPatterns = [
            /^(qualifications|requirements|responsibilities|about|description|skills|benefits|perks|what|why)[\s:\-]/i,
            /^[A-Z][a-zA-Z\s]+:$/,
            /^[A-Z\s]{10,}$/
        ];

        return headerPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Helper: Convert HTML to readable text
     */
    htmlToText(html) {
        // Replace <br> with newlines
        html = html.replace(/<br\s*\/?>/gi, '\n');

        // Replace </p> and </div> with double newlines
        html = html.replace(/<\/(p|div)>/gi, '\n\n');

        // Replace list items with bullets
        html = html.replace(/<li[^>]*>/gi, '\n• ');

        // Remove all other HTML tags
        html = html.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        html = textarea.value;

        // Clean up multiple newlines
        html = html.replace(/\n{3,}/g, '\n\n');

        return html.trim();
    }

    /**
     * Helper: Clean text (remove extra whitespace, etc.)
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
            'freelance': 'Freelance',
            'internship': 'Internship',
            'temporary': 'Temporary'
        };

        for (const [key, value] of Object.entries(types)) {
            if (text.includes(key)) {
                return value;
            }
        }

        return text;
    }

    /**
     * Helper: Normalize seniority level
     */
    normalizeSeniority(text) {
        const levels = {
            'entry level': 'Entry Level',
            'associate': 'Associate',
            'mid-senior level': 'Mid-Senior Level',
            'senior': 'Senior',
            'director': 'Director',
            'executive': 'Executive',
            'internship': 'Internship'
        };

        return levels[text] || text;
    }

    /**
     * Helper: Normalize date text
     */
    normalizeDate(text) {
        // "Posted 2 days ago" -> relative date
        const daysAgoMatch = text.match(/(\d+)\s+(day|hour|week|month)s?\s+ago/i);
        if (daysAgoMatch) {
            const amount = parseInt(daysAgoMatch[1]);
            const unit = daysAgoMatch[2].toLowerCase();

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
window.LinkedInParser = LinkedInParser;

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkedInParser;
}
