// AI Service - Main thread interface for AI Worker
// Provides a clean API for components to interact with AI functionality

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
            this.worker = new Worker('./workers/ai-worker.js');
            
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