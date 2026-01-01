import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('should load app for any route (single page app)', async ({ page }) => {
    const response = await page.goto('/any-route')
    expect(response?.status()).toBe(200) // SPA returns 200 for all routes
  })

  test('should show Miles Davis graph on load', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15000 })

    await expect(page.locator('h1')).toContainText('Miles Davis')
  })

  test('should preserve state on page reload', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('svg', { timeout: 10000 })
    await page.reload()
    await page.waitForSelector('svg', { timeout: 10000 })
    await expect(page.locator('svg')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForSelector('nav', { timeout: 10000 })
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should display on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await page.waitForSelector('svg', { timeout: 10000 })
    await expect(page.locator('svg')).toBeVisible()
  })
})
