/*
 * Creator data layer. Lists the signed-in user's polls and the set of live
 * sessions they host, so the dashboard and sidebar share one source of truth.
 * Live updates arrive for free via the useQuery WS subscription.
 */

import { useMemo } from 'react'
import { useQuery, useUser } from 'deepspace'
import type { Poll, Session, Deck } from '../../types'
import { NO_MATCH } from '../../lib/poll-data'

export interface PollRow {
  id: string
  poll: Poll
  /** The live session hosted for this poll, if one is open. */
  session: { id: string; data: Session } | null
}

export interface DeckRow {
  id: string
  deck: Deck
  /** The live session hosted for this deck, if one is open. */
  session: { id: string; data: Session } | null
}

/** All polls owned by the signed-in user, each paired with its live session. */
export function useCreatorPolls() {
  const { user } = useUser()
  const ownerId = user?.id ?? ''

  const pollsQ = useQuery<Poll>('polls', { where: ownerId ? { ownerId } : { recordId: NO_MATCH } })
  // Live sessions this user hosts; closed sessions are excluded by state.
  const liveQ = useQuery<Session>('sessions', {
    where: ownerId ? { hostId: ownerId, state: 'live' } : { recordId: NO_MATCH },
  })

  const rows = useMemo<PollRow[]>(() => {
    const byPoll = new Map<string, { id: string; data: Session }>()
    for (const r of liveQ.records) {
      const s = r.data
      const key = s.pollId || s.currentPollId
      if (key) byPoll.set(key, { id: r.recordId, data: s })
    }
    return pollsQ.records
      .map((r) => ({ id: r.recordId, poll: r.data, session: byPoll.get(r.recordId) ?? null }))
      .sort((a, b) => Number(b.poll.order ?? 0) - Number(a.poll.order ?? 0))
  }, [pollsQ.records, liveQ.records])

  return {
    ownerId,
    rows,
    status: pollsQ.status,
    user,
  }
}

/** Resolve the live session a single poll currently hosts, if any. */
export function usePollSession(pollId: string | undefined, ownerId: string) {
  const liveQ = useQuery<Session>('sessions', {
    where: pollId && ownerId ? { hostId: ownerId, pollId, state: 'live' } : { recordId: NO_MATCH },
  })
  const rec = liveQ.records[0]
  return { sessionId: rec?.recordId ?? null, session: rec?.data ?? null, status: liveQ.status }
}

/** All decks owned by the signed-in user, each paired with its live session. */
export function useCreatorDecks() {
  const { user } = useUser()
  const ownerId = user?.id ?? ''

  const decksQ = useQuery<Deck>('decks', { where: ownerId ? { ownerId } : { recordId: NO_MATCH } })
  const liveQ = useQuery<Session>('sessions', {
    where: ownerId ? { hostId: ownerId, state: 'live' } : { recordId: NO_MATCH },
  })

  const rows = useMemo<DeckRow[]>(() => {
    const byDeck = new Map<string, { id: string; data: Session }>()
    for (const r of liveQ.records) {
      if (r.data.deckId) byDeck.set(r.data.deckId, { id: r.recordId, data: r.data })
    }
    return decksQ.records.map((r) => ({ id: r.recordId, deck: r.data, session: byDeck.get(r.recordId) ?? null }))
  }, [decksQ.records, liveQ.records])

  return { ownerId, rows, status: decksQ.status, user }
}

/** Resolve the live session a single deck currently hosts, if any. */
export function useDeckSession(deckId: string | undefined, ownerId: string) {
  const liveQ = useQuery<Session>('sessions', {
    where: deckId && ownerId ? { hostId: ownerId, deckId, state: 'live' } : { recordId: NO_MATCH },
  })
  const rec = liveQ.records[0]
  return { sessionId: rec?.recordId ?? null, session: rec?.data ?? null, status: liveQ.status }
}
