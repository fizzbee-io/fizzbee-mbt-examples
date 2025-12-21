# TodoMVC Playwright Model-Based Testing

This project demonstrates model-based testing (MBT) of the TodoMVC React application using FizzBee and Playwright.

## Overview

The implementation tests the TodoMVC application at https://demo.playwright.dev/todomvc/#/ by executing test scenarios generated from the FizzBee specification.

## Architecture

- **spec/todomvc.fizz**: FizzBee specification defining the TodoMVC model and user actions
- **fizztests/todomvc_interfaces.ts**: Generated TypeScript interfaces
- **fizztests/todomvc_adapters.ts**: Playwright adapter implementation
- **fizztests/todomvc_test.ts**: Generated test runner

## Implemented Actions

The adapter implements all user actions from the FizzBee spec:

1. **UserAddsItem**: Adds a new todo item
2. **UserTogglesItem**: Toggles the completion state of a specific todo
3. **UserTogglesAll**: Toggles all todos between complete/incomplete
4. **UserDeletesItem**: Deletes a specific todo item
5. **UserEditsItem**: Edits the text of a todo item
6. **UserClearsCompleted**: Clears all completed todos
7. **UserSwitchesFilter**: Switches between All/Active/Completed filters

## Setup

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

## Running Tests

Execute the model-based tests:

```bash
npm test
```

## Debugging

To enable visual debugging, uncomment the following lines in `fizztests/todomvc_adapters.ts`:

```typescript
this.browser = await chromium.launch({
  headless: false,  // Uncomment to see the browser
  slowMo: 100       // Uncomment to slow down actions
});
```

To enable video recording:

```typescript
this.context = await this.browser.newContext({
  recordVideo: {
    dir: '/tmp/playwright-videos/',
    size: { width: 1280, height: 720 }
  }
});
```

## Test Configuration

Test parameters can be adjusted in the `getTestOptions()` function in `todomvc_adapters.ts`:

- `max-seq-runs`: Maximum number of sequential test runs
- `max-parallel-runs`: Maximum number of parallel test runs
- `max-actions`: Maximum number of actions per test sequence

## Key Implementation Details

- **Browser-only**: Unlike the [todo-app](../todo-app/) example, this implementation requires no server-side storage or authentication
- **State assertion**: Here the assertions are validated by implementing the getState function of StateGetter interface.
- **Locator Strategies**: Uses Playwright's role-based and test-id selectors for robust element identification
- **Error Handling**: Implements safe execution with error catching to handle edge cases gracefully
- **Wait Strategies**: Uses minimal timeouts for UI updates while maintaining test reliability
