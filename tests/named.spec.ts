/**
 * named.spec.ts - F2 named participation.
 *
 * A signed-in creator builds a Q&A poll into a deck and presents it through the
 * real Start-session sheet with the "Ask voters for their name" toggle on
 * (PROTOTYPE-MAP-v3 4). An anonymous voter is then shown the one-field name step
 * first, enters a stamped name, then asks a question. The name must carry through
 * to the live Q&A card on the presenter, proving displayName flows from the name
 * step into the response.
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeckAskingNames, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

test.setTimeout(120_000)

test('named: the name step collects a name that surfaces on the Q&A card', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Ask anything`
  const askerName = `__name-${stamp}__`
  const asked = `__q-${stamp}__ What time is lunch?`

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    // Q&A poll into a deck, then present with the "Ask for names" flag set.
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'qa', question, deckId })
    code = await presentDeckAskingNames(creator.page, deckId)

    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // Anonymous voter: the name step is shown BEFORE the question.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByTestId('voter-name-step')).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    await voter.screenshot({ path: 'docs/design/verify/s5/voter-name-step.png' })

    // Enter the stamped name and continue.
    await voter.getByTestId('name-input').fill(askerName)
    await voter.getByTestId('name-continue').click()

    // Now on the question phase: ask a stamped question.
    await expect(voter.getByText(question)).toBeVisible({ timeout: SYNC_TIMEOUT })
    await voter.getByTestId('text-answer').fill(asked)
    await voter.getByTestId('vote-submit').click()

    // The question appears live on the presenter, carrying the asker's name.
    const card = presenter.locator('[data-testid^="qa-card-"]').filter({ hasText: asked })
    await expect(card).toHaveCount(1, { timeout: SYNC_TIMEOUT })
    await expect(card.getByText(askerName)).toBeVisible({ timeout: SYNC_TIMEOUT })
    await presenter.screenshot({ path: 'docs/design/verify/s5/presenter-named-qa.png' })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
