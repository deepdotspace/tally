import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    await page.goto('/')
    // The app auto-connects its RecordRoom WebSocket on mount. app-root is the
    // canonical "shell mounted" marker (the scaffold's app-navigation was removed).
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 })
    // If the app loaded and the landing CTA rendered, the WS scope connected.
    // The CTA is a motion button (not a link); "Start a poll" recurs in the endcard.
    await expect(page.getByRole('button', { name: 'Start a poll' }).first()).toBeVisible({ timeout: 15000 })
  })
})
