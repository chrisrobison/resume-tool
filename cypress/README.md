# Cypress Testing Framework

This directory contains comprehensive end-to-end tests for the Job Hunt Manager application using Cypress.

## Test Structure

### Test Files
- **`basic-ui.cy.js`** - Core UI functionality and navigation tests
- **`import-job-button.cy.js`** - Specific tests for the Import Job button functionality 
- **`component-functionality.cy.js`** - Web component interaction and functionality tests
- **`visual-regression.cy.js`** - Visual regression testing with screenshot comparison

### Support Files
- **`support/commands.js`** - Custom Cypress commands specific to Job Hunt Manager
- **`support/e2e.js`** - Global test configuration and setup
- **`fixtures/test-data.json`** - Test data for consistent testing

## Custom Commands

### Navigation
- `cy.visitJobsApp(version)` - Visit application (version: 'new' or 'legacy')
- `cy.navigateToSection(section)` - Navigate to specific section
- `cy.waitForStore()` - Wait for global store to initialize
- `cy.waitForComponent(selector)` - Wait for component to be ready

### Modal Management
- `cy.openModal(modalId)` - Open and verify modal
- `cy.closeModal(modalId)` - Close and verify modal

### Form Interaction
- `cy.fillJobForm(jobData)` - Fill job form with test data
- `cy.setAPIKey(provider, key)` - Set API keys for testing
- `cy.clearAPIKeys()` - Clear all API keys

### Data Management
- `cy.seedJobData(jobs)` - Seed test job data
- `cy.seedResumeData(resumes)` - Seed test resume data

### Visual Testing
- `cy.takeNamedScreenshot(name)` - Take named screenshot with timestamp
- `cy.compareSnapshot(name)` - Compare visual regression snapshot
- `cy.matchImageSnapshot(name)` - Image snapshot comparison

### Utility Commands
- `cy.checkConsoleErrors()` - Monitor for JavaScript errors
- `cy.measurePageLoad(pageName)` - Performance testing
- `cy.checkA11y()` - Basic accessibility checks

## Running Tests

### Interactive Mode
```bash
npm run test:open
```

### Headless Mode
```bash
npm run test
npm run test:headless
```

### Specific Browsers
```bash
npm run test:chrome
npm run test:firefox
```

### Visual Regression Tests
```bash
npm run test:visual
```

### CI Mode
```bash
npm run test:ci
```

### With Reports
```bash
npm run test:report
```

## Test Data

The `fixtures/test-data.json` file contains:
- **testJobs** - Sample jobs with different statuses
- **testResumes** - Sample resume data following JSON Resume schema
- **testAPIKeys** - Mock API keys for testing
- **importJobTestData** - Data for import functionality testing
- **formTestData** - Valid and invalid form data

## Visual Regression Testing

Visual regression tests capture screenshots and compare them against baseline images to detect unintended UI changes.

### Baseline Creation
On first run, visual regression tests create baseline images. Subsequent runs compare against these baselines.

### Updating Baselines
To update baselines after intentional UI changes:
```bash
npm run clean:reports
npm run test:visual
```

## Screenshot Organization

Screenshots are organized by:
- Test name
- Timestamp
- Viewport size
- Component/section being tested

## Configuration

### Cypress Configuration
- **cypress.config.js** - Main Cypress configuration
- **reporter-config.json** - Test reporting configuration

### Key Settings
- **baseUrl**: `http://localhost:8080`
- **viewportWidth**: 1280
- **viewportHeight**: 720
- **defaultCommandTimeout**: 10000ms
- **screenshotOnRunFailure**: true
- **video**: true for debugging

## CI/CD Integration

The `.github/workflows/cypress.yml` workflow runs tests on:
- Push to main/develop branches
- Pull requests to main branch

### Artifacts
- Screenshots (on test failure)
- Videos (on test failure)  
- Test reports (always)

## Best Practices

### Writing Tests
1. Use data attributes for reliable selectors
2. Seed consistent test data for reliability
3. Wait for components to be fully loaded
4. Take screenshots at key interaction points
5. Clean up state between tests

### Visual Testing
1. Use consistent test data for visual stability
2. Hide dynamic content (timestamps, etc.)
3. Set appropriate error thresholds
4. Test across multiple viewports

### Performance
1. Run tests in parallel when possible
2. Use efficient selectors
3. Minimize wait times where possible
4. Clean up resources after tests

## Troubleshooting

### Common Issues
- **Server not starting**: Ensure port 8080 is available
- **Component not found**: Check component migration status
- **Visual differences**: Review screenshot comparisons in artifacts
- **API tests failing**: Verify test API keys are configured

### Debug Mode
Run with headed browser for debugging:
```bash
npx cypress open
```

### Verbose Logging
Enable detailed logging in cypress.config.js:
```javascript
env: {
  CYPRESS_LOG_LEVEL: 'debug'
}
```

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Use appropriate custom commands
3. Add test data to fixtures if needed
4. Include visual regression tests for UI changes
5. Update this README if adding new patterns