import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Wait for React to render
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page).toHaveTitle(/MusiqasiQ/i);
  });

  test('should display the MusiqasiQ header', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('header', { timeout: 10000 });
    
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('span')).toContainText('MusiqasiQ');
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Explore Artist');
  });

  test('should have a search input field', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.rounded-2xl', { timeout: 10000 });
    
    const featureCards = page.locator('.rounded-2xl.border');
    await expect(featureCards).toHaveCount(3);
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('footer', { timeout: 10000 });
    
    const footer = page.locator('footer');
    await expect(footer).toContainText('Last.fm');
  });
});

test.describe('Artist Search', () => {
  test('should allow typing in search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Radiohead');
    await expect(searchInput).toHaveValue('Radiohead');
  });
});
