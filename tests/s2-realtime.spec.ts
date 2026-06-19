/**
 * s2-realtime.spec.ts - S2 new-type real-time proofs (SPEC §7 S2, §8).
 *
 * Mirrors realtime.spec.ts's 2-client pattern on the v2 IA: a signed-in creator
 * builds a poll of the NEW type into a deck, presents the deck (deck-present ->
 * /present/<code>), and reads the join code. An ANONYMOUS context opens /v/<code>
 * and answers; the answer must propagate live to the presenter WITHOUT reload.
 *
 *  1. Word cloud: an anonymous voter submits a word; that word token appears
 *     live in the presenter's cloud.
 *  2. Q&A: an anonymous voter asks a question (live card appears); a second
 *     anonymous context upvotes it and the count rises live on the presenter.
 *
 * These two prove the full anonymous-write -> WS broadcast -> live-aggregate
 * path for the open-text response shapes (text + upvotes), not just rendering.
 */
import { test, expect } from 'deepspace/testing'
import type { BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const SYNC_TIMEOUT = 12_000

// Each spec drives the full build -> present -> anonymous-answer loop across
// two (or three) browser contexts, so it needs well past the default 30s.
test.setTimeout(120_000)

test('word cloud: an anonymous word appears live on the presenter', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ One word for today?`
  const word = 'banana' // aggregateWordCloud lowercases+trims; token === testid suffix

  let anonContext: BrowserContext | null = null
  let code = ''
  try {
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'wordcloud', question, deckId })
    code = await presentDeck(creator.page, deckId)

    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // BEFORE: no word token yet (empty cloud renders "No words yet.").
    const token = presenter.getByTestId(`cloud-word-${word}`)
    await expect(token).toHaveCount(0)
    await presenter.screenshot({ path: 'docs/design/verify/s2-wordcloud-before.png' })

    // Anonymous voter (fresh context, NO storageState) submits the word.
    anonContext = await browser.newContext()
    const voter = await anonContext.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)

    const field = voter.getByTestId('text-answer')
    await expect(field).toBeVisible()
    await field.fill(word)
    await voter.getByTestId('vote-submit').click()

    // AFTER: the word token appears live on the presenter with no reload.
    await expect(token).toBeVisible({ timeout: SYNC_TIMEOUT })
    await expect(token).toHaveText(word)
    await presenter.screenshot({ path: 'docs/design/verify/s2-wordcloud-after.png' })
  } finally {
    if (anonContext) await anonContext.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})

test('Q&A: an anonymous question + a second-device upvote propagate live', async ({ users, browser }) => {
  const [creator] = await users(1)
  const stamp = Date.now()
  const question = `__test-${stamp}__ Ask me anything`
  const asked = `__q-${stamp}__ When is the next break?`

  let askerCtx: BrowserContext | null = null
  let upvoterCtx: BrowserContext | null = null
  let code = ''
  try {
    const deckId = await createDeck(creator.page)
    await buildPoll(creator.page, { type: 'qa', question, deckId })
    code = await presentDeck(creator.page, deckId)

    const presenter = creator.page
    await expect(presenter.getByText(question)).toBeVisible({ timeout: 15_000 })

    // BEFORE: the asked question is not on the board yet.
    const card = presenter.locator('[data-testid^="qa-card-"]').filter({ hasText: asked })
    await expect(card).toHaveCount(0)
    await presenter.screenshot({ path: 'docs/design/verify/s2-qa-before.png' })

    // Asker (anonymous) submits a question via the open-text field.
    askerCtx = await browser.newContext()
    const asker = await askerCtx.newPage()
    await asker.goto(`/v/${code}`)
    await expect(asker.getByText(question)).toBeVisible({ timeout: 15_000 })
    expect(await asker.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    await asker.getByTestId('text-answer').fill(asked)
    await asker.getByTestId('vote-submit').click()

    // The question appears live on the presenter with no reload, count at 0.
    await expect(card).toHaveCount(1, { timeout: SYNC_TIMEOUT })
    const cardCount = card.locator('.tnum')
    await expect(cardCount).toHaveText('0', { timeout: SYNC_TIMEOUT })

    // A SECOND anonymous device opens the voter view and upvotes the question.
    // The voter Q&A view renders the upvote pill as a button; click it.
    upvoterCtx = await browser.newContext()
    const upvoter = await upvoterCtx.newPage()
    await upvoter.goto(`/v/${code}`)
    const voterCard = upvoter.locator('[data-testid^="qa-card-"]').filter({ hasText: asked })
    await expect(voterCard).toHaveCount(1, { timeout: SYNC_TIMEOUT })
    await voterCard.getByRole('button').click()

    // AFTER: the presenter's upvote count rises 0 -> 1 live, no reload.
    await expect(cardCount).toHaveText('1', { timeout: SYNC_TIMEOUT })
    await presenter.screenshot({ path: 'docs/design/verify/s2-qa-after.png' })
  } finally {
    if (askerCtx) await askerCtx.close()
    if (upvoterCtx) await upvoterCtx.close()
    await cleanupSession(creator.page, code).catch(() => {})
  }
})
