// Generated scaffold by fizzbee-mbt generator
// Source: ../../spec/todo.fizz
// Update the methods with your implementation.

import { Arg, NotImplementedError } from '@fizzbee/mbt';
import { TodoAppRole, TodoModel } from './todo_interfaces.js';
import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import Database from 'better-sqlite3';

interface TodoRecord {
  id: number;
  value: string;
  deleted: boolean;
  pinned: boolean;
}

// Role adaptors

export class TodoAppRoleAdapter implements TodoAppRole {
  private static readonly TITLE_PREFIX = 'Sample Title ';
  private static readonly DESCRIPTION_PREFIX = 'Some Description ';

  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor() {
    // Browser initialization will happen in init method if needed
  }

  async init(): Promise<void> {
    // Initialize Playwright and login
    this.browser = await chromium.launch({
      // // For debugging, you can enable these options:
      // headless: false,
      // slowMo: 400
    });

    this.context = await this.browser.newContext({
      // For debugging, you can enable video recording:
      // recordVideo: {
      //   dir: '/tmp/playwright-videos/',
      //   size: { width: 1280, height: 720 }
      // }
    });

    this.page = await this.context.newPage();
    await this.page.goto('http://localhost:9100/');

    // Login as fizzbee@example.org / FizzBeeRocks
    await this.page.getByRole('textbox', { name: 'Email' }).click();
    await this.page.getByRole('textbox', { name: 'Email' }).fill('fizzbee@example.org');
    await this.page.getByRole('textbox', { name: 'Password' }).fill('FizzBeeRocks');
    await this.page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for landing UI; wait for the "Take a note..." textbox to appear
    await this.page.getByRole('textbox', { name: 'Take a note...' }).waitFor();
  }

  async close(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
  }
  async closeAll(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }

    if (this.context) {
      await this.context.close();
    }

    if (this.browser) {
      await this.browser.close();
    }
  }

  async open(): Promise<void> {
    if (this.context) {
      this.page = await this.context.newPage();
      await this.page.goto('http://localhost:9100/');
    }
  }

  async actionCreateTodo(args: Arg[]): Promise<any> {
    const val = args[0].toString();
    const title = TodoAppRoleAdapter.TITLE_PREFIX + val;
    const content = TodoAppRoleAdapter.DESCRIPTION_PREFIX + val;

    await this.page!.getByRole('textbox', { name: 'Take a note...' }).fill(title);
    await this.page!.getByRole('textbox', { name: 'Content...' }).fill(content);

    const addButton = this.page!.getByRole('button', { name: 'Add' });

    // Wait for the UI to reflect the new changes
    await this.clickAndWaitForListDomUpdate(addButton);
  }

  async actionReadTodo(args: Arg[]): Promise<any> {
    const id = this.getTodoId(args[0]);

    // Open the modal for this todo
    const card = this.page!.getByTestId(`todo-card-${id}`);
    const count = await card.count();
    if (count === 0 || !(await card.isVisible())) {
      // Todo not found; return null
      return;
    }
    await card.click();

    // Wait for modal and read its contents
    const modal = this.page!.locator('#todoModalContent');
    await modal.waitFor();

    const title = await modal.getByTestId('todo-title').textContent();

    // Extract the "value" back from the title (if it follows "Sample Title X")
    const value = this.getValueFromTitle(title || '');

    const pinIcon = modal.locator('i.bi-pin, i.bi-pin-fill');
    const pinCount = await pinIcon.count();
    const pinClass = pinCount > 0 ? await pinIcon.first().getAttribute('class') : '';
    const pinned = pinClass?.includes('bi-pin-fill') || false;

    // Build result
    const result: TodoRecord = {
      id,
      value,
      deleted: false,
      pinned
    };

    // Close modal
    await this.page!.getByRole('button', { name: '' }).click();
    return this.toFizzBeeFormat(result);
  }

  async actionUpdateTodo(args: Arg[]): Promise<any> {
    await this.safeRun('updateTodo', async () => {
      const todoId = this.getTodoId(args[0]);
      const card = await this.hoverOnCard(todoId);
      if (!card) return;

      // Open the edit UI
      await this.page!.getByTestId(`edit-todo-${todoId}`).click();

      // Prepare new values
      const val = args[1].toString();
      const updateBtn = this.page!.getByRole('button', { name: 'Update' });
      await updateBtn.waitFor();

      await this.page!.getByRole('textbox', { name: 'Take a note...' })
        .fill(TodoAppRoleAdapter.TITLE_PREFIX + val);
      await this.page!.getByRole('textbox', { name: 'Content...' })
        .fill(TodoAppRoleAdapter.DESCRIPTION_PREFIX + val);

      // Wait for the UI to reflect the new changes
      await this.clickAndWaitForListDomUpdate(updateBtn);
    });
  }

  async actionDeleteTodo(args: Arg[]): Promise<any> {
    await this.safeRun('deleteTodo', async () => {
      const id = this.getTodoId(args[0]);
      const card = await this.hoverOnCard(id);
      if (!card) return;

      const del = this.page!.getByTestId(`delete-todo-${id}`);
      this.page!.once('dialog', dialog => dialog.accept());
      await this.clickAndWaitForListDomUpdate(del);
    });
    // return null;
  }

  async actionListTodo(args: Arg[]): Promise<any> {
    const results: TodoRecord[] = [];
    const cards = this.page!.locator("[data-testid^='todo-card-']");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      results.push(await this.extractTodo(card));
    }

    // Sort by id
    results.sort((a, b) => a.id - b.id);
    return this.toFizzBeeFormatList(results);
  }

  async actionPinTodo(args: Arg[]): Promise<any> {
    await this.safeRun('pinTodo', async () => {
      const id = this.getTodoId(args[0]);
      const card = await this.hoverOnCard(id);
      if (!card) return;

      const pin = this.page!.getByTestId(`pin-todo-${id}`);
      if ((await pin.count()) === 0) {
        return;
      }
      await this.pinAndWaitForListDomUpdate(pin, id);
    });
    // return null;
  }

  async actionUnPinTodo(args: Arg[]): Promise<any> {
    await this.safeRun('unpinTodo', async () => {
      const id = this.getTodoId(args[0]);
      const card = await this.hoverOnCard(id);
      if (!card) return;

      const unpin = this.page!.getByTestId(`unpin-todo-${id}`);
      if ((await unpin.count()) === 0) {
        return;
      }
      await this.clickAndWaitForListDomUpdate(unpin);
    });
  }

  /**
   * Clicks the given button and waits for the todo list DOM to update,
   * indicated by a change in the #todoUpdateCounter element's text content, to ensure that the UI has
   * reflected changes after actions like create, update, delete, pin, or unpin.
   *
   * Without this, tests may proceed before the UI is updated, leading to flaky tests, while avoiding
   * the unnecessary timed wait (or slow mo) for specific API responses.
   * Thereby, improving test speed and reliability.
   */
  private async clickAndWaitForListDomUpdate(btn: Locator): Promise<void> {
    const before = await this.page!.locator('#todoUpdateCounter').textContent();
    await btn.click();
    await this.page!.waitForFunction(
      prev => document.getElementById('todoUpdateCounter')?.textContent !== prev,
      before
    );
  }

  /**
   * Pin flow helper that waits for the PATCH /pin request to complete,
   * and only waits for the UI update if the PATCH request succeeded.
   */
  private async pinAndWaitForListDomUpdate(btn: Locator, todoId: number): Promise<void> {
    // Read counter before click
    const before = await this.page!.locator('#todoUpdateCounter').textContent();

    // Wait for PATCH /pin triggered by click
    const [patchResponse] = await Promise.all([
      this.page!.waitForResponse(
        (r) => r.url().includes(`/todos/${todoId}/pin`) && r.request().method() === 'PATCH',
        { timeout: 5000 }
      ),
      btn.click()
    ]);

    // Only wait for UI update if PATCH succeeded
    if (patchResponse.ok()) {
      await this.page!.waitForFunction(
        prev => document.getElementById('todoUpdateCounter')?.textContent !== prev,
        before
      );
    }
  }

  private async hoverOnCard(id: number): Promise<Locator | null> {
    const card = this.page!.getByTestId(`todo-card-${id}`);
    const count = await card.count();
    if (count === 0 || !(await card.isVisible())) {
      return null;
    }
    await card.hover();
    return card;
  }

  private getTodoId(arg: any): number {
    return typeof arg === 'number' ? arg : parseInt(arg.toString());
  }

  private getValueFromTitle(originalTitle: string): string {
    const title = originalTitle?.trim() || '';
    if (title.startsWith(TodoAppRoleAdapter.TITLE_PREFIX)) {
      return title.substring(TodoAppRoleAdapter.TITLE_PREFIX.length).trim();
    }
    return title;
  }

  private async extractTodo(card: Locator): Promise<TodoRecord> {
    const testid = await card.getAttribute('data-testid');
    // testid expected like todo-card-2
    const parts = testid!.split('-');
    const id = parseInt(parts[parts.length - 1]);

    const titleText = await card.getByTestId(`todo-title-${id}`).textContent();
    const value = this.getValueFromTitle(titleText || '');

    const cls = await card.getAttribute('class');
    const pinned = cls?.includes('pinned') || false;

    return {
      id,
      value,
      deleted: false,
      pinned
    };
  }

  private toFizzBeeFormat(record: TodoRecord): string {
    // Sort keys alphabetically to match Java TreeMap behavior
    const sortedEntries: [string, string][] = [
      ['deleted', record.deleted ? 'True' : 'False'],
      ['id', record.id.toString()],
      ['pinned', record.pinned ? 'True' : 'False'],
      ['value', `"${record.value}"`]
    ];

    const parts = sortedEntries.map(([key, value]) => `${key} = ${value}`);
    return `record(${parts.join(', ')})`;
  }

  private toFizzBeeFormatList(records: TodoRecord[]): string {
    const formatted = records.map(r => this.toFizzBeeFormat(r));
    return `[${formatted.join(', ')}]`;
  }

  private async safeRun(label: string, action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (e) {
      // Log and ignore Playwright exceptions to avoid test interruption
      console.error(`Error in ${label}:`, e);
    }
  }
}

// Model adaptor
export class TodoModelAdapter implements TodoModel {
  private static readonly DB_PATH = '/Users/jp/src/todo-golang/test.db';
  private todoappRole?: TodoAppRoleAdapter;

  async getRoles(): Promise<Map<string, any>> {
    const roles = new Map<string, any>();
    roles.set('TodoApp#0', this.todoappRole);
    return roles;
  }

  async init(): Promise<void> {
    if (this.todoappRole) {
      await this.todoappRole.open();
      return;
    }
    this.cleanupDb();
    this.todoappRole = new TodoAppRoleAdapter();
    await this.todoappRole.init();
  }

  async cleanup(): Promise<void> {
    if (this.todoappRole) {
      await this.todoappRole.close();
    }
    this.cleanupDb();
  }
  
  async cleanupAll(): Promise<void> {
      if (this.todoappRole) {
        await this.todoappRole.closeAll();
      }
  }

  private cleanupDb(): void {
    TodoModelAdapter.clearTodos();
  }

  static clearTodos(): void {
    try {
      const db = new Database(TodoModelAdapter.DB_PATH);

      db.pragma('busy_timeout = 3000');
      db.prepare('DELETE FROM todos').run();

      // Reset the auto-incrementing primary key
      db.prepare("DELETE FROM sqlite_sequence WHERE name='todos'").run();

      db.close();
    } catch (e) {
      console.error('Failed to clean up todos:', e);
      throw new Error('Failed to clean up todos');
    }
  }
}

export function newTodoModel(): TodoModel {
  return new TodoModelAdapter();
}

export function getTestOptions(): Record<string, any> {
  return {
    'max-seq-runs': 1000,
    'max-parallel-runs': 0,
    'max-actions': 10,
  };
}