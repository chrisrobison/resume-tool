# 🚀 Quick Start: Job Search Feature

## 5-Minute Setup Guide

### Step 1: Open the Application
```
https://cdr2.com/job-tool/jobs-new.html
```

### Step 2: Navigate to Job Search
Click the **🔍 Job Search** tab in the left sidebar.

### Step 3: Try Your First Search

**Example 1: Remote Jobs**
- Location: `Remote`
- Max Results: `20`
- Click **🔍 Search Jobs**

**Example 2: Location-Specific**
- Keywords: `Senior Engineer`
- Location: `San Francisco`
- Max Results: `30`
- Click **🔍 Search Jobs**

**Example 3: Technology-Specific**
- Keywords: `React Python`
- Max Results: `50`
- Click **🔍 Search Jobs**

### Step 4: Import Jobs

1. Review the search results
2. Check boxes next to interesting jobs
3. Click **Import X Selected** button
4. Jobs appear in your **Jobs** tab!

## Features at a Glance

| Feature | Description |
|---------|-------------|
| 🔍 **Smart Search** | Keyword and location filtering |
| 📦 **Bulk Import** | Select and import multiple jobs |
| 🏷️ **Auto-Tagging** | Automatically detects tech keywords |
| 💼 **Remote Detection** | Identifies remote positions |
| 📊 **Source Tracking** | Know where each job came from |
| ⚡ **Fast Caching** | Instant results for recent searches |

## What Gets Imported?

When you import a job, it's added to your tracking system with:

- ✅ Job title, company, location
- ✅ Full description
- ✅ Link to original posting
- ✅ Date posted
- ✅ Automatically extracted tags (React, Python, etc.)
- ✅ Remote status
- ✅ Source attribution ("Hacker News")
- ✅ Status set to "saved"

## Next Steps

After importing jobs:

1. **Update Status** - Mark as "applied", "interviewing", etc.
2. **Add Notes** - Track communication, interview dates
3. **Associate Resume** - Link to specific resume version
4. **Generate Cover Letter** - Use AI Assistant
5. **Track Progress** - Monitor your job search pipeline

## Tips & Tricks

### Best Search Practices

✨ **Be Specific**
- Good: `Senior React Engineer`
- Bad: `Job`

✨ **Use Multiple Searches**
- Search for different locations
- Try various keyword combinations
- Import from multiple sessions

✨ **Review Before Importing**
- Read job descriptions
- Check company websites
- Verify remote status

### Managing Results

- **Select All** - Import entire result set
- **Partial Import** - Cherry-pick the best matches
- **Multiple Passes** - Search, review, import, repeat

### Search Examples

#### Tech Stack Focused
```
Keywords: "Ruby on Rails"
Location: Remote
Limit: 50
```

#### Experience Level
```
Keywords: "Senior Staff Principal"
Location: San Francisco
Limit: 30
```

#### Company Size
```
Keywords: "startup seed series"
Location: New York
Limit: 25
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit search |
| `Esc` | Clear selection |

## Current Feed Sources

### 🔶 Hacker News Jobs
- **Best For**: Tech positions, startups, remote work
- **Updates**: Monthly "Who is Hiring?" threads
- **Quality**: High (manually posted by companies)
- **Quantity**: 100-500 jobs per month
- **Locations**: Worldwide, heavy US focus

## Coming Soon

- 🔷 **LinkedIn Jobs** - Professional network integration
- 🔷 **Indeed API** - Broader job market coverage
- 🔷 **GitHub Jobs** - Developer-focused positions
- 🔷 **Custom RSS** - Add your own feeds
- 🔷 **Saved Searches** - Rerun favorite searches
- 🔷 **Email Alerts** - Get notified of new matches

## Troubleshooting

### "No jobs found"
- ✅ Try broader search terms
- ✅ Remove location filter
- ✅ Increase result limit

### "Search failed"
- ✅ Check internet connection
- ✅ Try again in a few seconds
- ✅ Clear cache and retry

### "Import failed"
- ✅ Check browser console (F12)
- ✅ Verify localStorage isn't full
- ✅ Refresh page and retry

## Testing the Feature

Want to verify everything works?

Open `test-job-feeds.html` to run diagnostic tests:
```
https://cdr2.com/job-tool/test-job-feeds.html
```

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Job Search UI Component           │
│   (components/job-search.js)        │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Feed Manager                      │
│   (js/job-feeds.js)                 │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   HN Jobs Adapter                   │
│   (js/feed-adapters/hn-jobs.js)     │
└──────────────┬──────────────────────┘
               │
               ↓
       📡 hnrss.org API
               │
               ↓
       📊 Parsed Job Data
               │
               ↓
    💾 Your Job Tracking System
```

## Developer Mode

### Test Individual Components

```javascript
// In browser console (jobs-new.html)

// Get feed manager
const feedManager = window.feedManager; // or import manually

// Fetch jobs programmatically
const result = await feedManager.fetchJobs('hn-jobs', {
    keywords: 'React',
    location: 'Remote',
    limit: 10
});

console.log(result);
```

### Register Custom Adapter

```javascript
import { FeedAdapter, getFeedManager } from './js/job-feeds.js';

class MyAdapter extends FeedAdapter {
    async fetchJobs(params) {
        // Your implementation
    }
}

const manager = getFeedManager();
manager.registerAdapter('my-source', new MyAdapter());
```

## Feedback & Support

Found a bug or have a feature request?

1. Check browser console for errors
2. Review documentation in `JOB-SEARCH-FEATURE.md`
3. Test with `test-job-feeds.html`
4. Check `js/feed-adapters/README.md` for adapter info

## Performance Notes

- **Initial Search**: 1-3 seconds
- **Cached Search**: Instant
- **Import Speed**: ~50ms per job
- **Memory Usage**: Minimal (<5MB for 100 jobs)
- **Cache Duration**: 5 minutes

## Privacy & Data

✅ **All data stored locally** - Nothing sent to external servers (except feed APIs)
✅ **No tracking** - Your searches aren't logged
✅ **No accounts** - No registration required
✅ **Source attribution** - Always know where jobs came from
✅ **Delete anytime** - Clear localStorage to remove all data

---

**Ready to find your next opportunity? Start searching! 🚀**
