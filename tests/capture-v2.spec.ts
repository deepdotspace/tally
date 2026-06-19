/**
 * capture-v2.spec.ts — full-app screenshot capture for the v2 rebuild.
 *
 * NOT a behavior test. It drives the new light-primary IA end to end via the
 * `users()` fixture (same login path as realtime.spec.ts) and an anonymous
 * `browser.newContext()` voter, screenshotting every screen to
 * docs/design/verify/v2/ so each can be graded against PROTOTYPE-MAP.
 *
 * Flow: capture the empty Library, seed three polls of different types via
 * /build, build a deck and add the polls, open + present the deck, cast an
 * anonymous vote on /v/<code>, End the session (lands on /session/<id>), then
 * sweep Library / Deck / Builder / Voice / History. The public landing is
 * captured from a signed-OUT context.
 *
 * App chrome is light (default theme); presenter / voter / voice-stage /
 * landing are dark by nature. One chrome screen is also captured in dark to
 * exercise the data-theme override.
 */
import { test, expect } from 'deepspace/testing'
import type { Page, BrowserContext } from '@playwright/test'

const DIR = 'docs/design/verify/v2'

// Each capture test drives many navigations + builds; give it generous headroom.
test.setTimeout(300_000)

/** Override the chrome theme via <html data-theme> (pure CSS vars, no reload). */
async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(150)
}

/** Wait past the auth-boot "Loading..." gate so controlled forms stay filled. */
async function settle(page: Page) {
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 15_000 })
}

/**
 * Build one poll of the given type via /build and return to the previous screen.
 * Mirrors the proven auth-boot + remount retry from poll-helpers, adapted to the
 * v2 builder (testids: type-<id>, build-question, option-add, build-create).
 * Saving navigates back to the deck or library, not the old dashboard.
 */
async function buildPoll(
  page: Page,
  opts: { type: string; question: string; options?: string[]; deckId?: string },
) {
  const qs = opts.deckId ? `?deck=${opts.deckId}` : ''
  await page.goto(`/build${qs}`)
  const q = page.getByTestId('build-question')
  await expect(q).toBeVisible({ timeout: 15_000 })
  await settle(page)

  const create = page.getByTestId('build-create')
  const optionInputs = page.getByPlaceholder('Option label')
  const add = page.getByTestId('option-add')
  const labels = opts.options ?? []

  await expect(async () => {
    await settle(page)
    await expect(q).toBeEnabled({ timeout: 5_000 })
    await page.getByTestId(`type-${opts.type}`).click()
    await expect(page.getByTestId(`type-${opts.type}`)).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })
    await q.fill(opts.question)
    // Assert the value held: a mid-fill auth remount wipes controlled state, so
    // this re-arms the retry until the question sticks.
    await expect(q).toHaveValue(opts.question, { timeout: 3_000 })
    if (labels.length) {
      while ((await optionInputs.count()) < labels.length) await add.click()
      for (let i = 0; i < labels.length; i++) await optionInputs.nth(i).fill(labels[i])
      await expect(optionInputs).toHaveCount(labels.length, { timeout: 3_000 })
      await expect(optionInputs.nth(labels.length - 1)).toHaveValue(labels[labels.length - 1], { timeout: 3_000 })
    }
    await expect(create).toBeEnabled({ timeout: 3_000 })
  }).toPass({ timeout: 40_000 })

  await create.click()
  // Save returns to the deck (when authored from one) or the library.
  const back = opts.deckId ? new RegExp(`/deck/${opts.deckId}`) : /\/library/
  await page.waitForURL(back, { timeout: 15_000 })
}

test('capture v2 — library, deck, builder, present, vote, session, history', async ({ users, browser }) => {
  const [creator] = await users(1)
  const page = creator.page
  const stamp = Date.now()
  const anon: BrowserContext[] = []

  try {
    // 0. LIBRARY (empty) — first authed screen (a clean pool account; if it has
    // prior decks the populated shot below still captures the real layout).
    await page.goto('/library')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 20_000 })
    await settle(page)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DIR}/library-empty.png`, fullPage: true })

    // 1. Make a deck and author three polls of different shapes straight into it.
    // The deck polls also surface in the flat All-polls list, so this populates
    // the Library too (one seeding pass instead of two).
    await page.getByRole('button', { name: 'New deck' }).click()
    await page.waitForURL(/\/deck\//, { timeout: 15_000 })
    const deckUrl = page.url()
    const deckId = deckUrl.split('/deck/')[1].split(/[?#]/)[0]
    const deckTitle = `__v2-${stamp}__ Workshop deck`
    await page.getByLabel('Deck name').fill(deckTitle)
    await page.waitForTimeout(300)

    // Author two polls into the deck (each returns to /deck/<id>): an MC (the
    // votable presenter/voter subject) and an NPS (a second ordered row).
    await buildPoll(page, { type: 'choice', question: `__v2-${stamp}__ Pick a session`, options: ['Lightning talks', 'Workshop', 'Panel'], deckId })
    await buildPoll(page, { type: 'nps', question: `__v2-${stamp}__ Recommend us?`, deckId })

    // 2. LIBRARY (populated) — the deck card + the polls in the All-polls list.
    await page.goto('/library')
    await expect(page.getByText(`__v2-${stamp}__ Pick a session`)).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DIR}/library.png`, fullPage: true })

    // Library chrome in DARK (data-theme override) to exercise the dark path.
    await setTheme(page, 'dark')
    await page.screenshot({ path: `${DIR}/library-chrome-dark.png`, fullPage: true })
    await setTheme(page, 'light')

    // 3. DECK DETAIL — title, status chip, ordered poll list with reorder arrows.
    await page.goto(deckUrl)
    await expect(page.getByText(`__v2-${stamp}__ Pick a session`)).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DIR}/deck-detail.png`, fullPage: true })

    // 4. BUILDER captures live in the dedicated builder test below (so this data
    // path stays fast enough to reach session-detail + history within the budget).

    // 5. PRESENT the deck. deck-present now opens the Start-session sheet; Go live
    // (no toggles) creates the session and routes to /present/<code>.
    await page.goto(deckUrl)
    await expect(page.getByTestId('deck-present')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('deck-present').click()
    await expect(page.getByRole('dialog', { name: 'Start session' })).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('setup-go-live').click()
    await page.waitForURL(/\/present\//, { timeout: 20_000 })
    const code = page.url().split('/present/')[1].split(/[?#]/)[0].toUpperCase()
    expect(code).toMatch(/^[A-Z0-9]{4,8}$/)
    // Presenter resolves the first poll (a multiple-choice question). The
    // presenter is a fixed, viewport-filling overlay with continuous CSS
    // animations, so a viewport (not fullPage) shot is correct and avoids the
    // fullPage stitch hanging on the animated fixed layout.
    await expect(page.getByText(`__v2-${stamp}__ Pick a session`)).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${DIR}/presenter-mc.png`, animations: 'disabled' })

    // 6. ANONYMOUS voter on a phone-sized viewport (no auth state).
    const voterCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    anon.push(voterCtx)
    const voter = await voterCtx.newPage()
    await voter.goto(`/v/${code}`)
    await expect(voter.getByText(`__v2-${stamp}__ Pick a session`)).toBeVisible({ timeout: 20_000 })
    // No-signup proof: no auth overlay on the anon voter.
    expect(await voter.locator('[data-testid="auth-overlay"]').count()).toBe(0)
    await voter.waitForTimeout(400)
    await voter.screenshot({ path: `${DIR}/voter-mc.png`, fullPage: true })

    // Cast a vote, then capture the post-vote (voted) state.
    await voter.getByText('Lightning talks', { exact: true }).click()
    await voter.getByTestId('vote-submit').click()
    await voter.waitForTimeout(1200)
    await voter.screenshot({ path: `${DIR}/voter-voted.png`, fullPage: true })

    // Reveal results on the presenter so the bars show a real count, then reshoot.
    await page.getByTestId('presenter-ctl-reveal').click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${DIR}/presenter-mc-revealed.png`, animations: 'disabled' })

    // 7. END the session -> routes straight to /session/<id> (the saved snapshot).
    await page.getByTestId('presenter-end').click()
    await page.waitForURL(/\/session\//, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: deckTitle })).toBeVisible({ timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${DIR}/session-detail.png`, fullPage: true })

    // 8. HISTORY — the closed session now lists.
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/history.png`, fullPage: true })
  } finally {
    for (const c of anon) await c.close().catch(() => {})
  }
})

/* Voice (idle / typed / review) + the public landing. Independent of the data
   path above, so a slow seeding pass never starves these captures. */
test('capture v2 — voice + landing', async ({ users, browser }) => {
  const [creator] = await users(1)
  const page = creator.page
  let signedOut: BrowserContext | null = null

  try {
    // 1. VOICE — idle stage (dark mic stage inset on the light chrome).
    await page.goto('/voice')
    await expect(page.getByRole('heading', { name: 'Talk through your polls' })).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DIR}/voice-idle.png`, fullPage: true })

    // Typed fallback stage (mic will not work headless; "Write them out instead").
    await page.getByText('Prefer to type? Write them out instead').click()
    await expect(page.getByTestId('voice-typed')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('voice-typed').fill(
      'First, which feature should we build next: dark mode, search, or offline. ' +
        'Next, how likely are people to recommend us. Then one word for how today felt.',
    )
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/voice-typed.png`, fullPage: true })

    // Review board: drafting hits the user-billed AI action. It either lands on
    // the review board (best case) or, if the AI call fails, falls back to typed.
    await page.getByTestId('voice-draft-typed').click()
    const reviewHeading = page.getByRole('heading', { name: 'Review your polls' })
    const reachedReview = await reviewHeading.isVisible({ timeout: 30_000 }).catch(() => false)
    if (reachedReview) {
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${DIR}/voice-review.png`, fullPage: true })
    } else {
      // AI did not return drafts; the page fell back to the typed stage. Capture
      // it so the report flags that the review board was not reachable this run.
      await page.screenshot({ path: `${DIR}/voice-review-FALLBACK-typed.png`, fullPage: true })
    }

    // 2. LANDING — public, signed-OUT context.
    signedOut = await browser.newContext()
    const landing = await signedOut.newPage()
    await landing.goto('/')
    // The landing is dark and motion-led; give the hero a beat to mount.
    await landing.waitForTimeout(1800)
    await landing.screenshot({ path: `${DIR}/landing.png`, fullPage: true })
    // Above-the-fold hero only (the full page is very tall with all sections).
    await landing.screenshot({ path: `${DIR}/landing-hero.png` })
  } finally {
    if (signedOut) await signedOut.close().catch(() => {})
  }
})

/* Builder editor + dark phone preview, captured on a wide viewport so the third
   preview column shows (it hides below 1120px). No deck needed and nothing is
   saved, so this is fast and independent of the data path. */
test('capture v2 — builder', async ({ users }) => {
  const [creator] = await users(1)
  const page = creator.page
  const stamp = Date.now()

  await page.setViewportSize({ width: 1440, height: 900 })

  // Choice editor (options list + dark phone preview).
  await buildOpenForCapture(page, '', 'choice', `__v2-${stamp}__ Builder choice`, ['Alpha', 'Beta', 'Gamma'])
  await page.screenshot({ path: `${DIR}/builder-choice.png`, fullPage: true })

  // Word cloud (no-options info-box variant of the editor).
  await buildOpenForCapture(page, '', 'wordcloud', `__v2-${stamp}__ Builder wordcloud`)
  await page.screenshot({ path: `${DIR}/builder-wordcloud.png`, fullPage: true })
})

/**
 * Open /build pre-filled (without saving) purely for a builder screenshot.
 * Picks the type, fills the question + any options, and leaves the form open so
 * the editor + dark phone preview render with real content.
 */
async function buildOpenForCapture(
  page: Page,
  deckId: string,
  type: string,
  question: string,
  options?: string[],
) {
  await page.goto(deckId ? `/build?deck=${deckId}` : '/build')
  const q = page.getByTestId('build-question')
  await expect(q).toBeVisible({ timeout: 15_000 })
  await settle(page)
  const optionInputs = page.getByPlaceholder('Option label')
  const add = page.getByTestId('option-add')
  await expect(async () => {
    await settle(page)
    await expect(q).toBeEnabled({ timeout: 5_000 })
    await page.getByTestId(`type-${type}`).click()
    await expect(page.getByTestId(`type-${type}`)).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })
    await q.fill(question)
    if (options?.length) {
      while ((await optionInputs.count()) < options.length) await add.click()
      for (let i = 0; i < options.length; i++) await optionInputs.nth(i).fill(options[i])
    }
  }).toPass({ timeout: 30_000 })
  await page.waitForTimeout(500)
}
