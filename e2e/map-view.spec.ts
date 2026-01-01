import { expect, test } from '@playwright/test'

test.describe('Graph View', () => {
  test('should load graph with default artist', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    // Wait for graph to render
    await page.waitForSelector('svg', { timeout: 15000 })
    await expect(page.locator('svg')).toBeVisible()
  })

  test('should display The Living Gallery header', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('nav', { timeout: 10000 })

    await expect(page.getByText('The Living Gallery')).toBeVisible()
  })

  test('should display anchor artist name', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1', { timeout: 15000 })

    const h1 = page.locator('h1')
    await expect(h1).toContainText('Miles Davis')
  })

  test('should render graph nodes', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.graph-node', { timeout: 15000 })

    const nodes = page.locator('.graph-node')
    expect(await nodes.count()).toBeGreaterThan(0)
  })

  test('should render curved path edges', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('svg path', { timeout: 15000 })

    const paths = page.locator('svg .links path')
    expect(await paths.count()).toBeGreaterThan(0)
  })
})
