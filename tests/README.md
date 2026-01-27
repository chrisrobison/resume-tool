# Testing Infrastructure

This directory contains the testing infrastructure for the NextRole application.

## Structure

```
tests/
├── unit/                    # Unit tests for modules and components
│   ├── example.test.js     # Example test demonstrating patterns
│   ├── store.test.js       # Store module tests (Task #8)
│   ├── storage.test.js     # Storage module tests (Task #8)
│   └── component-base.test.js  # ComponentBase tests (Task #8)
├── reports/                # Test reports output
├── setup.js                # Vitest setup and mocks
└── README.md              # This file
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests once
npm run test:unit

# Run tests in watch mode (re-runs on file changes)
npm run test:unit:watch

# Run tests with UI dashboard
npm run test:unit:ui

# Run tests with coverage report
npm run test:unit:coverage
```

### E2E Tests (Cypress)

```bash
# Run Cypress E2E tests headless
npm run test:e2e

# Open Cypress UI
npm run test:e2e:open

# Run E2E tests in specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
```

### All Tests

```bash
# Run both unit and E2E tests
npm test

# Run in CI environment
npm run test:ci
```

## Writing Unit Tests

### Basic Test Structure

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Testing Modules

1. **Import the module** using ES6 imports
2. **Mock dependencies** using `vi.fn()` or `vi.mock()`
3. **Test public APIs** focusing on behavior, not implementation
4. **Use helpers** from `setup.js` for DOM and async operations

### Available Test Helpers

From `tests/setup.js`:

- `createMockElement(tag, attributes)` - Create mock DOM elements
- `simulateEvent(element, eventType, options)` - Trigger events
- `waitFor(callback, timeout)` - Wait for async conditions

### Mocked Globals

The following are automatically mocked in all tests:

- `localStorage` - Full implementation with tracking
- `sessionStorage` - Full implementation with tracking
- `indexedDB` - Basic implementation for testing
- `fetch` - Configurable mock responses
- `console` methods - Tracked with `vi.fn()`

### Example: Testing a Module

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from '../../js/my-module.js';

describe('myModule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store data in localStorage', () => {
    myFunction('key', 'value');

    expect(localStorage.getItem('key')).toBe('value');
  });
});
```

## Coverage Goals

Priority modules should achieve >70% coverage:

- `js/component-base.js`
- `js/store.js`
- `js/storage.js`
- `js/app-manager.js`

View coverage report:

```bash
npm run test:unit:coverage
# Open coverage/index.html in browser
```

## Test Configuration

- **Config**: `vitest.config.js` in project root
- **Setup**: `tests/setup.js` runs before all tests
- **Environment**: JSDOM for browser APIs
- **Reporter**: Verbose, JSON, and HTML reports
- **Timeout**: 10 seconds per test
- **Parallel**: Multi-threaded execution

## Best Practices

1. **One concept per test** - Each test should verify one behavior
2. **Clear test names** - Use "should..." naming convention
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Mock external dependencies** - Isolate units under test
5. **Clean up** - Use `beforeEach` and `afterEach` hooks
6. **Avoid implementation details** - Test behavior, not internals
7. **Use descriptive expects** - Make assertions clear

## Debugging Tests

```bash
# Run single test file
npx vitest run tests/unit/store.test.js

# Run tests matching pattern
npx vitest run -t "store"

# Run in watch mode with UI
npm run test:unit:ui
```

## CI Integration

Tests run automatically in CI via:

```bash
npm run test:ci
```

This runs:
1. Unit tests (Vitest)
2. Starts server in background
3. E2E tests (Cypress)
4. Generates reports

## Next Steps

See Task #8 for writing tests for core modules:
- Store module tests
- Storage module tests
- Component-base tests
- IndexedDB service tests
