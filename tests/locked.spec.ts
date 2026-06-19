/**
 * locked.spec.ts - P0-2 lock regression.
 *
 * A signed-in creator builds a choice poll into a deck, presents it, then locks
 * voting from the presenter host control (presenter-ctl-lock). An anonymous voter
 * on /v/<code> must flip to the "Voting is locked" state and be unable to submit a
 * vote (the submit affordance is absent). This proves the UX-enforced lock the
 * voter actually experiences, not just a flag.
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

test.setTimeout(120_000)

test('locked: an anonymous voter sees the locked state and cannot vote', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Lock me`
  const optionLabels = ['Alpha', 'Beta', 'Gamma']

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'choice', question, options: optionLabels, deckId })
    code = await presentDeck(creator.page, deckId)
    await expect(creator.page.getByText(question)).toBeVisible({ timeout: 15_000 })

    // Anonymous voter opens the voter page; the question + options are votable.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    // Pre-lock sanity: the voter has a submit affordance and no locked panel.
    await expect(voter.getByTestId('vote-submit')).toBeVisible()
    await expect(voter.getByTestId('voter-locked')).toHaveCount(0)

    // Host locks voting from the presenter control bar.
    await creator.page.getByTestId('presenter-ctl-lock').click()

    // The voter flips to the locked panel live (no reload) and loses the submit.
    await expect(voter.getByTestId('voter-locked')).toBeVisible({ timeout: SYNC_TIMEOUT })
    await expect(voter.getByText('Voting is locked')).toBeVisible()
    await expect(voter.getByTestId('vote-submit')).toHaveCount(0)
    // The option cards are gone too: there is nothing to cast.
    await expect(voter.locator('[data-testid^="vote-option-"]')).toHaveCount(0)
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-locked.png' })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
