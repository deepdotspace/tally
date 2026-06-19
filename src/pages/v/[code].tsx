import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutations } from 'deepspace'
import {
  useSessionByCode, usePoll, useResponses, useCastVote, useUpvotes, useUpvote,
  rankingToText, resultsVisibleToVoters, votingLocked, timerRemaining, isModerated, NO_MATCH,
} from '../../lib/poll-data'
import { useDeviceId } from '../../lib/useDeviceId'
import { useParticipantName } from '../../lib/useParticipantName'
import { VoterView, type VoterPhase } from '../../components/voter'
import type { Poll, Session, Response } from '../../types'

/*
 * /v/:code anonymous voter route. Resolves the session by code, follows the
 * active poll, and writes answers via the WS RecordRoom create, NOT the
 * submitVote action which 401s anon callers (SPEC §8). The active poll is
 * session.currentPollId (deck-follow) with a fallback to session.pollId; when
 * it changes the answer view re-resolves and replays the rs-in animation.
 *
 * Write models by poll type: single-submit-with-dedup (useCastVote.cast) for
 * choice/wordcloud/scale/nps/numeric/ranking/quiz; multi-row single-shot
 * (castMulti) for multi-select; and multi-submit (a direct create) plus upvotes
 * (useUpvote) for Q&A, where a voter may ask many and upvote others. When the
 * session asks for a name it is collected once and threaded into every write.
 */
export default function VoterRoute() {
  const { code: raw = '' } = useParams<{ code: string }>()
  const code = raw.toUpperCase()

  const { sessionId, session, status: sessionStatus } = useSessionByCode(code)
  const activePollId = session?.currentPollId || session?.pollId || undefined

  const { poll } = usePoll(activePollId)
  const { responses, status: respStatus } = useResponses(sessionId, activePollId)
  // Raw response envelopes + upvotes feed the live Q&A cards.
  const qa = useQuery<Response>('responses', { where: sessionId && activePollId ? { sessionId, pollId: activePollId } : { recordId: NO_MATCH } })
  const { upvotes } = useUpvotes(sessionId, activePollId)
  const { myResponse, myResponses, hasVoted, cast, castMulti } = useCastVote(sessionId, activePollId)
  const { hasUpvoted, upvote } = useUpvote(sessionId, activePollId)
  // Q&A submits go straight to the room (no single-submit dedup); the rest use cast.
  const { create } = useMutations<Response>('responses')
  const deviceId = useDeviceId()
  const { name, setName } = useParticipantName(code)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [textValue, setTextValue] = useState('')
  const [numericValue, setNumericValue] = useState('')
  const [rankOrder, setRankOrder] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [justCounted, setJustCounted] = useState(false)
  // Q&A: once a question is sent, swap the input for the "sent" confirmation.
  const [qaSent, setQaSent] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  // Name step: lets "Stay anonymous" advance past the step without a typed name.
  const [nameStepDone, setNameStepDone] = useState(false)
  // 1s tick so the countdown re-reads timerRemaining; cleared when no timer runs.
  const [, setNow] = useState(0)

  // Reset the local answer state when the host advances to a new poll.
  useEffect(() => {
    setSelectedId(null)
    setMultiSelected(new Set())
    setSelectedValue(null)
    setTextValue('')
    setNumericValue('')
    setRankOrder([])
    setSubmitting(false)
    setJustCounted(false)
    setQaSent(false)
  }, [activePollId])

  // Drive the countdown: tick once a second only while a timer is configured.
  const hasTimer = typeof poll?.settings.timerSeconds === 'number' && poll.settings.timerSeconds > 0
  useEffect(() => {
    if (!hasTimer) return
    const t = setInterval(() => setNow((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [hasTimer])

  // Seed the ranking order from the poll's options once they resolve.
  const optionIdsKey = poll?.options.map((o) => o.id).join(',') ?? ''
  useEffect(() => {
    if (poll?.type === 'ranking') setRankOrder(poll.options.map((o) => o.id))
  }, [poll?.type, optionIdsKey])

  // Swap two adjacent ranking rows (up = -1, down = +1).
  function moveRank(index: number, dir: -1 | 1) {
    setRankOrder((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  // Multi-select: toggle one option id in the working set.
  function toggleMulti(id: string) {
    setMultiSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit() {
    if (submitting || !poll || !sessionId || !activePollId) return
    setSubmitting(true)
    try {
      if (poll.type === 'qa') {
        // Multi-submit: append a question, then show the sent confirmation.
        // Moderated polls (per-poll or session-wide) hold the row (approved:0).
        const text = textValue.trim()
        if (!text) return
        const approved = isModerated(session, poll) ? 0 : 1
        await create({
          sessionId,
          pollId: activePollId,
          deviceId,
          optionId: '',
          value: 0,
          text,
          upvotes: 0,
          approved,
          createdAt: Date.now(),
          displayName: name,
        })
        setTextValue('')
        setQaSent(true)
      } else if (poll.type === 'multi') {
        // Multi-select: one row per chosen id, single-shot (gated by hasVoted).
        if (hasVoted || multiSelected.size === 0) return
        await castMulti([...multiSelected], name)
        flashCounted()
      } else if (!hasVoted) {
        const answer = answerFor(poll, { selectedId, selectedValue, textValue, numericValue, rankOrder })
        if (!answer) return
        await cast(answer, name)
        flashCounted()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function flashCounted() {
    setJustCounted(true)
    // Hold the counted confirmation ~1.7s so it reads on a glance (P1-4).
    setTimeout(() => setJustCounted(false), 1700)
  }

  // Name step: store the typed name (empty stays anonymous), then advance.
  function submitName() {
    setName(nameDraft.trim())
    setNameStepDone(true)
  }

  // Stay anonymous: advance past the name step without a typed name.
  function skipName() {
    setNameStepDone(true)
  }

  // Q&A "Ask another": clear the sent confirmation back to the question input.
  function askAnother() {
    setQaSent(false)
  }

  const needsName = session?.askNames === 1 && !name && !nameStepDone
  const phase = resolvePhase({ sessionStatus, session, poll, hasVoted, needsName })
  const ownChoiceId = myResponse?.optionId || undefined
  const ownChoiceIds = myResponses.map((r) => r.optionId).filter(Boolean)
  const connected = respStatus === 'ready'
  const remaining = timerRemaining(session, poll)

  return (
    <VoterView
      phase={phase}
      code={code}
      connected={connected}
      question={poll?.title ?? ''}
      options={poll?.options ?? []}
      poll={poll}
      responses={responses}
      total={responses.length}
      qaEnvelopes={qa.records}
      upvotes={upvotes}
      onUpvote={upvote}
      hasUpvoted={hasUpvoted}
      resultsVisible={resultsVisibleToVoters(session, poll)}
      ownChoiceId={ownChoiceId}
      ownChoiceIds={ownChoiceIds}
      selectedId={selectedId}
      onSelect={setSelectedId}
      multiSelected={multiSelected}
      onToggleMulti={toggleMulti}
      selectedValue={selectedValue}
      onSelectValue={setSelectedValue}
      textValue={textValue}
      onTextChange={setTextValue}
      numericValue={numericValue}
      onNumericChange={setNumericValue}
      rankOrder={rankOrder}
      onRankMove={moveRank}
      moderated={isModerated(session, poll)}
      qaSent={qaSent}
      onAskAnother={askAnother}
      submitting={submitting}
      justCounted={justCounted}
      onSubmit={onSubmit}
      timerRemaining={remaining}
      nameDraft={nameDraft}
      onNameDraftChange={setNameDraft}
      onNameSubmit={submitName}
      onNameSkip={skipName}
    />
  )
}

/** Local answer-state shape the route holds for the active poll. */
interface DraftAnswer {
  selectedId: string | null
  selectedValue: number | null
  textValue: string
  numericValue: string
  rankOrder: string[]
}

/* Pick the single-submit answer payload, or null if nothing is chosen yet. Q&A
   and multi-select are handled directly in onSubmit (their own write models). */
function answerFor(
  poll: Poll,
  draft: DraftAnswer,
): { optionId?: string; value?: number; text?: string } | null {
  switch (poll.type) {
    case 'wordcloud': {
      const text = draft.textValue.trim()
      return text ? { text } : null
    }
    case 'scale':
    case 'nps':
      return draft.selectedValue === null ? null : { value: draft.selectedValue }
    case 'numeric': {
      const n = Number(draft.numericValue.trim())
      return draft.numericValue.trim() === '' || !Number.isFinite(n) ? null : { value: n }
    }
    case 'ranking':
      // Encode the ordered optionId list to the text field (lib/poll-data seam).
      return draft.rankOrder.length === 0 ? null : { text: rankingToText(draft.rankOrder) }
    default:
      // choice / quiz: a tapped optionId.
      return draft.selectedId ? { optionId: draft.selectedId } : null
  }
}

interface PhaseArgs {
  sessionStatus: ReturnType<typeof useSessionByCode>['status']
  session: Session | null
  poll: ReturnType<typeof usePoll>['poll']
  hasVoted: boolean
  needsName: boolean
}

/* Map live state to the view's phase machine. Order matters: closed > locked >
   name > vote. Lock holds every type (including Q&A) but still shows results
   beneath when revealed. Q&A never reaches `voted`: the voter keeps asking, so
   it stays on `question` with the live list below. */
function resolvePhase({ sessionStatus, session, poll, hasVoted, needsName }: PhaseArgs): VoterPhase {
  if (sessionStatus !== 'ready' && !session) return 'loading'
  if (!session) return 'not-found'
  if (session.state === 'closed') return 'closed'
  if (!poll) return 'loading'
  if (votingLocked(session)) return 'locked'
  if (needsName) return 'name'
  if (poll.type === 'qa') return 'question'
  if (hasVoted) return 'voted'
  return 'question'
}
