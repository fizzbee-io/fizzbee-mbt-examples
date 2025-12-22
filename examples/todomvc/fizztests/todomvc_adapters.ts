// Generated scaffold by fizzbee-mbt generator
// Source: ../spec/todomvc.fizz
// Update the methods with your implementation.

import { Arg, NotImplementedError, StateGetter, AfterActionHook, IGNORE } from '@fizzbee/mbt';
import { waitForDOMSettled } from '@fizzbee/mbt/playwright';
import { TodoModelRole, TodoViewRole, TodoControllerRole, TodomvcModel } from './todomvc_interfaces.js';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
;

// ============================================================================
// Playwright Environment - Manages browser and context lifecycle
// ============================================================================

class PlaywrightEnv {
  private browser?: Browser;
  private context?: BrowserContext;

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      // headless: false,  // Uncomment to see the browser
      // slowMo: 300       // Uncomment to slow down actions
    });
    this.context = await this.browser.newContext({
      // recordVideo: {
      //   dir: '/tmp/playwright-videos/',
      //   size: { width: 1280, height: 720 }
      // }
    });
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('PlaywrightEnv not initialized. Call init() first.');
    }
    const page = await this.context.newPage();
    await page.goto('https://demo.playwright.dev/todomvc/#/');
    return page;
  }

  async closePage(page: Page): Promise<void> {
    if (!page.isClosed()) {
      await page.evaluate(() => window.localStorage.clear());
      await page.close();
    }
  }

  async closeAll(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Role adaptors

export class TodoModelRoleAdapter implements TodoModelRole {
  // TodoModel role has no actions in the spec - all state is managed in the browser
}

export class TodoViewRoleAdapter implements TodoViewRole, StateGetter {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================================
  // State Reading Methods - Read the current state of the UI for verification
  // ============================================================================

  async getState(): Promise<Record<string, any>> {
    return {
      nowShowing: this.getNowShowing(),
      shownTodos: await this.getShownTodos(),
      activeTodoCount: await this.getActiveTodoCount(),
      toggleAllStatus: await this.getToggleAllStatus(),
      clearButtonShown: await this.getClearButtonShown()
    };
  }

  private getNowShowing(): string {
    const url = this.page.url();
    if (url.includes('#/active')) return 'Active';
    if (url.includes('#/completed')) return 'Completed';
    return 'All';
  }

  private async getShownTodos(): Promise<any[]> {
    const todoItems = await this.page.getByTestId('todo-item').all();
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
    const footer = this.page.locator('.todo-count');
    if (await footer.isVisible()) {
      const countText = await footer.textContent();
      const match = countText?.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }
    return 0;
  }

  private async getToggleAllStatus(): Promise<string> {
    const toggleAll = this.page.getByRole('checkbox', { name: '❯Mark all as complete' });
    try {
      if (await toggleAll.isVisible()) {
        return await toggleAll.isChecked() ? 'Checked' : 'Unchecked';
      }
    } catch (e) { }
    return 'NotShown';
  }

  private async getClearButtonShown(): Promise<boolean> {
    try {
      return await this.page.getByRole('button', { name: 'Clear completed' }).isVisible();
    } catch (e) {
      return false;
    }
  }
}

export class TodoControllerRoleAdapter implements TodoControllerRole {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async actionUserAddsItem(args: Arg[]): Promise<any> {
    const title = args[0].toString();
    const input = this.page.getByRole('textbox', { name: 'What needs to be done?' });
    await input.fill(title);
    await input.press('Enter');
  }

  async actionUserSwitchesFilter(args: Arg[]): Promise<any> {
    const newFilter = args[0].toString();
    let link;
    if (newFilter === 'All') {
      link = this.page.getByRole('link', { name: 'All' });
    } else if (newFilter === 'Active') {
      link = this.page.getByRole('link', { name: 'Active' });
    } else if (newFilter === 'Completed') {
      link = this.page.getByRole('link', { name: 'Completed' });
    }

    if (link && await link.isVisible()) {
      await link.click();
    }
  }

  async actionUserTogglesItem(args: Arg[]): Promise<any> {
    const index = args[0] as unknown as number;
    const item = this.page.getByTestId('todo-item').nth(index);
    const checkbox = item.getByRole('checkbox', { name: 'Toggle Todo' });
    if (await checkbox.isVisible()) {
      await checkbox.click();
    }
  }

  async actionUserTogglesAll(args: Arg[]): Promise<any> {
    const toggleAll = this.page.getByRole('checkbox', { name: '❯Mark all as complete' });
    if (await toggleAll.isVisible()) {
      await toggleAll.click();
    }
  }

  async actionUserDeletesItem(args: Arg[]): Promise<any> {
    const index = args[0] as unknown as number;
    const item = this.page.getByTestId('todo-item').nth(index);
    if (await item.isVisible()) {
      await item.hover();
      const deleteBtn = item.getByRole('button', { name: 'Delete' });
      await deleteBtn.click();
    }
  }

  async actionUserEditsItem(args: Arg[]): Promise<any> {
    const newText = args[1].toString();
    const index = args[0] as unknown as number;
    const item = this.page.getByTestId('todo-item').nth(index);
    const title = item.getByTestId('todo-title');
    if (await title.isVisible()) {
      await title.dblclick();

      const editInput = this.page.getByRole('textbox', { name: 'Edit' });
      await editInput.fill(newText);
      await editInput.press('Enter');
    }
  }

  async actionUserClearsCompleted(args: Arg[]): Promise<any> {
    const clearBtn = this.page.getByRole('button', { name: 'Clear completed' });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  }
}

// Model adaptor
export class TodomvcModelAdapter implements TodomvcModel, AfterActionHook {
  private static playwrightEnv?: PlaywrightEnv;

  private todomodelRole?: TodoModelRoleAdapter;
  private todoviewRole?: TodoViewRoleAdapter;
  private todocontrollerRole?: TodoControllerRoleAdapter;
  private page?: Page;

  async getRoles(): Promise<Map<string, any>> {
    const roles = new Map<string, any>();
    roles.set('TodoModel#0', this.todomodelRole);
    roles.set('TodoView#0', this.todoviewRole);
    roles.set('TodoController#0', this.todocontrollerRole);
    return roles;
  }

  async init(): Promise<void> {
    // Initialize Playwright environment once
    if (!TodomvcModelAdapter.playwrightEnv) {
      TodomvcModelAdapter.playwrightEnv = new PlaywrightEnv();
      await TodomvcModelAdapter.playwrightEnv.init();
    }

    // Create a fresh page for each run
    this.page = await TodomvcModelAdapter.playwrightEnv.createPage();

    // Create role instances with the page
    this.todomodelRole = new TodoModelRoleAdapter();
    this.todoviewRole = new TodoViewRoleAdapter(this.page);
    this.todocontrollerRole = new TodoControllerRoleAdapter(this.page);
  }

  async afterAction(): Promise<void> {
    if (this.page) {
      await waitForDOMSettled(this.page);
    }
  }

  async cleanup(): Promise<void> {
    if (this.page && TodomvcModelAdapter.playwrightEnv) {
      await TodomvcModelAdapter.playwrightEnv.closePage(this.page);
    }
  }

  async cleanupAll(): Promise<void> {
    if (TodomvcModelAdapter.playwrightEnv) {
      await TodomvcModelAdapter.playwrightEnv.closeAll();
      TodomvcModelAdapter.playwrightEnv = undefined;
    }
  }
}

export function newTodomvcModel(): TodomvcModel {
  return new TodomvcModelAdapter();
}

export function getTestOptions(): Record<string, any> {
  return {
    'max-seq-runs': 1000,
    'max-parallel-runs': 0,
    'max-actions': 10,
  };
}