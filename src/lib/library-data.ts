/**
 * Data layer for the v2 IA: Library, Deck detail, History, and Session detail.
 * Library/Deck enrichment composes useCreatorData; History reads CLOSED sessions
 * and their SAVED responses (no `live` gate, so past results stay readable). All
 * counts (participants, polls, responses) are derived here, never stored.
 */

import { useMemo } from 'react'
import { useQuery, useUser } from 'deepspace'
import type { RecordData } from 'deepspace'
import type { Poll, Session, Response, Upvote, Deck } from '../types'
import { NO_MATCH } from './poll-data'
import { useCreatorDecks, useCreatorPolls } from '../components/creator/useCreatorData'
import { typeMeta } from '../components/creator/typeMeta'

/** Per-type response noun: "N responses" / "N questions" / "N votes" (singular-aware). */
export function responseLabel(poll: Poll, count: number): string {
  const noun = poll.type === 'qa' ? 'question' : poll.type === 'wordcloud' ? 'response' : 'vote'
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** Format an epoch ms into a short "Jun 16, 2026" style label for History rows. */
export function formatSessionDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface ClosedSessionRow {
  sessionId: string
  /** Snapshot name (deck title or single-poll question) taken at open. */
  name: string
  closedAt: number
  /** "Jun 16, 2026" convenience string. */
  dateLabel: string
  deckId: string
  pollCount: number
  /** Distinct deviceIds across this session's responses. */
  participantCount: number
}

/**
 * The host's past (closed) sessions, newest first by closedAt. Participant and
 * poll counts are derived: participants = distinct deviceIds across the session's
 * responses; pollCount = the deck's poll count (or 1 for a single-poll session).
 */
export function useClosedSessions(): { rows: ClosedSessionRow[]; status: string } {
  const { user } = useUser()
  const ownerId = user?.id ?? ''

  const sessionsQ = useQuery<Session>('sessions', {
    where: ownerId ? { hostId: ownerId, state: 'closed' } : { recordId: NO_MATCH },
  })
  // Responses have no host column, so we read the stream and keep only this
  // host's closed-session rows in memory (responses are public-read already).
  const responsesQ = useQuery<Response>('responses', { where: ownerId ? {} : { recordId: NO_MATCH } })
  const decksQ = useQuery<Deck>('decks', { where: ownerId ? { ownerId } : { recordId: NO_MATCH } })

  const rows = useMemo<ClosedSessionRow[]>(() => {
    const closed = sessionsQ.records
    const closedIds = new Set(closed.map((r) => r.recordId))
    // distinct deviceIds per session (only for the host's closed sessions).
    const devices = new Map<string, Set<string>>()
    for (const r of responsesQ.records) {
      const sid = r.data.sessionId
      if (!closedIds.has(sid)) continue
      let set = devices.get(sid)
      if (!set) devices.set(sid, (set = new Set()))
      if (r.data.deviceId) set.add(r.data.deviceId)
    }
    const deckById = new Map(decksQ.records.map((d) => [d.recordId, d.data]))
    return closed
      .map((r) => {
        const s = r.data
        const deck = s.deckId ? deckById.get(s.deckId) : undefined
        const pollCount = deck ? deck.pollIds.length : s.pollId ? 1 : 0
        return {
          sessionId: r.recordId,
          name: s.name || deck?.title || '',
          closedAt: s.closedAt,
          dateLabel: formatSessionDate(s.closedAt),
          deckId: s.deckId,
          pollCount,
          participantCount: devices.get(r.recordId)?.size ?? 0,
        }
      })
      .sort((a, b) => b.closedAt - a.closedAt)
  }, [sessionsQ.records, responsesQ.records, decksQ.records])

  return { rows, status: sessionsQ.status }
}

export interface SessionPollResult {
  pollId: string
  poll: Poll
  /** Saved responses for this poll (raw rows; UI aggregates via the 9 aggregators). */
  responses: Response[]
  /** Raw envelopes (qaItems needs recordIds). */
  qaEnvelopes: RecordData<Response>[]
  upvotes: Upvote[]
}

export interface SessionResults {
  session: Session | null
  name: string
  participantCount: number
  dateLabel: string
  /** Polls in deck order (or the single poll), each with its saved responses. */
  polls: SessionPollResult[]
  status: string
}

/**
 * Saved results for a CLOSED session, ready for the Session-detail screen. Reads
 * the session, its deck/polls, and all saved responses + upvotes WITHOUT gating
 * on state==='live', so closed sessions render their results. Polls come back in
 * deck order (single-poll sessions yield one entry).
 */
export function useSessionResults(sessionId: string | undefined): SessionResults {
  const sessionQ = useQuery<Session>('sessions', {
    where: sessionId ? { recordId: sessionId } : { recordId: NO_MATCH },
  })
  const session = sessionQ.records[0]?.data ?? null

  const deckQ = useQuery<Deck>('decks', {
    where: session?.deckId ? { recordId: session.deckId } : { recordId: NO_MATCH },
  })
  const deck = deckQ.records[0]?.data ?? null

  // The ordered pollIds: a deck's list, else the single poll. Resolve those polls.
  const pollIds = useMemo<string[]>(() => {
    if (deck) return deck.pollIds
    return session?.pollId ? [session.pollId] : []
  }, [deck, session?.pollId])

  // The `where` builder only does equality, so we fetch the host's polls and pick
  // the ones in pollIds in memory (session detail is host-only).
  const pollsQ = useQuery<Poll>('polls', {
    where: session?.hostId ? { ownerId: session.hostId } : { recordId: NO_MATCH },
  })

  // All saved responses + upvotes for the session in one query each (no `live` gate).
  const responsesQ = useQuery<Response>('responses', {
    where: sessionId ? { sessionId } : { recordId: NO_MATCH },
  })
  const upvotesQ = useQuery<Upvote>('upvotes', {
    where: sessionId ? { sessionId } : { recordId: NO_MATCH },
  })

  return useMemo<SessionResults>(() => {
    const pollById = new Map(pollsQ.records.map((r) => [r.recordId, r.data]))
    const respByPoll = new Map<string, RecordData<Response>[]>()
    for (const r of responsesQ.records) {
      const list = respByPoll.get(r.data.pollId) ?? []
      list.push(r)
      respByPoll.set(r.data.pollId, list)
    }
    const upvotesByPoll = new Map<string, Upvote[]>()
    for (const u of upvotesQ.records) {
      const list = upvotesByPoll.get(u.data.pollId) ?? []
      list.push(u.data)
      upvotesByPoll.set(u.data.pollId, list)
    }
    const devices = new Set<string>()
    for (const r of responsesQ.records) if (r.data.deviceId) devices.add(r.data.deviceId)

    const polls: SessionPollResult[] = pollIds
      .map((id) => {
        const poll = pollById.get(id)
        if (!poll) return null
        const envelopes = respByPoll.get(id) ?? []
        return {
          pollId: id,
          poll,
          responses: envelopes.map((e) => e.data),
          qaEnvelopes: envelopes,
          upvotes: upvotesByPoll.get(id) ?? [],
        }
      })
      .filter((p): p is SessionPollResult => p !== null)

    return {
      session,
      name: session?.name || deck?.title || '',
      participantCount: devices.size,
      dateLabel: formatSessionDate(session?.closedAt ?? 0),
      polls,
      status: sessionQ.status,
    }
  }, [session, deck, pollIds, pollsQ.records, responsesQ.records, upvotesQ.records, sessionQ.status])
}

// ---------------------------------------------------------------------------
// Library + Deck detail
// ---------------------------------------------------------------------------

/** Derived deck status: a deck with a currently-live session is 'ready', else 'draft'. */
export type DeckStatus = 'ready' | 'draft'

export interface LibraryDeckCard {
  id: string
  name: string
  pollCount: number
  /** First few polls' type glyphs (deck-card glyph row). */
  glyphs: string[]
  status: DeckStatus
  /** "Last presented Jun 16" or "Not presented yet". */
  lastPresentedLabel: string
  /** The live session this deck currently hosts, if any. */
  liveSession: { id: string; data: Session } | null
}

export interface LibraryPollCard {
  id: string
  question: string
  typeName: string
  glyph: string
  /** "0 responses" style label (zero until presented; structural identity). */
  responseLabel: string
  /** Names of the decks this poll belongs to (membership). */
  deckNames: string[]
}

export interface LibraryData {
  decks: LibraryDeckCard[]
  polls: LibraryPollCard[]
  status: string
  ownerId: string
}

/**
 * Everything the Library + Deck-detail screens need: the host's decks (with
 * derived status + glyphs + last-presented label) and the flat all-polls list
 * (with type name, response label, and deck membership). Composes useCreatorData
 * and the host's closed sessions for the last-presented label. `glyphCount`
 * caps the deck-card glyph row (default 5 per the prototype).
 */
export function useLibrary(glyphCount = 5): LibraryData {
  const { rows: deckRows, status, ownerId } = useCreatorDecks()
  const { rows: pollRows } = useCreatorPolls()
  const { rows: closed } = useClosedSessions()

  return useMemo<LibraryData>(() => {
    const pollById = new Map(pollRows.map((p) => [p.id, p.poll]))
    // Latest closedAt per deck, for the "last presented" label.
    const lastByDeck = new Map<string, number>()
    for (const c of closed) {
      if (!c.deckId) continue
      const prev = lastByDeck.get(c.deckId) ?? 0
      if (c.closedAt > prev) lastByDeck.set(c.deckId, c.closedAt)
    }
    // Deck membership per poll (a poll may sit in several decks).
    const decksByPoll = new Map<string, string[]>()
    for (const r of deckRows) {
      for (const pid of r.deck.pollIds) {
        const list = decksByPoll.get(pid) ?? []
        list.push(r.deck.title || 'Untitled deck')
        decksByPoll.set(pid, list)
      }
    }

    const decks: LibraryDeckCard[] = deckRows.map((r) => {
      const last = lastByDeck.get(r.id) ?? 0
      const glyphs = r.deck.pollIds
        .slice(0, glyphCount)
        .map((pid) => pollById.get(pid))
        .filter((p): p is Poll => !!p)
        .map((p) => typeMeta(p.type).glyph)
      return {
        id: r.id,
        name: r.deck.title || 'Untitled deck',
        pollCount: r.deck.pollIds.length,
        glyphs,
        status: r.session ? 'ready' : 'draft',
        lastPresentedLabel: last ? `Last presented ${formatSessionDate(last)}` : 'Not presented yet',
        liveSession: r.session,
      }
    })

    const polls: LibraryPollCard[] = pollRows.map((r) => ({
      id: r.id,
      question: r.poll.title,
      typeName: typeMeta(r.poll.type).name,
      glyph: typeMeta(r.poll.type).glyph,
      responseLabel: responseLabel(r.poll, 0),
      deckNames: decksByPoll.get(r.id) ?? [],
    }))

    return { decks, polls, status, ownerId }
  }, [deckRows, pollRows, closed, glyphCount, status, ownerId])
}
