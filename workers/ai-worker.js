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
            
            const { resume, jobDescription, provider, apiKey, model, includeAnalysis = false, route = 'auto' } = data;
            
            // Set metadata for logging
            this.currentOperation = 'tailor_resume';
            this.currentRequestData = { resume, jobDescription, includeAnalysis };
            
            // Debug individual parameters
            console.log('Worker - resume:', !!resume);
            console.log('Worker - jobDescription:', !!jobDescription, jobDescription?.substring(0, 100));
            console.log('Worker - provider:', provider);
            console.log('Worker - apiKey:', !!apiKey, apiKey?.substring(0, 10) + '...');
            
            if (!resume || !jobDescription || !provider || (provider !== 'browser' && !apiKey)) {
                const missing = [];
                if (!resume) missing.push('resume');
                if (!jobDescription) missing.push('jobDescription');
                if (!provider) missing.push('provider');
                if (provider !== 'browser' && !apiKey) missing.push('apiKey');
                throw new Error(`Missing required parameters for resume tailoring: ${missing.join(', ')}`);
            }

            let prompt = this.buildTailorResumePrompt(resume, jobDescription, includeAnalysis);
            
            this.postProgress('Sending request to AI service...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId, model, route);
            
            this.postProgress('Processing AI response...', requestId);
            
            const parsedResult = this.parseAIResponse(result, 'tailor-resume');
            
            this.postSuccess({
                type: 'tailor-resume',
                result: parsedResult,
                originalResume: resume,
                jobDescription: jobDescription,
                provider: provider,
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
            
            const { resume, jobDescription, jobInfo, provider, apiKey, model, includeAnalysis = true, route = 'auto' } = data;
            
            if (!resume || !jobDescription || !provider || (provider !== 'browser' && !apiKey)) {
                throw new Error('Missing required parameters for cover letter generation');
            }

            let prompt = this.buildCoverLetterPrompt(resume, jobDescription, jobInfo, includeAnalysis);
            
            this.postProgress('Generating cover letter with AI...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId, model, route);
            
            this.postProgress('Processing cover letter response...', requestId);
            
            const parsedResult = this.parseAIResponse(result, 'cover-letter');
            
            this.postSuccess({
                type: 'cover-letter',
                result: parsedResult,
                jobInfo: jobInfo,
                provider: provider,
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
            
            const { resume, jobDescription, provider, apiKey, model, route = 'auto' } = data;
            
            if (!resume || !jobDescription || !provider || (provider !== 'browser' && !apiKey)) {
                throw new Error('Missing required parameters for match analysis');
            }

            let prompt = this.buildMatchAnalysisPrompt(resume, jobDescription);
            
            this.postProgress('Analyzing match with AI...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId, model, route);
            
            this.postProgress('Processing match analysis...', requestId);
            
            const parsedResult = this.parseAIResponse(result, 'match-analysis');
            
            this.postSuccess({
                type: 'match-analysis',
                result: parsedResult,
                provider: provider,
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

    parseAIResponse(response, type) {
        try {
            // Extract JSON from response if it's wrapped in markdown or text
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate based on response type
            switch (type) {
                case 'tailor-resume':
                    if (!parsed.tailoredResume || !parsed.changes) {
                        throw new Error('Invalid tailor resume response format');
                    }
                    break;
                case 'cover-letter':
                    if (!parsed.coverLetter) {
                        throw new Error('Invalid cover letter response format');
                    }
                    break;
                case 'match-analysis':
                    if (!parsed.analysis || typeof parsed.analysis.overallScore !== 'number') {
                        throw new Error('Invalid match analysis response format');
                    }
                    break;
            }
            
            return parsed;
            
        } catch (error) {
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
                    targetUrl: metadata.targetUrl || null
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
            
            // Handle different response formats from server
            if (typeof data === 'string') {
                return data;
            } else if (data.result) {
                return data.result;
            } else if (data.response) {
                return data.response;
            } else {
                return JSON.stringify(data);
            }
            
        } catch (error) {
            throw error;
        }
    }

}

// Initialize the worker
new AIWorker();
