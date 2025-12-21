// Generated scaffold by fizzbee-mbt generator
// Source: ../spec/todomvc.fizz
// Update the methods with your implementation.

import { Arg, NotImplementedError, StateGetter, IGNORE } from '@fizzbee/mbt';
import { TodoModelRole, TodoViewRole, TodomvcModel } from './todomvc_interfaces.js';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class TodoModelRoleAdapter implements TodoModelRole {
  // TodoModel role has no actions in the spec - all state is managed in the browser
}

export class TodoViewRoleAdapter implements TodoViewRole, StateGetter {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor() {
    // Browser initialization will happen in init method
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: false,  // Uncomment to see the browser
      slowMo: 300       // Uncomment to slow down actions
    });
    this.context = await this.browser.newContext({
      // recordVideo: {
      //   dir: '/tmp/playwright-videos/',
      //   size: { width: 1280, height: 720 }
      // }
    });
    this.page = await this.context.newPage();
    await this.page.goto('https://demo.playwright.dev/todomvc/#/');
  }

  async close(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.evaluate(() => window.localStorage.clear());
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
    if (this.page && !this.page.isClosed()) {
      // Reuse existing page - localStorage is already cleared in cleanup()
      await this.page.goto('https://demo.playwright.dev/todomvc/#/');
    } else if (this.context) {
      this.page = await this.context.newPage();
      await this.page.goto('https://demo.playwright.dev/todomvc/#/');
    }
  }

  // ============================================================================
  // Action Methods - These implement the user interactions from the spec
  // ============================================================================

  async actionUserSwitchesFilter(args: Arg[]): Promise<any> {
    const newFilter = args[0].toString();
    await this.safeRun('UserSwitchesFilter', async () => {
      let link;
      if (newFilter === 'All') {
        link = this.page!.getByRole('link', { name: 'All' });
      } else if (newFilter === 'Active') {
        link = this.page!.getByRole('link', { name: 'Active' });
      } else if (newFilter === 'Completed') {
        link = this.page!.getByRole('link', { name: 'Completed' });
      } else {
        return;
      }

      if (await link.isVisible()) {
        await link.click();
      }
    });
  }

  async actionUserAddsItem(args: Arg[]): Promise<any> {
    const title = args[0].toString();
    await this.safeRun('UserAddsItem', async () => {
      const input = this.page!.getByRole('textbox', { name: 'What needs to be done?' });
      await input.fill(title);
      await input.press('Enter');
    });
  }

  async actionUserTogglesItem(args: Arg[]): Promise<any> {
    await this.safeRun('UserTogglesItem', async () => {
      const index = this.extractIndex(args[0]);
      const todoItems = await this.page!.getByTestId('todo-item').all();

      if (index >= 0 && index < todoItems.length) {
        const item = todoItems[index];
        const checkbox = item.getByRole('checkbox', { name: 'Toggle Todo' });
        if (await checkbox.isVisible()) {
          await checkbox.click();
        }
      }
    });
  }

  async actionUserTogglesAll(args: Arg[]): Promise<any> {
    await this.safeRun('UserTogglesAll', async () => {
      const toggleAll = this.page!.getByRole('checkbox', { name: '❯Mark all as complete' });
      if (await toggleAll.isVisible()) {
        await toggleAll.click();
      }
    });
  }

  async actionUserDeletesItem(args: Arg[]): Promise<any> {
    await this.safeRun('UserDeletesItem', async () => {
      const index = this.extractIndex(args[0]);
      const todoItems = await this.page!.getByTestId('todo-item').all();

      if (index >= 0 && index < todoItems.length) {
        const item = todoItems[index];
        await item.hover();
        const deleteBtn = item.getByRole('button', { name: 'Delete' });
        await deleteBtn.click();
      }
    });
  }

  async actionUserEditsItem(args: Arg[]): Promise<any> {
    const newText = args[1].toString();

    await this.safeRun('UserEditsItem', async () => {
      const index = this.extractIndex(args[0]);
      const todoItems = await this.page!.getByTestId('todo-item').all();

      if (index >= 0 && index < todoItems.length) {
        const item = todoItems[index];
        const title = item.getByTestId('todo-title');
        await title.dblclick();

        const editInput = this.page!.getByRole('textbox', { name: 'Edit' });
        await editInput.fill(newText);
        await editInput.press('Enter');
      }
    });
  }

  async actionUserClearsCompleted(args: Arg[]): Promise<any> {
    await this.safeRun('UserClearsCompleted', async () => {
      const clearBtn = this.page!.getByRole('button', { name: 'Clear completed' });
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
      }
    });
  }

  // ============================================================================
  // State Reading Methods - Read the current state of the UI for verification
  // ============================================================================

  async getState(): Promise<Record<string, any>> {
    if (!this.page) {
      return { nowShowing: 'All', shownTodos: [], activeTodoCount: 0, toggleAllStatus: 'NotShown', clearButtonShown: false };
    }

    return {
      nowShowing: this.getNowShowing(),
      shownTodos: await this.getShownTodos(),
      activeTodoCount: await this.getActiveTodoCount(),
      toggleAllStatus: await this.getToggleAllStatus(),
      clearButtonShown: await this.getClearButtonShown()
    };
  }

  private getNowShowing(): string {
    const url = this.page!.url();
    if (url.includes('#/active')) return 'Active';
    if (url.includes('#/completed')) return 'Completed';
    return 'All';
  }

  private async getShownTodos(): Promise<any[]> {
    const todoItems = await this.page!.getByTestId('todo-item').all();
    const todos = [];
    for (let i = 0; i < todoItems.length; i++) {
      const label = todoItems[i].locator('label');
      const checkbox = todoItems[i].getByRole('checkbox', { name: 'Toggle Todo' });
      todos.push({
        id: IGNORE,
        title: (await label.textContent() || '').trim(),
        completed: await checkbox.isChecked()
      });
    }
    return todos;
  }

  private async getActiveTodoCount(): Promise<number> {
    const footer = this.page!.locator('.todo-count');
    if (await footer.isVisible()) {
      const countText = await footer.textContent();
      const match = countText?.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }
    return 0;
  }

  private async getToggleAllStatus(): Promise<string> {
    const toggleAll = this.page!.getByRole('checkbox', { name: '❯Mark all as complete' });
    try {
      if (await toggleAll.isVisible()) {
        return await toggleAll.isChecked() ? 'Checked' : 'Unchecked';
      }
    } catch (e) { }
    return 'NotShown';
  }

  private async getClearButtonShown(): Promise<boolean> {
    try {
      return await this.page!.getByRole('button', { name: 'Clear completed' }).isVisible();
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private extractIndex(arg: any): number {
    return arg;
  }

  private async safeRun(label: string, action: () => Promise<void>): Promise<void> {
    try {
      await action();
      await this.waitForDOMSettled();
    } catch (e) {
      console.error(`Error in ${label}:`, e);
    }
  }

  private async waitForDOMSettled(): Promise<void> {
    await this.page!.evaluate(async () => {
      await new Promise((resolve) => {
        let timer = setTimeout(resolve, 1);
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(resolve, 1);
        });
        observer.observe(document.body, { attributes: true, childList: true, subtree: true });
      });
    });
  }
}

// Model adaptor
export class TodomvcModelAdapter implements TodomvcModel {
  private todomodelRole?: TodoModelRoleAdapter;
  private todoviewRole?: TodoViewRoleAdapter;

  async getRoles(): Promise<Map<string, any>> {
    const roles = new Map<string, any>();
    roles.set('TodoModel#0', this.todomodelRole);
    roles.set('TodoView#0', this.todoviewRole);
    return roles;
  }

  async init(): Promise<void> {
    if (this.todoviewRole) {
      await this.todoviewRole.open();
      return;
    }

    this.todomodelRole = new TodoModelRoleAdapter();
    this.todoviewRole = new TodoViewRoleAdapter();
    await this.todoviewRole.init();
  }

  async cleanup(): Promise<void> {
    if (this.todoviewRole) {
      await this.todoviewRole.close();
    }
  }

  async cleanupAll(): Promise<void> {
    if (this.todoviewRole) {
      await this.todoviewRole.closeAll();
    }
  }
}

export function newTodomvcModel(): TodomvcModel {
  return new TodomvcModelAdapter();
}

export function getTestOptions(): Record<string, any> {
  return {
    'max-seq-runs': 100,
    'max-parallel-runs': 0,
    'max-actions': 3,
  };
}
