/**
 * realtime.spec.ts - the load-bearing 2-client real-time proof (SPEC §14.2).
 *
 * Context A (signed-in creator): builds a choice poll into a deck, presents the
 * deck (deck-present -> /present/<code>), and reads the join code from the URL.
 * Context B (ANONYMOUS, no auth state): opens /v/<code>, reads the question, and
 * votes WITHOUT signing in.
 * Assertion: the chosen option's live count on the presenter increments from
 * 0 to 1 with no reload (the real-time promise + the no-signup promise).
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const VOTE_SYNC_TIMEOUT = 12_000

// This single spec drives the full creator -> share -> anonymous-vote loop
// across two browser contexts, so it needs more than the default 30s.
test.setTimeout(120_000)

test('anonymous vote appears live on the presenter view', async ({ users, browser }) => {
  const [creator] = await users(1)

  // Unique, recognizable test data (cleanup convention). Three options; we vote
  // for "Cats" and assert that specific row increments.
  const stamp = Date.now()
  const question = `__test-${stamp}__ Which pet wins?`
  const optionLabels = ['Cats', 'Dogs', 'Parrots']
  const chosenLabel = 'Cats'

  let anonContext: BrowserContext | null = null
  let code = ''

  try {
    // 1. Build the choice poll into a deck, then present the deck.
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'choice', question, options: optionLabels, deckId })
    code = await presentDeck(creator.page, deckId)

    // The presenter resolves the live poll and renders one result row per option.
    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // 2. Anonymous client (fresh context, NO storageState) opens the voter page.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)

    // No-signup proof: the anonymous client reads the question and the options
    // with no auth overlay and no sign-in.
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    const chosenButton = voter.getByText(chosenLabel, { exact: true })
    await expect(chosenButton).toBeVisible()

    // Discover the chosen option's stable id from its vote button testid.
    const optionId = await voter
      .locator('[data-testid^="vote-option-"]')
      .filter({ hasText: chosenLabel })
      .first()
      .getAttribute('data-testid')
    expect(optionId).toBeTruthy()
    const chosenId = optionId!.replace('vote-option-', '')

    // 3. BEFORE: capture the presenter and confirm the chosen count starts at 0.
    const presenterCount = presenter.getByTestId(`result-count-${chosenId}`)
    await expect(presenterCount).toBeVisible({ timeout: 10_000 })
    await expect(presenterCount).toHaveText('0')
    await presenter.screenshot({ path: 'docs/design/verify/realtime-before.png' })

    // 4. Anonymous vote (the WS create permitted by responses viewer.create).
    await voter.getByText(chosenLabel, { exact: true }).click()
    await voter.getByTestId('vote-submit').click()

    // 5. AFTER: the presenter's chosen-option count goes 0 -> 1 with no reload.
    await expect(presenterCount).toHaveText('1', { timeout: VOTE_SYNC_TIMEOUT })
    await presenter.screenshot({ path: 'docs/design/verify/realtime-after.png' })

    // Only the chosen row incremented: every other option still reads 0.
    const otherTotal = await presenter
      .locator('[data-testid^="result-count-"]')
      .filter({ hasNotText: '1' })
      .count()
    expect(otherTotal).toBe(optionLabels.length - 1)
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
