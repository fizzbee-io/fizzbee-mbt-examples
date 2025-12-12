# Todo App - TypeScript/Playwright Implementation

This directory contains the TypeScript implementation of the Todo App model-based tests using Playwright for UI automation.

## Prerequisites

1. Node.js (v18 or higher)
2. The todo application running at `http://localhost:9100/`
3. Access to the SQLite database at `/Users/jp/src/todo-golang/test.db`

## Setup

Install dependencies:

```bash
npm install
```

## Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Running Tests

After building, run the tests:

```bash
npm test
```

## Project Structure

```
typescript/
├── fizztests/
│   ├── todo_interfaces.ts    # Generated interfaces (DO NOT EDIT)
│   ├── todo_adapters.ts       # Adapter implementations
│   └── todo_test.ts           # Test runner (DO NOT EDIT)
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Details

### TodoAppRoleAdapter

The `TodoAppRoleAdapter` class implements the `TodoAppRole` interface using Playwright to interact with the web application. It provides methods to:

- **CreateTodo**: Creates a new todo item with a title and description
- **ReadTodo**: Reads a todo item by ID and returns its state
- **UpdateTodo**: Updates a todo item's title and description
- **DeleteTodo**: Deletes a todo item
- **ListTodo**: Returns all todo items
- **PinTodo**: Pins a todo item (only one can be pinned at a time)
- **UnPinTodo**: Unpins a todo item

Key features:
- Automatic login handling on initialization
- DOM update synchronization using `#todoUpdateCounter` element
- Special handling for pin operations to check server response
- Safe error handling to prevent test interruption

### TodoModelAdapter

The `TodoModelAdapter` class manages the test lifecycle:

- **init()**: Cleans the database, creates a new adapter instance, and initializes Playwright
- **cleanup()**: Closes browser pages and cleans the database
- **getRoles()**: Returns the role instances for the test framework

The adapter uses `better-sqlite3` to clean up the todo database between test runs, ensuring a consistent starting state.

## Test Configuration

The test options are configured in `todo_adapters.ts`:

```typescript
{
  'max-seq-runs': 1000,      // Maximum sequential test runs
  'max-parallel-runs': 1000,  // Maximum parallel test runs
  'max-actions': 10           // Maximum actions per test trace
}
```

## Debugging

To enable visual debugging, uncomment these options in `todo_adapters.ts`:

```typescript
// In TodoAppRoleAdapter.init():
this.browser = await chromium.launch({
  headless: false,  // Show browser window
  slowMo: 400       // Slow down operations
});

this.context = await this.browser.newContext({
  recordVideo: {    // Record videos
    dir: '/tmp/playwright-videos/',
    size: { width: 1280, height: 720 }
  }
});
```

## FizzBee Specification

The model is based on the FizzBee specification in `../spec/todo.fizz`, which defines:

- Todo item structure (id, title, pinned status)
- Maximum of 4 todo items
- Sequential ID assignment
- Pin/unpin constraints (only one item can be pinned at a time)

## Differences from Java Implementation

While functionally equivalent, this TypeScript implementation has some language-specific differences:

- Uses async/await throughout instead of blocking calls
- Uses `better-sqlite3` instead of JDBC for database access
- Uses Playwright's JavaScript API instead of Java API
- Error handling uses try/catch with async functions
- Type annotations using TypeScript's type system
