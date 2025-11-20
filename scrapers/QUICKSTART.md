# Quick Start Guide - hiring.cafe Scraper

Get job listings from hiring.cafe into your job-tool in 3 easy steps!

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd /home/cdr/domains/cdr2.com/www/job-tool
npm install
```

### Step 2: Scrape Jobs from hiring.cafe

```bash
# Replace the URL with your actual search URL from hiring.cafe
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=..."
```

**How to get your search URL:**
1. Go to https://hiring.cafe/
2. Search for jobs (e.g., "software engineering manager" in "San Francisco, CA")
3. Copy the entire URL from your browser's address bar
4. Paste it into the command above (keep the quotes!)

### Step 3: Import Jobs into Job-Tool

Two options:

#### Option A: Automatic Import (Recommended)

```bash
# This will open a browser and import automatically
npm run import:jobs scrapers/hiring-cafe-jobs-[timestamp].json
```

#### Option B: Manual Import

1. Open `app.html` or `jobs.html` in your browser
2. Go to Jobs section
3. Click "Import Jobs"
4. Select the generated JSON file from the `scrapers/` directory
5. Done!

## 📋 Complete Example

Here's a complete workflow:

```bash
# 1. Navigate to project directory
cd /home/cdr/domains/cdr2.com/www/job-tool

# 2. Install Puppeteer (first time only)
npm install

# 3. Run the scraper with your hiring.cafe search URL
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=%7B%22searchQuery%22%3A%22software+engineer%22%7D"

# Output will show:
# 🚀 Starting hiring.cafe scraper...
# 🌐 Navigating to hiring.cafe...
# ⏳ Waiting for page to render...
# 📜 Scrolling to load more jobs...
# 🔍 Extracting job data...
# ✅ Found 47 jobs!
# 💾 Saved 47 jobs to: scrapers/hiring-cafe-jobs-2025-01-15T10-30-15.json

# 4. Import the jobs
npm run import:jobs scrapers/hiring-cafe-jobs-2025-01-15T10-30-15.json

# 5. Open the app and view your imported jobs!
```

## 🎯 Pro Tips

### Watch the Browser in Action

See what the scraper is doing:

```bash
node scrapers/scrape-hiring-cafe.js --headless=false "https://hiring.cafe/..."
```

### Faster Scraping

If you're in a hurry and don't need to scroll for more jobs:

```bash
node scrapers/scrape-hiring-cafe.js \
  --wait=3000 \
  --max-scrolls=2 \
  "https://hiring.cafe/..."
```

### Custom Output Location

Save to a specific file:

```bash
node scrapers/scrape-hiring-cafe.js \
  --output=my-dream-jobs.json \
  "https://hiring.cafe/..."
```

### Multiple Searches

Run multiple searches and combine them:

```bash
# Search 1: Engineering jobs in SF
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=...engineering...sf..."

# Search 2: Engineering jobs in NYC
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=...engineering...nyc..."

# Search 3: Remote engineering jobs
npm run scrape:hiring-cafe "https://hiring.cafe/?searchState=...engineering...remote..."

# Import all of them
npm run import:jobs scrapers/hiring-cafe-jobs-*.json
```

## 🐛 Troubleshooting

### "No jobs found"

**Problem:** Scraper runs but finds 0 jobs.

**Solutions:**
- Make sure you're using a search results URL, not the homepage
- Try increasing wait time: `--wait=10000`
- Run with visible browser to debug: `--headless=false`

### "Failed to launch browser"

**Problem:** Puppeteer can't start Chrome.

**Solutions:**
```bash
# On Ubuntu/Debian
sudo apt-get install -y chromium-browser

# Or install Chrome dependencies
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
  libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

### Rate Limiting (429 errors)

**Problem:** hiring.cafe is blocking requests.

**Solutions:**
- Add more delays: `--wait=8000 --scroll-delay=2000`
- Don't run the scraper too frequently
- Wait a few minutes between runs

### Duplicate Jobs

**Problem:** Same jobs imported multiple times.

**Solution:** The import script automatically skips duplicates! If you see duplicates, they likely have different URLs or slight variations in title/company.

## 📖 More Help

- Full documentation: See `scrapers/README.md`
- Command options: `npm run scrape:help`
- Issues? Check the console output for error messages

## 🎉 Success!

Once imported, your jobs will be in the job-tool with:
- ✅ Status: "saved" (ready for you to review)
- 📝 Source: "hiring.cafe" (so you remember where they came from)
- 🔗 Direct links to the original job postings
- 📅 Dates for tracking when you found them

Now you can:
- Update job status as you apply
- Associate tailored resumes with each job
- Track your application progress
- Use AI to tailor your resume for each position

Happy job hunting! 🚀
