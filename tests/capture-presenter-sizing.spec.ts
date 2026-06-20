/**
 * capture-presenter-sizing.spec.ts - REVIEW-ONLY capture for the deterministic
 * length-aware projected-question sizing (questionFontSize in PresenterView).
 *
 * Builds a deck with a SHORT, a MEDIUM, and a LONG choice question, goes live via
 * the real Start-session sheet, and screenshots /present at 1440x900 for each so
 * the sizing can be judged on the real app (not just the fit2.png harness).
 *
 * Choice polls hide results until reveal, which is fine here: we are judging the
 * question headline size, so we reveal so the stage is representative. Saved to
 * docs/design/verify/v3/.
 */
import { test, expect } from 'deepspace/testing'
import { buildPoll, createDeck } from './helpers/poll-helpers'

const DIR = 'docs/design/verify/v3'
test.setTimeout(300_000)

const SHORT = 'Ready to start?'
const MEDIUM = 'Which feature should we build next quarter?'
const LONG =
  "Looking back at everything we covered in today's workshop, which single topic would you most want a follow up deep dive session on next month?"

test('capture presenter question sizing - short / medium / long', async ({ users }) => {
  const [creator] = await users(1)
  const page = creator.page
  await page.setViewportSize({ width: 1440, height: 900 })
  let code = ''

  try {
    const deckId = await createDeck(page)
    await buildPoll(page, { type: 'choice', question: SHORT, options: ['Yes', 'No'], deckId })
    await buildPoll(page, { type: 'choice', question: MEDIUM, options: ['A', 'B', 'C'], deckId })
    await buildPoll(page, { type: 'choice', question: LONG, options: ['One', 'Two', 'Three'], deckId })

    // Go live via the Start-session sheet.
    await page.goto(`/deck/${deckId}`)
    const sheet = page.getByRole('dialog', { name: 'Start session' })
    await expect(async () => {
      await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 15_000 })
      await page.getByTestId('deck-present').click()
      await expect(sheet).toBeVisible({ timeout: 8_000 })
    }).toPass({ timeout: 60_000 })
    await page.getByTestId('setup-go-live').click()
    await page.waitForURL(/\/present\//, { timeout: 20_000 })
    code = page.url().split('/present/')[1].split(/[?#]/)[0].toUpperCase()

    const shots = [
      { q: SHORT, file: 'sizing-short.png' },
      { q: MEDIUM, file: 'sizing-medium.png' },
      { q: LONG, file: 'sizing-long.png' },
    ]
    for (let i = 0; i < shots.length; i++) {
      await expect(page.getByRole('heading', { name: shots[i].q })).toBeVisible({ timeout: 20_000 })
      // Reveal so the stage isn't the empty hidden-body (representative of real use).
      await page.getByTestId('presenter-ctl-reveal').click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${DIR}/${shots[i].file}`, animations: 'disabled' })
      if (i < shots.length - 1) await page.getByTestId('presenter-next').click()
    }
  } finally {
    await page.goto(`/present/${code}`).catch(() => {})
    await page.getByTestId('presenter-end').click({ timeout: 5_000 }).catch(() => {})
  }
})
