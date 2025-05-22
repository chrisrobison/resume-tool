# Resume.json Editor - Developer Documentation

## Project Overview

This is a browser-based Resume.json Editor tool that allows users to create, edit, and manage resumes using the JSON Resume schema format. The application is a fully client-side single-page application that functions without a build process or server-side dependencies, though an optional Node.js component is included for AI resume customization.

## Architecture

The application follows a modular JavaScript architecture:

1. **Core App Object**: The main controller that coordinates all functionality
2. **Module-based Organization**: Functionality is split into specialized modules
3. **Local Storage**: Client-side persistence for saving resumes and settings
4. **Event Delegation**: Centralized event handling for dynamic elements
5. **AI Integration**: Optional Claude and OpenAI API integration

## Project Structure

```
resume-tool/
├── index.html            # Main application HTML
├── styles.css            # Global styles
├── js/                   # JavaScript modules
│   ├── core.js           # Main application object and initialization
│   ├── config.js         # Configuration and default data
│   ├── ui.js             # UI and view management
│   ├── utils.js          # Utility functions
│   ├── storage.js        # Local storage operations
│   ├── modals.js         # Modal dialogs and form handling
│   ├── preview.js        # Resume preview and themes
│   ├── import-export.js  # Import/export functionality
│   ├── jobs.js           # Job management system
│   ├── logs.js           # Activity logging and history
│   └── theme-styles.css  # Theme-specific CSS styles
└── server/               # Optional Node.js server for AI integration
```

## Modules and Key Components

### core.js

The central module containing the main application object and initialization logic. Coordinates the interaction between all other modules. Uses the namespace import pattern to reference functions from other modules.

Key functions:
- `app.init()`: Initialize the application
- `app.updateAllFields()`: Update UI from data model
- `app.saveNamedResume()`: Save resume with name to localStorage
- `app.loadSavedResume()`: Load resume from localStorage

### utils.js

Provides utility functions used throughout the application.

Key functions:
- `$(selector)`: Shorthand for querySelector
- `$$(selector)`: Shorthand for querySelectorAll
- `escapeHtml(str)`: Escape HTML entities for safe rendering
- `formatDate(dateStr, format)`: Format dates with multiple format options
- `showToast(message, type)`: Show toast notifications

### storage.js

Handles all localStorage operations for persistent data storage.

Key functions:
- `initLocalStorage()`: Initialize storage if needed
- `saveResumeToStorage(data)`: Save current resume to localStorage
- `loadResumeFromStorage()`: Load resume from localStorage
- `saveNamedResume(data, name)`: Save a named resume version
- `loadNamedResume(name)`: Load a specific named resume
- `deleteNamedResume(name)`: Delete a named resume

### ui.js

Manages the user interface, view switching, and tab navigation.

Key functions:
- `setupUIEventListeners(app)`: Set up UI-related event listeners
- `switchView(viewId)`: Switch between main views (resume, jobs, history)
- `switchTab(tabId)`: Switch between tabs in the resume editor
- `createSectionItem(data, index, type)`: Create list items for resume sections

### modals.js

Handles all modal dialogs and their associated forms.

Key functions:
- `setupModals(app)`: Initialize all modal event handlers
- `showModal(modalId)`: Show a specific modal
- `hideModal(modalId)`: Hide a specific modal
- `clearModalFields(modalId)`: Clear form fields in a modal
- Functions for each section: `setupProfileModal`, `setupWorkModal`, etc.
- Render functions: `renderProfiles`, `renderWork`, `renderEducation`, etc.

### preview.js

Manages the resume preview functionality and different theme renderings.

Key functions:
- `setupPreviewEventListeners(app)`: Set up preview-related event listeners
- `renderPreview(resumeData)`: Render the resume preview with selected theme
- `generateModernTheme(resumeData)`: Generate HTML for modern theme
- `generateClassicTheme(resumeData)`: Generate HTML for classic theme
- `generateMinimalTheme(resumeData)`: Generate HTML for minimal theme

### import-export.js

Handles importing and exporting resume data.

Key functions:
- `setupImportFunctionality(app)`: Set up import-related event listeners
- `setupExportFunctionality(app)`: Set up export-related event listeners
- `importFromJson(jsonString, app)`: Import resume from JSON text
- `importFromFile(file, app)`: Import resume from uploaded file
- `importFromUrl(url, app)`: Import resume from URL

### jobs.js

Manages job tracking, applications, and resume tailoring.

Key functions:
- `setupJobEventListeners(app)`: Set up job-related event listeners
- `createDefaultJob()`: Create a new job object with default values
- `saveJob(job)`: Save a job to localStorage
- `loadJobs()`: Load all jobs from localStorage
- `renderJobs(app)`: Render the jobs list in the UI
- `associateResumeWithJob(jobId, resumeId)`: Link a resume to a job

### logs.js

Handles activity logging and history tracking.

Key functions:
- `addLog(type, action, details)`: Add a general log entry
- `logApiCall(provider, action, details)`: Log an API call
- `logJobAction(action, jobId, details)`: Log a job-related action
- `renderLogs(container)`: Render the logs in the UI
- `setupLogFilters(container, form)`: Set up log filtering

## Data Models

### Resume Schema

Based on the JSON Resume standard (jsonresume.org/schema/):

```javascript
{
  "basics": {
    "name": "",
    "label": "",
    "email": "",
    "phone": "",
    "website": "",
    "summary": "",
    "location": {
      "address": "",
      "postalCode": "",
      "city": "",
      "countryCode": "",
      "region": ""
    },
    "profiles": [
      {
        "network": "",
        "username": "",
        "url": ""
      }
    ]
  },
  "work": [
    {
      "name": "",
      "position": "",
      "url": "",
      "startDate": "",
      "endDate": "",
      "summary": "",
      "highlights": []
    }
  ],
  "education": [
    {
      "institution": "",
      "area": "",
      "studyType": "",
      "startDate": "",
      "endDate": "",
      "score": "",
      "courses": []
    }
  ],
  "skills": [
    {
      "name": "",
      "level": "",
      "keywords": []
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "highlights": [],
      "startDate": "",
      "endDate": "",
      "url": ""
    }
  ],
  "meta": {
    "theme": "",
    "language": "",
    "lastModified": ""
  }
}
```

### Job Schema

Custom schema for tracking job applications:

```javascript
{
  "id": "job_timestamp_random",
  "title": "",
  "company": "",
  "location": "",
  "url": "",
  "description": "",
  "contactName": "",
  "contactEmail": "",
  "contactPhone": "",
  "notes": "",
  "status": "saved", // One of: saved, applied, interviewing, offered, accepted, rejected
  "dateCreated": "",
  "dateUpdated": "",
  "dateApplied": "",
  "resumeId": null, // Associated tailored resume ID
  "statusHistory": [
    {
      "from": "saved",
      "to": "applied",
      "date": "",
      "notes": ""
    }
  ]
}
```

### Log Entry Schema

Custom schema for tracking activity history:

```javascript
{
  "id": "log_timestamp_random",
  "type": "api_call|job_action|resume_action|system",
  "action": "action_name",
  "timestamp": "ISO timestamp",
  "details": {
    // Action-specific details
  }
}
```

## Key Features Implemented

1. **Modular JS Architecture**
   - Split code into specialized modules with clear responsibilities
   - Used namespace imports pattern (`import * as moduleName`)
   - Enhanced maintainability and code organization

2. **Complete Resume Editor**
   - Implemented all JSON Resume schema sections (basics, work, education, skills, projects)
   - Support for adding, editing, and deleting entries in each section
   - Form validation and data integrity checks

3. **Multiple Themes**
   - Modern theme: Clean, contemporary styling with card-based layout
   - Classic theme: Traditional resume format with formal styling
   - Minimal theme: Simple, elegant design with minimalist aesthetics

4. **Enhanced Date Formatting**
   - Support for multiple date formats (YYYY-MM-DD, MMM YYYY, YYYY)
   - Consistent date display across different resume sections
   - Smart handling of incomplete or invalid dates

5. **Job Management System**
   - Job tracking with different statuses (saved, applied, interviewing, etc.)
   - History tracking for job status changes
   - Association of tailored resumes with specific job applications

6. **Activity Logging**
   - Comprehensive logging system for important actions
   - Log filtering by type, date, and action
   - Detailed history view for all activities

7. **Resume Import/Export**
   - Import from JSON text, file upload, or URL
   - Export to JSON file or clipboard
   - Validation of imported data against schema

8. **AI Resume Tailoring**
   - Integration with Claude and OpenAI APIs
   - Customization of resumes based on job descriptions
   - Cover letter generation

9. **Local Storage**
   - Save multiple named resumes
   - Automatic saving of current work
   - Resume management with load and delete operations

10. **Responsive UI**
    - Mobile-friendly interface with swipe navigation
    - Adaptive layout for different screen sizes
    - Touch-optimized controls

## Recent Improvements

1. **Fixed Education, Skills, and Projects Sections**
   - Implemented missing modal functionality
   - Fixed event handlers for add/edit/delete operations
   - Corrected modal ID references

2. **Enhanced Theme System**
   - Added complete implementations for Classic and Minimal themes
   - Created separate theme-styles.css for better organization
   - Improved HTML generation for all themes

3. **Refactored Code Structure**
   - Converted to namespace imports for all modules
   - Improved initialization sequence
   - Better error handling throughout the application

4. **Job and History Integration**
   - Connected job management system with logging
   - Enhanced status tracking workflow
   - Improved UI for job management

## Technical Notes

1. **Module Pattern**
   - The application uses ES6 modules with explicit exports
   - Each module has a clear responsibility and API
   - Dependencies are explicitly imported at the top of each file

2. **Event Handling**
   - Uses event delegation for dynamically created elements
   - Centralizes event binding in setup functions
   - Maintains clear separation between event handlers and logic

3. **Form Management**
   - Consistent pattern for form handling across all modals
   - Form field validation before saving data
   - Clear error messages for validation failures

4. **UI State Management**
   - Application state is maintained in the app.state object
   - UI updates are triggered by state changes
   - Clear data flow from model to view

5. **API Integration**
   - Support for both Claude and OpenAI APIs
   - Error handling and response validation
   - Configurable API settings

## Future Enhancements

1. **Sync with Cloud Storage**
   - Add support for Google Drive or Dropbox integration
   - Enable cross-device synchronization

2. **Export to PDF/Word**
   - Enhanced export options for different file formats
   - More customization options for exports

3. **Enhanced Theme Editor**
   - Visual theme customization tools
   - Custom theme creation and saving

4. **Improved AI Features**
   - More targeted resume customization options
   - Resume analysis and improvement suggestions

5. **Offline Support**
   - Implement Service Workers for offline functionality
   - Local caching of application data

## Troubleshooting

Common issues and solutions:

1. **Modal Dialogs Not Opening**
   - Check for correct modal ID references in code
   - Verify the modal HTML exists in the document
   - Check browser console for errors

2. **Local Storage Issues**
   - Clear browser cache and local storage if encountering data corruption
   - Check storage limits in the browser
   - Use storage.clearStorage() to reset the application

3. **API Integration Problems**
   - Verify API keys are correctly entered
   - Check network requests in browser dev tools
   - Review API response handling in the code

4. **UI Rendering Issues**
   - Verify DOM element IDs match those referenced in JavaScript
   - Check for CSS conflicts or overrides
   - Test in different browsers for compatibility issues

## Contributors

This project has been developed and improved with assistance from Claude AI (Anthropic).

## License

This project is intended for educational and personal use.