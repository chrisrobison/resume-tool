// AI Service - Main thread interface for AI Worker
// Provides a clean API for components to interact with AI functionality

import { getState } from './store.js';

class AIService {
    constructor() {
        this.worker = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.isReady = false;
        
        this.initWorker();
    }

    initWorker() {
        try {
            // Cache-bust the worker to avoid stale code in browsers
            const cacheBuster = `v=${Date.now()}`;
            this.worker = new Worker(`./workers/ai-worker.js?${cacheBuster}`);
            
            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event.data);
            };
            
            this.worker.onerror = (error) => {
                console.error('AI Worker error:', error);
                this.handleWorkerError(error);
            };
            
        } catch (error) {
            console.error('Failed to initialize AI Worker:', error);
            throw new Error('AI Worker not supported in this browser');
        }
    }

    handleWorkerMessage(data) {
        const { type, requestId, message, data: responseData, error, logData } = data;
        
        switch (type) {
            case 'ready':
                this.isReady = true;
                console.log('AI Worker ready');
                break;
                
            case 'progress':
                this.handleProgress(requestId, message);
                break;
                
            case 'success':
                this.handleSuccess(requestId, responseData);
                break;
                
            case 'error':
                this.handleError(requestId, error);
                break;
                
            case 'log':
                this.handleLog(logData);
                break;
                
            default:
                console.warn('Unknown message type from AI Worker:', type);
        }
    }

    async handleLog(logData) {
        try {
            // Import logging function dynamically to avoid circular dependencies
            const { logApiCall } = await import('./logs.js');
            
            // Convert worker log data to the format expected by logApiCall
            if (logData.type === 'api_request' || logData.type === 'api_response' || logData.type === 'api_error') {
                const operation = logData.operation;
                const apiType = logData.apiType;
                const requestData = logData.requestData || {};
                const response = logData.response || null;
                const error = logData.error || null;
                const metadata = {
                    processingTime: logData.processingTime,
                    tokenUsage: logData.tokenUsage,
                    ...logData.metadata
                };
                
                // Log comprehensive API data
                logApiCall(apiType, operation, requestData, response, error, metadata);
                
                console.log(`[AI ${logData.type.toUpperCase()}]`, {
                    operation,
                    apiType,
                    success: !error,
                    processingTime: logData.processingTime,
                    responseLength: response?.length || 0
                });
            }
        } catch (err) {
            console.warn('Failed to log API data:', err);
        }
    }

    handleWorkerError(error) {
        // Handle worker-level errors
        console.error('Worker error:', error);
        
        // Reject all pending requests
        for (const [requestId, request] of this.pendingRequests) {
            if (request.reject) {
                request.reject(new Error('AI Worker encountered an error'));
            }
        }
        this.pendingRequests.clear();
    }

    handleProgress(requestId, message) {
        const request = this.pendingRequests.get(requestId);
        if (request && request.onProgress) {
            request.onProgress(message);
        }
    }

    handleSuccess(requestId, data) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            this.pendingRequests.delete(requestId);
            if (request.resolve) {
                request.resolve(data);
            }
        }
    }

    handleError(requestId, error) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            this.pendingRequests.delete(requestId);
            if (request.reject) {
                request.reject(new Error(error));
            }
        }
    }

    // Public API methods

    /**
     * Tailor a resume to match a job description
     * @param {Object} options - Configuration object
     * @param {Object} options.resume - Resume data in JSON Resume format
     * @param {string} options.jobDescription - Job description text
     * @param {string} options.provider - AI provider ('claude' or 'openai')
     * @param {string} options.apiKey - API key for the provider
     * @param {boolean} options.includeAnalysis - Include match analysis in response
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with tailored resume data
     */
    async tailorResume(options) {
        return this.makeRequest('tailor-resume', options);
    }

    /**
     * Generate a cover letter
     * @param {Object} options - Configuration object
     * @param {Object} options.resume - Resume data in JSON Resume format
     * @param {string} options.jobDescription - Job description text
     * @param {Object} options.jobInfo - Job information (title, company, etc.)
     * @param {string} options.provider - AI provider ('claude' or 'openai')
     * @param {string} options.apiKey - API key for the provider
     * @param {boolean} options.includeAnalysis - Include match analysis in response
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with cover letter data
     */
    async generateCoverLetter(options) {
        return this.makeRequest('generate-cover-letter', options);
    }

    /**
     * Analyze job-resume match
     * @param {Object} options - Configuration object
     * @param {Object} options.resume - Resume data in JSON Resume format
     * @param {string} options.jobDescription - Job description text
     * @param {string} options.provider - AI provider ('claude' or 'openai')
     * @param {string} options.apiKey - API key for the provider
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with match analysis
     */
    async analyzeMatch(options) {
        return this.makeRequest('analyze-match', options);
    }

    /**
     * Parse a job posting (from URL or description) into structured data
     * @param {Object} options - Configuration object
     * @param {string} options.url - Job posting URL (optional)
     * @param {string} options.description - Job description text (optional)
     * @param {string} options.instructions - Additional parsing instructions (optional)
     * @param {string} options.provider - AI provider ('claude' or 'openai')
     * @param {string} options.apiKey - API key for the provider
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with parsed job data (object or string)
     */
    async parseJob(options) {
        return this.makeRequest('parse-job', options);
    }

    /**
     * Ingest jobs from a remote source (URL or raw content)
     * and optionally analyze match scores against a resume
     * @param {Object} options - Configuration object
     * @param {string} options.url - Source URL containing multiple job postings
     * @param {string} options.content - Raw job post content (optional alternative to URL)
     * @param {Object} options.resume - Resume data for match scoring
     * @param {Array<string>} options.keywords - Keywords to highlight/filter
     * @param {number} options.maxJobs - Maximum number of jobs to return
     * @param {boolean} options.includeAnalysis - Whether to run match analysis
     * @param {string} options.provider - AI provider ('claude', 'openai', 'webllm')
     * @param {string} options.apiKey - API key for the provider (ignored for webLLM)
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with structured job list data
     */
    async ingestJobs(options) {
        return this.makeRequest('ingest-jobs', options);
    }

    /**
     * Test an API key
     * @param {Object} options - Configuration object
     * @param {string} options.provider - AI provider ('claude' or 'openai')
     * @param {string} options.apiKey - API key to test
     * @param {Function} options.onProgress - Progress callback function
     * @returns {Promise} Promise that resolves with test result
     */
    async testApiKey(options) {
        return this.makeRequest('test-api-key', options);
    }

    /**
     * Convenience: test provider connectivity with explicit args
     * @param {string} provider - 'claude' | 'openai'
     * @param {string} apiKey - provider API key
     * @param {string} model - optional model override
     * @returns {Promise<{success:boolean,response?:any,error?:string}>}
     */
    async testConnection(provider, apiKey, model) {
        const data = await this.testApiKey({ provider, apiKey, model });
        let success = false;
        let response = data?.response ?? data?.result?.response;
        const error = data?.error;
        if (data && (data.success === true || data.result?.success === true)) {
            success = true;
        } else if (typeof data === 'string') {
            const txt = data.toLowerCase();
            success = txt.includes('api key test successful');
            response = data;
        } else if (typeof response === 'string') {
            const txt = response.toLowerCase();
            success = txt.includes('api key test successful');
        }
        return { success, response, error, raw: data };
    }

    /**
     * Make a request to the AI worker
     * @private
     */
    async makeRequest(type, options) {
        if (!this.isReady) {
            throw new Error('AI Worker not ready yet');
        }

        const requestId = ++this.requestId;
        const { onProgress, ...data } = options;

        return new Promise((resolve, reject) => {
            // Store request for response handling
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                onProgress
            });

            // Augment data with settings-driven route if not provided
            try {
                const settings = getState('settings');
                const provider = data && data.provider;
                if (provider && (!data.route || typeof data.route !== 'string')) {
                    const providerCfg = settings?.apiProviders?.[provider];
                    if (providerCfg && providerCfg.route) {
                        data.route = providerCfg.route;
                    }
                }
            } catch (e) {
                // Non-fatal: proceed without settings
            }

            // Send request to worker
            this.worker.postMessage({
                type,
                requestId,
                data
            });

            // Set timeout for request (5 minutes)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('AI request timed out'));
                }
            }, 5 * 60 * 1000);
        });
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests() {
        for (const [requestId, request] of this.pendingRequests) {
            if (request.reject) {
                request.reject(new Error('Request cancelled'));
            }
        }
        this.pendingRequests.clear();
    }

    /**
     * Get the number of pending requests
     */
    getPendingRequestCount() {
        return this.pendingRequests.size;
    }

    /**
     * Check if worker is ready
     */
    isWorkerReady() {
        return this.isReady;
    }

    /**
     * Terminate the worker (cleanup)
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            this.pendingRequests.clear();
        }
    }
}

// Create singleton instance
const aiService = new AIService();

// Export both the class and singleton instance
export { AIService, aiService as default };
