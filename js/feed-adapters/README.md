# Job Feed Adapters

This directory contains pluggable adapters for fetching jobs from various sources. Each adapter implements a standard interface defined by the `FeedAdapter` base class.

## Architecture

The job feeds system uses a modular adapter pattern:

```
FeedManager (js/job-feeds.js)
    ↓
FeedAdapter Interface
    ↓
├── HNJobsAdapter (hn-jobs.js)
├── [Future: LinkedInAdapter]
├── [Future: IndeedAdapter]
└── [Future: CustomRSSAdapter]
```

## Creating a New Adapter

To add support for a new job source:

### 1. Create Adapter File

Create `your-source.js` in this directory:

```javascript
import { FeedAdapter } from '../job-feeds.js';

export class YourSourceAdapter extends FeedAdapter {
    constructor(config = {}) {
        super({
            name: 'Your Source Name',
            enabled: true,
            ...config
        });
    }

    async fetchJobs(params = {}) {
        // Implement job fetching logic
        // Return array of standardized job objects
    }

    parseJobs(rawData) {
        // Parse source-specific format into standard format
    }

    getSearchParams() {
        // Define search parameters for this source
        return {
            keywords: { type: 'text', label: 'Keywords', required: false },
            // ... other params
        };
    }
}
```

### 2. Standardized Job Format

All adapters must return jobs in this format:

```javascript
{
    id: 'unique_id',              // Unique identifier
    title: 'Job Title',           // Position title
    company: 'Company Name',      // Company
    location: 'Location',         // Job location
    description: 'Full text...',  // Job description
    url: 'https://...',           // Link to job
    datePosted: '2025-01-01',     // ISO date string
    source: 'Source Name',        // Your adapter name
    sourceData: {},               // Original data (optional)
    salary: '$100k-150k',         // Salary if available
    tags: ['tag1', 'tag2'],       // Extracted keywords
    remote: true                  // Remote position flag
}
```

### 3. Register Adapter

In `components/job-search.js`:

```javascript
import { createYourSourceAdapter } from '../js/feed-adapters/your-source.js';

async onInitialize() {
    const adapter = createYourSourceAdapter();
    this._feedManager.registerAdapter('your-source', adapter);
}
```

## Existing Adapters

### HN Jobs Adapter (`hn-jobs.js`)

Fetches jobs from Hacker News "Who is Hiring?" posts via hnrss.org.

**Features:**
- Full JSON Feed support
- Keyword and location filtering
- Automatic tag extraction
- Remote job detection
- No API key required
- **Uses server-side proxy** (feed-proxy.php) to bypass CORS restrictions

**Technical Notes:**
- HN RSS feed (hnrss.org) doesn't support CORS
- All requests are routed through `/job-tool/feed-proxy.php`
- Proxy handles caching (5 minutes) and rate limiting
- Proxy validates allowed hosts for security

**Search Parameters:**
- `keywords` - Search terms
- `location` - Location filter (city, state, or "Remote")
- `limit` - Max results (1-100, default: 50)

**Example Usage:**
```javascript
const result = await feedManager.fetchJobs('hn-jobs', {
    keywords: 'React Senior Engineer',
    location: 'San Francisco',
    limit: 20
});
```

## Future Adapters

### Planned Additions

1. **LinkedIn Jobs Adapter**
   - Use LinkedIn Job Search API (requires approval)
   - Company pages scraping (via API)

2. **Indeed Adapter**
   - Indeed Publisher API integration
   - Requires API key from Indeed

3. **GitHub Jobs Adapter**
   - GitHub Jobs API (free, tech-focused)
   - No authentication required

4. **Generic RSS/Atom Adapter**
   - Support any RSS/Atom feed
   - Configurable field mapping

5. **Dice API Adapter**
   - Dice job board integration
   - Tech-focused positions

## Best Practices

1. **Error Handling**
   - Always catch and return meaningful errors
   - Use try-catch in `fetchJobs()`
   - Return `{ success: false, error: 'message' }`

2. **Rate Limiting**
   - Respect API rate limits
   - Implement caching (FeedManager handles this)
   - Add delays between requests if needed

3. **Data Parsing**
   - Be defensive - check for null/undefined
   - Provide sensible defaults
   - Log parsing errors without failing

4. **Configuration**
   - Make adapters configurable via constructor
   - Support enabled/disabled state
   - Validate configuration in `validate()` method

## Testing

Test your adapter using `test-job-feeds.html`:

```bash
# Open in browser
open test-job-feeds.html

# Or via web server
https://cdr2.com/job-tool/test-job-feeds.html
```

## Server-Side Proxy

Many feed sources (like hnrss.org) don't support CORS requests from browsers. We use a server-side proxy (`feed-proxy.php`) to handle these requests.

### Proxy Features:
- **CORS handling** - Adds proper CORS headers
- **Security** - Whitelist of allowed hosts (prevents SSRF attacks)
- **Caching** - 5-minute cache to reduce API load
- **Rate limiting** - 30 requests per minute per IP
- **IP filtering** - Blocks requests to private IP ranges

### Allowed Hosts:
- `hnrss.org` - Hacker News RSS
- `news.ycombinator.com` - Hacker News
- `api.github.com` - GitHub Jobs
- `feeds.feedburner.com` - Generic RSS
- `rss.app` - RSS aggregator

### Adding New Hosts:
Edit `feed-proxy.php` and add to the `ALLOWED_HOSTS` array:
```php
const ALLOWED_HOSTS = [
    'hnrss.org',
    'your-new-host.com', // Add your host here
];
```

### Using the Proxy:
```javascript
// Adapter automatically uses proxy
this.proxyUrl = '/job-tool/feed-proxy.php';

// Makes request through proxy
const proxyUrl = `${this.proxyUrl}?url=${encodeURIComponent(feedUrl)}`;
const response = await fetch(proxyUrl);
```

### Testing the Proxy:
```bash
# PHP test script
php test-feed-proxy.php

# Manual test
curl "http://localhost/job-tool/feed-proxy.php?url=https%3A%2F%2Fhnrss.org%2Fwhoishiring%2Fjobs.jsonfeed%3Fcount%3D5"
```

## API Keys & Security

- **Never commit API keys** to the repository
- Store keys in localStorage (user provides)
- Pass keys via adapter config:

```javascript
const adapter = new YourAdapter({
    apiKey: localStorage.getItem('yourservice_api_key')
});
```

## Contributing

When adding a new adapter:

1. Create adapter file in this directory
2. Implement all required methods
3. Add comprehensive JSDoc comments
4. Test with `test-job-feeds.html`
5. Update this README
6. Add to `CLAUDE.md` project documentation
