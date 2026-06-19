/**
 * Multi-user spec — two signed-in creators land in the gated Library shell and
 * each sees their OWN account in the sidebar (isolated browser contexts, no
 * identity bleed). The deeper real-time proof (anonymous vote syncs live to the
 * presenter) lives in realtime.spec.ts.
 *
 * Uses users(2) — the first two accounts in the shared pool, by createdAt.
 * Do NOT switch to named accounts unless a test needs specific identities.
 */
import { test, expect } from 'deepspace/testing'

test('two creators each see their own account in the creator shell', async ({ users }) => {
  const [a, b] = await users(2)

  await Promise.all([a.page.goto('/library'), b.page.goto('/library')])

  const nameA = a.page.getByTestId('sidebar-account-name')
  const nameB = b.page.getByTestId('sidebar-account-name')

  await expect(nameA).toBeVisible({ timeout: 20_000 })
  await expect(nameB).toBeVisible({ timeout: 20_000 })

  // Each context shows its own user, not the other's (no identity bleed).
  await expect(nameA).toHaveText(a.name)
  await expect(nameB).toHaveText(b.name)
  expect(a.name).not.toBe(b.name)
})
