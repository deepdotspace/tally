/**
 * Shared data layer for the live-poll surfaces. The voter, presenter, and
 * dashboard waves all read through these hooks so session resolution, the live
 * response stream, and the anonymous vote path stay consistent. Pure SDK hooks
 * over the app-scope RecordRoom (responses filtered by sessionId + pollId).
 */

import { useQuery, useMutations } from 'deepspace'
import type { RecordData } from 'deepspace'
import { useDeviceId } from './useDeviceId'
import { config } from '../config'
import type { Poll, Session, Response, Upvote } from '../types'
import type { ResultOption } from '../components/results/types'

/**
 * Sentinel for a "disabled" query. useQuery has no disabled flag and treats an
 * undefined `where` as match-all, so to subscribe to nothing (when an id is not
 * known yet) we filter on a recordId that cannot exist.
 */
export const NO_MATCH = '__tally_none__'

/** Whether voters may see live results: `never` mode always hides; else honor the host reveal flag. */
export function resultsVisibleToVoters(session: Session | null, poll: Poll | null): boolean {
  if (!session || !poll) return false
  return poll.settings.revealMode === 'never' ? false : session.resultsRevealed === 1
}

/** Whether voting is locked on the current poll. */
export function votingLocked(session: Session | null): boolean {
  return session?.locked === 1
}

/**
 * Whether a session is genuinely live: state 'live' AND the host heartbeat is
 * recent. A stale (abandoned) session reads as not-active everywhere.
 */
export function sessionActive(s: Session | null): boolean {
  return !!s && s.state === 'live' && Date.now() - (s.lastSeenAt || 0) < config.session.activeTimeoutMs
}

/** Whether Q&A questions need host approval before showing: per-poll setting OR the session-wide flag. */
export function isModerated(session: Session | null, poll: Poll | null): boolean {
  return session?.moderateQa === 1 || poll?.settings.moderated === true
}

/** Seconds left on the poll's countdown, or null when no timer is set. */
export function timerRemaining(session: Session | null, poll: Poll | null): number | null {
  const seconds = poll?.settings.timerSeconds
  if (!session || typeof seconds !== 'number' || seconds <= 0) return null
  return Math.max(0, Math.ceil((session.pollStartedAt + seconds * 1000 - Date.now()) / 1000))
}

/** Resolve a live session by its join code (mirrors kahoot useQuery by pin). */
export function useSessionByCode(code: string | undefined) {
  const q = useQuery<Session>('sessions', { where: code ? { code } : { recordId: NO_MATCH } })
  const rec = q.records[0]
  return { sessionId: rec?.recordId ?? null, session: rec?.data ?? null, status: q.status }
}

/** Resolve a single poll by record id. */
export function usePoll(pollId: string | undefined) {
  const q = useQuery<Poll>('polls', { where: pollId ? { recordId: pollId } : { recordId: NO_MATCH } })
  return { poll: q.records[0]?.data ?? null, status: q.status }
}

/** Live response stream for one poll in a session. Subscribes via the WS room. */
export function useResponses(sessionId: string | undefined, pollId: string | undefined) {
  const q = useQuery<Response>('responses', {
    where: sessionId && pollId ? { sessionId, pollId } : { recordId: NO_MATCH },
  })
  return { responses: q.records.map((r) => r.data), status: q.status }
}

/** Choice/multi aggregation: one row per poll option with its live tally. */
export function aggregateChoice(
  responses: Response[],
  poll: Poll,
): { options: ResultOption[]; total: number } {
  const counts = new Map<string, number>()
  for (const r of responses) {
    if (r.optionId) counts.set(r.optionId, (counts.get(r.optionId) ?? 0) + 1)
  }
  const options = poll.options.map((o) => ({ id: o.id, label: o.label, count: counts.get(o.id) ?? 0 }))
  // Multi-select: a voter casts several rows, so shares are % of distinct voters (may sum past 100%).
  const total = poll.type === 'multi' ? new Set(responses.map((r) => r.deviceId)).size : responses.length
  return { options, total }
}

/**
 * Anonymous vote with client-side dedup (SPEC §8). One vote per device per
 * poll; if this device already voted, `cast` is a no-op and `hasVoted` is true
 * (vote-change is S3). The WS create is permitted by responses viewer.create.
 */
export function useCastVote(sessionId: string | undefined, pollId: string | undefined) {
  const deviceId = useDeviceId()
  const { create } = useMutations<Response>('responses')
  const mine = useQuery<Response>('responses', {
    where: sessionId && pollId && deviceId ? { sessionId, pollId, deviceId } : { recordId: NO_MATCH },
  })
  const myResponses = mine.records.map((r) => r.data)
  const myResponse = myResponses[0] ?? null
  const hasVoted = myResponses.length > 0

  async function cast(answer: { optionId?: string; value?: number; text?: string }, displayName?: string) {
    if (!sessionId || !pollId || hasVoted) return
    await create({
      sessionId,
      pollId,
      deviceId,
      optionId: answer.optionId ?? '',
      value: answer.value ?? 0,
      text: answer.text ?? '',
      upvotes: 0,
      approved: 1,
      createdAt: Date.now(),
      displayName: displayName ?? '',
    })
  }

  /** Multi-select: write one row per chosen optionId (single-shot, gated by hasVoted). */
  async function castMulti(optionIds: string[], displayName?: string) {
    if (!sessionId || !pollId || hasVoted || optionIds.length === 0) return
    for (const optionId of optionIds) {
      await create({
        sessionId,
        pollId,
        deviceId,
        optionId,
        value: 0,
        text: '',
        upvotes: 0,
        approved: 1,
        createdAt: Date.now(),
        displayName: displayName ?? '',
      })
    }
  }

  return { deviceId, myResponse, myResponses, hasVoted, cast, castMulti }
}

/**
 * Word cloud aggregation: collapse responses to (token, count), token =
 * trimmed + lowercased `text`. Empties/whitespace dropped. Profanity filtering
 * happens at submit/moderation, not here. Descending by count.
 */
export function aggregateWordCloud(responses: Response[]): { text: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of responses) {
    const token = r.text.trim().toLowerCase()
    if (!token) continue
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Scale aggregation: a per-value histogram across the inclusive [min,max]
 * range (every bucket present, even at 0) plus the mean of all votes. Values
 * outside the range are ignored. `average` is 0 when there are no votes.
 */
export function aggregateScale(
  responses: Response[],
  min: number,
  max: number,
): { buckets: { value: number; count: number }[]; average: number } {
  const counts = new Map<number, number>()
  let sum = 0
  let total = 0
  for (const r of responses) {
    const v = r.value
    if (v < min || v > max) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
    sum += v
    total += 1
  }
  const buckets: { value: number; count: number }[] = []
  for (let v = min; v <= max; v++) buckets.push({ value: v, count: counts.get(v) ?? 0 })
  return { buckets, average: total ? sum / total : 0 }
}

/**
 * Net Promoter Score over 0-10 votes: 0-6 detractor, 7-8 passive, 9-10
 * promoter; score = round(%promoters - %detractors), 0 when there are no
 * votes. Values outside 0-10 are ignored.
 */
export function npsScore(responses: Response[]): {
  score: number
  promoters: number
  passives: number
  detractors: number
  total: number
} {
  let promoters = 0
  let passives = 0
  let detractors = 0
  for (const r of responses) {
    const v = r.value
    if (v < 0 || v > 10) continue
    if (v <= 6) detractors += 1
    else if (v <= 8) passives += 1
    else promoters += 1
  }
  const total = promoters + passives + detractors
  const score = total ? Math.round(((promoters - detractors) / total) * 100) : 0
  return { score, promoters, passives, detractors, total }
}

/**
 * Q&A list: approved text responses, each with its live upvote count (upvotes
 * whose `responseId` matches the question's recordId). Takes RecordData
 * envelopes so each item carries its recordId. Sorted by upvotes desc, then
 * createdAt asc (oldest first on a tie).
 */
export function qaItems(
  responses: RecordData<Response>[],
  upvotes: Upvote[],
): { response: Response; recordId: string; upvotes: number }[] {
  const tally = new Map<string, number>()
  for (const u of upvotes) tally.set(u.responseId, (tally.get(u.responseId) ?? 0) + 1)
  return responses
    .filter((r) => r.data.approved === 1 && r.data.text.trim() !== '')
    .map((r) => ({ response: r.data, recordId: r.recordId, upvotes: tally.get(r.recordId) ?? 0 }))
    .sort((a, b) => b.upvotes - a.upvotes || a.response.createdAt - b.response.createdAt)
}

/**
 * Ranking storage: a ranking response stores its ordered optionId array as JSON
 * in `Response.text` (no schema change). These two helpers are the only encode/
 * decode seam; the voter writes via rankingToText, every reader uses textToRanking.
 */
export function rankingToText(ids: string[]): string {
  return JSON.stringify(ids)
}

/** Decode an ordered optionId array from `Response.text`. Malformed -> []. */
export function textToRanking(text: string): string[] {
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && id !== '')
  } catch {
    return []
  }
}

/**
 * Ranking aggregation: mean rank per option across all responses (rank 1 = top
 * choice). A response's ordered ids give each option a 1-based rank; options it
 * omits are skipped for that response. Sorted ascending by meanRank (best first);
 * options with no ranks sink to the end. Malformed/empty responses are ignored.
 */
export function aggregateRanking(
  responses: Response[],
  poll: Poll,
): { id: string; label: string; meanRank: number; count: number }[] {
  const sums = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const r of responses) {
    const ids = textToRanking(r.text)
    if (ids.length === 0) continue
    ids.forEach((id, i) => {
      sums.set(id, (sums.get(id) ?? 0) + (i + 1))
      counts.set(id, (counts.get(id) ?? 0) + 1)
    })
  }
  return poll.options
    .map((o) => {
      const count = counts.get(o.id) ?? 0
      const meanRank = count ? (sums.get(o.id) ?? 0) / count : Infinity
      return { id: o.id, label: o.label, meanRank, count }
    })
    .sort((a, b) => a.meanRank - b.meanRank)
}

/**
 * Numeric aggregation over `Response.value`: a bucketed histogram across the
 * observed [min,max] range plus the running average and the closest guess to an
 * optional target. Default ~10 bins (capped at distinct-value count). A single
 * distinct value yields one bucket; no responses yields no buckets, average 0.
 */
export function aggregateNumeric(
  responses: Response[],
  opts: { bins?: number; target?: number } = {},
): {
  buckets: { lo: number; hi: number; count: number }[]
  average: number
  closest?: { value: number }
} {
  const values = responses.map((r) => r.value).filter((v) => Number.isFinite(v))
  if (values.length === 0) return { buckets: [], average: 0 }

  const sum = values.reduce((a, v) => a + v, 0)
  const average = sum / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Closest guess to the target (nearest absolute distance; first wins on a tie).
  let closest: { value: number } | undefined
  if (typeof opts.target === 'number' && Number.isFinite(opts.target)) {
    let best = Infinity
    for (const v of values) {
      const d = Math.abs(v - opts.target)
      if (d < best) {
        best = d
        closest = { value: v }
      }
    }
  }

  // Single value (or flat range): one bucket covering it.
  if (min === max) return { buckets: [{ lo: min, hi: max, count: values.length }], average, closest }

  const bins = Math.max(1, Math.min(opts.bins ?? 10, values.length))
  const width = (max - min) / bins
  const buckets = Array.from({ length: bins }, (_, i) => ({
    lo: min + i * width,
    hi: min + (i + 1) * width,
    count: 0,
  }))
  for (const v of values) {
    // Clamp the index so the max value lands in the last bucket (right edge inclusive).
    const idx = Math.min(bins - 1, Math.floor((v - min) / width))
    buckets[idx].count += 1
  }
  return { buckets, average, closest }
}

/**
 * Quiz tally (light): per-option counts with the correct flag, plus a per-device
 * leaderboard of correct-answer counts (desc). Correct = `optionId` matches the
 * poll option flagged `correct === true`. No speed scoring (Tally is a poll, not
 * a game). Responses with no `optionId` are ignored for the leaderboard.
 */
export function tallyQuiz(
  responses: Response[],
  poll: Poll,
): {
  perOption: { id: string; label: string; count: number; correct: boolean }[]
  leaderboard: { deviceId: string; correct: number; displayName: string }[]
} {
  const correctIds = new Set(poll.options.filter((o) => o.correct === true).map((o) => o.id))
  const counts = new Map<string, number>()
  const byDevice = new Map<string, number>()
  const names = new Map<string, string>()
  for (const r of responses) {
    if (!r.optionId) continue
    if (r.displayName) names.set(r.deviceId, r.displayName)
    counts.set(r.optionId, (counts.get(r.optionId) ?? 0) + 1)
    if (correctIds.has(r.optionId)) byDevice.set(r.deviceId, (byDevice.get(r.deviceId) ?? 0) + 1)
  }
  const perOption = poll.options.map((o) => ({
    id: o.id,
    label: o.label,
    count: counts.get(o.id) ?? 0,
    correct: correctIds.has(o.id),
  }))
  const leaderboard = [...byDevice.entries()]
    .map(([deviceId, correct]) => ({ deviceId, correct, displayName: names.get(deviceId) ?? '' }))
    .sort((a, b) => b.correct - a.correct)
  return { perOption, leaderboard }
}

/**
 * Live upvote rows for one poll (feeds qaItems). NO_MATCH disables the query
 * until the ids are known, mirroring useResponses.
 */
export function useUpvotes(sessionId: string | undefined, pollId: string | undefined) {
  const q = useQuery<Upvote>('upvotes', {
    where: sessionId && pollId ? { sessionId, pollId } : { recordId: NO_MATCH },
  })
  return { upvotes: q.records.map((r) => r.data), status: q.status }
}

/**
 * Anonymous Q&A upvote with client-side dedup (mirrors useCastVote). One
 * upvote per device per question (`responseId`); a repeat is a no-op. The WS
 * create is permitted by upvotes viewer.create; counting is done in qaItems.
 */
export function useUpvote(sessionId: string | undefined, pollId: string | undefined) {
  const deviceId = useDeviceId()
  const { create } = useMutations<Upvote>('upvotes')
  const mine = useQuery<Upvote>('upvotes', {
    where: sessionId && pollId && deviceId ? { sessionId, pollId, deviceId } : { recordId: NO_MATCH },
  })
  const myIds = new Set(mine.records.map((r) => r.data.responseId))

  function hasUpvoted(responseId: string): boolean {
    return myIds.has(responseId)
  }

  async function upvote(responseId: string) {
    if (!sessionId || !pollId || !responseId || hasUpvoted(responseId)) return
    await create({ sessionId, pollId, responseId, deviceId, createdAt: Date.now() })
  }

  return { deviceId, hasUpvoted, upvote }
}
