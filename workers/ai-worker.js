// AI Worker - Handles all AI API interactions in a separate thread
// This prevents UI blocking during potentially long AI operations

class AIWorker {
    constructor() {
        this.pendingRequests = new Map();
        this.requestId = 0;
        
        // Listen for messages from main thread
        self.addEventListener('message', this.handleMessage.bind(this));
        
        // Send ready signal
        self.postMessage({ type: 'ready' });
    }

    handleMessage(event) {
        const { type, data, requestId } = event.data;
        
        switch (type) {
            case 'tailor-resume':
                this.handleTailorResume(data, requestId);
                break;
            case 'generate-cover-letter':
                this.handleGenerateCoverLetter(data, requestId);
                break;
            case 'analyze-match':
                this.handleAnalyzeMatch(data, requestId);
                break;
            case 'parse-job':
                this.handleParseJob(data, requestId);
                break;
            case 'ingest-jobs':
                this.handleIngestJobs(data, requestId);
                break;
            case 'test-api-key':
                this.handleTestApiKey(data, requestId);
                break;
            default:
                this.postError(`Unknown message type: ${type}`, requestId);
        }
    }

    async handleTailorResume(data, requestId) {
        try {
            this.postProgress('Starting resume tailoring...', requestId);

            // Debug logging
            console.log('Worker handleTailorResume - Received data:', data);

            const { resume, jobDescription, providerList, provider, apiKey, model, includeAnalysis = false, route = 'auto' } = data;

            // Set metadata for logging
            this.currentOperation = 'tailor_resume';
            this.currentRequestData = { resume, jobDescription, includeAnalysis };

            // Debug individual parameters
            console.log('Worker - resume:', !!resume);
            console.log('Worker - jobDescription:', !!jobDescription, jobDescription?.substring(0, 100));
            console.log('Worker - providerList:', providerList);
            console.log('Worker - provider (legacy):', provider);

            // Validate inputs
            if (!resume || !jobDescription) {
                const missing = [];
                if (!resume) missing.push('resume');
                if (!jobDescription) missing.push('jobDescription');
                throw new Error(`Missing required parameters for resume tailoring: ${missing.join(', ')}`);
            }

            // Handle both new (providerList) and legacy (provider/apiKey/model) formats
            let providers = providerList;
            if (!providers || providers.length === 0) {
                // Legacy format fallback
                if (provider) {
                    providers = [{ provider, apiKey: apiKey || '', model: model || '', route: route || 'auto' }];
                } else {
                    throw new Error('No AI providers configured');
                }
            }

            let prompt = this.buildTailorResumePrompt(resume, jobDescription, includeAnalysis);

            this.postProgress('Sending request to AI service...', requestId);

            const { result, usedProvider, usedModel } = await this.makeAIRequestWithFallback(providers, prompt, requestId);

            this.postProgress('Processing AI response...', requestId);

            const parsedResult = this.parseAIResponse(result, 'tailor-resume');

            this.postSuccess({
                type: 'tailor-resume',
                result: parsedResult,
                originalResume: resume,
                jobDescription: jobDescription,
                provider: usedProvider,
                usedProvider,
                usedModel,
                timestamp: new Date().toISOString()
            }, requestId);

        } catch (error) {
            this.postError(`Resume tailoring failed: ${error.message}`, requestId);
        }
    }

    async handleGenerateCoverLetter(data, requestId) {
        try {
            this.postProgress('Starting cover letter generation...', requestId);
            // Set metadata for logging/proxy
            this.currentOperation = 'generate_cover_letter';
            this.currentRequestData = { resume: data?.resume, jobDescription: data?.jobDescription, jobInfo: data?.jobInfo, includeAnalysis: data?.includeAnalysis };

            const { resume, jobDescription, jobInfo, providerList, provider, apiKey, model, includeAnalysis = true, route = 'auto' } = data;

            if (!resume || !jobDescription) {
                throw new Error('Missing required parameters for cover letter generation');
            }

            // Handle both new (providerList) and legacy formats
            let providers = providerList;
            if (!providers || providers.length === 0) {
                if (provider) {
                    providers = [{ provider, apiKey: apiKey || '', model: model || '', route: route || 'auto' }];
                } else {
                    throw new Error('No AI providers configured');
                }
            }

            let prompt = this.buildCoverLetterPrompt(resume, jobDescription, jobInfo, includeAnalysis);

            this.postProgress('Generating cover letter with AI...', requestId);

            const { result, usedProvider, usedModel } = await this.makeAIRequestWithFallback(providers, prompt, requestId);

            this.postProgress('Processing cover letter response...', requestId);

            const parsedResult = this.parseAIResponse(result, 'cover-letter');

            this.postSuccess({
                type: 'cover-letter',
                result: parsedResult,
                jobInfo: jobInfo,
                provider: usedProvider,
                usedProvider,
                usedModel,
                timestamp: new Date().toISOString()
            }, requestId);

        } catch (error) {
            this.postError(`Cover letter generation failed: ${error.message}`, requestId);
        }
    }

    async handleAnalyzeMatch(data, requestId) {
        try {
            this.postProgress('Starting job-resume match analysis...', requestId);
            // Set metadata for logging/proxy
            this.currentOperation = 'analyze_match';
            this.currentRequestData = { resume: data?.resume, jobDescription: data?.jobDescription };

            const { resume, jobDescription, providerList, provider, apiKey, model, route = 'auto' } = data;

            if (!resume || !jobDescription) {
                throw new Error('Missing required parameters for match analysis');
            }

            // Handle both new (providerList) and legacy formats
            let providers = providerList;
            if (!providers || providers.length === 0) {
                if (provider) {
                    providers = [{ provider, apiKey: apiKey || '', model: model || '', route: route || 'auto' }];
                } else {
                    throw new Error('No AI providers configured');
                }
            }

            let prompt = this.buildMatchAnalysisPrompt(resume, jobDescription);

            this.postProgress('Analyzing match with AI...', requestId);

            const { result, usedProvider, usedModel } = await this.makeAIRequestWithFallback(providers, prompt, requestId);

            this.postProgress('Processing match analysis...', requestId);

            const parsedResult = this.parseAIResponse(result, 'match-analysis');

            this.postSuccess({
                type: 'match-analysis',
                result: parsedResult,
                provider: usedProvider,
                usedProvider,
                usedModel,
                timestamp: new Date().toISOString()
            }, requestId);

        } catch (error) {
            this.postError(`Match analysis failed: ${error.message}`, requestId);
        }
    }

    async handleParseJob(data, requestId) {
        try {
            this.postProgress('Starting job parsing...', requestId);
            // Set metadata for logging/proxy
            this.currentOperation = 'parse-job';
            this.currentRequestData = { url: data?.url, description: data?.description, instructions: data?.instructions };

            const { url, description, instructions, provider, apiKey, model, route = 'auto' } = data;

            if (!provider || (provider !== 'browser' && !apiKey)) {
                throw new Error('Missing provider or apiKey for parse-job');
            }

            // Build parsing prompt
            let prompt = `You are an expert at extracting structured data from job postings. Return ONLY a JSON object (no surrounding text) with the following keys if available: title, company, location, description, requirements, skills, seniority, employmentType, postedDate, applyUrl, rawText.\n`;
            if (instructions) {
                prompt += `Additional instructions: ${instructions}\n`;
            }

            let aiResponse;

            if (url) {
                // Ask the server proxy to fetch the URL and run the AI on the fetched content
                prompt += "Fetch the page content from the provided URL on the server and extract the job posting information. Use the page text to populate the fields.\n";
                const metadata = { operation: 'parse-job', targetUrl: url };
                // If route explicitly requests direct, avoid server-side fetch
                if (route === 'direct') {
                    throw new Error('Direct parsing from URL is not supported from the browser due to CORS; use Proxy or Auto');
                }
                aiResponse = await this.callServerAPI(provider, apiKey, prompt, requestId, metadata, model);
            } else if (description) {
                prompt += `Job description:\n${description}\n`;
                // Use direct AI request for raw description
                aiResponse = await this.makeAIRequest(provider, apiKey, prompt, requestId, model, route);
            } else {
                throw new Error('No URL or description provided for parse-job');
            }

            // Attempt to extract assistant content and parse JSON
            let parsed = null;
            // Helper: try to parse a JSON substring from text
            const tryParseFromText = (text) => {
                if (!text || typeof text !== 'string') return null;
                let t = text.trim();
                // Remove markdown code fences if present
                t = t.replace(/```json\s*/i, '```');
                const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                if (fenceMatch && fenceMatch[1]) {
                    try {
                        return JSON.parse(fenceMatch[1].trim());
                    } catch (e) {
                        // fallthrough to other attempts
                    }
                }

                // Try to find the first {...} block
                const objMatch = t.match(/\{[\s\S]*\}/);
                if (objMatch) {
                    try {
                        return JSON.parse(objMatch[0]);
                    } catch (e) {
                        return null;
                    }
                }

                // Try whole-text parse as last resort
                try {
                    return JSON.parse(t);
                } catch (e) {
                    return null;
                }
            };

            // If the AI response is already an object, try to extract assistant content shapes
            if (typeof aiResponse === 'object' && aiResponse !== null) {
                // OpenAI chat completion shape
                if (aiResponse.choices && aiResponse.choices[0]) {
                    const choice = aiResponse.choices[0];
                    const msg = choice.message || choice;
                    const content = msg?.content || msg?.text || choice?.text || null;
                    if (typeof content === 'string') {
                        parsed = tryParseFromText(content) || tryParseFromText(JSON.stringify(content));
                    } else if (typeof content === 'object') {
                        // Some Responses API shapes return arrays under content
                        const arr = Array.isArray(content) ? content : (content?.content || []);
                        if (Array.isArray(arr)) {
                            const outText = arr.map(c => (c?.text || c?.content || '')).join('\n');
                            parsed = tryParseFromText(outText) || tryParseFromText(JSON.stringify(outText));
                        }
                    }
                }

                // OpenAI Responses API simple output_text
                if (!parsed && typeof aiResponse.output_text === 'string') {
                    parsed = tryParseFromText(aiResponse.output_text);
                }

                // Claude style nested content
                if (!parsed && aiResponse.content && typeof aiResponse.content === 'string') {
                    parsed = tryParseFromText(aiResponse.content);
                }

                // If still not parsed, maybe the object already *is* the parsed job
                if (!parsed) {
                    // Heuristic: check for expected keys
                    const hasKeys = ['title','company','location','description','requirements','skills'].some(k => k in aiResponse);
                    if (hasKeys) parsed = aiResponse;
                }
            }

            // If aiResponse is a string, run parsing attempts on the string
            if (!parsed && typeof aiResponse === 'string') {
                // If the server returned a provider envelope as JSON string, try to parse that first
                let envelope = null;
                try {
                    envelope = JSON.parse(aiResponse);
                } catch (e) {
                    envelope = null;
                }

                if (envelope && typeof envelope === 'object') {
                    // Re-run extraction on the envelope object
                    if (envelope.choices && envelope.choices[0]) {
                        const content = envelope.choices[0].message?.content || envelope.choices[0].message?.text || envelope.choices[0].text || null;
                        if (content) parsed = tryParseFromText(typeof content === 'string' ? content : JSON.stringify(content));
                    }
                    if (!parsed && typeof envelope.output_text === 'string') {
                        parsed = tryParseFromText(envelope.output_text);
                    }
                    if (!parsed && envelope.response) {
                        parsed = tryParseFromText(typeof envelope.response === 'string' ? envelope.response : JSON.stringify(envelope.response));
                    }
                }

                // Last resort: try to extract a JSON block from the raw string
                if (!parsed) {
                    parsed = tryParseFromText(aiResponse);
                }
            }

            if (!parsed) {
                // If parsing failed, return raw text/envelope in a structured envelope
                this.postSuccess({ type: 'parse-job', result: null, raw: aiResponse }, requestId);
                return;
            }

            // Return the parsed job object
            this.postSuccess({ type: 'parse-job', result: parsed }, requestId);

        } catch (error) {
            this.postError(`Job parsing failed: ${error.message}`, requestId);
        }
    }

    async handleIngestJobs(data, requestId) {
        const startTime = Date.now();
        try {
            this.postProgress('Starting job ingestion...', requestId);

            const {
                url,
                content,
                description,
                provider,
                apiKey,
                resume,
                model,
                includeAnalysis = true,
                keywords = [],
                maxJobs = 20,
                route = 'auto',
                instructions = ''
            } = data || {};

            if (!provider || !apiKey) {
                throw new Error('Missing provider or API key for job ingestion');
            }

            if (!url && !content && !description) {
                throw new Error('Provide a URL or job content to ingest');
            }

            this.currentOperation = 'ingest-jobs';
            const normalizedKeywords = Array.isArray(keywords)
                ? keywords.map(kw => kw && typeof kw === 'string' ? kw.trim() : kw).filter(Boolean)
                : (typeof keywords === 'string' && keywords.trim().length > 0
                    ? keywords.split(/[,;]/).map(kw => kw.trim()).filter(Boolean)
                    : []);
            this.currentRequestData = {
                url,
                keywords: normalizedKeywords,
                maxJobs,
                includeAnalysis
            };

            const promptOptions = {
                content: content || description || '',
                keywords: normalizedKeywords,
                maxJobs,
                instructions,
                sourceUrl: url || null
            };

            const basePrompt = this.buildJobListPrompt(promptOptions);
            let aiResponse;

            if (url) {
                if (route === 'direct') {
                    throw new Error('Direct ingestion from URL is not supported; use proxy or auto routing');
                }
                this.postProgress('Fetching job source via server proxy...', requestId);
                const metadata = {
                    operation: 'parse-job-list',
                    targetUrl: url,
                    instructions,
                    jobFilters: { keywords: normalizedKeywords, maxJobs }
                };
                aiResponse = await this.callServerAPI(provider, apiKey, basePrompt, requestId, metadata, model);
            } else {
                this.postProgress('Parsing provided job content...', requestId);
                aiResponse = await this.makeAIRequest(provider, apiKey, basePrompt, requestId, model, route);
            }

            const parsedJobs = this.parseJobListResponse(aiResponse, {
                sourceUrl: url,
                keywords: normalizedKeywords
            });

            if (!Array.isArray(parsedJobs) || parsedJobs.length === 0) {
                this.postSuccess({
                    type: 'ingest-jobs',
                    jobs: [],
                    metadata: {
                        sourceUrl: url || null,
                        keywords: normalizedKeywords,
                        maxJobs,
                        includeAnalysis: includeAnalysis && !!resume,
                        processedJobs: 0,
                        processingTimeMs: Date.now() - startTime
                    },
                    raw: aiResponse
                }, requestId);
                return;
            }

            const limitedJobs = parsedJobs.slice(0, Math.max(1, maxJobs));

            let scoredJobs = limitedJobs;
            if (resume && includeAnalysis) {
                const results = [];

                for (let i = 0; i < limitedJobs.length; i++) {
                    const jobEntry = limitedJobs[i];
                    const descriptionText = this.buildJobDescriptionText(jobEntry);

                    if (!descriptionText) {
                        results.push({
                            ...jobEntry,
                            matchScore: null,
                            matchAnalysis: null,
                            matchStatus: 'missing-description'
                        });
                        continue;
                    }

                    this.postProgress(`Scoring job ${i + 1} of ${limitedJobs.length}...`, requestId);

                    this.currentOperation = 'analyze_match';
                    this.currentRequestData = {
                        resume,
                        jobDescription: descriptionText,
                        includeAnalysis: true
                    };

                    const matchPrompt = this.buildMatchAnalysisPrompt(resume, descriptionText);

                    try {
                        const matchResponse = await this.makeAIRequest(provider, apiKey, matchPrompt, requestId, model, route);
                        const parsedAnalysis = this.parseAIResponse(matchResponse, 'match-analysis');
                        const analysis = parsedAnalysis?.analysis || null;

                        results.push({
                            ...jobEntry,
                            matchScore: analysis?.overallScore ?? null,
                            matchAnalysis: analysis || null,
                            matchStatus: analysis ? 'analyzed' : 'no-analysis'
                        });
                    } catch (analysisError) {
                        results.push({
                            ...jobEntry,
                            matchScore: null,
                            matchAnalysis: null,
                            matchStatus: 'analysis-failed',
                            matchError: analysisError?.message || String(analysisError)
                        });
                    }
                }

                scoredJobs = results;
            }

            this.postSuccess({
                type: 'ingest-jobs',
                jobs: scoredJobs,
                metadata: {
                    sourceUrl: url || null,
                    keywords: normalizedKeywords,
                    maxJobs,
                    includeAnalysis: includeAnalysis && !!resume,
                    processedJobs: scoredJobs.length,
                    processingTimeMs: Date.now() - startTime
                }
            }, requestId);

        } catch (error) {
            this.postError(`Job ingestion failed: ${error.message}`, requestId);
        } finally {
            this.currentOperation = 'ingest-jobs';
            this.currentRequestData = null;
        }
    }

    async handleTestApiKey(data, requestId) {
        try {
            this.postProgress('Testing API key...', requestId);

            // Set metadata for logging/proxy
            this.currentOperation = 'test-api-key';
            this.currentRequestData = { provider: data?.provider };

            const { provider, apiKey, model, route = 'auto' } = data;

            if (!provider || (provider !== 'browser' && !apiKey)) {
                throw new Error('Missing provider or API key');
            }

            // Simple test prompt
            const testPrompt = 'Respond with exactly: "API key test successful"';

            const result = await this.makeAIRequest(provider, apiKey, testPrompt, requestId, model, route);

            this.postSuccess({
                type: 'api-test',
                success: true,
                response: result,
                provider: provider,
                timestamp: new Date().toISOString()
            }, requestId);

        } catch (error) {
            this.postError(`API key test failed: ${error.message}`, requestId);
        }
    }

    /**
     * Make AI request with automatic provider fallback
     * Tries each provider in order until one succeeds
     * @param {Array} providers - Array of provider configs: [{provider, apiKey, model, route}]
     * @param {string} prompt - The prompt to send
     * @param {number} requestId - Request ID for progress updates
     * @returns {Promise<{result, usedProvider, usedModel}>} The result and provider info
     */
    async makeAIRequestWithFallback(providers, prompt, requestId) {
        const errors = [];

        for (let i = 0; i < providers.length; i++) {
            const providerConfig = providers[i];
            const { provider, apiKey, model, route } = providerConfig;

            try {
                this.postProgress(`Trying provider ${i + 1}/${providers.length}: ${provider}...`, requestId);

                const result = await this.makeAIRequest(provider, apiKey, prompt, requestId, model, route);

                // Success! Return result with provider info
                this.postProgress(`Successfully connected using ${provider}`, requestId);
                return {
                    result,
                    usedProvider: provider,
                    usedModel: model || 'default'
                };

            } catch (error) {
                console.error(`Provider ${provider} failed:`, error.message);
                errors.push({ provider, error: error.message });

                // Intelligent error handling - decide whether to try next provider
                const errorType = this.classifyError(error);

                if (errorType === 'authentication') {
                    // Auth failed - try next provider immediately
                    this.postProgress(`${provider} authentication failed, trying next provider...`, requestId);
                    continue;
                }

                if (errorType === 'rate_limit') {
                    // Rate limited - try next provider (could add delay if we want)
                    this.postProgress(`${provider} rate limited, trying next provider...`, requestId);
                    continue;
                }

                if (errorType === 'cors' || errorType === 'network') {
                    // Network/CORS issue - try next provider
                    this.postProgress(`${provider} connection failed, trying next provider...`, requestId);
                    continue;
                }

                if (errorType === 'invalid_request') {
                    // Invalid request - likely won't work with other providers either, but try anyway
                    this.postProgress(`${provider} rejected request, trying next provider...`, requestId);
                    continue;
                }

                // Unknown error - try next provider
                this.postProgress(`${provider} failed with unknown error, trying next provider...`, requestId);
                continue;
            }
        }

        // All providers failed - throw comprehensive error
        const errorSummary = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
        throw new Error(`All ${providers.length} AI providers failed. Errors: ${errorSummary}`);
    }

    /**
     * Classify error type for intelligent fallback
     * @param {Error} error - The error to classify
     * @returns {string} Error type: authentication, rate_limit, cors, network, invalid_request, unknown
     */
    classifyError(error) {
        const message = (error.message || '').toLowerCase();

        // Authentication errors (401, 403, invalid API key)
        if (message.includes('401') || message.includes('403') ||
            message.includes('unauthorized') || message.includes('invalid api key') ||
            message.includes('authentication') || message.includes('api key')) {
            return 'authentication';
        }

        // Rate limiting errors (429)
        if (message.includes('429') || message.includes('rate limit') ||
            message.includes('too many requests') || message.includes('quota')) {
            return 'rate_limit';
        }

        // CORS errors
        if (message.includes('cors') || message.includes('cross-origin')) {
            return 'cors';
        }

        // Network errors
        if (message.includes('network') || message.includes('fetch failed') ||
            message.includes('connection') || message.includes('timeout')) {
            return 'network';
        }

        // Invalid request errors (400, 422)
        if (message.includes('400') || message.includes('422') ||
            message.includes('invalid') || message.includes('bad request')) {
            return 'invalid_request';
        }

        return 'unknown';
    }

    async makeAIRequest(provider, apiKey, prompt, requestId, model, route = 'auto') {
        const maxRetries = 2;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                attempt++;
                
                // Pass metadata to API methods
                const apiMetadata = {
                    operation: this.currentOperation || 'unknown',
                    resume: this.currentRequestData?.resume,
                    jobDescription: this.currentRequestData?.jobDescription,
                    includeAnalysis: this.currentRequestData?.includeAnalysis
                };

                // Route handling:
                // - 'auto' : try direct then fallback to server proxy (existing behavior)
                // - 'direct': force direct API call from browser; do not fallback to proxy
                // - 'proxy': always use server-side ai-proxy
                // Special-case: Browser LLM provider or explicit browser route
                if (provider === 'browser' || route === 'browser') {
                    return await this.callBrowserLLM(prompt, requestId, model);
                }

                if (provider === 'claude') {
                    if (route === 'proxy') {
                        return await this.callServerAPI('claude', apiKey, prompt, requestId, apiMetadata, model);
                    } else if (route === 'direct') {
                        // Force direct; bubble up errors instead of falling back
                        return await this.callClaudeAPIDirect(apiKey, prompt, model);
                    } else {
                        // auto: existing behavior (try direct, fallback to server)
                        return await this.callClaudeAPI(apiKey, prompt, requestId, apiMetadata, model);
                    }
                } else if (provider === 'openai') {
                    if (route === 'proxy') {
                        return await this.callServerAPI('openai', apiKey, prompt, requestId, apiMetadata, model);
                    } else if (route === 'direct') {
                        return await this.callOpenAIAPIDirect(apiKey, prompt, model);
                    } else {
                        return await this.callOpenAIAPI(apiKey, prompt, requestId, apiMetadata, model);
                    }
                } else {
                    throw new Error(`Unsupported AI provider: ${provider}`);
                }
                
            } catch (error) {
                if (attempt >= maxRetries) {
                    throw error;
                }
                
                this.postProgress(`Attempt ${attempt} failed, retrying... (${error.message})`, requestId);
                await this.sleep(1000 * attempt); // Exponential backoff
            }
        }
    }

    async callBrowserLLM(prompt, requestId, model) {
        try {
            this.postProgress('Running prompt on local browser LLM...', requestId);

            // Ensure worker-side browser LLM bridge is available
            try {
                // workers/browser-llm.js creates self.BrowserLLM shim
                importScripts('/workers/browser-llm.js');
            } catch (e) {
                // If importScripts fails (e.g., path issue), try to proceed since the file may already be evaluated
            }

            if (!self.BrowserLLM || typeof self.BrowserLLM.generate !== 'function') {
                throw new Error('Browser LLM runtime unavailable in worker. Provide a runtime at /vendor/web-llm/worker-llm.js');
            }

            // Optionally load model first (best-effort)
            try {
                if (model) {
                    await self.BrowserLLM.loadModel(model, { source: 'huggingface' }).catch(() => {});
                }
            } catch (e) {
                // Non-fatal: continue to generation
            }

            const out = await self.BrowserLLM.generate(prompt, { model });
            // Post log for telemetry
            this.postLog({ type: 'api_response', apiType: 'browser-llm', response: typeof out === 'string' ? out.substring(0, 2000) : out, processingTime: 0 });
            return out;
        } catch (e) {
            throw new Error('Browser LLM error: ' + e.message);
        }
    }


    buildTailorResumePrompt(resume, jobDescription, includeAnalysis) {
        return `
You are an expert resume writer. Please tailor the following resume to match the job description provided.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${JSON.stringify(resume, null, 2)}

Please provide your response as a JSON object with this exact structure:
{
  "tailoredResume": {
    // The complete tailored resume in JSON Resume format
  },
  "changes": [
    // Array of strings describing what changes were made
  ]${includeAnalysis ? ',\n  "analysis": {\n    "matchScore": 85,\n    "strengths": [],\n    "improvements": [],\n    "missingSkills": []\n  }' : ''}
}

Focus on:
1. Highlighting relevant experience and skills
2. Using keywords from the job description
3. Quantifying achievements where possible
4. Maintaining truthfulness - only emphasize existing experience
${includeAnalysis ? '5. Providing detailed match analysis and recommendations' : ''}
`;
    }

    buildCoverLetterPrompt(resume, jobDescription, jobInfo, includeAnalysis) {
        return `
You are an expert cover letter writer. Please generate a compelling cover letter based on the resume and job information provided.

JOB INFORMATION:
Company: ${jobInfo?.company || 'N/A'}
Position: ${jobInfo?.title || 'N/A'}
Location: ${jobInfo?.location || 'N/A'}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${JSON.stringify(resume, null, 2)}

Please provide your response as a JSON object with this exact structure:
{
  "coverLetter": "The complete cover letter text here...",
  "keyPoints": [
    // Array of key selling points highlighted in the letter
  ]${includeAnalysis ? ',\n  "analysis": {\n    "matchScore": 85,\n    "alignedSkills": [],\n    "uniqueValue": "",\n    "recommendations": []\n  }' : ''}
}

Requirements:
1. Professional tone appropriate for the industry
2. Highlight relevant experience from the resume
3. Address the specific job requirements
4. Show enthusiasm and knowledge about the company
5. Include a strong opening and closing
${includeAnalysis ? '6. Provide detailed analysis of job-candidate fit' : ''}
`;
    }

    buildMatchAnalysisPrompt(resume, jobDescription) {
        return `
You are an expert career counselor. Please analyze how well this resume matches the job description and provide detailed feedback.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${JSON.stringify(resume, null, 2)}

Please provide your response as a JSON object with this exact structure:
{
  "analysis": {
    "overallScore": 85,
    "skillsMatch": {
      "score": 80,
      "matchedSkills": [],
      "missingSkills": []
    },
    "experienceMatch": {
      "score": 90,
      "relevantExperience": [],
      "gaps": []
    },
    "recommendations": [
      // Specific suggestions for improving the match
    ],
    "strengths": [
      // What makes this candidate strong for this role
    ],
    "concerns": [
      // Potential areas of concern or weakness
    ]
  }
}

Provide honest, constructive analysis that will help the candidate understand their fit and improve their application.
`;
    }

    extractJSONStructure(aiResponse) {
        const tryParseFromText = (text) => {
            if (!text || typeof text !== 'string') return null;
            let trimmed = text.trim();
            if (!trimmed) return null;

            // Normalize common markdown fences
            trimmed = trimmed.replace(/\u200b/g, '');
            const candidates = new Set();
            const fencePattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
            let fenceMatch;
            while ((fenceMatch = fencePattern.exec(trimmed)) !== null) {
                if (fenceMatch[1]) {
                    candidates.add(fenceMatch[1].trim());
                }
            }

            candidates.add(trimmed);

            const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                candidates.add(arrayMatch[0]);
            }

            const objectMatch = trimmed.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                candidates.add(objectMatch[0]);
            }

            for (const candidate of candidates) {
                try {
                    return JSON.parse(candidate);
                } catch (e) {
                    // Try to progressively trim trailing characters
                    const lastBrace = candidate.lastIndexOf('}');
                    const lastBracket = candidate.lastIndexOf(']');
                    const stopIndex = Math.max(lastBrace, lastBracket);
                    if (stopIndex > 0) {
                        const trimmedCandidate = candidate.slice(0, stopIndex + 1);
                        try {
                            return JSON.parse(trimmedCandidate);
                        } catch (err) {
                            continue;
                        }
                    }
                    continue;
                }
            }
            return null;
        };

        if (aiResponse === null || aiResponse === undefined) {
            return null;
        }

        if (typeof aiResponse === 'object') {
            if (Array.isArray(aiResponse)) {
                return aiResponse;
            }

            if (aiResponse.choices && aiResponse.choices[0]) {
                const choice = aiResponse.choices[0];
                const message = choice.message || choice;
                const content = message?.content || message?.text || choice?.text || null;
                if (typeof content === 'string') {
                    const parsed = tryParseFromText(content);
                    if (parsed) return parsed;
                } else if (Array.isArray(content)) {
                    const joined = content.map(item => item?.text || item?.content || '').join('\n');
                    const parsed = tryParseFromText(joined);
                    if (parsed) return parsed;
                }
            }

            if (typeof aiResponse.output_text === 'string') {
                const parsed = tryParseFromText(aiResponse.output_text);
                if (parsed) return parsed;
            }

            if (typeof aiResponse.response === 'string') {
                const parsed = tryParseFromText(aiResponse.response);
                if (parsed) return parsed;
            }

            if (typeof aiResponse.content === 'string') {
                const parsed = tryParseFromText(aiResponse.content);
                if (parsed) return parsed;
            }

            if (Array.isArray(aiResponse.content)) {
                const joined = aiResponse.content.map(part => {
                    if (typeof part === 'string') return part;
                    if (part?.text) return part.text;
                    if (part?.content) return part.content;
                    return '';
                }).join('\n');
                const parsed = tryParseFromText(joined);
                if (parsed) return parsed;
            }

            if (aiResponse.result) {
                const parsed = this.extractJSONStructure(aiResponse.result);
                if (parsed) return parsed;
            }

            const jobKeys = ['title', 'company', 'location', 'description', 'requirements', 'skills', 'jobs', 'results', 'listings', 'postings'];
            const keys = Object.keys(aiResponse);
            if (keys.some(key => jobKeys.includes(key))) {
                return aiResponse;
            }
        }

        if (typeof aiResponse === 'string') {
            const parsed = tryParseFromText(aiResponse);
            if (parsed) return parsed;

            try {
                return JSON.parse(aiResponse);
            } catch (error) {
                return null;
            }
        }

        return null;
    }

    buildJobListPrompt(options = {}) {
        const {
            content = '',
            keywords = [],
            maxJobs = 20,
            instructions = '',
            sourceUrl = ''
        } = options;

        const keywordNote = Array.isArray(keywords) && keywords.length > 0
            ? `Focus on roles that mention these keywords: ${keywords.join(', ')}. Populate "matchedKeywords" with any keywords you observe for each role.`
            : 'If you identify relevant keywords, include them in "matchedKeywords".';

        const promptSections = [
            'You are an expert at extracting structured job data from unstructured text.',
            'Analyze the provided content and return ONLY a JSON array (no additional text) of job postings.',
            'Each job object must follow this shape:',
            `{
  "id": "stable unique identifier (slugified if possible)",
  "title": "Job title",
  "company": "Company name",
  "location": "Location string or null",
  "remote": true | false,
  "summary": "1-2 sentence summary",
  "description": "Full textual description suitable for resume tailoring",
  "requirements": ["List of requirements or must-haves"],
  "responsibilities": ["List of responsibilities"],
  "skills": ["Key technologies or skills"],
  "tags": ["Any additional tags or categories"],
  "matchedKeywords": ["Keywords that align with user focus"],
  "jobType": "Employment type (full-time, contract, etc.)",
  "postedDate": "ISO date if available",
  "compensation": "Salary or rate details if provided",
  "applyUrl": "Direct application URL if present",
  "sourceUrl": "Original posting URL if present",
  "rawText": "Any extra raw text snippet that may be useful"
}`,
            `Limit the output to the top ${Math.max(1, maxJobs)} distinct positions ordered by relevance.`,
            keywordNote
        ];

        if (instructions) {
            promptSections.push(`Additional instructions: ${instructions}`);
        }
        if (sourceUrl) {
            promptSections.push(`Source URL: ${sourceUrl}`);
        }
        if (content) {
            promptSections.push('Content to analyze:');
            promptSections.push(content);
        }

        return promptSections.join('\n\n');
    }

    parseJobListResponse(aiResponse, options = {}) {
        const parsed = this.extractJSONStructure(aiResponse);
        if (!parsed) {
            return [];
        }

        let jobs = [];
        if (Array.isArray(parsed)) {
            jobs = parsed;
        } else if (Array.isArray(parsed.jobs)) {
            jobs = parsed.jobs;
        } else if (Array.isArray(parsed.listings)) {
            jobs = parsed.listings;
        } else if (Array.isArray(parsed.results)) {
            jobs = parsed.results;
        } else if (Array.isArray(parsed.postings)) {
            jobs = parsed.postings;
        } else if (parsed.job) {
            jobs = [parsed.job];
        } else if (parsed.items && Array.isArray(parsed.items)) {
            jobs = parsed.items;
        } else {
            const jobKeys = ['title', 'company', 'description'];
            const looksLikeJob = jobKeys.some(key => Object.prototype.hasOwnProperty.call(parsed, key));
            if (looksLikeJob) {
                jobs = [parsed];
            }
        }

        if (!Array.isArray(jobs)) {
            return [];
        }

        const normalized = jobs
            .map((entry, index) => this.normalizeJobEntry(entry, index, options))
            .filter(job => !!job);

        return normalized;
    }

    normalizeJobEntry(entry, index, options = {}) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const { sourceUrl = '', keywords = [] } = options;

        const candidateIdFields = [
            entry.id,
            entry.jobId,
            entry.slug,
            entry.identifier,
            entry.refId,
            entry.reference,
            entry.applyUrl,
            entry.url
        ];
        let identifier = candidateIdFields.find(value => typeof value === 'string' && value.trim().length > 0);
        if (identifier) {
            identifier = identifier.trim();
        } else {
            const seed = [
                entry.title,
                entry.company,
                entry.location,
                index
            ].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            identifier = seed || this.generateJobFallbackId(index);
        }

        const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';

        let description = entry.description;
        if (Array.isArray(description)) {
            description = description.join('\n');
        }
        if (typeof description !== 'string' || description.trim().length === 0) {
            description = typeof entry.rawText === 'string' ? entry.rawText : '';
        }
        description = this.truncateText((description || '').trim(), 8000);

        const responsibilities = this.normalizeList(entry.responsibilities || entry.duties || entry.responsibilitiesList);
        const requirements = this.normalizeList(entry.requirements || entry.qualifications || entry.mustHave);
        const skills = this.normalizeList(entry.skills || entry.technologies || entry.techStack);
        const tags = this.normalizeList(entry.tags || entry.categories || entry.keywords);
        const matchedKeywords = this.normalizeList(entry.matchedKeywords);

        const keywordSet = Array.isArray(keywords)
            ? keywords.map(kw => kw.trim()).filter(Boolean)
            : [];

        const haystack = [
            summary,
            description,
            responsibilities.join(' '),
            requirements.join(' '),
            skills.join(' '),
            tags.join(' ')
        ].join(' ').toLowerCase();

        const keywordMatches = Array.from(new Set(keywordSet.filter(keyword => {
            if (!keyword) return false;
            return haystack.includes(keyword.toLowerCase());
        })));

        const combinedMatchedKeywords = matchedKeywords.length > 0
            ? Array.from(new Set(matchedKeywords))
            : keywordMatches;

        const normalizedJob = {
            id: identifier,
            order: index + 1,
            title: this.sanitizeText(entry.title || entry.position || entry.role || '', 200),
            company: this.sanitizeText(entry.company || entry.organization || entry.employer || '', 200),
            location: this.sanitizeText(entry.location || entry.city || entry.region || '', 200),
            remote: this.inferRemoteFlag(entry, description, tags),
            summary: this.truncateText(summary, 1000),
            description,
            responsibilities,
            requirements,
            skills,
            tags: tags.length > 0 ? Array.from(new Set(tags)) : skills,
            matchedKeywords: combinedMatchedKeywords,
            jobType: entry.jobType || entry.employmentType || entry.positionType || '',
            postedDate: entry.postedDate || entry.datePosted || entry.listedDate || null,
            compensation: entry.compensation || entry.salary || entry.payRange || null,
            applyUrl: entry.applyUrl || entry.applicationUrl || entry.url || '',
            sourceUrl: entry.sourceUrl || sourceUrl || entry.url || '',
            rawText: this.truncateText(entry.rawText || entry.fullText || description, 8000),
            metadata: entry.metadata || {},
            extra: entry.extra || {}
        };

        return normalizedJob;
    }

    buildJobDescriptionText(jobEntry) {
        if (!jobEntry || typeof jobEntry !== 'object') {
            return '';
        }

        const sections = [];

        if (jobEntry.title && jobEntry.company) {
            sections.push(`${jobEntry.title} at ${jobEntry.company}`);
        }
        if (jobEntry.summary) {
            sections.push(`Summary:\n${jobEntry.summary}`);
        }
        if (jobEntry.description) {
            sections.push(`Description:\n${jobEntry.description}`);
        }
        if (Array.isArray(jobEntry.requirements) && jobEntry.requirements.length > 0) {
            const bulletList = jobEntry.requirements.map(item => `- ${item}`).join('\n');
            sections.push(`Requirements:\n${bulletList}`);
        }
        if (Array.isArray(jobEntry.responsibilities) && jobEntry.responsibilities.length > 0) {
            const bulletList = jobEntry.responsibilities.map(item => `- ${item}`).join('\n');
            sections.push(`Responsibilities:\n${bulletList}`);
        }
        if (Array.isArray(jobEntry.skills) && jobEntry.skills.length > 0) {
            sections.push(`Skills:\n${jobEntry.skills.join(', ')}`);
        }

        return sections.join('\n\n').trim();
    }

    normalizeList(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value
                .map(item => {
                    if (typeof item === 'string') return item.trim();
                    if (item === null || item === undefined) return '';
                    return String(item).trim();
                })
                .filter(Boolean);
        }
        if (typeof value === 'string') {
            return value
                .split(/[\n\r,;•·\-]+/g)
                .map(item => item.trim())
                .filter(Boolean);
        }
        return [];
    }

    sanitizeText(value, maxLen = 500) {
        if (value === null || value === undefined) return '';
        const text = String(value).trim();
        if (!text) return '';
        return this.truncateText(text, maxLen);
    }

    truncateText(text, maxLen = 4000) {
        if (typeof text !== 'string') return '';
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen - 3)}...`;
    }

    inferRemoteFlag(entry, description, tags) {
        if (entry && typeof entry.remote === 'boolean') {
            return entry.remote;
        }

        const textFragments = [
            entry?.location,
            entry?.summary,
            entry?.workModel,
            entry?.workType,
            entry?.employmentModel,
            description,
            Array.isArray(tags) ? tags.join(' ') : ''
        ].filter(Boolean).join(' ').toLowerCase();

        if (!textFragments) return false;

        if (textFragments.includes('not remote') || textFragments.includes('on-site only')) {
            return false;
        }

        if (textFragments.includes('remote') || textFragments.includes('work from home') || textFragments.includes('distributed')) {
            return true;
        }

        return false;
    }

    generateJobFallbackId(index = 0) {
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        return `job_${Date.now()}_${index}_${randomSuffix}`;
    }

    parseAIResponse(response, type) {
        try {
            console.log('Worker parseAIResponse - Type:', type);
            console.log('Worker parseAIResponse - Response length:', response?.length);
            console.log('Worker parseAIResponse - Response preview:', response?.substring(0, 200));

            // Extract JSON from response if it's wrapped in markdown or text
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('Worker parseAIResponse - No JSON found in response:', response);
                throw new Error('No JSON found in AI response');
            }

            console.log('Worker parseAIResponse - Found JSON, parsing...');
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Worker parseAIResponse - Parsed successfully, keys:', Object.keys(parsed));

            // Validate based on response type
            switch (type) {
                case 'tailor-resume':
                    if (!parsed.tailoredResume && !parsed.tailored_resume && !parsed.tailored) {
                        console.error('Worker parseAIResponse - Missing tailoredResume in parsed object:', parsed);
                        throw new Error('Invalid tailor resume response format: missing tailoredResume field');
                    }
                    if (!parsed.changes) {
                        console.warn('Worker parseAIResponse - Missing changes field, but continuing');
                    }
                    break;
                case 'cover-letter':
                    if (!parsed.coverLetter && !parsed.cover_letter) {
                        console.error('Worker parseAIResponse - Missing coverLetter in parsed object:', parsed);
                        throw new Error('Invalid cover letter response format: missing coverLetter field');
                    }
                    break;
                case 'match-analysis':
                    if (!parsed.analysis || typeof parsed.analysis.overallScore !== 'number') {
                        console.error('Worker parseAIResponse - Invalid analysis in parsed object:', parsed);
                        throw new Error('Invalid match analysis response format: missing or invalid analysis field');
                    }
                    break;
            }

            console.log('Worker parseAIResponse - Validation passed');
            return parsed;

        } catch (error) {
            console.error('Worker parseAIResponse - Error:', error.message);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    postMessage(data) {
        self.postMessage(data);
    }

    postProgress(message, requestId) {
        self.postMessage({
            type: 'progress',
            requestId,
            message,
            timestamp: new Date().toISOString()
        });
    }

    postSuccess(data, requestId) {
        self.postMessage({
            type: 'success',
            requestId,
            data,
            timestamp: new Date().toISOString()
        });
    }

    postError(error, requestId) {
        self.postMessage({
            type: 'error',
            requestId,
            error: typeof error === 'string' ? error : error.message,
            timestamp: new Date().toISOString()
        });
    }

    // Send logging data to main thread
    postLog(logData) {
        self.postMessage({
            type: 'log',
            logData,
            timestamp: new Date().toISOString()
        });
    }

    async callClaudeAPI(apiKey, prompt, requestId, metadata = {}, model) {
        // Try direct API call first, fallback to server if CORS fails
        try {
            this.postProgress('Connecting directly to Claude API...', requestId);
            return await this.callClaudeAPIDirect(apiKey, prompt, model);
        } catch (error) {
            if (error.message.includes('CORS') || error.message.includes('network')) {
                this.postProgress('Direct connection failed, trying server proxy...', requestId);
                return await this.callServerAPI('claude', apiKey, prompt, requestId, metadata, model);
            }
            throw error;
        }
    }

    async callOpenAIAPI(apiKey, prompt, requestId, metadata = {}, model) {
        // Try direct API call first, fallback to server if CORS fails
        try {
            this.postProgress('Connecting directly to OpenAI API...', requestId);
            return await this.callOpenAIAPIDirect(apiKey, prompt, model);
        } catch (error) {
            if (error.message.includes('CORS') || error.message.includes('network')) {
                this.postProgress('Direct connection failed, trying server proxy...', requestId);
                return await this.callServerAPI('openai', apiKey, prompt, requestId, metadata, model);
            }
            throw error;
        }
    }

    async callClaudeAPIDirect(apiKey, prompt, model) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: model || 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Claude API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response format from Claude API');
        }

        return data.content[0].text;
    }

    async callOpenAIAPIDirect(apiKey, prompt, model) {
        const useResponses = this.shouldUseOpenAIResponses(model);
        const url = useResponses ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions';
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        const body = useResponses
            ? {
                model: model || 'gpt-4o',
                input: prompt,
                max_output_tokens: 4000
            }
            : {
                model: model || 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.7
            };

        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();

        // Try Responses API shape first
        if (useResponses) {
            if (typeof data.output_text === 'string') return data.output_text;
            if (Array.isArray(data.output) && data.output.length > 0) {
                // Find the 'message' block in output
                const msgBlock = data.output.find(b => b && b.type === 'message');
                const contentArr = msgBlock?.content;
                if (Array.isArray(contentArr)) {
                    // Prefer 'output_text', fallback to 'text'
                    const out = contentArr.find(c => c?.type === 'output_text') || contentArr.find(c => c?.type === 'text');
                    if (out?.text) return out.text;
                }
            }
            // Fallback to choices if OpenAI returns hybrid shape
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            throw new Error('Invalid response format from OpenAI Responses API');
        }

        // Chat Completions shape
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }
        return data.choices[0].message.content;
    }

    shouldUseOpenAIResponses(model) {
        const m = (model || '').toLowerCase();
        // Newer models typically require Responses API params
        return m.startsWith('gpt-5') || m.startsWith('o1') || m.includes('responses');
    }

    async callServerAPI(apiType, apiKey, prompt, requestId, metadata = {}, model) {
        const startTime = Date.now();
        this.postProgress(`Connecting to ${apiType} via server...`, requestId);
        
        try {
            // Try different server endpoints
            const endpoints = [
                '/job-tool/ai-proxy.php',
                '/api/tailor-resume',  // Direct proxy (if configured)
                'http://localhost:3000/api/tailor-resume',  // Local server
                'https://cdr2.com:3000/api/tailor-resume'   // Remote server
            ];
            
            let response;
            let lastError;
            
            for (const endpoint of endpoints) {
                try {
                    response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                // Include optional metadata such as resume, operation and targetUrl
                body: JSON.stringify({
                    prompt,
                    apiType,
                    apiKey,
                    model,
                    resume: metadata.resume,
                    operation: metadata.operation,
                    targetUrl: metadata.targetUrl || null,
                    instructions: metadata.instructions || null,
                    jobFilters: metadata.jobFilters || null
                })
            });
                    
                    // If we get here without error, break out of the loop
                    break;
                } catch (error) {
                    lastError = error;
                    console.log(`Failed to connect to ${endpoint}:`, error.message);
                    continue;
                }
            }
            
            // If all endpoints failed, throw the last error
            if (!response) {
                throw new Error(`All API endpoints failed. Last error: ${lastError.message}`);
            }

            if (!response.ok) {
                const errorData = await response.text();
                let errorJson;
                try {
                    errorJson = JSON.parse(errorData);
                } catch {
                    errorJson = { error: errorData };
                }
                
                throw new Error(`Server API error (${response.status}): ${errorJson.error || errorData}`);
            }

            const data = await response.json();

            console.log('Worker callServerAPI - Raw response from server:', data);

            // Handle different response formats from server
            if (typeof data === 'string') {
                return data;
            } else if (data.result) {
                return data.result;
            } else if (data.response) {
                return data.response;
            } else if (data.content && Array.isArray(data.content) && data.content.length > 0) {
                // Anthropic API response format from ai-proxy.php
                // Extract the actual text content from Claude's response
                const textContent = data.content.find(c => c.type === 'text');
                if (textContent && textContent.text) {
                    console.log('Worker callServerAPI - Extracted Claude content.text');
                    return textContent.text;
                }
            } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
                // OpenAI API response format from ai-proxy.php
                const choice = data.choices[0];
                if (choice.message && choice.message.content) {
                    console.log('Worker callServerAPI - Extracted OpenAI message.content');
                    return choice.message.content;
                } else if (choice.text) {
                    console.log('Worker callServerAPI - Extracted OpenAI choice.text');
                    return choice.text;
                }
            }

            // Fallback: return as stringified JSON
            console.log('Worker callServerAPI - No recognized format, returning stringified data');
            return JSON.stringify(data);
            
        } catch (error) {
            throw error;
        }
    }

}

// Initialize the worker
new AIWorker();
