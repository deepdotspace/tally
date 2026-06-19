import { expect } from 'deepspace/testing'
import type { Page } from '@playwright/test'

/*
 * Shared e2e helpers for the v2 information architecture, cribbed from the proven
 * capture-v2.spec.ts flow (the one spec that already drives the new IA end to end).
 *
 * The flow: author polls at /build (into a deck via ?deck=<id>), present a deck
 * with the deck-present control, configure the session in the Start-session sheet
 * (PROTOTYPE-MAP-v3 section 2), then Go live (routes to /present/<code>), vote
 * anonymously at /v/<code>, and run host controls from the presenter
 * (presenter-ctl-* + presenter-end).
 *
 * The data layer can briefly remount (auth re-validates -> AuthBoot "Loading...")
 * and wipe controlled form state, so every builder interaction runs inside a
 * toPass() retry that first waits for a mounted, non-loading, editable form.
 */

export interface BuildOptions {
  /** Poll type, e.g. 'choice' | 'multi' | 'qa' | 'wordcloud'. Selected via its type card. */
  type: string
  /** The question text (already stamped by the caller). */
  question: string
  /** Option labels for choice/multi/ranking/quiz; omit for the option-less types. */
  options?: string[]
  /** Reveal-mode segment to pick (reveal-manual / reveal-onClose / reveal-never). */
  revealMode?: 'manual' | 'onClose' | 'never'
  /** Author the poll into this deck (?deck=<id>); Save then returns to /deck/<id>. */
  deckId?: string
}

/** Start-session sheet choices, flipped before Go live (PROTOTYPE-MAP-v3 2). */
export interface PresentOptions {
  /** Turn on the "Ask voters for their name" toggle (default off / anonymous). */
  askNames?: boolean
  /** Turn on every Q&A "Hold questions for review" toggle (default off / instant). */
  holdQuestions?: boolean
}

/** Wait past the auth-boot "Loading..." gate so controlled forms stay filled. */
async function settle(page: Page): Promise<void> {
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 15_000 })
}

/**
 * Build a poll of the given shape via /build. When `deckId` is set the poll is
 * authored into that deck and Save returns to /deck/<id>; otherwise Save returns
 * to /library. Picking a type clears the per-type fields, so the retry re-selects
 * the type before re-filling.
 */
export async function buildPoll(page: Page, opts: BuildOptions): Promise<void> {
  const qs = opts.deckId ? `?deck=${opts.deckId}` : ''
  await page.goto(`/build${qs}`)
  const questionField = page.getByTestId('build-question')
  await expect(questionField).toBeVisible({ timeout: 15_000 })
  await settle(page)

  const createBtn = page.getByTestId('build-create')
  const optionInputs = page.getByPlaceholder('Option label')
  const addBtn = page.getByTestId('option-add')
  const labels = opts.options ?? []

  await expect(async () => {
    await settle(page)
    await expect(questionField).toBeEnabled({ timeout: 5_000 })

    await page.getByTestId(`type-${opts.type}`).click()
    await expect(page.getByTestId(`type-${opts.type}`)).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })

    await questionField.fill(opts.question)
    // A mid-fill auth remount wipes controlled state; re-arm the retry until it sticks.
    await expect(questionField).toHaveValue(opts.question, { timeout: 3_000 })

    if (labels.length) {
      while ((await optionInputs.count()) < labels.length) await addBtn.click()
      for (let i = 0; i < labels.length; i++) await optionInputs.nth(i).fill(labels[i])
      await expect(optionInputs).toHaveCount(labels.length, { timeout: 3_000 })
      await expect(optionInputs.nth(labels.length - 1)).toHaveValue(labels[labels.length - 1], { timeout: 3_000 })
    }

    if (opts.revealMode) {
      await page.getByTestId(`reveal-${opts.revealMode}`).click()
      await expect(page.getByTestId(`reveal-${opts.revealMode}`)).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })
    }

    await expect(createBtn).toBeEnabled({ timeout: 3_000 })
  }).toPass({ timeout: 40_000 })

  await createBtn.click()
  // Save returns to the deck (when authored from one) or the library.
  const back = opts.deckId ? new RegExp(`/deck/${opts.deckId}`) : /\/library/
  await page.waitForURL(back, { timeout: 15_000 })
}

/**
 * Create a fresh deck via the "New deck" button and return its id from /deck/<id>.
 * newDeck() no-ops until the user (ownerId) has resolved, and the auth boot can
 * remount the page to "Loading..." mid-click, so retry the click until the URL
 * actually moves to a deck.
 */
export async function createDeck(page: Page): Promise<string> {
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 20_000 })

  await expect(async () => {
    await settle(page)
    const newDeck = page.getByRole('button', { name: 'New deck' })
    await expect(newDeck).toBeVisible({ timeout: 5_000 })
    await newDeck.click()
    await page.waitForURL(/\/deck\//, { timeout: 5_000 })
  }).toPass({ timeout: 40_000 })

  return page.url().split('/deck/')[1].split(/[?#]/)[0]
}

/** Read a join code off a /present/<code> URL, uppercased and validated. */
function codeFromPresentUrl(page: Page): string {
  const code = page.url().split('/present/')[1].split(/[?#]/)[0].toUpperCase()
  expect(code).toMatch(/^[A-Z0-9]{4,8}$/)
  return code
}

/**
 * Present a deck through the real Start-session flow (PROTOTYPE-MAP-v3 2):
 * open /deck/<id>, click deck-present to open the Start-session sheet, optionally
 * flip its "Ask voters for their name" / "Hold questions for review" toggles, then
 * Go live and wait for /present/<code>. Returns the join code.
 *
 * The deck page can boot through an auth "Loading..." remount, so the click that
 * opens the sheet is retried until the sheet dialog is actually open. Toggling +
 * Go live then runs once (Go live navigates, so it must not be inside the retry).
 */
export async function presentDeck(page: Page, deckId: string, opts: PresentOptions = {}): Promise<string> {
  await page.goto(`/deck/${deckId}`)
  const sheet = page.getByRole('dialog', { name: 'Start session' })

  // Generous budget: under the full parallel suite the deck page can sit on the
  // auth-boot "Loading..." remount well past a tight window before deck-present mounts.
  await expect(async () => {
    await settle(page)
    const present = page.getByTestId('deck-present')
    await expect(present).toBeVisible({ timeout: 8_000 })
    await present.click()
    await expect(sheet).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 75_000 })

  if (opts.askNames) await setSwitch(sheet.getByRole('switch', { name: 'Ask voters for their name' }), true)
  if (opts.holdQuestions) {
    // One switch per Q&A poll; turn them all on (single-Q&A decks have exactly one).
    const holds = sheet.getByRole('switch', { name: /^Hold questions for review:/ })
    const count = await holds.count()
    for (let i = 0; i < count; i++) await setSwitch(holds.nth(i), true)
  }

  await page.getByTestId('setup-go-live').click()
  await page.waitForURL(/\/present\//, { timeout: 20_000 })
  return codeFromPresentUrl(page)
}

/** Drive a role=switch toggle to the desired on/off state (idempotent). */
async function setSwitch(toggle: ReturnType<Page['getByRole']>, on: boolean): Promise<void> {
  await expect(toggle).toBeVisible({ timeout: 5_000 })
  if ((await toggle.getAttribute('aria-checked')) !== String(on)) await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', String(on), { timeout: 3_000 })
}

/**
 * Present a deck with "Ask voters for their name" on, through the real
 * Start-session sheet toggle (PROTOTYPE-MAP-v3 4). Returns the join code.
 */
export async function presentDeckAskingNames(page: Page, deckId: string): Promise<string> {
  return presentDeck(page, deckId, { askNames: true })
}

/**
 * End a live session from the presenter (presenter-end -> /session/<id>) so the
 * test leaves none behind (a lingering live session locks the deck's edits).
 * Best-effort; the caller swallows failures.
 */
export async function cleanupSession(page: Page, code: string): Promise<void> {
  await page.goto(`/present/${code}`)
  const end = page.getByTestId('presenter-end')
  if (!(await end.isVisible({ timeout: 5_000 }).catch(() => false))) return
  await end.click()
  await page.waitForURL(/\/session\//, { timeout: 15_000 }).catch(() => {})
}
