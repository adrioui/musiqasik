import { expect, test } from '@playwright/test'

test.describe('Search race condition fix', () => {
  test('typing quickly should only show final search results', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')

    // Find the search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Type "Radio" quickly followed by "head" to spell "Radiohead"
    await searchInput.fill('Radio')
    // Small delay to let first request start
    await page.waitForTimeout(100)
    // Continue typing immediately to trigger abort
    await searchInput.fill('Radiohead')

    // Wait for results to appear
    await page.waitForTimeout(500)

    // Check that only Radiohead-related results appear (not "Radio" results)
    const resultsList = page.locator('ul.py-2 li')

    // Wait for results
    await expect(resultsList.first()).toBeVisible({ timeout: 5000 })

    // Get all result names
    const resultNames = await resultsList.locator('p.truncate').allTextContents()

    // Verify "Radiohead" is in results
    const hasRadiohead = resultNames.some((name) => name.toLowerCase().includes('radiohead'))
    expect(hasRadiohead).toBe(true)

    // Verify no AbortError console errors
    const abortErrors = consoleErrors.filter(
      (err) => err.includes('AbortError') || err.includes('aborted'),
    )
    expect(abortErrors).toHaveLength(0)
  })

  test('search works normally with regular typing', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Type a normal search query
    await searchInput.fill('Coldplay')

    // Wait for debounce and results
    await page.waitForTimeout(500)

    const resultsList = page.locator('ul.py-2 li')
    await expect(resultsList.first()).toBeVisible({ timeout: 5000 })

    // Verify results contain the search term
    const resultNames = await resultsList.locator('p.truncate').allTextContents()
    const hasColdplay = resultNames.some((name) => name.toLowerCase().includes('coldplay'))
    expect(hasColdplay).toBe(true)
  })
})
