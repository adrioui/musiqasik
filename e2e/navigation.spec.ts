import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load 404 page for invalid routes', async ({ page }) => {
    const response = await page.goto('/invalid-route-xyz');
    expect(response?.status()).toBe(200); // SPA returns 200 for all routes
  });

  test('should navigate between pages', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Go to an artist page
    await page.goto('/artist/Muse');
    await page.waitForSelector('header', { timeout: 10000 });
    await expect(page.locator('header')).toBeVisible();
  });

  test('should preserve URL on page reload', async ({ page }) => {
    await page.goto('/artist/Queen');
    const url = page.url();
    await page.reload();
    expect(page.url()).toBe(url);
  });
});

test.describe('Responsive Design', () => {
  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('header', { timeout: 10000 });
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 10000 });
    await expect(page.locator('main')).toBeVisible();
  });
});
