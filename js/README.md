# Resume.json Editor - Modular Structure

This directory contains the modularized JavaScript code for the Resume.json Editor application.

## Module Structure

The application has been broken down into the following modules:

### Core Modules

- **main.js** - Entry point for the application
- **core.js** - Core application functionality and state management
- **config.js** - Configuration and default resume schema

### Utility Modules

- **utils.js** - General utility functions
- **storage.js** - Local storage operations

### UI Modules

- **ui.js** - UI-related utilities and event listeners
- **modals.js** - Modal dialog functionality
- **preview.js** - Resume preview rendering
- **import-export.js** - Import and export functionality

## Module Dependencies

```
main.js
  └── core.js
      ├── config.js
      ├── utils.js
      ├── storage.js
      ├── ui.js
      │   └── utils.js
      ├── modals.js
      │   ├── utils.js
      │   └── ui.js
      ├── preview.js
      │   └── utils.js
      └── import-export.js
          ├── utils.js
          └── modals.js
```

## How It Works

1. The application starts by loading `main.js` as a module
2. `main.js` imports the `app` object from `core.js`
3. `core.js` initializes the application when the DOM is loaded
4. Each module handles a specific part of the application functionality
5. Modules communicate through imports and the shared `app` object

## Adding New Features

To add new features to the application:

1. Determine which module the feature belongs in
2. Add the necessary code to the appropriate module
3. Export any new functions that need to be used by other modules
4. Import the functions in the modules that need to use them

## Best Practices

- Keep modules focused on specific functionality
- Minimize dependencies between modules
- Use the `app` object for shared state
- Export only what's necessary
- Use named exports for clarity