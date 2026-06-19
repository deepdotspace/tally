/**
 * moderation.spec.ts - F3 Q&A moderation (PROTOTYPE-MAP-v3 5).
 *
 * A signed-in creator builds a Q&A poll into a deck and presents it through the
 * real Start-session sheet with the per-Q&A "Hold questions for review" toggle on.
 * An anonymous voter asks a question and sees the "Sent for review" confirmation.
 * The held question must NOT reach the presenter projection until the host
 * approves it from the Moderate panel; after Approve it appears live. This proves
 * the approve-before-show gate end to end (the projection filters approved === 1).
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

test.setTimeout(120_000)

test('moderation: a held question shows on the presenter only after approval', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Ask away`
  const asked = `__q-${stamp}__ Will this be reviewed?`

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    // Q&A poll into a deck, then present with "Hold questions for review" on.
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'qa', question, deckId })
    code = await presentDeck(creator.page, deckId, { holdQuestions: true })

    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // The held question never reaches the projection (qa cards are approved-only).
    const card = presenter.locator('[data-testid^="qa-card-"]').filter({ hasText: asked })
    await expect(card).toHaveCount(0)

    // Anonymous voter asks a question.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    await voter.getByTestId('text-answer').fill(asked)
    await voter.getByTestId('vote-submit').click()

    // The voter sees the moderated "Sent for review" confirmation, not "posted".
    await expect(voter.getByTestId('qa-sent')).toBeVisible({ timeout: SYNC_TIMEOUT })
    await expect(voter.getByText('Sent for review')).toBeVisible()

    // STILL held: the question has not appeared on the presenter projection.
    await expect(card).toHaveCount(0)

    // Open the Moderate panel; the pending question waits there for approval.
    await presenter.getByTestId('presenter-ctl-moderate').click()
    const panel = presenter.getByTestId('presenter-moderate-panel')
    await expect(panel).toBeVisible({ timeout: SYNC_TIMEOUT })
    await expect(panel.getByText(asked)).toBeVisible({ timeout: SYNC_TIMEOUT })

    // Approve it; now the question appears live on the projection (no reload).
    await panel.getByTestId('moderate-approve').click()
    await expect(card).toHaveCount(1, { timeout: SYNC_TIMEOUT })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
