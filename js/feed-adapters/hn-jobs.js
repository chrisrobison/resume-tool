// hn-jobs.js - Hacker News Who is Hiring Feed Adapter
// Fetches jobs from HN RSS feed (https://hnrss.org/)

import { FeedAdapter } from '../job-feeds.js';

/**
 * Hacker News Jobs Feed Adapter
 * Uses hnrss.org to fetch "Who is Hiring?" posts
 */
export class HNJobsAdapter extends FeedAdapter {
    constructor(config = {}) {
        super({
            name: 'Hacker News Jobs',
            enabled: true,
            ...config
        });

        // Base URL for HN RSS feed
        this.baseUrl = config.baseUrl || 'https://hnrss.org/whoishiring/jobs.jsonfeed';

        // Default parameters
        this.defaults = {
            count: 50,
            ...config.defaults
        };

        console.log('HNJobsAdapter: Initialized with base URL:', this.baseUrl);
    }

    /**
     * Fetch jobs from HN RSS feed
     * @param {Object} params - Search parameters
     * @param {string} params.keywords - Keywords to search for
     * @param {string} params.location - Location filter
     * @param {number} params.limit - Maximum number of results
     * @returns {Promise<Array>} Array of standardized job objects
     */
    async fetchJobs(params = {}) {
        const {
            keywords = '',
            location = '',
            limit = this.defaults.count
        } = params;

        // Build query string
        const queryParts = [];
        if (keywords) queryParts.push(keywords);
        if (location) queryParts.push(location);
        const query = queryParts.join(' ');

        // Build URL
        const url = new URL(this.baseUrl);
        url.searchParams.set('count', limit);
        if (query) {
            url.searchParams.set('q', query);
        }

        console.log('HNJobsAdapter: Fetching from:', url.toString());

        try {
            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('HNJobsAdapter: Received data:', data);

            return this.parseJobs(data);

        } catch (error) {
            console.error('HNJobsAdapter: Fetch error:', error);
            throw new Error(`Failed to fetch HN jobs: ${error.message}`);
        }
    }

    /**
     * Parse HN JSON Feed into standardized job format
     * @param {Object} feedData - JSON Feed format data
     * @returns {Array} Standardized job objects
     */
    parseJobs(feedData) {
        if (!feedData || !feedData.items || !Array.isArray(feedData.items)) {
            console.warn('HNJobsAdapter: Invalid feed data structure');
            return [];
        }

        console.log(`HNJobsAdapter: Parsing ${feedData.items.length} items`);

        return feedData.items.map((item, index) => {
            try {
                return this.parseJobItem(item);
            } catch (error) {
                console.error(`HNJobsAdapter: Error parsing item ${index}:`, error);
                return null;
            }
        }).filter(job => job !== null);
    }

    /**
     * Parse a single HN job item
     * @param {Object} item - Single JSON Feed item
     * @returns {Object} Standardized job object
     */
    parseJobItem(item) {
        // Extract basic info
        const id = item.id || `hn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = item.url || item.external_url || '';
        const datePosted = item.date_published || new Date().toISOString();

        // Parse title and content
        const title = this.extractTitle(item.title || '');
        const { company, location, description, remote, tags } = this.parseContent(item.content_html || item.content_text || '');

        return {
            id,
            title: title || 'Untitled Position',
            company: company || 'Unknown Company',
            location: location || 'Not specified',
            description,
            url,
            datePosted,
            source: 'Hacker News',
            sourceData: {
                hnId: item.id,
                author: item.author?.name || 'unknown',
                raw: item
            },
            salary: '',  // HN posts don't usually have structured salary
            tags,
            remote
        };
    }

    /**
     * Extract job title from HN post title
     * HN titles are usually in format: "Company (Location) | Position"
     * @param {string} hnTitle - Original HN post title
     * @returns {string} Extracted job title
     */
    extractTitle(hnTitle) {
        // Remove common prefixes
        let title = hnTitle.replace(/^Ask HN:\s*/i, '');

        // Try to extract position from common patterns
        // Pattern: "Company (Location) | Position"
        const pipeMatch = title.match(/\|\s*(.+)$/);
        if (pipeMatch) {
            return pipeMatch[1].trim();
        }

        // Pattern: "Company - Position"
        const dashMatch = title.match(/\s+-\s+(.+)$/);
        if (dashMatch) {
            return dashMatch[1].trim();
        }

        // Return cleaned title
        return title.trim();
    }

    /**
     * Parse HTML/text content to extract job details
     * @param {string} content - HTML or plain text content
     * @returns {Object} Extracted details
     */
    parseContent(content) {
        // Strip HTML tags
        const text = this.stripHtml(content);

        // Extract company (usually at the start)
        const companyMatch = text.match(/^([A-Z][^|\n]+?)(?:\s*\||:|\n)/);
        const company = companyMatch ? companyMatch[1].trim() : '';

        // Extract location
        const location = this.extractLocation(text);

        // Check for remote
        const remote = /\b(remote|work from home|wfh|distributed)\b/i.test(text);

        // Extract tags/keywords
        const tags = this.extractTags(text);

        return {
            company,
            location,
            description: text,
            remote,
            tags
        };
    }

    /**
     * Strip HTML tags from content
     * @param {string} html - HTML content
     * @returns {string} Plain text
     */
    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Extract location from text
     * @param {string} text - Job description text
     * @returns {string} Location
     */
    extractLocation(text) {
        // Look for common location patterns
        const patterns = [
            /Location:?\s*([^|\n]+)/i,
            /\(([^)]+(?:CA|NY|TX|FL|WA|MA|CO|OR|IL|GA|NC|VA|Remote)[^)]*)\)/,
            /\b(San Francisco|New York|Seattle|Austin|Boston|Remote|Los Angeles|Chicago|Denver|Portland)\b/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return '';
    }

    /**
     * Extract relevant tags/keywords from text
     * @param {string} text - Job description text
     * @returns {Array<string>} Tags
     */
    extractTags(text) {
        const tags = new Set();

        // Common tech keywords
        const keywords = [
            'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'ruby',
            'react', 'vue', 'angular', 'node', 'nodejs', 'express', 'django', 'flask',
            'frontend', 'backend', 'fullstack', 'full-stack', 'devops', 'ml', 'ai',
            'senior', 'junior', 'staff', 'principal', 'lead', 'manager',
            'remote', 'onsite', 'hybrid'
        ];

        const lowerText = text.toLowerCase();
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                tags.add(keyword);
            }
        });

        return Array.from(tags);
    }

    /**
     * Get search parameter schema for HN Jobs
     * @returns {Object} Parameter definitions
     */
    getSearchParams() {
        return {
            keywords: {
                type: 'text',
                label: 'Keywords',
                placeholder: 'e.g., "Senior Engineer" or "React"',
                required: false,
                help: 'Search for keywords in job titles and descriptions'
            },
            location: {
                type: 'text',
                label: 'Location',
                placeholder: 'e.g., San Francisco, Remote',
                required: false,
                help: 'Filter by location (city, state, or "Remote")'
            },
            limit: {
                type: 'number',
                label: 'Max Results',
                default: 50,
                min: 1,
                max: 100,
                required: false,
                help: 'Maximum number of jobs to fetch'
            }
        };
    }

    /**
     * Validate adapter configuration
     * @returns {Object} Validation result
     */
    validate() {
        if (!this.enabled) {
            return { valid: false, error: 'HN Jobs adapter is disabled' };
        }

        if (!this.baseUrl) {
            return { valid: false, error: 'Base URL not configured' };
        }

        return { valid: true, error: null };
    }
}

// Export factory function for easy instantiation
export function createHNJobsAdapter(config = {}) {
    return new HNJobsAdapter(config);
}

// Export default instance
export default new HNJobsAdapter();
