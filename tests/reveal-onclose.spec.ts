/**
 * reveal-onclose.spec.ts - F3 reveal mode "When the poll closes".
 *
 * A choice poll built with revealMode 'onClose' hides results from the voter
 * during voting (a vote shows the "results hidden" thanks, not the bars). When
 * the host locks the poll from the presenter, lockSession auto-reveals
 * (resultsRevealed -> 1), so the voter's screen now shows the result rows.
 * Deterministic: driven by the host lock action, not a timer, so it is safe in
 * the full suite.
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

test.setTimeout(120_000)

test('reveal onClose: results hidden during voting, revealed on lock', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Reveal on close`
  const optionLabels = ['One', 'Two', 'Three']
  const chosen = 'One'

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'choice', question, options: optionLabels, revealMode: 'onClose', deckId })
    code = await presentDeck(creator.page, deckId)
    await expect(creator.page.getByText(question)).toBeVisible({ timeout: 15_000 })

    // Anonymous voter casts a vote.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    await voter.getByText(chosen, { exact: true }).click()
    await voter.getByTestId('vote-submit').click()

    // DURING voting: results are hidden, so the voter sees the held-back thanks,
    // not the result rows. (revealMode onClose seeds resultsRevealed = 0.)
    await expect(voter.getByText('Your vote is counted')).toBeVisible({ timeout: SYNC_TIMEOUT })
    await expect(voter.locator('[data-testid^="result-row-"]')).toHaveCount(0)
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-reveal-hidden.png' })

    // Host locks the poll from the presenter -> onClose auto-reveal flips
    // resultsRevealed to 1.
    await creator.page.getByTestId('presenter-ctl-lock').click()

    // AFTER lock: the voter now sees the result rows (revealed live, no reload).
    await expect(voter.locator('[data-testid^="result-row-"]').first()).toBeVisible({ timeout: SYNC_TIMEOUT })
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-reveal-shown.png' })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
