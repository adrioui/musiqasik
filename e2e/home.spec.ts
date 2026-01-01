import { expect, test } from '@playwright/test'

test.describe('Living Gallery - Main View', () => {
  test('should load the app successfully', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    // Wait for React to render the graph
    await page.waitForSelector('svg', { timeout: 10000 })
    await expect(page).toHaveTitle(/MusiqasiQ/i)
  })

  test('should display The Living Gallery header', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('nav', { timeout: 10000 })

    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    await expect(nav.getByText('The Living Gallery')).toBeVisible()
  })

  test('should display Miles Davis as default anchor', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15000 })

    const h1 = page.locator('h1')
    await expect(h1).toContainText('Miles Davis')
  })

  test('should render the force graph SVG', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('svg', { timeout: 10000 })

    const svg = page.locator('svg')
    await expect(svg).toBeVisible()
  })

  test('should display graph nodes', async ({ page }) => {
    await page.goto('/')
    // Wait for nodes to be rendered
    await page.waitForSelector('.graph-node', { timeout: 15000 })

    const nodes = page.locator('.graph-node')
    // Should have at least the center node and some similar artists
    expect(await nodes.count()).toBeGreaterThan(0)
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
