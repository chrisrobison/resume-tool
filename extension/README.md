# Job Hunt Manager - Browser Extension

A Chrome/Edge extension that allows you to save job postings from LinkedIn, Indeed, and Glassdoor with one click.

## Features

- 🔖 **One-Click Save**: Save job postings directly from job board pages
- 🎯 **Platform Support**: Works on LinkedIn, Indeed, and Glassdoor
- 💾 **Local Storage**: All data stored locally in your browser
- ⌨️ **Keyboard Shortcut**: Quick save with `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)
- 📊 **Status Tracking**: Track application status (Wishlist, Applied, Interviewing, etc.)
- 🔄 **Sync Ready**: Designed to sync with the main Job Hunt Manager web app

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the [Chrome Web Store](#)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/resume-tool.git
   cd resume-tool/extension
   ```

2. **Open Chrome/Edge Extension Page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `extension` folder
   - The extension icon should appear in your toolbar

5. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in the toolbar
   - Click the pin icon next to "Job Hunt Manager"

## Usage

### Saving a Job

#### Method 1: Floating Button
1. Visit a job posting on LinkedIn, Indeed, or Glassdoor
2. Look for the blue "Save Job" button in the bottom right corner
3. Click the button to save the job
4. You'll see a success notification

#### Method 2: Context Menu
1. Right-click anywhere on a job posting page
2. Select "Save to Job Hunt Manager"
3. The job will be extracted and saved

#### Method 3: Keyboard Shortcut
1. While viewing a job posting, press:
   - Windows/Linux: `Ctrl+Shift+S`
   - Mac: `Cmd+Shift+S`
2. The job will be saved automatically

#### Method 4: Extension Popup
1. Click the extension icon in your toolbar
2. Click "Save This Job" (when on a job page)

### Managing Saved Jobs

1. **View Saved Jobs**
   - Click the extension icon to open the popup
   - See all your saved jobs listed

2. **Change Job Status**
   - Click a job to expand details
   - Use the status dropdown to update
   - Available statuses: Wishlist, Applied, Interviewing, Offered, Rejected, Accepted

3. **Delete a Job**
   - Expand a job in the popup
   - Click the "Delete" button
   - Confirm the deletion

4. **Open Job Link**
   - Expand a job in the popup
   - Click "View" to open the original job posting

### Syncing with Web App

1. Click the extension icon
2. Click "Open App" to access the full web application
3. Your saved jobs will be available in the extension
4. Future updates will include automatic sync between extension and web app

## Supported Job Boards

| Platform | Job Listings | Company Pages | Search Results |
|----------|-------------|---------------|----------------|
| **LinkedIn** | ✅ Yes | ❌ No | ❌ No |
| **Indeed** | ✅ Yes | ❌ No | ❌ No |
| **Glassdoor** | ✅ Yes | ❌ No | ❌ No |

## Extracted Data

The extension automatically extracts the following information:

- ✅ Job Title
- ✅ Company Name
- ✅ Location
- ✅ Salary (if available)
- ✅ Job Description
- ✅ Requirements (if available)
- ✅ Benefits (if available)
- ✅ Employment Type (Full-time, Part-time, etc.)
- ✅ Posted Date
- ✅ Company Logo
- ✅ Job URL

## Privacy & Data

- **Local Storage Only**: All job data is stored locally in your browser using Chrome's storage API
- **No External Servers**: The extension does not send data to any external servers
- **No Tracking**: We don't track your browsing or job search activity
- **Minimal Permissions**: The extension only accesses job board pages you explicitly visit

### Permissions Explained

- `storage`: Store saved jobs locally in your browser
- `activeTab`: Access the current tab to extract job details
- `contextMenus`: Add "Save to Job Hunt Manager" to right-click menu
- `notifications`: Show success/error notifications

## Development

### Project Structure

```
extension/
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── content-script.js      # Injected into job board pages
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── parsers/              # Job extraction parsers
│   ├── job-extractor.js  # Base extraction service
│   ├── linkedin-parser.js
│   ├── indeed-parser.js
│   └── glassdoor-parser.js
├── icons/                # Extension icons
└── README.md            # This file
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/resume-tool.git
cd resume-tool/extension

# No build step required - the extension runs directly from source

# Load in Chrome/Edge as described in Installation section
```

### Testing

1. **Test on Real Job Postings**
   - Navigate to job postings on supported platforms
   - Click the "Save Job" button
   - Verify data extraction in the popup

2. **Test Edge Cases**
   - Jobs without salary information
   - Remote jobs
   - Jobs with special characters
   - Very long job descriptions

3. **Test All Save Methods**
   - Floating button
   - Context menu
   - Keyboard shortcut
   - Extension popup

### Debugging

1. **Background Script Console**
   - Go to `chrome://extensions/`
   - Find "Job Hunt Manager"
   - Click "service worker" link
   - View console logs

2. **Content Script Console**
   - Right-click on a job page
   - Select "Inspect"
   - Go to Console tab
   - Look for "Job Hunt Manager" logs

3. **Popup Console**
   - Open the extension popup
   - Right-click inside the popup
   - Select "Inspect"

## Icon Requirements

The extension requires icons in the following sizes:

- `icons/icon16.png` - 16x16px (toolbar, small displays)
- `icons/icon32.png` - 32x32px (toolbar retina)
- `icons/icon48.png` - 48x48px (extension management page)
- `icons/icon128.png` - 128x128px (Chrome Web Store, installation)

**Icon Design Guidelines:**
- Use the Job Hunt Manager brand colors (#3498db primary)
- Include a recognizable symbol (briefcase, bookmark, or checkmark)
- Ensure icon is clear at small sizes
- Use transparent background
- Follow Chrome Web Store icon guidelines

## Troubleshooting

### Extension Not Appearing
- Verify you're on a supported job board URL
- Check that Developer Mode is enabled
- Reload the extension from `chrome://extensions/`

### Save Button Not Showing
- Refresh the job posting page
- Check browser console for errors
- Verify the URL matches supported patterns

### Jobs Not Saving
- Check storage quota in `chrome://extensions/`
- Look for errors in background script console
- Ensure you have permission to access storage

### Extraction Errors
- Some job boards frequently update their HTML structure
- Report issues with specific URLs to help improve parsers
- Try refreshing the page and saving again

## Roadmap

### Version 1.1
- [ ] Firefox support (Manifest V2)
- [ ] Safari extension port
- [ ] Export jobs to CSV/JSON

### Version 1.2
- [ ] Sync with web app (cloud storage)
- [ ] Custom fields and notes
- [ ] Tags and categories

### Version 1.3
- [ ] Bulk operations (delete, status change)
- [ ] Search and filter within extension
- [ ] Import from spreadsheet

### Version 2.0
- [ ] AI-powered job matching
- [ ] Salary insights and comparisons
- [ ] Application tracking timeline

## Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

### Ways to Contribute
- Report bugs and issues
- Suggest new features
- Improve job extraction accuracy
- Add support for new job boards
- Improve documentation
- Translate to other languages

## License

MIT License - See [LICENSE](../LICENSE) for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/resume-tool/issues)
- **Email**: support@jobhuntmanager.com
- **Docs**: [Documentation](https://docs.jobhuntmanager.com)

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Support for LinkedIn, Indeed, Glassdoor
- Local storage
- Status tracking
- Context menu and keyboard shortcuts
- Extension popup with job management

---

Made with ❤️ by the Job Hunt Manager Team
