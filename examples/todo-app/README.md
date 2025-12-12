This example tests a simple todo application, demonstrating
multiple types of tests in different languages:
- UI tests using Playwright written in Java (see [java/](./java/) directory)
- UI tests using Playwright written in TypeScript (see [typescript/](./typescript/) directory)
- API tests using HTTP requests written in Go (see [go/](./go/) directory)

The system under test (SUT) is a todo application, that is available at
[https://github.com/Horlerdipo/todo-golang](https://github.com/Horlerdipo/todo-golang)
and can be run locally by following the instructions in the repository.

## Playwright UI Tests

### Java Implementation
The Playwright UI tests are located in the [java/app](./java/app/) directory.
The entry point is [TodoTest.java](./java/app/src/fizztest/java/org/example/todo/TodoTest.java).
The `newModel` method creates a FizzBee model adapter defined in [TodoModelAdapter.java](./java/app/src/fizztest/java/org/example/todo/TodoModelAdapter.java).

Major aspect of the adapter is defined in [TodoAppRoleAdapter.java](./java/app/src/fizztest/java/org/example/todo/TodoAppRoleAdapter.java) which maps the FizzBee operations to Playwright actions on the UI.

### TypeScript Implementation
The Playwright UI tests are also available in TypeScript at [typescript/fizztests](./typescript/fizztests/) directory.
The entry point is [todo_test.ts](./typescript/fizztests/todo_test.ts).
The model adapter is defined in [todo_adapters.ts](./typescript/fizztests/todo_adapters.ts).

The `TodoAppRoleAdapter` class maps FizzBee operations to Playwright actions on the UI, similar to the Java implementation.

See [typescript/README.md](./typescript/README.md) for setup and usage instructions.

### FizzBee Specification:

The fizzbee spec for the model is defined in [spec/todo.fizz](./spec/todo.fizz).

### Explanation of the Model:

1. **Model Definition**:
   - The `Todo` model defines the structure of a todo item with an `id`, `title`, and `pinned` status.

2. **State Definition**:
   - The `Todos` state holds a list of `Todo` items.

3. **Operations**:
   - **CreateTodo**: Adds a new todo item with a sequential ID, ensuring the maximum limit of 4 todos is not exceeded.
   - **UpdateTodo**: Updates the title and completed status of an existing todo item identified by its ID.
   - **DeleteTodo**: Removes a todo item from the list based on its ID.
   - **ReadTodo**: Retrieves a todo item by its ID.
   - **ListTodo**: Returns the list of todos, ensuring it returns all current todos in a single page.
   - **PinTodo**: Marks a todo item as pinned, and at most one todo can be pinned.
   - **UnpinTodo**: Removes the pinned status from a todo item.

### Constraints:
- The maximum number of todos is limited to 4.
- Each todo has a unique ID starting from 1 and increments sequentially.

This model provides a clear structure for the todo application and adheres to the specified requirements.