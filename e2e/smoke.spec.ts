import { expect, test } from '@playwright/test'

test('home page renders primary launch CTA', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /professional options & futures analysis platform/i })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /launch dashboard/i })).toBeVisible()
})

test('oi heatmap route renders with mocked data and supports control changes', async ({
  page,
}) => {
  await page.route('**/api/heatmap/oi**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          cells: [
            [
              { price: 100, timestamp: 1, oiDelta: 10, intensity: 30 },
              { price: 100, timestamp: 2, oiDelta: -5, intensity: 20 },
            ],
            [
              { price: 110, timestamp: 1, oiDelta: 25, intensity: 80 },
              { price: 110, timestamp: 2, oiDelta: 15, intensity: 60 },
            ],
          ],
          priceBuckets: [100, 110],
          timeBuckets: [1, 2],
          minPrice: 100,
          maxPrice: 110,
          bucketSize: 10,
        },
      }),
    })
  })

  await page.goto('/heatmap/oi')

  await expect(page.getByText(/professional oi delta heatmap/i)).toBeVisible()

  const selectors = page.getByRole('combobox')
  await selectors.nth(0).selectOption('ETHUSDT')
  await selectors.nth(1).selectOption('1h')

  await expect(selectors.nth(0)).toHaveValue('ETHUSDT')
  await expect(selectors.nth(1)).toHaveValue('1h')
})
