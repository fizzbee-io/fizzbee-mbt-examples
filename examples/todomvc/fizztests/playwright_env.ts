import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * Manages Playwright browser and context lifecycle for TodoMVC testing.
 * Browser and context are created eagerly in constructor and reused across test runs.
 * Each test run gets a fresh page.
 */
export class PlaywrightEnv {
  private browser: Browser;
  private context: BrowserContext;

  private constructor(browser: Browser, context: BrowserContext) {
    this.browser = browser;
    this.context = context;
  }

  static async create(): Promise<PlaywrightEnv> {
    const browser = await chromium.launch({
      headless: false,  // Uncomment to see the browser
      slowMo: 300       // Uncomment to slow down actions
    });
    const context = await browser.newContext({
      // recordVideo: {
      //   dir: '/tmp/playwright-videos/',
      //   size: { width: 1280, height: 720 }
      // }
    });
    return new PlaywrightEnv(browser, context);
  }

  async createPage(): Promise<Page> {
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
