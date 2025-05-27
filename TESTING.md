# Testing Strategy for Resume Tool

This document outlines how to test the resume tool functionality to prevent issues like missing event handlers or broken functionality.

## Quick Manual Testing

### 1. Browser Console Testing
1. Open `demo.html` in a browser
2. Open Developer Tools (F12) and go to Console tab
3. Load the test script:
   ```javascript
   // Copy and paste the contents of test-in-browser.js
   // Or if you can load scripts:
   fetch('test-in-browser.js').then(r => r.text()).then(eval);
   ```
4. Run tests:
   ```javascript
   testDemo.runQuickTests();
   testDemo.testEditButtonFunctionality();
   ```

### 2. Manual UI Testing Checklist

#### Navigation Testing
- [ ] Click "Resumes" tab - should show resumes list
- [ ] Click "Jobs" tab - should show jobs list  
- [ ] Click "Settings" tab - should show settings
- [ ] Click "Logs" tab - should show logs

#### Resume Creation Testing
- [ ] Click "New Resume" button - should open resume editor
- [ ] Switch between tabs (Basics, Work, Education, Skills, Projects, Preview)
- [ ] All tabs should be clickable and show correct panels
- [ ] Form fields in Basics tab should be functional

#### Edit/Delete Button Testing
- [ ] Go to Work tab, add some test data manually to app.currentResumeData
- [ ] Check if edit/delete buttons appear
- [ ] Click edit button - should show alert with index
- [ ] Click delete button - should show confirmation and remove item

#### Data Persistence Testing
- [ ] Enter data in forms
- [ ] Save resume with a name
- [ ] Load the saved resume
- [ ] Verify data is preserved

## Automated Testing Options

### Option 1: Headless Browser Testing (Puppeteer)
```bash
# Install dependencies
npm install puppeteer

# Run tests
node test-demo.js
```

### Option 2: Browser-based Testing
Open `verify-demo.html` in a browser to run automated tests in an iframe.

### Option 3: Command Line with Your Headless Chromium
```bash
# Example command structure
chromium --headless --run-all-tests --dump-dom demo.html
```

## Key Areas to Test

### 1. Event Delegation
**Problem:** Edit buttons calling undefined functions
**Test:** Verify containers exist and event listeners are attached
```javascript
// Check containers exist
['#work-list', '#education-list', '#skills-list', '#projects-list'].forEach(id => {
    console.assert(document.querySelector(id), `Container ${id} missing`);
});

// Check event delegation setup
console.assert(typeof app.setupSectionEventDelegation === 'function', 'Event delegation method missing');
```

### 2. Function Availability
**Problem:** Methods called from HTML that don't exist
**Test:** Verify all referenced functions exist
```javascript
// Check required methods exist
['updateWorkSection', 'updateEducationSection', 'updateSkillsSection', 'updateProjectsSection'].forEach(method => {
    console.assert(typeof app[method] === 'function', `Method ${method} missing`);
});
```

### 3. Data Flow
**Problem:** Data updates not reflected in UI
**Test:** Modify data and verify UI updates
```javascript
// Add test data and verify it renders
app.currentResumeData = { work: [{ name: 'Test', position: 'Test' }] };
app.updateWorkSection();
console.assert(document.querySelector('#work-list .section-item'), 'Work item not rendered');
```

### 4. No JavaScript Errors
**Test:** Monitor console for errors during operations
```javascript
let errorCount = 0;
const originalError = console.error;
console.error = (...args) => { errorCount++; originalError(...args); };

// Perform operations...
// Check errorCount === 0
```

## Testing Workflow

### Before Making Changes
1. Run `testDemo.runQuickTests()` to establish baseline
2. Document which functionality currently works
3. Save test results for comparison

### After Making Changes
1. Run the same tests again
2. Compare results - ensure no regressions
3. Test new functionality specifically
4. Check browser console for errors

### Before Committing
1. Run full test suite
2. Test on multiple browsers if possible
3. Verify in both dev and production environments

## Common Issues to Watch For

1. **Container ID Mismatches**: Event delegation targeting wrong IDs
2. **Method Name Typos**: Functions called from HTML that don't exist
3. **Timing Issues**: Events attached before DOM elements exist
4. **Data Structure Mismatches**: Code expecting different data formats
5. **CSS Selector Errors**: Event delegation using wrong selectors

## Emergency Testing Script

If you need to quickly verify functionality works:

```javascript
// Emergency test - paste in console
function quickCheck() {
    const tests = [
        () => !!window.app,
        () => !!document.querySelector('#work-list'),
        () => typeof app.setupSectionEventDelegation === 'function',
        () => typeof app.updateWorkSection === 'function'
    ];
    
    const results = tests.map((test, i) => {
        try { return test(); } catch { return false; }
    });
    
    console.log('Quick Test Results:', results);
    return results.every(r => r);
}
quickCheck();
```

## Integration with Your Headless Chromium

You can integrate these tests with your headless setup by:

1. Loading `demo.html` 
2. Injecting `test-in-browser.js`
3. Running `testDemo.runQuickTests()`
4. Capturing console output to verify results
5. Failing the build if tests don't pass

This will catch issues like the edit button problem before they reach you!