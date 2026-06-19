/**
 * capture-v3.spec.ts - screenshot capture for the four v3 features.
 *
 * NOT a behavior test. It drives the new Start-session flow + the moderation /
 * name / AI / export surfaces end to end (the `users()` login path + an anonymous
 * `browser.newContext()` voter, same as capture-v2.spec.ts) and screenshots each
 * new surface to docs/design/verify/v3/ so each can be graded against
 * PROTOTYPE-MAP-v3.
 *
 * Surfaces captured:
 *  - Start-session setup sheet (name + Q&A moderation toggles).
 *  - Voter name step + voter "Sent for review" confirmation (moderated Q&A).
 *  - Presenter Moderate panel with a pending question.
 *  - Presenter AI Summary panel (idle).
 *  - Session-detail Download menu (open) + the session-detail AI summary row.
 *
 * The setup sheet, presenter, and voter are dark/overlay surfaces, so a viewport
 * shot (not fullPage) is used for those (fullPage would stitch over fixed
 * overlays). The session-detail surfaces are light app chrome (fullPage is fine).
 */
import { test, expect } from 'deepspace/testing'
import type { Page, BrowserContext } from '@playwright/test'
import { buildPoll, createDeck, presentDeck, cleanupSession } from './helpers/poll-helpers'

const DIR = 'docs/design/verify/v3'

// The capture drives a full build -> present -> vote -> moderate -> end flow.
test.setTimeout(300_000)

/** Wait past the auth-boot "Loading..." gate so controlled forms stay filled. */
async function settle(page: Page) {
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 15_000 })
}

test('capture v3 - setup sheet, moderation, name step, AI, export', async ({ users, browser }) => {
  const [creator] = await users(1)
  const page = creator.page
  const stamp = Date.now()
  const qaQuestion = `__v3-${stamp}__ What should we cover next?`
  const asked = `__q-${stamp}__ Can we get the slides afterward?`
  const askerName = `__name-${stamp}__`
  const anon: BrowserContext[] = []
  let code = ''

  try {
    // Seed a deck with a Q&A poll: a Q&A poll makes the sheet show its moderation
    // group AND is a text poll the AI Summary can run on.
    const deckId = await createDeck(page)
    await buildPoll(page, { type: 'qa', question: qaQuestion, deckId })

    // 1. START-SESSION SHEET - open it from the deck, flip both toggles on, shoot.
    await page.goto(`/deck/${deckId}`)
    const sheet = page.getByRole('dialog', { name: 'Start session' })
    await expect(async () => {
      await settle(page)
      await page.getByTestId('deck-present').click()
      await expect(sheet).toBeVisible({ timeout: 8_000 })
    }).toPass({ timeout: 40_000 })

    const nameToggle = sheet.getByRole('switch', { name: 'Ask voters for their name' })
    const holdToggle = sheet.getByRole('switch', { name: /^Hold questions for review:/ })
    await nameToggle.click()
    await holdToggle.click()
    await expect(nameToggle).toHaveAttribute('aria-checked', 'true')
    await expect(holdToggle).toHaveAttribute('aria-checked', 'true')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/setup-sheet.png`, animations: 'disabled' })

    // Go live straight from the sheet (toggles are already on: names + moderation).
    await page.getByTestId('setup-go-live').click()
    await page.waitForURL(/\/present\//, { timeout: 20_000 })
    code = page.url().split('/present/')[1].split(/[?#]/)[0].toUpperCase()
    await expect(page.getByText(qaQuestion)).toBeVisible({ timeout: 20_000 })

    // 2. VOTER NAME STEP - anonymous voter on a phone viewport sees it first.
    const voterCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    anon.push(voterCtx)
    const voter = await voterCtx.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByTestId('voter-name-step')).toBeVisible({ timeout: 20_000 })
    await voter.waitForTimeout(300)
    await voter.screenshot({ path: `${DIR}/voter-name-step.png`, fullPage: true })

    // Enter the name, continue, then ask a question (held for review).
    await voter.getByTestId('name-input').fill(askerName)
    await voter.getByTestId('name-continue').click()
    await expect(voter.getByText(qaQuestion)).toBeVisible({ timeout: 15_000 })
    await voter.getByTestId('text-answer').fill(asked)
    await voter.getByTestId('vote-submit').click()

    // 3. VOTER "SENT FOR REVIEW" CONFIRMATION (moderated copy).
    await expect(voter.getByTestId('qa-sent')).toBeVisible({ timeout: 12_000 })
    await expect(voter.getByText('Sent for review')).toBeVisible()
    await voter.waitForTimeout(300)
    await voter.screenshot({ path: `${DIR}/voter-sent-for-review.png`, fullPage: true })

    // 4. PRESENTER MODERATE PANEL with the pending question.
    await page.getByTestId('presenter-ctl-moderate').click()
    const modPanel = page.getByTestId('presenter-moderate-panel')
    await expect(modPanel).toBeVisible({ timeout: 12_000 })
    await expect(modPanel.getByText(asked)).toBeVisible({ timeout: 12_000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/presenter-moderate-panel.png`, animations: 'disabled' })

    // 5. PRESENTER AI SUMMARY PANEL (idle). Q&A is a text type, so the control shows.
    await page.getByTestId('presenter-ctl-summary').click()
    const aiPanel = page.getByTestId('presenter-ai-panel')
    await expect(aiPanel).toBeVisible({ timeout: 12_000 })
    await expect(page.getByTestId('ai-summarize-run')).toBeVisible({ timeout: 12_000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/presenter-ai-panel.png`, animations: 'disabled' })

    // End the session -> routes to /session/<id> (the saved snapshot). The asked
    // question was approved-or-not: end saves whatever is there; the card renders.
    await page.getByTestId('presenter-end').click()
    await page.waitForURL(/\/session\//, { timeout: 20_000 })
    await expect(page.getByText(qaQuestion)).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)

    // 6. SESSION-DETAIL AI SUMMARY ROW - the idle "Summarize answers into themes"
    // row renders by default on the (text) Q&A card. Capture the page with it.
    await page.screenshot({ path: `${DIR}/session-ai-summary.png`, fullPage: true })

    // 7. SESSION-DETAIL DOWNLOAD MENU (open) - click the quiet Download trigger.
    await page.getByRole('button', { name: 'Download' }).first().click()
    await expect(page.getByText('Spreadsheet')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Chart image')).toBeVisible()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/session-download-menu.png`, fullPage: true })
  } finally {
    for (const c of anon) await c.close().catch(() => {})
    await cleanupSession(page, code).catch(() => {})
  }
})
