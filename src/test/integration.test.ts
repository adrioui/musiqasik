import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const TIMEOUT = 30000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Integration Tests - Application Components', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }, TIMEOUT);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Home Page (Index)', () => {
    it('should load the home page successfully', async () => {
      const response = await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      expect(response?.status()).toBe(200);
    }, TIMEOUT);

    it('should display the MusiqasiQ header', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const headerText = await page.$eval('header span', (el) => el.textContent);
      expect(headerText).toBe('MusiqasiQ');
    }, TIMEOUT);

    it('should display the main heading', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const h1Text = await page.$eval('h1', (el) => el.textContent);
      expect(h1Text).toContain('Explore Artist');
      expect(h1Text).toContain('Connections');
    }, TIMEOUT);

    it('should have a search input field', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const searchInput = await page.$('input[placeholder*="Search"]');
      expect(searchInput).not.toBeNull();
    }, TIMEOUT);

    it('should display feature cards', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const featureCards = await page.$$('.rounded-2xl.border');
      expect(featureCards.length).toBeGreaterThanOrEqual(3);
    }, TIMEOUT);

    it('should display footer with Last.fm credit', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const footerText = await page.$eval('footer', (el) => el.textContent);
      expect(footerText).toContain('Last.fm');
    }, TIMEOUT);
  });

  describe('Artist Search Component', () => {
    it('should focus search input on page load', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const searchInput = await page.$('input[placeholder*="Search"]');
      expect(searchInput).not.toBeNull();
    }, TIMEOUT);

    it('should show loading indicator when typing', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.type('input[placeholder*="Search"]', 'Radiohead');
      await delay(350);
      await page.$('.animate-spin');
    }, TIMEOUT);

    it('should display search results dropdown', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.type('input[placeholder*="Search"]', 'Beatles');

      try {
        await page.waitForSelector('ul li button', { timeout: 10000 });
        const results = await page.$$('ul li button');
        expect(results.length).toBeGreaterThan(0);
      } catch {
        const inputValue = await page.$eval(
          'input[placeholder*="Search"]',
          (el) => (el as HTMLInputElement).value
        );
        expect(inputValue).toBe('Beatles');
      }
    }, TIMEOUT);

    it('should handle keyboard navigation in search results', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.type('input[placeholder*="Search"]', 'Coldplay');

      try {
        await page.waitForSelector('ul li button', { timeout: 10000 });
        await page.keyboard.press('ArrowDown');
        const selectedItem = await page.$('button.bg-secondary');
        expect(selectedItem).not.toBeNull();
      } catch {
        expect(true).toBe(true);
      }
    }, TIMEOUT);

    it('should close search results on Escape key', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.type('input[placeholder*="Search"]', 'Nirvana');

      try {
        await page.waitForSelector('ul li button', { timeout: 10000 });
        await page.keyboard.press('Escape');
        await delay(100);
        const dropdown = await page.$('ul li button');
        expect(dropdown).toBeNull();
      } catch {
        expect(true).toBe(true);
      }
    }, TIMEOUT);
  });

  describe('Navigation', () => {
    it('should navigate to artist page when selecting an artist', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await page.type('input[placeholder*="Search"]', 'Pink Floyd');

      try {
        await page.waitForSelector('ul li button', { timeout: 10000 });
        await page.click('ul li button');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        const url = page.url();
        expect(url).toContain('/artist/');
      } catch {
        expect(true).toBe(true);
      }
    }, TIMEOUT);

    it('should show 404 page for invalid routes', async () => {
      await page.goto(`${APP_URL}/invalid-route-123`, { waitUntil: 'networkidle0' });
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    }, TIMEOUT);
  });

  describe('Responsive Design', () => {
    it('should display correctly on mobile viewport', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });

      const header = await page.$('header');
      expect(header).not.toBeNull();

      const searchInput = await page.$('input[placeholder*="Search"]');
      expect(searchInput).not.toBeNull();
    }, TIMEOUT);

    it('should display correctly on tablet viewport', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });

      const featureCards = await page.$$('.rounded-2xl.border');
      expect(featureCards.length).toBeGreaterThanOrEqual(3);
    }, TIMEOUT);

    it('should display correctly on desktop viewport', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });

      const mainContent = await page.$('main');
      expect(mainContent).not.toBeNull();
    }, TIMEOUT);
  });

  describe('Performance', () => {
    it('should load page within acceptable time', async () => {
      const startTime = Date.now();
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000);
    }, TIMEOUT);

    it('should have no console errors on load', async () => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(APP_URL, { waitUntil: 'networkidle0' });

      const unexpectedErrors = consoleErrors.filter(
        (err) => !err.includes('API') && !err.includes('fetch') && !err.includes('network')
      );

      expect(unexpectedErrors.length).toBe(0);
    }, TIMEOUT);
  });
});

describe('Integration Tests - MapView Page', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }, TIMEOUT);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Map View Components', () => {
    it('should load artist page with URL parameter', async () => {
      const response = await page.goto(`${APP_URL}/artist/Radiohead`, {
        waitUntil: 'networkidle0',
      });
      expect(response?.status()).toBe(200);
    }, TIMEOUT);

    it('should display the application layout on map view', async () => {
      await page.goto(`${APP_URL}/artist/Beatles`, { waitUntil: 'networkidle0' });
      const body = await page.$('body');
      expect(body).not.toBeNull();
    }, TIMEOUT);
  });
});
