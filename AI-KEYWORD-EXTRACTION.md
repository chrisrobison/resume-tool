# 🤖 AI Keyword Extraction for Job Search

## Overview

The Job Search feature now includes AI-powered keyword extraction from your resumes. Instead of manually typing search keywords, AI analyzes your resume and automatically identifies the most relevant terms for job searching.

## How It Works

### User Workflow

1. **Navigate to Job Search** tab
2. **Click "🤖 Extract from Resume"** button (green button)
3. **Select a resume** from the dropdown
4. **Click "Extract Keywords"**
5. AI analyzes the resume and extracts relevant keywords
6. Search fields are **automatically populated**
7. Click "🔍 Search Jobs" to find matches

### What AI Extracts

The AI analyzes your resume and identifies:

- **Technical Skills**: Programming languages, frameworks, tools (e.g., React, Python, Docker)
- **Job Titles**: Relevant positions based on experience (e.g., Senior Engineer, Full Stack Developer)
- **Location Preferences**: If mentioned in resume (e.g., Remote, San Francisco)

## Example

**Resume Contains:**
```
Work Experience:
- Senior Software Engineer at Company X
- Built React applications with Node.js backend
- Python data analysis and automation
- Led team of 5 developers

Skills:
- JavaScript, TypeScript, React, Node.js
- Python, Django, FastAPI
- AWS, Docker, Kubernetes
```

**AI Extracts:**
```
Keywords: React Node.js Python TypeScript AWS Docker Senior Engineer Full-stack
Location: (if mentioned in resume)
```

**Result:** Search fields auto-populate, ready to search!

## Requirements

### Prerequisites

1. **API Key Configured**
   - Go to Settings tab
   - Add your Claude (Anthropic) or OpenAI API key
   - Save settings

2. **At Least One Resume**
   - Create or import a resume in the Resumes tab
   - Resume should contain work experience, skills, or projects

### Supported AI Services

- ✅ **Claude** (Anthropic) - claude-3-5-sonnet-20241022
- ✅ **OpenAI** - gpt-4o

Both services provide excellent keyword extraction quality.

## Features

### Smart Analysis

The AI is specifically prompted to:
- Identify terms that appear in **job postings**
- Focus on **searchable keywords** (not generic terms)
- Extract **5-10 most relevant** keywords
- Be **specific** (e.g., "React" not "JavaScript frameworks")

### User Experience

- **Fast**: Extracts keywords in 2-5 seconds
- **Visual Feedback**: "Analyzing..." loading state
- **Success Toast**: Shows extracted keywords
- **Auto-populate**: Search fields filled automatically
- **Error Handling**: Clear messages if something fails

### Privacy

- **Local API Calls**: Requests go directly from browser to AI service
- **No Server Storage**: Resume data never stored on server
- **User Control**: You provide and manage your own API key

## UI Elements

### "Extract from Resume" Button

```
🤖 Extract from Resume
```

- **Location**: Top of search form, next to "Search Jobs"
- **Color**: Green (btn-success)
- **State**: Disabled during extraction ("Analyzing...")

### Resume Selection Dialog

```
┌─────────────────────────────────────┐
│ 🤖 AI Keyword Extraction           │
│                                     │
│ Select a resume to analyze. AI     │
│ will extract relevant keywords...  │
│                                     │
│ Select Resume: [Dropdown ▼]        │
│                                     │
│         [Cancel]  [Extract Keywords]│
└─────────────────────────────────────┘
```

## Technical Implementation

### API Integration

The component makes direct API calls (no proxy needed):

```javascript
// Claude API
POST https://api.anthropic.com/v1/messages
Headers:
  - x-api-key: YOUR_KEY
  - anthropic-version: 2023-06-01

// OpenAI API
POST https://api.openai.com/v1/chat/completions
Headers:
  - Authorization: Bearer YOUR_KEY
```

### Prompt Engineering

The AI prompt is carefully crafted:

```
Analyze this resume and extract relevant job search keywords.

Resume: [JSON data]

Extract and return ONLY a JSON object with this exact format:
{
  "skills": ["keyword1", "keyword2", "keyword3"],
  "jobTitles": ["title1", "title2"],
  "location": "preferred location or empty string"
}

Focus on:
1. Technical skills and technologies
2. Job titles and roles
3. Location preferences (if mentioned)

Return 5-10 most relevant keywords for job searching.
Be specific and use terms that would appear in job postings.
```

### Response Parsing

```javascript
// AI returns JSON
{
  "skills": ["React", "Node.js", "Python", "AWS", "Docker"],
  "jobTitles": ["Senior Software Engineer", "Full Stack Developer"],
  "location": "San Francisco"
}

// Keywords joined: "React Node.js Python AWS Docker"
// Location: "San Francisco"
// Auto-populate search fields
```

## Error Handling

### Common Errors & Solutions

**Error: "Please configure your API key in Settings first"**
- **Solution**: Go to Settings → Add Claude or OpenAI API key

**Error: "Please select a resume"**
- **Solution**: Choose a resume from dropdown before clicking Extract

**Error: "Resume not found"**
- **Solution**: Ensure resume exists in Resumes tab

**Error: "Claude API error: 401"**
- **Solution**: Invalid API key - check Settings

**Error: "Failed to parse AI response"**
- **Solution**: AI returned unexpected format - try again

**Error: "No resumes found. Create a resume first"**
- **Solution**: Go to Resumes tab and create/import a resume

## Best Practices

### For Best Results

1. **Keep Resume Updated**
   - Add recent skills and technologies
   - Include relevant keywords in work experience
   - List specific tools and frameworks

2. **Use Descriptive Titles**
   - "Senior React Developer" better than "Developer"
   - Include seniority level (Junior, Senior, Staff, etc.)

3. **Add Location Info**
   - Include "Remote" if that's your preference
   - Mention cities or regions in profile/summary

4. **Technical Detail**
   - List specific technologies (not just "programming")
   - Include frameworks, tools, platforms

### After Extraction

1. **Review Keywords**: Check if they match what you want
2. **Adjust if Needed**: You can edit the extracted keywords
3. **Add More**: Include specific companies or locations
4. **Search**: Click "Search Jobs" to find matches

## Performance

- **Extraction Time**: 2-5 seconds (depends on AI service)
- **API Cost**: ~$0.001-0.01 per extraction (user's API key)
- **Cache**: No caching (fresh extraction each time)
- **Rate Limits**: Subject to your AI provider's limits

## Future Enhancements

Potential improvements:

- [ ] Cache extracted keywords per resume
- [ ] Show confidence scores for keywords
- [ ] Extract additional metadata (years of experience, education level)
- [ ] Support for multiple resume formats (PDF upload)
- [ ] Keyword suggestions based on job market trends
- [ ] Auto-search after extraction (optional)

## Troubleshooting

### Dialog Won't Open

- Check browser console for errors
- Ensure component is fully loaded
- Try refreshing the page

### Extraction Takes Too Long

- Check network connection
- Verify API key is valid
- Try with a different resume (smaller size)

### Keywords Don't Match Resume

- Resume might be too generic
- Add more specific technical terms
- Try a different AI service (Claude vs OpenAI)

### No Resumes in Dropdown

- Go to Resumes tab
- Create a new resume or import existing one
- Return to Job Search tab

## API Costs

Approximate costs per extraction (using your API key):

**Claude (Anthropic)**
- Input: ~1,000 tokens (resume data)
- Output: ~200 tokens (keywords)
- Cost: ~$0.005 per extraction

**OpenAI (GPT-4o)**
- Input: ~1,000 tokens
- Output: ~200 tokens
- Cost: ~$0.01 per extraction

Very affordable for occasional use!

## Security & Privacy

✅ **No Server Storage**: Resume data sent directly to AI provider
✅ **User API Keys**: You control and own your API keys
✅ **HTTPS Only**: All API calls encrypted
✅ **No Logging**: Extraction requests not logged by application
✅ **Local Storage**: Resume data stored only in browser localStorage

## Comparison: Manual vs AI Extraction

| Aspect | Manual Entry | AI Extraction |
|--------|--------------|---------------|
| Time | 2-5 minutes | 5 seconds |
| Accuracy | Depends on user | AI-optimized |
| Completeness | May miss keywords | Comprehensive |
| Job Market Fit | User knowledge | AI-trained on job data |
| Ease of Use | Typing required | One-click |

## Related Features

- **Job Search**: Uses extracted keywords to find jobs
- **Resume Editor**: Create/edit resumes for analysis
- **AI Assistant**: Other AI-powered features
- **Settings**: Configure API keys

---

**Last Updated**: January 17, 2025
**Feature Version**: 1.0
**Supported Models**: Claude 3.5 Sonnet, GPT-4o
