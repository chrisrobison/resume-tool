# Testing Guide

This document provides comprehensive information about the testing infrastructure for the Job-Centric Career Management Tool.

## Testing Stack

### Unit Testing - Vitest
- **Framework**: Vitest (fast, Vite-based, Jest-compatible)
- **Environment**: jsdom (browser-like environment)
- **Coverage**: v8 provider with 70% targets
- **Mocks**: IndexedDB, localStorage, fetch, Web Components

### E2E Testing - Cypress
- **Framework**: Cypress
- **Tests**: Component functionality, user workflows, IndexedDB migration
- **Interactive**: Visual test runner with time travel debugging

### Legacy Testing
- **Puppeteer**: Automated browser tests (`test-demo.js`)
- **Manual**: Browser-based verification (`verify-demo.html`, `test-indexeddb.html`)
- **Console**: In-browser testing utilities (`test-in-browser.js`)

---

## Quick Start

### Install Dependencies
```bash
npm install --save-dev vitest @vitest/ui jsdom fake-indexeddb sinon cypress
```

### Run Tests
```bash
# Unit tests
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage report
npm run test:unit:ui           # Interactive UI

# E2E tests
npm run test:e2e               # Headless
npm run test:e2e:open          # Interactive mode

# All tests
npm test                       # Run both unit and E2E
```

---

## Unit Testing (Vitest)

### Configuration

**Location**: `vitest.config.js`

Key settings:
- Environment: jsdom (browser simulation)
- Global test functions (describe, it, expect)
- Setup file: `tests/setup.js`
- Coverage thresholds: 70% lines/functions, 60% branches

### Setup File

**Location**: `tests/setup.js`

Provides mocks for:
- IndexedDB (using `fake-indexeddb`)
- localStorage and sessionStorage
- Web Components (custom HTMLElement)
- window.app and window.globalStore
- Console methods (reduce noise)

### Writing Unit Tests

**Directory**: `tests/unit/`

**Example**: Testing a service module
```javascript
// tests/unit/my-service.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from '../../js/services/my-service.js';

describe('MyService', () => {
  let service;

  beforeEach(() => {
    service = new MyService();
  });

  it('should initialize with defaults', () => {
    expect(service.someProperty).toBe('default');
  });

  it('should handle async operations', async () => {
    const result = await service.doSomething();
    expect(result).toBeDefined();
  });

  it('should emit events', () => {
    const spy = vi.fn();
    service.addEventListener('custom-event', spy);
    service.triggerEvent();
    expect(spy).toHaveBeenCalled();
  });
});
```

### Example Tests

The repository includes 11 example tests demonstrating patterns:
- `tests/unit/component-base.test.js` - Component lifecycle testing
- `tests/unit/indexeddb-service.test.js` - Database operations
- `tests/unit/storage-migration.test.js` - Migration logic
- `tests/integration/job-workflow.test.js` - Full workflow testing

---

## E2E Testing (Cypress)

### Configuration

**Location**: `cypress.config.js` (create if needed)

```javascript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js'
  }
});
```

### Writing E2E Tests

**Directory**: `cypress/e2e/`

**Example**: IndexedDB Migration Test
```javascript
// cypress/e2e/indexeddb-migration.cy.js
describe('IndexedDB Migration', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should initialize IndexedDB on app load', () => {
    cy.visit('/app.html');
    cy.window().then((win) => {
      expect(win.indexedDBService).to.exist;
      expect(win.indexedDBService.isInitialized).to.be.true;
    });
  });

  it('should migrate localStorage to IndexedDB', () => {
    // Seed localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('jobs', JSON.stringify([
        { id: 'test-1', company: 'Test Corp' }
      ]));
    });

    cy.reload();
    cy.wait(2000); // Allow migration to complete

    // Verify migration
    cy.window().then(async (win) => {
      const jobs = await win.indexedDBService.getJobs();
      expect(jobs.length).to.be.greaterThan(0);
    });
  });
});
```

### Current Cypress Tests

**Completed**:
- ✅ `indexeddb-migration.cy.js` - 394 lines, 25+ test cases
  - Initialization tests
  - Migration tests
  - CRUD operations (jobs, resumes, letters)
  - Persistence tests
  - Error handling
  - Integration tests

**Needs Update** (disabled with `.skip` extension):
- `component-functionality.cy.js.skip` - Needs Web Component selectors
- Other legacy tests - Need modernization

---

## Manual Testing

### Interactive Test Interface

**File**: `test-indexeddb.html`

Features:
- One-click test execution
- Visual test results
- Database inspection
- Console logging
- Migration simulation

**Usage**:
1. Open `test-indexeddb.html` in browser
2. Click "Run All Tests" button
3. Check results panel
4. Open DevTools → Application → IndexedDB to inspect data

### Manual Testing Guide

**File**: `INDEXEDDB-TESTING-GUIDE.md`

Comprehensive 10-scenario testing guide covering:
- Basic initialization
- Data persistence
- Migration from localStorage
- Error handling
- Fallback mechanisms
- CRUD operations
- Real-world workflows

---

## Testing Best Practices

### Unit Test Guidelines

1. **Test behavior, not implementation**
   - Focus on public API, not internal details
   - Test what the code does, not how it does it

2. **Use descriptive test names**
   ```javascript
   // Good
   it('should return null when job ID does not exist', () => {})

   // Bad
   it('test getJob', () => {})
   ```

3. **Follow AAA pattern**
   - Arrange: Set up test data
   - Act: Execute the code under test
   - Assert: Verify the results

4. **Mock external dependencies**
   ```javascript
   const mockStorage = {
     getJobs: vi.fn().mockResolvedValue([])
   };
   const service = new JobService(mockStorage);
   ```

5. **Keep tests independent**
   - Each test should run in isolation
   - Use `beforeEach` for setup, `afterEach` for cleanup

### E2E Test Guidelines

1. **Test user workflows, not implementation**
   - Simulate real user behavior
   - Test complete scenarios end-to-end

2. **Use data-testid attributes**
   ```html
   <button data-testid="add-job-btn">Add Job</button>
   ```
   ```javascript
   cy.get('[data-testid="add-job-btn"]').click();
   ```

3. **Wait for async operations**
   ```javascript
   cy.window().then(async (win) => {
     // Use async/await for promises
   });
   ```

4. **Clean up between tests**
   ```javascript
   beforeEach(() => {
     cy.clearLocalStorage();
     cy.clearIndexedDB();
   });
   ```

5. **Use custom commands for common operations**
   ```javascript
   // cypress/support/commands.js
   Cypress.Commands.add('clearIndexedDB', () => {
     cy.window().then((win) => {
       return win.indexedDB.deleteDatabase('JobHuntManagerDB');
     });
   });
   ```

---

## Coverage Targets

### Current Targets (70% baseline)
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

### Priority Modules (Target >80%)
1. `component-base.js` - Base class for all components
2. `store.js` - Global state management
3. `storage.js` - Storage abstraction layer
4. `indexeddb-service.js` - Database operations
5. `storage-migration.js` - Migration logic

### Lower Priority (Target >60%)
- UI components (covered by E2E tests)
- Rendering logic (visual testing)
- Theme switching (manual testing)

---

## Continuous Integration

### Recommended CI Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:unit:coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Troubleshooting

### Vitest Issues

**Problem**: Tests fail with "indexedDB is not defined"
**Solution**: Ensure `fake-indexeddb/auto` is imported in `tests/setup.js`

**Problem**: Can't mock ES6 modules
**Solution**: Use `vi.mock()` before importing the module
```javascript
vi.mock('../../js/my-module.js', () => ({
  myFunction: vi.fn()
}));
```

**Problem**: Tests hang or timeout
**Solution**: Check for unresolved promises or missing async/await

### Cypress Issues

**Problem**: "cy.window() returns undefined properties"
**Solution**: Add wait for app initialization
```javascript
cy.window().then((win) => {
  return new Cypress.Promise((resolve) => {
    const checkReady = () => {
      if (win.globalStore && win.globalStore.state) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
});
```

**Problem**: Web Component selectors don't work
**Solution**: Use `.shadow()` to access shadow DOM
```javascript
cy.get('job-manager').shadow().find('.job-list');
```

**Problem**: IndexedDB operations fail in tests
**Solution**: Clear database before each test
```javascript
beforeEach(() => {
  cy.window().then((win) => {
    return win.indexedDB.deleteDatabase('JobHuntManagerDB');
  });
});
```

---

## Test Organization

```
job-tool/
├── tests/
│   ├── setup.js                    # Vitest setup and mocks
│   ├── unit/                       # Unit tests
│   │   ├── component-base.test.js
│   │   ├── indexeddb-service.test.js
│   │   └── storage-migration.test.js
│   └── integration/                # Integration tests
│       └── job-workflow.test.js
├── cypress/
│   ├── e2e/                        # E2E test specs
│   │   ├── indexeddb-migration.cy.js
│   │   └── component-functionality.cy.js.skip
│   └── support/                    # Cypress support files
│       ├── commands.js
│       └── e2e.js
├── vitest.config.js                # Vitest configuration
├── cypress.config.js               # Cypress configuration
├── test-indexeddb.html             # Interactive test UI
├── INDEXEDDB-TESTING-GUIDE.md      # Manual testing guide
└── TESTING.md                      # This file
```

---

## Next Steps

### Immediate Priorities
1. ✅ Vitest infrastructure set up
2. ✅ Example tests created
3. ⏳ Write unit tests for core modules (component-base, store, storage)
4. ⏳ Fix disabled Cypress tests (update selectors)
5. ⏳ Expand coverage to 70%+ on priority modules

### Future Enhancements
- Add visual regression testing (Percy, Chromatic)
- Add performance testing (Lighthouse CI)
- Add accessibility testing (axe-core)
- Add mutation testing (Stryker)
- Set up CI/CD pipeline

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)
- [Testing Best Practices](https://testingjavascript.com/)
- [Component Testing Guide](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: January 2025
**Status**: Testing infrastructure complete, test expansion in progress
