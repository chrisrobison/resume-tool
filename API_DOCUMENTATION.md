# Job Tool API Documentation

## Overview

The Job Tool API provides three main endpoints through `api.php`:

1. **Job Search** (`?x=search`) - Search for jobs using multiple job boards
2. **Resume Tailoring** (`?x=tailor`) - Tailor resumes to job descriptions using AI
3. **Cover Letter Generation** (`?x=letter`) - Generate cover letters using AI

All endpoints expect JSON in the request body and return JSON responses.

## Base URL

```
https://cdr2.com/job-tool/api.php
```

---

## 1. Job Search Endpoint

Search for jobs across multiple platforms (Indeed, LinkedIn, ZipRecruiter, Google).

### Endpoint

```
POST /job-tool/api.php?x=search
```

### Request Body

```json
{
  "searchTerm": "software engineer",
  "location": "San Francisco, CA",
  "sites": ["indeed", "linkedin", "zip_recruiter", "google"],
  "results": 20,
  "hoursOld": 72,
  "country": "USA",
  "remoteOnly": false
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `searchTerm` | string | **Yes** | - | Job search term (e.g., "software engineer") |
| `location` | string | No | "San Francisco, CA" | Job location |
| `sites` | array | No | ["indeed", "linkedin", "zip_recruiter", "google"] | Job sites to search |
| `results` | integer | No | 20 | Number of results wanted |
| `hoursOld` | integer | No | 72 | Filter jobs by hours since posted |
| `country` | string | No | "USA" | Country for Indeed searches |
| `remoteOnly` | boolean | No | false | Filter for remote jobs only |

### Response

```json
{
  "success": true,
  "count": 15,
  "jobs": [
    {
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "description": "...",
      "date_posted": "2025-01-15",
      "job_url": "https://...",
      "site": "indeed"
    }
  ],
  "query": {
    "searchTerm": "software engineer",
    "location": "San Francisco, CA",
    "sites": ["indeed", "linkedin", "zip_recruiter", "google"]
  }
}
```

### Example cURL Request

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=search \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerm": "frontend developer",
    "location": "New York, NY",
    "results": 10,
    "remoteOnly": true
  }'
```

### Example JavaScript Request

```javascript
const searchJobs = async () => {
  const response = await fetch('/job-tool/api.php?x=search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchTerm: 'full stack developer',
      location: 'Austin, TX',
      results: 15,
      hoursOld: 48
    })
  });

  const data = await response.json();
  console.log(`Found ${data.count} jobs`, data.jobs);
};
```

---

## 2. Resume Tailoring Endpoint

Tailor a resume to match a specific job description using AI.

### Endpoint

```
POST /job-tool/api.php?x=tailor
```

### Request Body

```json
{
  "resume": {
    "basics": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "(555) 123-4567",
      "summary": "Experienced software engineer..."
    },
    "work": [
      {
        "name": "Tech Company",
        "position": "Software Engineer",
        "startDate": "2020-01-01",
        "endDate": "2024-01-01",
        "highlights": ["Built scalable systems", "Led team of 5"]
      }
    ],
    "skills": [
      {
        "name": "JavaScript",
        "level": "Expert",
        "keywords": ["React", "Node.js", "TypeScript"]
      }
    ]
  },
  "jobDescription": "We are looking for a senior software engineer with React and Node.js experience...",
  "provider": "claude",
  "apiKey": "sk-ant-...",
  "model": "claude-3-5-sonnet-20241022",
  "includeAnalysis": true
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resume` | object | **Yes** | - | Resume in JSON Resume format |
| `jobDescription` | string | **Yes** | - | Job description text |
| `provider` | string | **Yes** | - | AI provider: "claude" or "openai" |
| `apiKey` | string | **Yes** | - | API key for the provider |
| `model` | string | No | Provider default | Model to use (e.g., "claude-3-5-sonnet-20241022", "gpt-4o") |
| `includeAnalysis` | boolean | No | false | Include match analysis with scores |

### Response

```json
{
  "tailoredResume": {
    "basics": { ... },
    "work": [ ... ],
    "skills": [ ... ]
  },
  "changes": [
    "Enhanced summary to emphasize React and Node.js experience",
    "Added specific metrics to quantify achievements",
    "Highlighted leadership experience"
  ],
  "analysis": {
    "matchScore": 87,
    "strengths": [
      "Strong React experience matches job requirements",
      "Leadership experience aligns with senior role"
    ],
    "improvements": [
      "Consider adding cloud platform experience",
      "Highlight more team collaboration examples"
    ],
    "missingSkills": ["AWS", "Kubernetes"]
  }
}
```

### Example cURL Request

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=tailor \
  -H "Content-Type: application/json" \
  -d '{
    "resume": { ... },
    "jobDescription": "Looking for senior engineer with React...",
    "provider": "claude",
    "apiKey": "sk-ant-...",
    "includeAnalysis": true
  }'
```

### Example JavaScript Request

```javascript
const tailorResume = async (resume, jobDescription, apiKey) => {
  const response = await fetch('/job-tool/api.php?x=tailor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resume,
      jobDescription,
      provider: 'claude',
      apiKey,
      includeAnalysis: true
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error('Error:', data.error);
    return;
  }

  console.log('Tailored resume:', data.tailoredResume);
  console.log('Match score:', data.analysis?.matchScore);
  console.log('Changes made:', data.changes);
};
```

---

## 3. Cover Letter Generation Endpoint

Generate a personalized cover letter for a job application using AI.

### Endpoint

```
POST /job-tool/api.php?x=letter
```

### Request Body

```json
{
  "resume": {
    "basics": { ... },
    "work": [ ... ],
    "skills": [ ... ]
  },
  "jobDescription": "We are seeking a talented software engineer...",
  "jobInfo": {
    "company": "Tech Corp",
    "title": "Senior Software Engineer",
    "location": "San Francisco, CA"
  },
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "includeAnalysis": true
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resume` | object | **Yes** | - | Resume in JSON Resume format |
| `jobDescription` | string | **Yes** | - | Job description text |
| `jobInfo` | object | No | {} | Job details (company, title, location) |
| `provider` | string | **Yes** | - | AI provider: "claude" or "openai" |
| `apiKey` | string | **Yes** | - | API key for the provider |
| `model` | string | No | Provider default | Model to use |
| `includeAnalysis` | boolean | No | true | Include match analysis |

### Response

```json
{
  "coverLetter": "Dear Hiring Manager,\n\nI am writing to express my interest in the Senior Software Engineer position at Tech Corp...",
  "keyPoints": [
    "5+ years of React and Node.js experience",
    "Led team of engineers on high-impact projects",
    "Strong problem-solving and collaboration skills"
  ],
  "analysis": {
    "matchScore": 85,
    "alignedSkills": ["React", "Node.js", "Leadership", "System Design"],
    "uniqueValue": "Combination of technical expertise and proven leadership",
    "recommendations": [
      "Mention specific Tech Corp products in the letter",
      "Emphasize cloud platform experience if available"
    ]
  }
}
```

### Example cURL Request

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=letter \
  -H "Content-Type: application/json" \
  -d '{
    "resume": { ... },
    "jobDescription": "We are seeking a talented engineer...",
    "jobInfo": {
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "location": "San Francisco, CA"
    },
    "provider": "openai",
    "apiKey": "sk-..."
  }'
```

### Example JavaScript Request

```javascript
const generateCoverLetter = async (resume, jobInfo, jobDescription, apiKey) => {
  const response = await fetch('/job-tool/api.php?x=letter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resume,
      jobDescription,
      jobInfo,
      provider: 'openai',
      apiKey,
      includeAnalysis: true
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error('Error:', data.error);
    return;
  }

  console.log('Cover Letter:\n', data.coverLetter);
  console.log('Match Score:', data.analysis?.matchScore);
};
```

---

## Error Handling

All endpoints return appropriate HTTP status codes and error messages.

### Error Response Format

```json
{
  "error": "Missing required parameter: searchTerm",
  "trace": "Stack trace (in development mode)"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (missing or invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Example Error Handling

```javascript
try {
  const response = await fetch('/job-tool/api.php?x=search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchTerm: 'developer' })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  // Handle successful response
  console.log('Success:', data);

} catch (error) {
  console.error('API Error:', error.message);
}
```

---

## Rate Limits

- Job Search: 10 requests per minute per IP
- AI Endpoints: Subject to provider rate limits (Claude/OpenAI)

---

## Integration with AI Worker

The Job Tool's Web Worker automatically uses api.php as the primary endpoint with automatic fallback to other servers if unavailable.

```javascript
// The worker will automatically try api.php first
import { aiService } from './js/ai-service.js';

const result = await aiService.tailorResume({
  resume: myResume,
  jobDescription: jobDesc,
  provider: 'claude',
  apiKey: myApiKey,
  includeAnalysis: true
});
```

The worker tries endpoints in this order:
1. `/job-tool/api.php?x=tailor` (NEW - PRIMARY)
2. `/job-tool/ai-proxy.php` (Legacy)
3. `/api/tailor-resume` (Direct proxy)
4. `http://localhost:3000/api/tailor-resume` (Local Node server)
5. `https://cdr2.com:3000/api/tailor-resume` (Remote Node server)

---

## Python CLI for Job Search

The `jobsearch.py` script can be used directly from the command line:

### Command Line Arguments

```bash
./jobsearch.py \
  --search-term "software engineer" \
  --location "San Francisco, CA" \
  --results 20 \
  --hours-old 72 \
  --sites indeed linkedin \
  --output jobs.csv \
  --output-format json
```

### JSON Input via stdin

```bash
echo '{
  "searchTerm": "frontend developer",
  "location": "New York, NY",
  "results": 15
}' | ./jobsearch.py --json
```

### Available Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--json` | flag | false | Read configuration from JSON stdin |
| `--search-term` | string | "software engineer" | Job search term |
| `--location` | string | "San Francisco, CA" | Job location |
| `--sites` | array | [indeed, linkedin, ...] | Sites to search |
| `--results` | integer | 20 | Number of results |
| `--hours-old` | integer | 72 | Hours since posted |
| `--country` | string | "USA" | Country for Indeed |
| `--output` | string | "jobs.csv" | Output file path |
| `--output-format` | string | "csv" | Output format (csv or json) |
| `--linkedin-fetch-description` | flag | false | Fetch full LinkedIn descriptions |
| `--remote-only` | flag | false | Remote jobs only |

---

## Security Considerations

1. **API Keys**: Never commit API keys to version control. Store them in environment variables or secure key management systems.

2. **CORS**: The API has CORS enabled for local development. Configure appropriately for production.

3. **Input Validation**: All user inputs are validated and sanitized.

4. **Rate Limiting**: Implement rate limiting on your server to prevent abuse.

5. **HTTPS**: Always use HTTPS in production to encrypt API keys in transit.

---

## Testing

### Test Job Search

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=search \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"developer","location":"Remote","results":5}'
```

### Test Resume Tailoring

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=tailor \
  -H "Content-Type: application/json" \
  -d '{
    "resume":{"basics":{"name":"Test User"},"work":[],"skills":[]},
    "jobDescription":"Looking for a developer",
    "provider":"claude",
    "apiKey":"YOUR_API_KEY"
  }'
```

### Test Cover Letter Generation

```bash
curl -X POST https://cdr2.com/job-tool/api.php?x=letter \
  -H "Content-Type: application/json" \
  -d '{
    "resume":{"basics":{"name":"Test User"},"work":[],"skills":[]},
    "jobDescription":"Looking for a developer",
    "jobInfo":{"company":"Test Co","title":"Developer"},
    "provider":"openai",
    "apiKey":"YOUR_API_KEY"
  }'
```

---

## Support

For issues or questions:
- GitHub: [Project Repository]
- Email: christopher.robison@gmail.com

---

## Changelog

### Version 1.0.0 (2025-01-15)
- Initial release of centralized API
- Job search integration with jobsearch.py
- Resume tailoring endpoint
- Cover letter generation endpoint
- Support for Claude and OpenAI providers
- Automatic endpoint fallback in AI Worker
