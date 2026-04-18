import { expect, test } from '@playwright/test'

test.describe('WebSocket Resilience - Connection Status Indicators', () => {
  test.beforeEach(async ({ page }) => {
    // Mock REST API responses to ensure tests are deterministic
    await page.route('**/api/market/oi**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { timestamp: Date.now() - 5000, value: 100, symbol: 'BTCUSDT' },
            { timestamp: Date.now() - 10000, value: 99, symbol: 'BTCUSDT' },
            { timestamp: Date.now() - 15000, value: 98, symbol: 'BTCUSDT' },
          ],
        }),
      })
    })

    await page.route('**/api/heatmap/oi**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cells: [
              [
                { price: 100, timestamp: Date.now() - 5000, oiDelta: 10, intensity: 30 },
                { price: 100, timestamp: Date.now() - 10000, oiDelta: -5, intensity: 20 },
              ],
              [
                { price: 110, timestamp: Date.now() - 5000, oiDelta: 25, intensity: 80 },
                { price: 110, timestamp: Date.now() - 10000, oiDelta: 15, intensity: 60 },
              ],
            ],
            priceBuckets: [100, 110],
            timeBuckets: [Date.now() - 10000, Date.now() - 5000],
            minPrice: 100,
            maxPrice: 110,
            bucketSize: 10,
          },
        }),
      })
    })
  })

  test('displays connection status indicator on dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for the page to load and status indicator to appear
    await page.waitForLoadState('networkidle')

    // The status indicator should be visible with LIVE status (since data is fresh)
    const statusIndicator = page.locator('text=LIVE').first()
    await expect(statusIndicator).toBeVisible({ timeout: 10000 })
  })

  test('shows LIVE on heatmap when data is fresh', async ({ page }) => {
    await page.goto('/heatmap/oi')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // The status indicator should be visible
    // Look for either LIVE text or a status badge element
    const statusIndicator = page.locator('text=LIVE').first()
    await expect(statusIndicator).toBeVisible({ timeout: 10000 })
  })

  test('WS-down-but-REST-up shows REST-based health (CRITICAL)', async ({
    page,
  }) => {
    // Block WebSocket connections to simulate WS failure
    await page.route('**/stream**', (route) => route.abort())

    // Allow REST API to succeed (already mocked in beforeEach)
    await page.goto('/heatmap/oi')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Should show LIVE (green) because REST is working, NOT OFFLINE
    // This validates the hybrid health approach where REST data is used as fallback
    const statusIndicator = page.locator('text=LIVE').first()
    await expect(statusIndicator).toBeVisible({ timeout: 10000 })

    // Verify it's NOT showing OFFLINE
    const offlineIndicator = page.locator('text=OFFLINE')
    await expect(offlineIndicator).not.toBeVisible()
  })

  test('stale state appears when data stops updating', async ({ page }) => {
    // Mock API to return old data (older than critical threshold of 120s for oiHeatmap)
    await page.route('**/api/heatmap/oi**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cells: [
              [
                {
                  price: 100,
                  timestamp: Date.now() - 150000, // 150 seconds ago (> 120s critical)
                  oiDelta: 10,
                  intensity: 30,
                },
              ],
            ],
            priceBuckets: [100],
            timeBuckets: [Date.now() - 150000],
            minPrice: 100,
            maxPrice: 110,
            bucketSize: 10,
          },
        }),
      })
    })

    await page.goto('/heatmap/oi')

    // Wait for the page to load with stale data
    await page.waitForLoadState('networkidle')

    // Should show OFFLINE (data is 150s old, oiHeatmap critical threshold is 120s)
    const offlineIndicator = page.locator('text=OFFLINE').first()
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 })
  })
})
