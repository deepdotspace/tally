/**
 * multi-realtime.spec.ts - P0-1 multi-select regression (the load-bearing S5 proof).
 *
 * A MULTI-SELECT poll silently behaved as single before S5 (one row per voter,
 * so only the last pick counted). This spec proves multi now collects MULTIPLE
 * options end to end: a signed-in creator builds a multi poll with three options
 * into a deck, presents the deck, then an anonymous voter toggles TWO options and
 * submits ONCE. Both chosen presenter counts must reach 1 with no reload, and the
 * unchosen option must stay at 0.
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

// Full creator -> present -> anonymous multi-vote loop across two contexts.
test.setTimeout(120_000)

test('multi-select: an anonymous voter picks two options and both count live', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Which have you tried?`
  const optionLabels = ['Tea', 'Coffee', 'Mate']
  // Pick the first two; the third must stay at 0.
  const chosen = ['Tea', 'Coffee']
  const unchosen = 'Mate'

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'multi', question, options: optionLabels, deckId })
    code = await presentDeck(creator.page, deckId)

    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // Anonymous voter (fresh context, NO storageState) opens the voter page.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)

    // Resolve each option's stable id from its vote button.
    const idOf = async (label: string) => {
      const testid = await voter
        .locator('[data-testid^="vote-option-"]')
        .filter({ hasText: label })
        .first()
        .getAttribute('data-testid')
      expect(testid).toBeTruthy()
      return testid!.replace('vote-option-', '')
    }
    const chosenIds = [await idOf(chosen[0]), await idOf(chosen[1])]
    const unchosenId = await idOf(unchosen)

    // BEFORE: every presenter count starts at 0.
    for (const id of [...chosenIds, unchosenId]) {
      const c = presenter.getByTestId(`result-count-${id}`)
      await expect(c).toBeVisible({ timeout: 10_000 })
      await expect(c).toHaveText('0')
    }
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-multi-empty.png' })

    // Toggle BOTH chosen options on, then submit ONCE. aria-pressed confirms the
    // multi cards actually hold a selection set (not a single radio swap).
    for (const label of chosen) {
      const card = voter.locator('[data-testid^="vote-option-"]').filter({ hasText: label }).first()
      await card.click()
      await expect(card).toHaveAttribute('aria-pressed', 'true')
    }
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-multi-two-selected.png' })
    await voter.getByTestId('vote-submit').click()

    // AFTER: both chosen rows go 0 -> 1 live; the unchosen row stays 0.
    for (const id of chosenIds) {
      await expect(presenter.getByTestId(`result-count-${id}`)).toHaveText('1', { timeout: SYNC_TIMEOUT })
    }
    await expect(presenter.getByTestId(`result-count-${unchosenId}`)).toHaveText('0')
    await presenter.screenshot({ path: 'docs/design/verify/s5/presenter-multi-two-counted.png' })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
