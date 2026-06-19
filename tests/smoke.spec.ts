import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests for Tally's real routes. The scaffold's <Navigation/> chrome was
 * removed: routes own their chrome (public landing/voter/presenter render
 * full-bleed; the gated app mounts the creator AppShell). The canonical
 * "shell mounted" marker is [data-testid="app-root"] from _app.tsx.
 */
async function waitForRoot(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 15_000 })
}

test.describe('Smoke tests', () => {
  test('landing loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    // '/' redirects to '/home' (the public landing).
    await page.goto('/')
    await waitForRoot(page)
    // The landing is lazy-loaded behind the auth-boot gate; the CTA is a motion
    // button (not a link), and "Start a poll" recurs in the endcard, so scope first.
    await expect(page.getByRole('button', { name: 'Start a poll' }).first()).toBeVisible({ timeout: 15_000 })
    expect(errors).toEqual([])
  })

  test('public landing shows the Tally brand + CTAs, no auth overlay', async ({ page }) => {
    await page.goto('/home')
    await waitForRoot(page)
    await expect(page.getByRole('button', { name: 'Start a poll' }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Join with a code' }).first()).toBeVisible()
    // Public route: the auth overlay must not be present.
    expect(await page.locator('[data-testid="auth-overlay"]').count()).toBe(0)
  })

  test('public join page renders the code entry form, no auth overlay', async ({ page }) => {
    await page.goto('/join')
    await waitForRoot(page)
    await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByLabel('Session code')).toBeVisible()
    expect(await page.locator('[data-testid="auth-overlay"]').count()).toBe(0)
  })

  test('gated /library shows the auth overlay and hides content when signed out', async ({ page }) => {
    await page.goto('/library')
    await waitForRoot(page)
    // Signed-out visitor to a (protected) route sees the SDK AuthGate overlay
    // and must NOT see the creator content (the Library heading).
    await expect(page.locator('[data-testid="auth-overlay"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Library' })).toHaveCount(0)
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForRoot(page)
    await expect(page.getByText('404')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Page not found')).toBeVisible()
  })
})
