import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { timerRemaining, sessionActive } from './poll-data'
import { config } from '../config'
import type { Poll, Session, PollSettings } from '../types'

/*
 * Unit coverage for timerRemaining (F1). Pure helper, so we pin Date.now via
 * fake timers and assert exact seconds rather than a flaky live-timing e2e:
 *   timerRemaining = ceil((pollStartedAt + timerSeconds*1000 - now) / 1000),
 *   clamped at 0, and null when there is no session or no positive timer.
 */

const NOW = 1_700_000_000_000

function makeSession(over: Partial<Session> = {}): Session {
  return {
    code: 'TEST01',
    pollId: 'p1',
    deckId: '',
    name: '',
    state: 'live',
    currentPollId: 'p1',
    resultsRevealed: 0,
    locked: 0,
    hostId: 'host',
    startedAt: NOW,
    closedAt: 0,
    lastSeenAt: NOW,
    askNames: 0,
    pollStartedAt: NOW,
    ...over,
  }
}

function makePoll(settings: Partial<PollSettings> = {}): Poll {
  const base: PollSettings = {
    resultsVisible: true,
    dedup: true,
    anonymous: true,
  }
  return {
    title: 'Q',
    type: 'choice',
    options: [],
    settings: { ...base, ...settings },
    deckId: '',
    order: 0,
    ownerId: 'host',
  }
}

describe('timerRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the full duration the instant the poll starts', () => {
    const session = makeSession({ pollStartedAt: NOW })
    const poll = makePoll({ timerSeconds: 60 })
    expect(timerRemaining(session, poll)).toBe(60)
  })

  it('counts down as time elapses', () => {
    const session = makeSession({ pollStartedAt: NOW - 20_000 }) // started 20s ago
    const poll = makePoll({ timerSeconds: 60 })
    expect(timerRemaining(session, poll)).toBe(40)
  })

  it('rounds a partial second up (ceil), never down', () => {
    const session = makeSession({ pollStartedAt: NOW - 19_500 }) // 40.5s left -> 41
    const poll = makePoll({ timerSeconds: 60 })
    expect(timerRemaining(session, poll)).toBe(41)
  })

  it('clamps to 0 once the timer has elapsed (never negative)', () => {
    const session = makeSession({ pollStartedAt: NOW - 90_000 }) // -30s -> 0
    const poll = makePoll({ timerSeconds: 60 })
    expect(timerRemaining(session, poll)).toBe(0)
  })

  it('returns null when no timer is set', () => {
    const session = makeSession()
    expect(timerRemaining(session, makePoll())).toBeNull()
  })

  it('treats a 0 (or negative) timerSeconds as off (null)', () => {
    const session = makeSession()
    expect(timerRemaining(session, makePoll({ timerSeconds: 0 }))).toBeNull()
    expect(timerRemaining(session, makePoll({ timerSeconds: -5 }))).toBeNull()
  })

  it('returns null when the session is missing', () => {
    expect(timerRemaining(null, makePoll({ timerSeconds: 60 }))).toBeNull()
  })

  it('returns null when the poll is missing', () => {
    expect(timerRemaining(makeSession(), null)).toBeNull()
  })
})

describe('sessionActive', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is true for a fresh live session', () => {
    expect(sessionActive(makeSession({ state: 'live', lastSeenAt: NOW }))).toBe(true)
  })

  it('is false when the last heartbeat is older than the active timeout', () => {
    const stale = makeSession({ state: 'live', lastSeenAt: NOW - config.session.activeTimeoutMs - 1 })
    expect(sessionActive(stale)).toBe(false)
  })

  it('is false for a closed session', () => {
    expect(sessionActive(makeSession({ state: 'closed', lastSeenAt: NOW }))).toBe(false)
  })

  it('is false for a null session', () => {
    expect(sessionActive(null)).toBe(false)
  })
})
