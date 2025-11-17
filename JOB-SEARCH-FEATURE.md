# 🔍 Job Search Feature

## Overview

The Job Search feature allows you to discover and import jobs from external sources directly into your job tracking system. It uses a modular adapter pattern, making it easy to add new job sources.

## Features

✅ **Modular Feed System** - Plugin architecture for multiple job sources
✅ **HN Who is Hiring** - Built-in Hacker News jobs integration
✅ **Smart Filtering** - Search by keywords, location, and more
✅ **Bulk Import** - Select multiple jobs and import at once
✅ **Automatic Parsing** - Extract job details automatically
✅ **Tag Extraction** - Automatically detect relevant skills and keywords
✅ **Remote Detection** - Identify remote positions
✅ **Caching** - Smart caching to avoid redundant API calls

## How to Use

### 1. Access Job Search

Navigate to the **Job Search** tab in the sidebar (🔍 icon).

### 2. Select Feed Source

Choose from available job feeds:
- **Hacker News Jobs** - Tech jobs from HN "Who is Hiring?" threads

### 3. Search for Jobs

Enter search parameters:
- **Keywords** - Job title, skills, technologies (e.g., "React", "Senior Engineer")
- **Location** - City, state, or "Remote"
- **Max Results** - Number of jobs to fetch (1-100)

Click **🔍 Search Jobs** to fetch results.

### 4. Review Results

Browse the job listings with:
- Job title and company
- Location and posting date
- Remote status indicator
- Automatically extracted tags
- Description preview

### 5. Import Jobs

1. Check the boxes next to jobs you want to import
2. Or use **Select All** to import all results
3. Click **Import Selected** to add jobs to your tracking system

Imported jobs will appear in your **Jobs** list with:
- Status set to "saved"
- Source attribution (e.g., "Hacker News")
- All extracted metadata
- Status history entry

## Architecture

### Core Components

```
js/job-feeds.js
├── FeedManager          - Manages all feed adapters
├── FeedAdapter          - Base class for adapters
└── Helper functions     - Caching, conversion, etc.

js/feed-adapters/
└── hn-jobs.js          - Hacker News adapter

components/job-search.js - UI component (ComponentBase)
```

### Data Flow

```
User Search Input
    ↓
FeedManager.fetchJobs()
    ↓
HNJobsAdapter.fetchJobs()
    ↓
Parse & Standardize
    ↓
Display in UI
    ↓
User Selects Jobs
    ↓
convertToInternalJob()
    ↓
Save to Storage
    ↓
Update Global State
    ↓
Refresh Jobs List
```

## Technical Details

### Standardized Job Format

All feed adapters convert jobs to this format:

```javascript
{
    id: 'unique_id',
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    description: 'Full job description...',
    url: 'https://example.com/job',
    datePosted: '2025-01-16T12:00:00Z',
    source: 'Hacker News',
    sourceData: { /* original data */ },
    salary: '$150k-200k',
    tags: ['javascript', 'react', 'senior'],
    remote: true
}
```

### Internal Job Schema

Jobs are converted to the internal format:

```javascript
{
    id: 'job_timestamp_random',
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    url: 'https://example.com/job',
    description: 'Full job description...',
    status: 'saved',
    dateCreated: '2025-01-16T12:00:00Z',
    dateApplied: null,
    resumeId: null,
    notes: '',
    salary: '$150k-200k',
    tags: ['javascript', 'react', 'senior'],
    remote: true,
    source: 'Hacker News',
    sourceData: { /* original data */ },
    statusHistory: [
        {
            from: null,
            to: 'saved',
            date: '2025-01-16T12:00:00Z',
            notes: 'Imported from Hacker News'
        }
    ]
}
```

## Adding New Feed Sources

### Quick Start

1. Create new adapter file:
```bash
touch js/feed-adapters/your-source.js
```

2. Implement adapter:
```javascript
import { FeedAdapter } from '../job-feeds.js';

export class YourSourceAdapter extends FeedAdapter {
    constructor(config = {}) {
        super({ name: 'Your Source', ...config });
    }

    async fetchJobs(params) {
        // Fetch and return jobs
    }

    parseJobs(rawData) {
        // Parse into standard format
    }
}
```

3. Register in `components/job-search.js`:
```javascript
import { createYourSourceAdapter } from '../js/feed-adapters/your-source.js';

const adapter = createYourSourceAdapter();
this._feedManager.registerAdapter('your-source', adapter);
```

See `js/feed-adapters/README.md` for detailed instructions.

## HN Jobs Adapter Details

### Data Source

- **Feed**: https://hnrss.org/whoishiring/jobs.jsonfeed
- **Format**: JSON Feed (RFC 7159)
- **Updates**: Posts from monthly "Who is Hiring?" threads
- **Rate Limit**: None (RSS feed)
- **Authentication**: Not required

### Search Capabilities

- **Keywords**: Full-text search in titles and descriptions
- **Location**: Filter by city, state, or "Remote"
- **Limit**: 1-100 jobs per request

### Parsing Features

The adapter automatically extracts:
- Job title from HN post title
- Company name (usually at start of post)
- Location (from common patterns)
- Remote status (detects "remote", "WFH", etc.)
- Tech tags (JavaScript, Python, React, etc.)
- Salary (if mentioned in description)

### Example HN Post Parsing

**Input (HN Post):**
```
Acme Corp (San Francisco, CA) | Senior Software Engineer | Full-time | Remote OK

We're looking for an experienced engineer to work on our React/Node.js platform...
```

**Output (Parsed Job):**
```javascript
{
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    description: 'We're looking for...',
    remote: true,
    tags: ['react', 'nodejs', 'fullstack', 'senior']
}
```

## Testing

### Manual Testing

1. Open `test-job-feeds.html` in browser
2. Run automated tests
3. Try custom search parameters
4. Verify job parsing and conversion

### Integration Testing

1. Navigate to Job Search tab in `app.html`
2. Search for jobs (e.g., location: "San Francisco")
3. Select and import jobs
4. Verify jobs appear in Jobs list
5. Check status history and metadata

## Performance

- **Caching**: 5-minute cache for search results
- **Parallel Requests**: Support for multiple feed sources
- **Non-blocking**: ComponentBase integration ensures smooth UI
- **Memory**: Minimal overhead with Set-based selection tracking

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

Requires:
- ES6 modules support
- Fetch API
- Web Components (Custom Elements)

## Troubleshooting

### No results found

- Try broader search terms
- Remove location filter
- Increase result limit
- Check browser console for errors

### Import fails

- Verify storage is available
- Check browser localStorage isn't full
- Look for duplicate job IDs
- Review console errors

### Feed unavailable

- Check internet connection
- Verify hnrss.org is accessible
- Try clearing cache
- Check browser CORS settings

## Future Enhancements

### Planned Features

- [ ] LinkedIn Jobs integration
- [ ] Indeed API adapter
- [ ] GitHub Jobs support
- [ ] Custom RSS feed adapter
- [ ] Save search queries
- [ ] Email alerts for new jobs
- [ ] Advanced filtering (salary, experience level)
- [ ] Job recommendations based on resume
- [ ] Export search results

### Community Adapters

We welcome contributions! To add a new job source:

1. Follow adapter creation guide in `js/feed-adapters/README.md`
2. Test thoroughly with `test-job-feeds.html`
3. Submit pull request with documentation
4. Include example searches and expected results

## Related Documentation

- **Architecture**: See `CLAUDE.md` for overall project structure
- **Adapter Development**: See `js/feed-adapters/README.md`
- **ComponentBase**: See `js/component-base.js` for component pattern
- **Global State**: See `js/store.js` for state management

## Credits

- **HN RSS Feed**: [hnrss.org](https://hnrss.org/) by Hacker News RSS
- **JSON Feed Spec**: [jsonfeed.org](https://jsonfeed.org/)
- **Hacker News**: [news.ycombinator.com](https://news.ycombinator.com/)

## License

This feature is part of the Job Hunt Manager project. All rights reserved.

---

**Questions or Issues?** Check the Help tab or review console logs for debugging information.
