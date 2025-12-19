import { test, expect } from '@playwright/test';

test.describe('MapView Page', () => {
  test('should load artist page with URL parameter', async ({ page }) => {
    const response = await page.goto('/artist/Radiohead');
    expect(response?.status()).toBe(200);
  });

  test('should display application header on map view', async ({ page }) => {
    await page.goto('/artist/Beatles');
    await page.waitForSelector('header', { timeout: 10000 });
    
    await expect(page.locator('header')).toBeVisible();
  });

  test('should display back button', async ({ page }) => {
    await page.goto('/artist/Nirvana');
    await page.waitForSelector('a[href="/"]', { timeout: 10000 });
    
    const backButton = page.locator('a[href="/"]');
    await expect(backButton).toBeVisible();
  });

  test('should have search input in header', async ({ page }) => {
    await page.goto('/artist/Coldplay');
    await page.waitForSelector('input', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should have side panel', async ({ page }) => {
    await page.goto('/artist/Pink%20Floyd');
    await page.waitForSelector('aside', { timeout: 10000 });
    
    const sidePanel = page.locator('aside');
    await expect(sidePanel).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/artist/Daft%20Punk');
    await page.waitForSelector('a[href="/"]', { timeout: 10000 });
    
    await page.locator('a[href="/"]').click();
    await page.waitForSelector('h1', { timeout: 10000 });
    
    await expect(page).toHaveURL('/');
  });
});
