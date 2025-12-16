// job-feeds.js - Modular Job Feed Manager
// Provides pluggable adapter system for fetching jobs from various sources

/**
 * Base adapter interface that all feed adapters should implement
 */
export class FeedAdapter {
    constructor(config = {}) {
        this.config = config;
        this.name = config.name || 'Unknown Feed';
        this.enabled = config.enabled !== false;
    }

    /**
     * Fetch jobs from the feed source
     * @param {Object} params - Search parameters (keywords, location, limit, etc.)
     * @returns {Promise<Array>} Array of standardized job objects
     */
    async fetchJobs(params = {}) {
        throw new Error('fetchJobs() must be implemented by adapter');
    }

    /**
     * Parse raw feed data into standardized job format
     * @param {*} rawData - Raw data from feed source
     * @returns {Array} Array of standardized job objects
     */
    parseJobs(rawData) {
        throw new Error('parseJobs() must be implemented by adapter');
    }

    /**
     * Get search parameter schema for this feed
     * @returns {Object} Parameter definitions
     */
    getSearchParams() {
        return {
            keywords: { type: 'text', label: 'Keywords', required: false },
            location: { type: 'text', label: 'Location', required: false },
            limit: { type: 'number', label: 'Max Results', default: 50, min: 1, max: 100 }
        };
    }

    /**
     * Validate if adapter is properly configured
     * @returns {Object} { valid: boolean, error: string }
     */
    validate() {
        return { valid: this.enabled, error: this.enabled ? null : 'Adapter is disabled' };
    }
}

/**
 * Standardized job object schema
 * Adapters should convert their data to this format
 */
export const standardJobSchema = {
    id: null,                    // Unique identifier from source
    title: '',                   // Job title
    company: '',                 // Company name
    location: '',                // Job location
    description: '',             // Full job description
    url: '',                     // Link to original posting
    datePosted: null,            // Date posted (ISO string)
    source: '',                  // Feed source name
    sourceData: {},              // Original data from source
    salary: '',                  // Salary info if available
    tags: [],                    // Extracted tags/keywords
    remote: false                // Remote position flag
};

/**
 * Main Feed Manager
 * Manages multiple feed adapters and provides unified interface
 */
export class FeedManager {
    constructor() {
        this.adapters = new Map();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        console.log('FeedManager: Initialized');
    }

    /**
     * Register a feed adapter
     * @param {string} name - Unique adapter name
     * @param {FeedAdapter} adapter - Adapter instance
     */
    registerAdapter(name, adapter) {
        if (!(adapter instanceof FeedAdapter)) {
            throw new Error('Adapter must extend FeedAdapter base class');
        }

        this.adapters.set(name, adapter);
        console.log(`FeedManager: Registered adapter "${name}"`);
    }

    /**
     * Unregister an adapter
     * @param {string} name - Adapter name
     */
    unregisterAdapter(name) {
        const removed = this.adapters.delete(name);
        if (removed) {
            console.log(`FeedManager: Unregistered adapter "${name}"`);
        }
        return removed;
    }

    /**
     * Get a registered adapter
     * @param {string} name - Adapter name
     * @returns {FeedAdapter|null}
     */
    getAdapter(name) {
        return this.adapters.get(name) || null;
    }

    /**
     * Get all registered adapters
     * @returns {Array<{name: string, adapter: FeedAdapter}>}
     */
    getAllAdapters() {
        return Array.from(this.adapters.entries()).map(([name, adapter]) => ({
            name,
            adapter,
            enabled: adapter.enabled,
            displayName: adapter.name
        }));
    }

    /**
     * Fetch jobs from a specific adapter
     * @param {string} adapterName - Name of registered adapter
     * @param {Object} params - Search parameters
     * @returns {Promise<{success: boolean, data: Array, error: string, cached: boolean}>}
     */
    async fetchJobs(adapterName, params = {}) {
        const adapter = this.getAdapter(adapterName);

        if (!adapter) {
            return {
                success: false,
                data: [],
                error: `Adapter "${adapterName}" not found`,
                cached: false
            };
        }

        // Validate adapter
        const validation = adapter.validate();
        if (!validation.valid) {
            return {
                success: false,
                data: [],
                error: validation.error,
                cached: false
            };
        }

        // Check cache
        const cacheKey = this.getCacheKey(adapterName, params);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`FeedManager: Returning cached results for "${adapterName}"`);
            return {
                success: true,
                data: cached,
                error: null,
                cached: true
            };
        }

        try {
            console.log(`FeedManager: Fetching jobs from "${adapterName}"`, params);
            const jobs = await adapter.fetchJobs(params);

            // Cache results
            this.setInCache(cacheKey, jobs);

            return {
                success: true,
                data: jobs,
                error: null,
                cached: false
            };

        } catch (error) {
            console.error(`FeedManager: Error fetching from "${adapterName}":`, error);
            return {
                success: false,
                data: [],
                error: error.message || 'Unknown error occurred',
                cached: false
            };
        }
    }

    /**
     * Fetch jobs from multiple adapters
     * @param {Array<string>} adapterNames - Array of adapter names
     * @param {Object} params - Search parameters
     * @returns {Promise<Object>} Results keyed by adapter name
     */
    async fetchFromMultiple(adapterNames, params = {}) {
        const results = {};

        await Promise.all(adapterNames.map(async (name) => {
            results[name] = await this.fetchJobs(name, params);
        }));

        return results;
    }

    /**
     * Generate cache key
     * @private
     */
    getCacheKey(adapterName, params) {
        return `${adapterName}:${JSON.stringify(params)}`;
    }

    /**
     * Get from cache if not expired
     * @private
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set in cache
     * @private
     */
    setInCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('FeedManager: Cache cleared');
    }

    /**
     * Get search parameter schema for an adapter
     * @param {string} adapterName - Adapter name
     * @returns {Object|null} Parameter schema
     */
    getSearchParamsSchema(adapterName) {
        const adapter = this.getAdapter(adapterName);
        return adapter ? adapter.getSearchParams() : null;
    }
}

// Singleton instance
let feedManagerInstance = null;

/**
 * Get or create singleton FeedManager instance
 * @returns {FeedManager}
 */
export function getFeedManager() {
    if (!feedManagerInstance) {
        feedManagerInstance = new FeedManager();
    }
    return feedManagerInstance;
}

/**
 * Helper to convert job to internal job schema
 * @param {Object} feedJob - Standardized job from feed
 * @returns {Object} Job in internal schema format
 */
export function convertToInternalJob(feedJob) {
    return {
        id: feedJob.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: feedJob.title || '',
        company: feedJob.company || '',
        location: feedJob.location || '',
        url: feedJob.url || '',
        description: feedJob.description || '',
        status: 'saved',
        dateCreated: new Date().toISOString(),
        dateApplied: null,
        resumeId: null,
        notes: '',
        salary: feedJob.salary || '',
        tags: feedJob.tags || [],
        remote: feedJob.remote || false,
        source: feedJob.source || 'feed',
        sourceData: feedJob.sourceData || {},
        statusHistory: [{
            from: null,
            to: 'saved',
            date: new Date().toISOString(),
            notes: `Imported from ${feedJob.source || 'feed'}`
        }]
    };
}
