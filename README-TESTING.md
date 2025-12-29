# Testing Guide

## Quick Start

Install dependencies:
```bash
npm install
```

Run tests:
```bash
npm test
```

Watch mode (recommended for development):
```bash
npm run test:watch
```

Coverage report:
```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── setup/              # Test configuration and mocks
│   ├── globalSetup.js  # Environment setup, module reset
│   └── browserMocks.js # localStorage, FileReader, Blob mocks
├── unit/               # Unit tests for individual modules
│   ├── config/         # Configuration tests
│   ├── models/         # Event, Constraint model tests
│   ├── services/       # DateService, ScoringEngine, StateManager tests
│   └── utils/          # EventBus tests
├── integration/        # Integration tests for module interactions
│   └── full-workflow.test.js
└── fixtures/           # Shared test data (optional)
```

## Writing Tests

### Example: Testing a Pure Function

```javascript
import { describe, it, expect } from 'vitest';
import { getMonday } from '../js/services/DateService.js';

describe('getMonday', () => {
  it('should return Monday for any day of week', () => {
    const wednesday = new Date(2025, 0, 8);
    const monday = getMonday(wednesday);
    expect(monday.getDay()).toBe(1);
  });
});
```

### Example: Testing StateManager (Singleton)

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('StateManager', () => {
  let StateManager;

  beforeEach(async () => {
    vi.resetModules(); // Reset singleton
    global.localStorage.clear();
    const module = await import('../js/services/StateManager.js');
    StateManager = module.default;
  });

  it('should add event', () => {
    StateManager.addEvent({
      title: 'Test',
      type: 'division',
      location: 'London',
      startDate: '2025-05-12',
      isFixed: false
    });

    expect(StateManager.getEvents()).toHaveLength(1);
  });
});
```

### Example: Testing with EventBus

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventBus Integration', () => {
  let StateManager, EventBus;

  beforeEach(async () => {
    vi.resetModules();
    global.localStorage.clear();

    const smModule = await import('../js/services/StateManager.js');
    const ebModule = await import('../js/utils/EventBus.js');

    StateManager = smModule.default;
    EventBus = ebModule.default;
  });

  it('should emit event when state changes', () => {
    const callback = vi.fn();
    EventBus.on('state:changed', callback);

    StateManager.addEvent({
      title: 'Test',
      type: 'division',
      location: 'Paris',
      startDate: '2025-06-02',
      isFixed: false
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

## Test Coverage

### Coverage Goals

- **Critical modules:** 90%+ (DateService, ScoringEngine, Models, StateManager, EventBus)
- **High priority:** 75%+ (DataService, calendarConfig)
- **Overall target:** 80%+

### Viewing Coverage

After running `npm run test:coverage`, open `coverage/index.html` in your browser to view the interactive coverage report.

### Coverage Thresholds

The following thresholds are enforced in `vitest.config.js`:
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## Debugging Tests

### Run Single Test File

```bash
npx vitest run tests/unit/services/DateService.test.js
```

### Run Tests Matching Pattern

```bash
npx vitest run -t "getMonday"
```

### Debug with VSCode

1. Open "JavaScript Debug Terminal" in VSCode
2. Set breakpoints in your test file
3. Run `npm test` in the debug terminal
4. Debugger will pause at breakpoints

### Using Vitest UI

```bash
npm run test:ui
```

Opens an interactive browser-based UI for exploring test results.

## Common Testing Patterns

### Testing Singleton Pattern

Always reset modules between tests:

```javascript
beforeEach(async () => {
  vi.resetModules();
  const module = await import('../js/services/StateManager.js');
  StateManager = module.default;
});
```

### Mocking localStorage

LocalStorage is automatically mocked in `tests/setup/globalSetup.js`:

```javascript
// No need to mock manually - global.localStorage works in tests
StateManager.addEvent({...});

// Verify persistence
const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
expect(stored.events).toHaveLength(1);
```

### Testing Async Code

```javascript
it('should load from localStorage', async () => {
  global.localStorage.setItem('travelPlannerState', JSON.stringify({...}));

  vi.resetModules();
  const module = await import('../js/services/StateManager.js');
  const SM = module.default;

  const state = SM.getState();
  expect(state.events).toHaveLength(1);
});
```

## Test Organization

### File Naming

- Unit tests: `<ModuleName>.test.js`
- Integration tests: `<feature>-<feature>.test.js` or `full-workflow.test.js`

### Directory Mirroring

Tests mirror the source structure:
- Source: `js/services/DateService.js`
- Test: `tests/unit/services/DateService.test.js`

## Continuous Integration

Tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install

- name: Run tests with coverage
  run: npm run test:coverage

- name: Check coverage thresholds
  run: |
    npm run test:coverage -- --reporter=json --outputFile=coverage.json
```

## Troubleshooting

### Tests Failing Due to Module Cache

**Problem:** Singleton instances not resetting between tests

**Solution:** Always use `vi.resetModules()` in `beforeEach`:

```javascript
beforeEach(async () => {
  vi.resetModules();
  // Re-import modules
});
```

### localStorage Not Clearing

**Problem:** Test state bleeding between tests

**Solution:** Clear localStorage in `beforeEach`:

```javascript
beforeEach(() => {
  global.localStorage.clear();
});
```

This is automatically handled in `tests/setup/globalSetup.js`.

### Import Errors

**Problem:** Cannot find module '../../../js/...'

**Solution:** Check relative path from test file to source file. Use `.js` extension explicitly.

## Best Practices

1. **Test One Thing:** Each test should verify one specific behavior
2. **Clear Names:** Use descriptive test names that explain what's being tested
3. **Arrange-Act-Assert:** Structure tests clearly:
   ```javascript
   it('should add event', () => {
     // Arrange: Set up test data
     const eventData = {...};

     // Act: Execute the action
     StateManager.addEvent(eventData);

     // Assert: Verify the result
     expect(StateManager.getEvents()).toHaveLength(1);
   });
   ```
4. **Independent Tests:** Each test should run independently
5. **Mock Sparingly:** Only mock external dependencies, not the code under test
6. **Test Edge Cases:** Include tests for boundary conditions and error cases

## Test Scripts Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode (auto-rerun on file changes) |
| `npm run test:ui` | Open interactive browser UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run only integration tests |

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)
