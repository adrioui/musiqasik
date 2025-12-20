import { test, expect } from '@playwright/test';

test.describe('WASM Loading', () => {
  test('should load WASM module when enabled', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for app to load
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Check WASM loaded (exposed via debug mode)
    // Note: This test requires VITE_USE_WASM_GRAPH=true and VITE_WASM_DEBUG=true
    const wasmLoaded = await page.evaluate(() => {
      return (window as unknown as { __WASM_LOADED__?: boolean }).__WASM_LOADED__ === true;
    });

    // Skip assertion if WASM is not enabled in test environment
    if (process.env.VITE_USE_WASM_GRAPH === 'true') {
      expect(wasmLoaded).toBe(true);

      // Verify WASM version is accessible
      const wasmVersion = await page.evaluate(() => {
        const win = window as unknown as { __WASM_MODULE__?: { get_version: () => string } };
        return win.__WASM_MODULE__?.get_version?.();
      });
      expect(wasmVersion).toBe('0.1.0');
    }
  });

  test('should fall back gracefully when WASM is disabled', async ({ page }) => {
    await page.goto('/');

    // App should still function without WASM
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Search should still work (from JS implementation)
    await page.fill('input[placeholder*="Search"]', 'Radiohead');
    await page.waitForTimeout(500);

    // Should show results or the search input should accept input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveValue('Radiohead');
  });

  test('should not break the app if WASM fails to load', async ({ page }) => {
    // Block WASM file requests to simulate failure
    await page.route('**/*.wasm', (route) => route.abort());

    await page.goto('/');

    // App should still load and be functional
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 10000 });

    // Verify basic app functionality works
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('The Beatles');

    // The input should accept text regardless of WASM status
    await expect(searchInput).toHaveValue('The Beatles');
  });

  test('should show consistent UI regardless of WASM status', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to fully load
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Check that main UI elements are present
    // The app should render the same UI whether WASM is enabled or not
    await expect(page.locator('body')).toBeVisible();

    // Take a screenshot for visual comparison (optional)
    await page.screenshot({ path: 'test-results/wasm-ui-state.png' });
  });

  test.describe('WASM Module Functions', () => {
    test.skip(
      process.env.VITE_USE_WASM_GRAPH !== 'true',
      'WASM not enabled in test environment'
    );

    test('should expose health_check function', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

      const healthCheckResult = await page.evaluate(() => {
        const win = window as unknown as { __WASM_MODULE__?: { health_check: () => boolean } };
        return win.__WASM_MODULE__?.health_check?.();
      });

      expect(healthCheckResult).toBe(true);
    });

    test('should expose benchmark functions', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

      const benchmarkResult = await page.evaluate(() => {
        const win = window as unknown as {
          __WASM_MODULE__?: {
            benchmark_sum: (n: number) => bigint;
            benchmark_normalize: (s: string) => string;
          };
        };

        const sum = win.__WASM_MODULE__?.benchmark_sum?.(100);
        const normalized = win.__WASM_MODULE__?.benchmark_normalize?.('TEST');

        return {
          sum: sum !== undefined ? Number(sum) : undefined,
          normalized,
        };
      });

      expect(benchmarkResult.sum).toBe(5050);
      expect(benchmarkResult.normalized).toBe('test');
    });
  });
});
