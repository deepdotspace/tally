/**
 * Authoritative vote write: dedup + rate-limit run server-side so a client
 * cannot stuff the ballot. Dedup-by-prior-row mirrors kahoot submitAnswer
 * (kahoot/src/actions/games.ts:204-207).
 *
 * NOTE: the HTTP action route requires a verified JWT (worker.ts:170-171), so
 * this is reachable today only by signed-in callers. The anonymous voter path
 * writes via the WS RecordRoom create (responses `viewer.create:true`) with the
 * client-side dedup of SPIKE-2 layer 1. See the day-0 report push-back: to make
 * this server dedup authoritative for anonymous voters, the action route must
 * accept an anon identity (a shared seam the orchestrator owns).
 */

import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Poll, Session, Response } from '../types'
import { config } from '../config'
import { queryRecords, unwrap } from './_helpers'

export const submitVote: ActionHandler<Env> = async ({ params, tools }) => {
  const sessionId = String(params.sessionId ?? '')
  const pollId = String(params.pollId ?? '')
  const deviceId = String(params.deviceId ?? '')
  if (!sessionId || !pollId || !deviceId) {
    return { success: false, error: 'sessionId, pollId, and deviceId required' }
  }

  const session = unwrap<Session>(await tools.get('sessions', sessionId))
  if (!session) return { success: false, error: 'Session not found' }
  if (session.state === 'closed') return { success: false, error: 'Session is closed' }
  if (session.locked) return { success: false, error: 'Voting is locked' }

  const poll = unwrap<Poll>(await tools.get('polls', pollId))
  if (!poll) return { success: false, error: 'Poll not found' }
  const settings = poll.settings ?? config.defaults

  // Rate-limit: cap writes per deviceId per window across this session.
  const recent = await queryRecords<Response>(tools, 'responses', { where: { sessionId, deviceId } })
  const since = Date.now() - config.antiAbuse.rateLimit.windowMs
  const inWindow = recent.filter((r) => r.data.createdAt >= since).length
  if (inWindow >= config.antiAbuse.rateLimit.maxVotes) {
    return { success: false, error: 'Too many votes, slow down' }
  }

  // Anti-abuse: soft participant ceiling (distinct deviceIds in the session).
  const allForSession = await queryRecords<Response>(tools, 'responses', { where: { sessionId } })
  const known = new Set(allForSession.map((r) => r.data.deviceId))
  if (!known.has(deviceId) && known.size >= config.antiAbuse.maxParticipants) {
    return { success: false, error: 'This session is at capacity' }
  }

  const answer = {
    optionId: String(params.optionId ?? ''),
    value: Number(params.value ?? 0),
    text: String(params.text ?? ''),
    displayName: String(params.displayName ?? ''),
  }

  // Dedup by (sessionId, pollId, deviceId). One vote per device per poll.
  if (settings.dedup && recent.some((r) => r.data.pollId === pollId)) {
    return { success: false, error: 'You have already voted on this poll' }
  }

  return tools.create<Response>('responses', {
    sessionId,
    pollId,
    deviceId,
    optionId: answer.optionId,
    value: answer.value,
    text: answer.text,
    upvotes: 0,
    approved: settings.moderated ? 0 : 1,
    createdAt: Date.now(),
    displayName: answer.displayName,
  })
}
