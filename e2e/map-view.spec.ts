import { expect, test } from '@playwright/test'

test.describe('MapView Page', () => {
  test('should load artist page with URL parameter', async ({ page }) => {
    const response = await page.goto('/artist/Radiohead')
    expect(response?.status()).toBe(200)
  })

  test('should display navigation on map view', async ({ page }) => {
    await page.goto('/artist/Beatles')
    // Wait for the floating nav to render (contains MusiqasiQ text)
    await page.waitForSelector('text=MusiqasiQ', { timeout: 10000 })

    await expect(page.getByText('MusiqasiQ')).toBeVisible()
  })

  test('should display back button', async ({ page }) => {
    await page.goto('/artist/Nirvana')
    await page.waitForSelector('a[href="/"]', { timeout: 10000 })

    const backButton = page.locator('a[href="/"]')
    await expect(backButton).toBeVisible()
  })

  test('should have search button in floating nav', async ({ page }) => {
    await page.goto('/artist/Coldplay')
    // Wait for the floating nav to render
    await page.waitForSelector('text=MusiqasiQ', { timeout: 10000 })

    // Search button is in the floating nav
    const searchButton = page.getByRole('button', { name: 'Search' })
    await expect(searchButton).toBeVisible()
  })

  test('should show search input when search button clicked', async ({ page }) => {
    await page.goto('/artist/Pink%20Floyd')
    await page.waitForSelector('text=MusiqasiQ', { timeout: 10000 })

    // Click search button to open search
    await page.getByRole('button', { name: 'Search' }).click()

    // Search input should now be visible
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
  })

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/artist/Daft%20Punk')
    await page.waitForSelector('a[href="/"]', { timeout: 10000 })

    await page.locator('a[href="/"]').click()
    await page.waitForSelector('h1', { timeout: 10000 })

    await expect(page).toHaveURL('/')
  })
})
