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
            
            const { resume, jobDescription, provider, apiKey, includeAnalysis = false } = data;
            
            if (!resume || !jobDescription || !provider || !apiKey) {
                throw new Error('Missing required parameters for resume tailoring');
            }

            let prompt = this.buildTailorResumePrompt(resume, jobDescription, includeAnalysis);
            
            this.postProgress('Sending request to AI service...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId);
            
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
            
            const { resume, jobDescription, jobInfo, provider, apiKey, includeAnalysis = true } = data;
            
            if (!resume || !jobDescription || !provider || !apiKey) {
                throw new Error('Missing required parameters for cover letter generation');
            }

            let prompt = this.buildCoverLetterPrompt(resume, jobDescription, jobInfo, includeAnalysis);
            
            this.postProgress('Generating cover letter with AI...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId);
            
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
            
            const { resume, jobDescription, provider, apiKey } = data;
            
            if (!resume || !jobDescription || !provider || !apiKey) {
                throw new Error('Missing required parameters for match analysis');
            }

            let prompt = this.buildMatchAnalysisPrompt(resume, jobDescription);
            
            this.postProgress('Analyzing match with AI...', requestId);
            
            const result = await this.makeAIRequest(provider, apiKey, prompt, requestId);
            
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

    async handleTestApiKey(data, requestId) {
        try {
            this.postProgress('Testing API key...', requestId);
            
            const { provider, apiKey } = data;
            
            if (!provider || !apiKey) {
                throw new Error('Missing provider or API key');
            }

            // Simple test prompt
            const testPrompt = 'Respond with exactly: "API key test successful"';
            
            const result = await this.makeAIRequest(provider, apiKey, testPrompt, requestId);
            
            this.postSuccess({
                type: 'api-test',
                result: { success: true, response: result },
                provider: provider,
                timestamp: new Date().toISOString()
            }, requestId);
            
        } catch (error) {
            this.postError(`API key test failed: ${error.message}`, requestId);
        }
    }

    async makeAIRequest(provider, apiKey, prompt, requestId) {
        const maxRetries = 2;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                attempt++;
                
                if (provider === 'claude') {
                    return await this.callClaudeAPI(apiKey, prompt, requestId);
                } else if (provider === 'openai') {
                    return await this.callOpenAIAPI(apiKey, prompt, requestId);
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

    async callClaudeAPI(apiKey, prompt, requestId) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
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

    async callOpenAIAPI(apiKey, prompt, requestId) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }

        return data.choices[0].message.content;
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

    async callClaudeAPI(apiKey, prompt, requestId) {
        this.postProgress('Connecting to Claude API...', requestId);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Claude API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    async callOpenAIAPI(apiKey, prompt, requestId) {
        this.postProgress('Connecting to OpenAI API...', requestId);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}

// Initialize the worker
new AIWorker();