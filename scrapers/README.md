# Job Board Scrapers

This directory contains web scrapers for various job boards that can extract job listings and format them for import into the job-tool.

## Available Scrapers

### 🎯 hiring.cafe Scraper

A Puppeteer-based scraper for extracting job listings from hiring.cafe search results.

## Installation

Make sure you have Puppeteer installed:

```bash
npm install
```

This will install puppeteer from the `package-test.json` file.

## Usage

### Basic Usage

```bash
# Using npm script
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=..."

# Or directly with node
node scrapers/scrape-hiring-cafe.js "https://hiring.cafe/?searchState=..."
```

### Advanced Options

```bash
# See all available options
npm run scrape:help

# Run with visible browser (useful for debugging)
node scrapers/scrape-hiring-cafe.js --headless=false "https://hiring.cafe/..."

# Custom output file
node scrapers/scrape-hiring-cafe.js --output=my-jobs.json "https://hiring.cafe/..."

# Faster scraping (less waiting and scrolling)
node scrapers/scrape-hiring-cafe.js --wait=3000 --max-scrolls=3 "https://hiring.cafe/..."

# Verbose logging
node scrapers/scrape-hiring-cafe.js --verbose "https://hiring.cafe/..."
```

### Options

- `--headless=false` - Run with visible browser (default: true)
- `--wait=5000` - Wait time for page load in milliseconds (default: 5000)
- `--scroll-delay=1000` - Delay between scrolls in milliseconds (default: 1000)
- `--max-scrolls=5` - Maximum number of scrolls to load more jobs (default: 5)
- `--output=path` - Custom output file path (default: auto-generated)
- `--verbose` - Enable verbose logging

## How to Get a hiring.cafe Search URL

1. Go to [hiring.cafe](https://hiring.cafe/)
2. Enter your search criteria:
   - Job title/keywords (e.g., "software engineering manager")
   - Location (e.g., "San Francisco, CA")
   - Filters (remote, salary, etc.)
3. Click search
4. Copy the URL from your browser's address bar
5. Use that URL with the scraper

Example URL:
```
https://hiring.cafe/?searchState=%7B%22searchQuery%22%3A%22software+engineering+manager%22%2C%22locations%22%3A%5B%7B%22id%22%3A%226xk1yZQBoEtHp_8Uv-2X%22...
```

## Output

The scraper generates two files:

1. **Main output** (`hiring-cafe-jobs-YYYY-MM-DD-HH-MM.json`):
   - Full job data in job-tool format
   - Ready to import directly into the application
   - Contains all fields: title, company, location, URL, description, etc.

2. **Summary** (`hiring-cafe-jobs-YYYY-MM-DD-HH-MM-summary.json`):
   - Quick overview of scraped jobs
   - Useful for reviewing what was found
   - Includes job count and basic job info

## Importing Scraped Jobs

After scraping, import the jobs into your job-tool:

### Method 1: Web Interface (Recommended)

1. Open `app.html` or `jobs.html` in your browser
2. Navigate to the Jobs section
3. Look for "Import Jobs" or use the job-manager component
4. Select the generated JSON file
5. Jobs will be imported with status "saved"

### Method 2: Batch Import Script

If you have many jobs to import, you can use the batch import utility:

```bash
node scrapers/import-jobs.js hiring-cafe-jobs-2025-01-15.json
```

*(Coming soon)*

## How It Works

The scraper:

1. **Launches a browser** - Uses Puppeteer to control a headless Chrome instance
2. **Navigates to URL** - Goes to your hiring.cafe search results page
3. **Waits for JavaScript** - Allows the React/JavaScript app to render
4. **Scrolls the page** - Loads lazy-loaded content by scrolling
5. **Extracts job data** - Uses multiple fallback selectors to find job cards
6. **Formats data** - Converts to job-tool format with all required fields
7. **Saves to file** - Outputs JSON ready for import

## Troubleshooting

### No jobs found

- **Check the URL** - Make sure you're using a search results URL, not the homepage
- **Increase wait time** - Try `--wait=10000` for slower connections
- **Run with visible browser** - Use `--headless=false` to see what's happening
- **Page structure changed** - The site may have updated their HTML structure

### Browser won't launch

- **Install dependencies** - Run `npm install` to ensure Puppeteer is installed
- **Check permissions** - On Linux, you may need additional dependencies:
  ```bash
  # Debian/Ubuntu
  sudo apt-get install -y chromium-browser

  # Or install Chrome dependencies
  sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
  ```

### Rate limiting

- **Add delays** - Increase `--wait` and `--scroll-delay` values
- **Don't abuse** - Be respectful of the site's resources
- **Space out scrapes** - Don't run the scraper too frequently

## Future Scrapers

Planned scrapers for other job boards:

- [ ] LinkedIn Jobs
- [ ] Indeed
- [ ] Glassdoor
- [ ] AngelList/Wellfound
- [ ] RemoteOK
- [ ] We Work Remotely
- [ ] Hacker News "Who's Hiring" threads

## Contributing

To add a new scraper:

1. Create a new file: `scrapers/scrape-[sitename].js`
2. Follow the same pattern as the hiring.cafe scraper
3. Output jobs in the job-tool format (see example below)
4. Add documentation to this README
5. Add npm script to `package-test.json`

### Job Format

```javascript
{
  "id": "job_[source]_[timestamp]_[index]",
  "title": "Software Engineer",
  "company": "Tech Company Inc",
  "location": "San Francisco, CA",
  "url": "https://example.com/job/123",
  "description": "Job description text...",
  "salary": "$120k - $180k",
  "jobType": "Remote",
  "source": "hiring.cafe",
  "sourceUrl": "https://hiring.cafe/?search=...",
  "status": "saved",
  "dateCreated": "2025-01-15T10:30:00.000Z",
  "dateUpdated": "2025-01-15T10:30:00.000Z",
  "dateApplied": null,
  "statusHistory": [],
  "resumeId": null,
  "contactName": "",
  "contactEmail": "",
  "contactPhone": "",
  "notes": "Scraped from [source] on [date]",
  "logs": []
}
```

## License

Same as the parent project.
