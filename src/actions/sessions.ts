/**
 * Session lifecycle + host controls. All state mutation runs server-side so a
 * client cannot advance, reveal, lock, or reset a session it does not own.
 * Host-ownership re-check mirrors kahoot loadHostGame (kahoot/src/actions/games.ts:13-22).
 */

import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Session, Deck, Response, Poll, PollSettings } from '../types'
import { config } from '../config'
import { patchRecord, queryRecords, unwrap } from './_helpers'

type Tools = Parameters<ActionHandler<Env>>[0]['tools']

/** Load a session and confirm the caller is its host, else null. */
async function loadHostSession(
  tools: Tools,
  sessionId: string,
  userId: string,
): Promise<Session | null> {
  const session = unwrap<Session>(await tools.get('sessions', sessionId))
  if (!session || session.hostId !== userId) return null
  return session
}

/** Settings of a session's current poll (currentPollId, else pollId), or defaults. */
async function currentPollSettings(tools: Tools, session: Session): Promise<PollSettings> {
  const pollId = session.currentPollId || session.pollId
  if (!pollId) return config.defaults
  const poll = unwrap<Poll>(await tools.get('polls', pollId))
  return poll?.settings ?? config.defaults
}

/**
 * Initial `resultsRevealed` for a freshly opened or advanced poll: shown only
 * when results are visible and the reveal mode is not deferred (onClose/never).
 * Missing revealMode is treated as 'manual'.
 */
function revealedOnOpen(settings: PollSettings): number {
  const mode = settings.revealMode
  return mode !== 'onClose' && mode !== 'never' && settings.resultsVisible ? 1 : 0
}

/** Mint a join code from the unambiguous alphabet (no 0/O/1/I). */
function generateCode(): string {
  const { joinCodeLength, joinCodeAlphabet } = config.authoring
  let code = ''
  for (let i = 0; i < joinCodeLength; i++) {
    code += joinCodeAlphabet[Math.floor(Math.random() * joinCodeAlphabet.length)]
  }
  return code
}

/** Open a session for a poll or deck. Mints a unique join code, sets state. */
export const createSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const pollId = String(params.pollId ?? '')
  const deckId = String(params.deckId ?? '')
  if (!pollId && !deckId) return { success: false, error: 'pollId or deckId required' }
  const askNames = params.askNames === 1 || params.askNames === true ? 1 : 0
  const moderateQa = params.moderateQa === 1 || params.moderateQa === true ? 1 : 0

  // For a deck, start on its first poll so voters see a question immediately.
  // `name` is snapshotted now for the History label (deck title, else poll question).
  let currentPollId = pollId
  let name = ''
  if (deckId) {
    const deck = unwrap<Deck>(await tools.get('decks', deckId))
    if (!deck) return { success: false, error: 'Deck not found' }
    if (deck.ownerId !== userId) return { success: false, error: 'Forbidden' }
    currentPollId = deck.pollIds[0] ?? ''
    name = deck.title
  }

  // Initial reveal follows the opening poll's mode (manual + results-visible = shown now).
  const openingPoll = unwrap<Poll>(await tools.get('polls', currentPollId))
  const resultsRevealed = revealedOnOpen(openingPoll?.settings ?? config.defaults)
  if (!deckId) name = openingPoll?.title ?? ''

  // Allocate a code not held by another open (non-closed) session.
  let code = ''
  for (let attempt = 0; attempt < config.authoring.joinCodeMaxAttempts; attempt++) {
    const candidate = generateCode()
    const existing = await queryRecords<Session>(tools, 'sessions', { where: { code: candidate } })
    if (!existing.some((s) => s.data.state !== 'closed')) {
      code = candidate
      break
    }
  }
  if (!code) return { success: false, error: 'Could not allocate a join code, try again' }

  return tools.create('sessions', {
    code,
    pollId,
    deckId,
    name,
    state: 'live',
    currentPollId,
    resultsRevealed,
    locked: 0,
    hostId: userId,
    startedAt: Date.now(),
    closedAt: 0,
    lastSeenAt: Date.now(),
    askNames,
    moderateQa,
    pollStartedAt: Date.now(),
  })
}

/**
 * Move a deck session to another poll. `direction:'next'` (default) advances and
 * closes the session past the last poll; `direction:'prev'` steps back (clamped
 * at the first poll); `targetIndex` jumps to an exact poll. Each move resets the
 * reveal/lock flags so the new question starts clean.
 */
export const advanceDeck: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const session = await loadHostSession(tools, sessionId, userId)
  if (!session) return { success: false, error: 'Forbidden' }
  if (!session.deckId) return { success: false, error: 'Session is not a deck' }

  const deck = unwrap<Deck>(await tools.get('decks', session.deckId))
  if (!deck) return { success: false, error: 'Deck not found' }
  if (deck.pollIds.length === 0) return { success: false, error: 'Deck has no polls' }

  const cur = deck.pollIds.indexOf(session.currentPollId)
  const direction = params.direction === 'prev' ? 'prev' : 'next'
  // A valid targetIndex wins; otherwise step from the current poll.
  const hasTarget = typeof params.targetIndex === 'number' && Number.isInteger(params.targetIndex)
  const target = hasTarget ? (params.targetIndex as number) : direction === 'prev' ? cur - 1 : cur + 1

  // Past the last poll on a forward move closes the session.
  if (!hasTarget && direction === 'next' && target >= deck.pollIds.length) {
    return patchRecord<Session>(tools, 'sessions', sessionId, { state: 'closed', closedAt: Date.now() })
  }
  const idx = Math.max(0, Math.min(target, deck.pollIds.length - 1))
  const nextPoll = unwrap<Poll>(await tools.get('polls', deck.pollIds[idx]))
  return patchRecord<Session>(tools, 'sessions', sessionId, {
    currentPollId: deck.pollIds[idx],
    resultsRevealed: revealedOnOpen(nextPoll?.settings ?? config.defaults),
    locked: 0,
    pollStartedAt: Date.now(),
    lastSeenAt: Date.now(),
  })
}

/**
 * Reorder a poll within a deck. `fromIndex` -> `toIndex` (both 0-based) moves one
 * poll and shifts the rest. Host-only. Up/down arrows pass adjacent indices.
 */
export const reorderDeck: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const deckId = String(params.deckId ?? '')
  const from = Number(params.fromIndex)
  const to = Number(params.toIndex)
  if (!deckId || !Number.isInteger(from) || !Number.isInteger(to)) {
    return { success: false, error: 'deckId, fromIndex, and toIndex required' }
  }
  const deck = unwrap<Deck>(await tools.get('decks', deckId))
  if (!deck) return { success: false, error: 'Deck not found' }
  if (deck.ownerId !== userId) return { success: false, error: 'Forbidden' }

  const ids = [...deck.pollIds]
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) {
    return { success: false, error: 'Index out of range' }
  }
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved)
  return patchRecord<Deck>(tools, 'decks', deckId, { pollIds: ids })
}

/**
 * Clone a deck and all its polls into a brand-new draft deck (History "Run
 * again"). Each poll is copied as a fresh record (new ids, option ids remapped),
 * so editing the clone never touches the original. Returns the new deckId.
 */
export const cloneDeck: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const deckId = String(params.deckId ?? '')
  if (!deckId) return { success: false, error: 'deckId required' }
  const deck = unwrap<Deck>(await tools.get('decks', deckId))
  if (!deck) return { success: false, error: 'Deck not found' }
  if (deck.ownerId !== userId) return { success: false, error: 'Forbidden' }

  // Clone polls first (deckId set after the new deck exists), then the deck.
  const newPollIds: string[] = []
  for (const pollId of deck.pollIds) {
    const poll = unwrap<Poll>(await tools.get('polls', pollId))
    if (!poll) continue
    const created = await tools.create<Poll>('polls', clonePollData(poll, userId))
    if (!created.success) return created
    newPollIds.push(created.data.recordId)
  }

  const created = await tools.create<Deck>('decks', {
    title: `${deck.title} (copy)`,
    pollIds: newPollIds,
    ownerId: userId,
  })
  if (!created.success) return created
  // Point the cloned polls at their new deck now that we have its id.
  for (const id of newPollIds) {
    const patch = await patchRecord<Poll>(tools, 'polls', id, { deckId: created.data.recordId })
    if (!patch.success) return patch
  }
  return created
}

/** A fresh Poll payload copied from `src`, with option ids remapped to new ids. */
function clonePollData(src: Poll, ownerId: string): Poll {
  const stamp = Date.now().toString(36)
  return {
    title: src.title,
    type: src.type,
    options: src.options.map((o, i) => ({ ...o, id: `opt-${stamp}-${i}` })),
    settings: { ...src.settings },
    deckId: '',
    order: Date.now(),
    ownerId,
  }
}

/** Show or hide live results to voters. */
export const revealResults: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  if (!(await loadHostSession(tools, sessionId, userId))) return { success: false, error: 'Forbidden' }
  const revealed = params.revealed === false ? 0 : 1
  return patchRecord<Session>(tools, 'sessions', sessionId, { resultsRevealed: revealed })
}

/** Lock or unlock voting on the current poll. Locking an onClose poll reveals its results. */
export const lockSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const session = await loadHostSession(tools, sessionId, userId)
  if (!session) return { success: false, error: 'Forbidden' }
  const locked = params.locked === false ? 0 : 1
  const patch: Partial<Session> = { locked }
  if (locked === 1) {
    const settings = await currentPollSettings(tools, session)
    if (settings.revealMode === 'onClose') patch.resultsRevealed = 1
  }
  return patchRecord<Session>(tools, 'sessions', sessionId, patch)
}

/** Clear every response for the current poll so the host can re-run it. */
export const resetPoll: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const session = await loadHostSession(tools, sessionId, userId)
  if (!session) return { success: false, error: 'Forbidden' }

  const rows = await queryRecords(tools, 'responses', {
    where: { sessionId, pollId: session.currentPollId },
  })
  for (const row of rows) {
    const removed = await tools.remove('responses', row.recordId)
    if (!removed.success) return removed
  }
  return patchRecord<Session>(tools, 'sessions', sessionId, { locked: 0, pollStartedAt: Date.now(), lastSeenAt: Date.now() })
}

/** Refresh the host heartbeat so the presenter's open tab keeps the session active (recency model). */
export const heartbeatSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  if (!(await loadHostSession(tools, sessionId, userId))) return { success: false, error: 'Forbidden' }
  return patchRecord<Session>(tools, 'sessions', sessionId, { lastSeenAt: Date.now() })
}

/** Close a session: stop accepting votes, stamp closedAt. An onClose poll reveals on close. */
export const closeSession: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const session = await loadHostSession(tools, sessionId, userId)
  if (!session) return { success: false, error: 'Forbidden' }
  const settings = await currentPollSettings(tools, session)
  const patch: Partial<Session> = { state: 'closed', closedAt: Date.now() }
  if (settings.revealMode === 'onClose') patch.resultsRevealed = 1
  return patchRecord<Session>(tools, 'sessions', sessionId, patch)
}

/**
 * Approve or hide one response (Q&A moderation lever). Host-only: the caller must
 * host the session before the response's `approved` flips. qaItems shows only
 * `approved === 1`, so this is the approve-before-show toggle. Anon voters cannot
 * update responses; this is the sole path to change moderation state.
 */
export const setResponseApproved: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const responseId = String(params.responseId ?? '')
  if (!sessionId || !responseId) return { success: false, error: 'sessionId and responseId required' }
  if (!(await loadHostSession(tools, sessionId, userId))) return { success: false, error: 'Forbidden' }
  // 1 shows the question, 0 holds it pending, 2 dismisses it (hidden, never shown).
  const approved = params.approved === 2 ? 2 : params.approved === 1 || params.approved === true ? 1 : 0
  return patchRecord<Response>(tools, 'responses', responseId, { approved })
}

/** Toggle session-wide Q&A moderation live (the presenter Moderate panel switch). */
export const setSessionModeration: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  if (!sessionId) return { success: false, error: 'sessionId required' }
  if (!(await loadHostSession(tools, sessionId, userId))) return { success: false, error: 'Forbidden' }
  const moderateQa = params.moderateQa === 1 || params.moderateQa === true ? 1 : 0
  return patchRecord<Session>(tools, 'sessions', sessionId, { moderateQa })
}
