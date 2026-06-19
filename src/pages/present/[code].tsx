/**
 * /present/:code — the presenter / projection view (PROTOTYPE-MAP 3.7).
 *
 * Public, full-screen, read-from-the-back display of the live question +
 * animating results + a join panel, driven by the host control bar (Reveal /
 * Lock / Reset / Phone / Moderate / AI Summary / End + deck Prev/Next/jump).
 * Phone, Moderate, and AI Summary are mutually-exclusive right-side panels.
 * Wires the shared live-poll data layer + the host actions to the presentational
 * PresenterView; live updates arrive for free via the useQuery WS subscription.
 * Forced dark via the data-theme="dark" wrapper so tokens resolve the palette.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { PresenterView } from '../../components/presenter'
import type { PresenterPanel } from '../../components/presenter/PresenterView'
import type { AiStatus, AiTheme } from '../../components/presenter'
import { BarMark, ConfirmModal } from '../../components/ui'
import { callAction } from '../../lib/actions-client'
import {
  useSessionByCode, usePoll, useResponses, useUpvotes, isModerated, timerRemaining, votingLocked, NO_MATCH,
} from '../../lib/poll-data'
import type { Deck, Response } from '../../types'

/** AI summary state, keyed by poll id so it persists while the host toggles panels. */
type AiState = { status: AiStatus; themes: AiTheme[]; total: number; error: string | null }
const AI_IDLE: AiState = { status: 'idle', themes: [], total: 0, error: null }

export default function PresentCodePage() {
  const { code = '' } = useParams<{ code: string }>()
  const upper = code.toUpperCase()
  const navigate = useNavigate()

  const { sessionId, session, status: sessionStatus } = useSessionByCode(upper)
  // A deck advances currentPollId; a single-poll session uses pollId.
  const activePollId = session?.currentPollId || session?.pollId
  const { poll, status: pollStatus } = usePoll(activePollId)
  const respScope = sessionId ?? undefined
  const respPoll = poll ? activePollId : undefined
  const { responses } = useResponses(respScope, respPoll)
  // Raw response envelopes + upvotes feed the Q&A cards (qaItems needs recordIds).
  const qa = useQuery<Response>('responses', { where: respScope && respPoll ? { sessionId: respScope, pollId: respPoll } : { recordId: NO_MATCH } })
  const { upvotes } = useUpvotes(respScope, respPoll)
  // The deck (when this is a deck session) gives the poll position + total.
  const deckQ = useQuery<Deck>('decks', { where: session?.deckId ? { recordId: session.deckId } : { recordId: NO_MATCH } })
  const deck = deckQ.records[0]?.data ?? null

  const host = typeof window !== 'undefined' ? window.location.host : 'tally.app.space'

  const [busy, setBusy] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [panel, setPanel] = useState<PresenterPanel>(null)
  // AI summaries keyed by poll id; held here so toggling the panel does not re-run the model.
  const [aiByPoll, setAiByPoll] = useState<Record<string, AiState>>({})

  // Re-read every second so the countdown ticks and the auto-lock effect re-runs.
  const [, setNow] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = timerRemaining(session, poll)

  // Host-only auto-lock: fire lockSession exactly once when the timer hits 0 and
  // the session is not already locked. A non-host call 403s harmlessly. The ref
  // re-arms when the active poll changes (pollStartedAt or currentPollId).
  const lockFired = useRef(false)
  useEffect(() => {
    lockFired.current = false
  }, [session?.pollStartedAt, session?.currentPollId])
  useEffect(() => {
    if (remaining !== 0 || lockFired.current || !sessionId || votingLocked(session)) return
    lockFired.current = true
    void callAction('lockSession', { sessionId, locked: true })
  }, [remaining, sessionId, session])

  // Run a host action behind a per-key busy guard (non-host calls 403 server-side).
  async function run(key: string, name: string, params: Record<string, unknown>) {
    if (busy || !sessionId) return
    setBusy(key)
    await callAction(name, { sessionId, ...params })
    setBusy(null)
  }

  // End the session, then route to its History detail (PROTOTYPE-MAP 2.3).
  async function end() {
    if (busy || !sessionId) return
    setBusy('end')
    await callAction('closeSession', { sessionId })
    setBusy(null)
    navigate(`/session/${sessionId}`)
  }

  // Toggle a right-side panel; clicking the open one closes it (mutually exclusive).
  function togglePanel(next: Exclude<PresenterPanel, null>) {
    setPanel((cur) => (cur === next ? null : next))
  }

  // Approve (1), return to pending (0), or dismiss (2). The live WS stream updates the queue.
  function moderate(responseId: string, approved: 0 | 1 | 2) {
    if (!sessionId) return
    void callAction('setResponseApproved', { sessionId, responseId, approved })
  }

  // Flip session-wide hold-for-review live from the presenter Moderate panel.
  function toggleModeration(on: boolean) {
    if (!sessionId) return
    void callAction('setSessionModeration', { sessionId, moderateQa: on ? 1 : 0 })
  }

  // Summarize this poll's text answers, billed to the host. Caps to 5 themes,
  // computes each theme's share, and holds the result keyed by poll id.
  async function runAiSummary(pollId: string) {
    setAiByPoll((m) => ({ ...m, [pollId]: { ...AI_IDLE, status: 'loading' } }))
    const res = await callAction<{ themes: { label: string; count: number }[] }>(
      'summarizeResponses',
      { sessionId, pollId },
    )
    if (!res.success || !res.data) {
      // "Not enough responses" is the empty state; anything else is a real error.
      const empty = (res.error ?? '').toLowerCase().includes('not enough')
      setAiByPoll((m) => ({
        ...m,
        [pollId]: { ...AI_IDLE, status: empty ? 'empty' : 'idle', error: empty ? null : res.error ?? 'AI request failed' },
      }))
      return
    }
    const themes = res.data.themes.slice(0, 5)
    const total = themes.reduce((sum, t) => sum + t.count, 0)
    const withPct: AiTheme[] = themes.map((t) => ({
      label: t.label,
      count: t.count,
      pct: total > 0 ? Math.round((t.count / total) * 100) : 0,
    }))
    setAiByPoll((m) => ({ ...m, [pollId]: { status: 'done', themes: withPct, total, error: null } }))
  }

  if (sessionStatus === 'loading') return <PresenterShell>Loading the room.</PresenterShell>

  if (!session) return <SessionNotFound code={upper} host={host} />

  // Session resolved but the poll has not loaded / no poll is current yet.
  if (!poll || pollStatus === 'loading') {
    return (
      <PresenterShell code={upper} host={host}>
        Waiting for the question.
      </PresenterShell>
    )
  }

  // Deck position (1-based) + total for the control bar + dot navigation.
  const deckIndex = deck ? deck.pollIds.indexOf(activePollId ?? '') : -1
  const questionIndex = deck && deckIndex >= 0 ? deckIndex + 1 : null
  const questionTotal = deck ? deck.pollIds.length : null
  const revealed = (session.resultsRevealed ?? 0) === 1
  const locked = votingLocked(session)
  // Distinct voters for the "votes in" count (a multi voter casts several rows).
  const totalVotes = new Set(responses.map((r) => r.deviceId)).size

  // Q&A moderation: questions awaiting approval (approved === 0) drive the badge.
  const moderated = isModerated(session, poll)
  const pendingCount = poll.type === 'qa'
    ? qa.records.filter((r) => r.data.approved === 0 && r.data.text.trim() !== '').length
    : 0
  const ai = activePollId ? aiByPoll[activePollId] ?? AI_IDLE : AI_IDLE

  return (
    <>
      <PresenterView
        poll={poll}
        responses={responses}
        qaEnvelopes={qa.records}
        upvotes={upvotes}
        code={upper}
        host={host}
        totalVotes={totalVotes}
        deckName={session.name || deck?.title || poll.title}
        revealed={revealed}
        locked={locked}
        panel={panel}
        moderated={moderated}
        moderationOn={(session.moderateQa ?? 0) === 1}
        pendingCount={pendingCount}
        ai={ai}
        questionIndex={questionIndex}
        questionTotal={questionTotal}
        busy={busy}
        onReveal={() => run('reveal', 'revealResults', { revealed: !revealed })}
        onLock={() => run('lock', 'lockSession', { locked: !locked })}
        onReset={() => setConfirmReset(true)}
        onPanel={togglePanel}
        onModerate={moderate}
        onToggleModerate={toggleModeration}
        onAiRun={() => { if (activePollId) void runAiSummary(activePollId) }}
        onEnd={() => void end()}
        onPrev={() => run('prev', 'advanceDeck', { direction: 'prev' })}
        onNext={() => run('next', 'advanceDeck', { direction: 'next' })}
        onJump={(i) => run('jump', 'advanceDeck', { targetIndex: i })}
      />
      {/* Reset wipes every vote for the current poll and cannot be undone. */}
      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false)
          void run('reset', 'resetPoll', {})
        }}
        title="Reset all votes?"
        description="This clears every response for this poll and cannot be undone. The timer restarts."
        confirmText="Reset votes"
        cancelText="Keep votes"
      />
    </>
  )
}

/*
 * Designed intermediate states (loading / waiting for the question). When a
 * code/host is known we still show the join affordance so the room can join
 * before the first question is live; otherwise it is a centered status line.
 * data-theme="dark" pins the projection palette so the states stay legible.
 */
function PresenterShell({
  children,
  code,
  host,
}: {
  children: React.ReactNode
  code?: string
  host?: string
}) {
  return (
    <div data-theme="dark" className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-bg-0 text-text-1">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-live animate-tly-blink" />
        <p className="font-display text-[length:var(--text-pt-question-sm)] font-extrabold tracking-[-0.025em] text-text-3b">
          {children}
        </p>
      </div>
      {code && host && (
        <div className="flex flex-col items-center gap-3">
          <p className="flex items-baseline gap-2 text-[length:var(--text-pt-eyebrow)]">
            <span className="font-ui text-text-3b">Join at</span>
            <span className="font-display font-extrabold tracking-[-0.01em] text-accent">{host}/v</span>
          </p>
          <p className="tnum font-mono font-bold text-text-1" style={{ fontSize: 'var(--text-pt-code)', letterSpacing: '0.14em' }}>
            {code}
          </p>
        </div>
      )}
    </div>
  )
}

/** Session-not-found: a designed dead-end, not a raw error. */
function SessionNotFound({ code, host }: { code: string; host: string }) {
  return (
    <div data-theme="dark" className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-bg-0 text-text-1">
      <BarMark size={40} />
      <p className="font-display text-[length:var(--text-pt-question-sm)] font-extrabold tracking-[-0.025em] text-text-1">
        No live session here.
      </p>
      {code && (
        <p className="tnum font-mono font-bold text-text-5" style={{ fontSize: 'var(--text-pt-code)', letterSpacing: '0.14em' }}>
          {code}
        </p>
      )}
      <p className="font-ui text-[length:var(--text-pt-eyebrow)] text-text-3b">
        Start a session at {host} to get a code.
      </p>
    </div>
  )
}
