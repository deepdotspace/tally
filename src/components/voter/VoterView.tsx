import { useEffect, useState } from 'react'
import { Check, Loader2, Lock, X } from 'lucide-react'
import type { RecordData } from 'deepspace'
import { BarMark } from '../ui'
import { cn } from '../ui/utils'
import { ResultsView } from '../results'
import { ScaleInput, NpsInput, TextInput, NumericInput, RankingInput, SubmitButton } from './inputs'
import { config } from '../../config'
import type { ThemeMode } from '../../themes'
import type { Poll, Response, Upvote } from '../../types'

/*
 * Pure voter view (PROTOTYPE-MAP 3.8, dark phone): mobile-first, one-thumb. A
 * near-black phone world with a sticky LIVE header, an Archivo question, and the
 * per-type answer affordance, then live results after voting. Renders from props
 * only so the route page can wire it to the live hooks and a harness can
 * screenshot sample props. Forces dark via a data-theme wrapper (the prototype
 * voter is dark); pass theme="light" for the token-driven light variant.
 */

export type VoterPhase = 'loading' | 'not-found' | 'closed' | 'locked' | 'name' | 'question' | 'voted'

export interface VoterChoiceOption {
  id: string
  label: string
}

export interface VoterViewProps {
  phase: VoterPhase
  /** Phone theme; the live voter is dark (prototype), light is the token variant. */
  theme?: ThemeMode
  /** Join code for the sticky header chip (uppercased upstream). */
  code: string
  /** Live connected indicator: true once the response stream is subscribed. */
  connected: boolean
  /** Question prompt + its options (choice/multi answer affordance). */
  question: string
  options: VoterChoiceOption[]
  /** The live poll; drives the post-vote results viz. Null until it resolves. */
  poll: Poll | null
  /** Raw response rows for the post-vote results (from useResponses). */
  responses: Response[]
  total: number
  /** Q&A: raw response envelopes (q.records) so cards carry their recordId. */
  qaEnvelopes?: RecordData<Response>[]
  /** Q&A: live upvote rows (from useUpvotes). */
  upvotes?: Upvote[]
  /** Q&A: cast an upvote (the W-voter-S2 seam; omit for read-only). */
  onUpvote?: (responseId: string) => void
  /** Q&A: whether this device already upvoted a question. */
  hasUpvoted?: (responseId: string) => boolean
  /** Whether the creator lets voters see results after voting. */
  resultsVisible: boolean
  /** The voter's own pick id (single choice/quiz), so it stays accent in results. */
  ownChoiceId?: string
  /** The voter's own picks (multi), so every chosen card stays accent in results. */
  ownChoiceIds?: string[]
  /** Single choice/quiz selection (route page owns the state machine). */
  selectedId: string | null
  onSelect: (id: string) => void
  /** Multi-select working set; tapping a card toggles its id. */
  multiSelected: Set<string>
  onToggleMulti: (id: string) => void
  /** Scale/nps selection: the chosen numeric value, null until tapped. */
  selectedValue: number | null
  onSelectValue: (value: number) => void
  /** Wordcloud/qa open-text answer. */
  textValue: string
  onTextChange: (value: string) => void
  /** Numeric guess: the raw field text (kept a string so it can be empty). */
  numericValue: string
  onNumericChange: (value: string) => void
  /** Ranking: the voter's working order of option ids; onMove reorders one row. */
  rankOrder: string[]
  onRankMove: (index: number, dir: -1 | 1) => void
  /** Q&A: when the poll is moderated (per-poll or session-wide), a submit is held. */
  moderated?: boolean
  /** Q&A: true once a question is sent; swaps the input for the sent confirmation. */
  qaSent?: boolean
  /** Q&A: return from the sent confirmation to the question input. */
  onAskAnother?: () => void
  /** Shared submit state + handler; the route picks the write by poll type. */
  submitting: boolean
  justCounted: boolean
  onSubmit: () => void
  /** Seconds left on the countdown, or null when no timer is set (display only). */
  timerRemaining: number | null
  /** Name step (askNames mode): the draft name + continue handler. */
  nameDraft: string
  onNameDraftChange: (value: string) => void
  onNameSubmit: () => void
  /** Name step: stay anonymous, advancing without a typed name. */
  onNameSkip: () => void
}

/* A B C D ... markers for the option cards (mono glyph, §6.3). */
const MARKERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function VoterView(props: VoterViewProps) {
  return (
    <div data-theme={props.theme ?? 'dark'} className="flex min-h-screen w-full flex-col bg-bg-0">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 pb-7 pt-4">
        <VoterHeader code={props.code} connected={props.connected} phase={props.phase} timerRemaining={props.timerRemaining} />
        <div className="mt-5 flex flex-1 flex-col">
          <VoterBody {...props} />
        </div>
        <VoterFooter code={props.code} />
      </div>
    </div>
  )
}

/* Sticky LIVE header (§6.3): brand mark + coral pulse dot + LIVE mono eyebrow,
   an optional mm:ss countdown, the join code in mono, and the theme toggle. */
function VoterHeader({
  code,
  connected,
  phase,
  timerRemaining,
}: {
  code: string
  connected: boolean
  phase: VoterPhase
  timerRemaining: number | null
}) {
  const loading = phase === 'loading'
  return (
    <header className="sticky top-0 z-10 -mx-5 flex items-center gap-3 border-b border-border-2 bg-bg-0/95 px-5 py-3 backdrop-blur">
      <BarMark size={24} />
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-3 w-3 animate-[var(--animate-rs-spin)] text-text-5" />
        ) : (
          <span
            className={cn('h-[7px] w-[7px] rounded-full', connected ? 'bg-live animate-[var(--animate-tly-blink)]' : 'bg-text-5')}
          />
        )}
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-3b">
          {loading ? 'Connecting' : connected ? 'Live' : 'Offline'}
        </span>
      </div>
      {timerRemaining !== null && <Countdown seconds={timerRemaining} />}
      <span className="tnum ml-auto font-mono text-[13px] font-bold tracking-[0.14em] text-text-1">
        {code || '------'}
      </span>
    </header>
  )
}

/* mm:ss countdown chip (display only). Reads accent until the final 10s, then
   coral to signal the close. The route ticks `seconds`; the voter never locks. */
function Countdown({ seconds }: { seconds: number }) {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const ending = seconds <= 10
  return (
    <span
      data-testid="voter-countdown"
      className={cn(
        'tnum rounded-[6px] border border-border-4 px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums',
        ending ? 'text-live' : 'text-accent',
      )}
    >
      {mm}:{String(ss).padStart(2, '0')}
    </span>
  )
}

/* Footer wordmark + join hint at low opacity (§6.3). */
function VoterFooter({ code }: { code: string }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 pt-2 opacity-50">
      <span className="font-display text-[13px] font-extrabold tracking-[-0.02em] text-text-3b">Tally</span>
      <span className="tnum font-mono text-[11px] text-text-5">tally.app.space / {code || '------'}</span>
    </div>
  )
}

function VoterBody(props: VoterViewProps) {
  switch (props.phase) {
    case 'loading':
      return <LoadingState />
    case 'not-found':
      return <NotFoundState code={props.code} />
    case 'closed':
      return <ClosedState />
    case 'locked':
      return <LockedState {...props} />
    case 'name':
      return <NameState {...props} />
    case 'voted':
      return <VotedState {...props} />
    default:
      return <QuestionState {...props} />
  }
}

/* Pre-vote: question + the per-type answer affordance + submit. Keyed on pollId
   so a deck advance remounts and replays the entry animation. Q&A is the
   exception: the route keeps it in `question` so a voter can keep asking, with
   the live list below the input (see QaState). */
function QuestionState(props: VoterViewProps) {
  if (props.poll?.type === 'qa') return <QaState {...props} />
  return (
    <div className="animate-[var(--animate-tly-fade-up)]">
      <QuestionHeading text={props.question} />
      <p className="mt-2.5 text-[14px] text-text-3b">{helperFor(props.poll?.type)}</p>
      <div className="mt-5">
        <AnswerAffordance {...props} />
      </div>
    </div>
  )
}

/* Type-appropriate pre-vote helper (P2): "Pick one" only fits single-choice. */
function helperFor(type?: Poll['type']): string {
  switch (type) {
    case 'multi':
      return 'Pick all that apply. Your answer is anonymous.'
    case 'wordcloud':
      return 'Type a word. Your answer is anonymous.'
    case 'scale':
    case 'nps':
      return 'Tap a number. Your answer is anonymous.'
    case 'numeric':
      return 'Enter your guess. Your answer is anonymous.'
    case 'ranking':
      return 'Reorder the options from best to worst. Your answer is anonymous.'
    default:
      return 'Pick one. Your answer is anonymous.'
  }
}

function QuestionHeading({ text, small }: { text: string; small?: boolean }) {
  return (
    <h1
      className={cn(
        'font-display font-extrabold leading-[1.12] tracking-[-0.02em] text-text-1 text-pretty',
        small ? 'text-[23px]' : 'text-[26px]',
      )}
    >
      {text}
    </h1>
  )
}

/* The input for choice/multi/wordcloud/scale/nps + the shared submit. */
function AnswerAffordance(props: VoterViewProps) {
  const { poll, submitting, justCounted, onSubmit } = props
  const type = poll?.type ?? 'choice'

  switch (type) {
    case 'wordcloud':
      return (
        <>
          <TextInput
            value={props.textValue}
            placeholder="Type a word"
            maxLength={config.authoring.maxResponseLength}
            disabled={submitting}
            onChange={props.onTextChange}
            onEnter={onSubmit}
          />
          <SubmitButton label="Submit" counted={justCounted} disabled={!props.textValue.trim() || submitting} onClick={onSubmit} />
        </>
      )
    case 'scale': {
      const min = poll?.settings?.min ?? config.ranges.scaleMin
      const max = poll?.settings?.max ?? config.ranges.scaleMax
      return (
        <>
          <ScaleInput min={min} max={max} selected={props.selectedValue} disabled={submitting} onSelect={props.onSelectValue} />
          <SubmitButton label="Submit" counted={justCounted} disabled={props.selectedValue === null || submitting} onClick={onSubmit} />
        </>
      )
    }
    case 'nps':
      return (
        <>
          <NpsInput selected={props.selectedValue} disabled={submitting} onSelect={props.onSelectValue} />
          <SubmitButton label="Submit" counted={justCounted} disabled={props.selectedValue === null || submitting} onClick={onSubmit} />
        </>
      )
    case 'numeric':
      return (
        <>
          <NumericInput
            value={props.numericValue}
            min={poll?.settings?.min}
            max={poll?.settings?.max}
            disabled={submitting}
            onChange={props.onNumericChange}
            onEnter={onSubmit}
          />
          <SubmitButton label="Submit" counted={justCounted} disabled={props.numericValue.trim() === '' || submitting} onClick={onSubmit} />
        </>
      )
    case 'ranking':
      return (
        <>
          <RankingInput options={orderedOptions(props)} disabled={submitting} onMove={props.onRankMove} />
          <SubmitButton label="Submit ranking" counted={justCounted} disabled={props.options.length === 0 || submitting} onClick={onSubmit} />
        </>
      )
    case 'multi':
      // Multi-select: toggle several cards, submit at >= 1 selected.
      return <MultiOptions {...props} />
    default:
      // choice / quiz use the tap-one-option recipe.
      return <ChoiceOptions {...props} />
  }
}

/* Resolve the ranking display order: the working rankOrder mapped back to the
   poll options, with any unranked options appended (defensive). */
function orderedOptions(props: VoterViewProps): VoterChoiceOption[] {
  const byId = new Map(props.options.map((o) => [o.id, o]))
  const ordered = props.rankOrder.map((id) => byId.get(id)).filter((o): o is VoterChoiceOption => !!o)
  const seen = new Set(ordered.map((o) => o.id))
  return [...ordered, ...props.options.filter((o) => !seen.has(o.id))]
}

/* Single choice/quiz (§6.3): full-width cards on --bg-card-b with a 1.5px
   resting border, a mono A/B/C marker, selected = --accent-soft + accent border. */
function ChoiceOptions(props: VoterViewProps) {
  const { options, selectedId, submitting, justCounted, onSelect, onSubmit } = props
  return (
    <>
      <div className="flex flex-col gap-2.5">
        {options.map((o, i) => {
          const selected = selectedId === o.id
          const flash = selected && justCounted
          return (
            <button
              key={o.id}
              data-testid={`vote-option-${o.id}`}
              type="button"
              disabled={submitting}
              onClick={() => onSelect(o.id)}
              className={cn(
                'flex min-h-[56px] w-full items-center gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left transition-all duration-150 disabled:cursor-default',
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-border-4 bg-bg-card-b hover:border-border-7',
              )}
              style={flash ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
            >
              <span
                className={cn(
                  'grid h-[30px] w-[30px] shrink-0 place-content-center rounded-[9px] font-mono text-[13px] font-bold transition-all duration-150',
                  selected
                    ? 'bg-accent text-accent-text'
                    : 'border-[1.5px] border-border-7 text-text-3b',
                )}
              >
                {MARKERS[i] ?? '?'}
              </span>
              <span className="min-w-0 flex-1 font-ui text-[16px] font-semibold text-text-1b">{o.label}</span>
              {selected && (
                <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={3} />
              )}
            </button>
          )
        })}
      </div>
      <SubmitButton label="Submit" counted={justCounted} disabled={!selectedId || submitting} onClick={onSubmit} />
    </>
  )
}

/* Multi-select (§6.3, P0-1): same option cards, but a tap toggles membership in
   a Set. The marker becomes a checkbox glyph; Submit enables at >= 1 selected.
   Identical resting/selected styling to ChoiceOptions for a coherent look. */
function MultiOptions(props: VoterViewProps) {
  const { options, multiSelected, submitting, justCounted, onToggleMulti, onSubmit } = props
  return (
    <>
      <div className="flex flex-col gap-2.5">
        {options.map((o, i) => {
          const selected = multiSelected.has(o.id)
          return (
            <button
              key={o.id}
              data-testid={`vote-option-${o.id}`}
              aria-pressed={selected}
              type="button"
              disabled={submitting}
              onClick={() => onToggleMulti(o.id)}
              className={cn(
                'flex min-h-[56px] w-full items-center gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left transition-all duration-150 disabled:cursor-default',
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-border-4 bg-bg-card-b hover:border-border-7',
              )}
            >
              <span
                className={cn(
                  'grid h-[30px] w-[30px] shrink-0 place-content-center rounded-[9px] font-mono text-[13px] font-bold transition-all duration-150',
                  selected
                    ? 'bg-accent text-accent-text'
                    : 'border-[1.5px] border-border-7 text-text-3b',
                )}
              >
                {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : (MARKERS[i] ?? '?')}
              </span>
              <span className="min-w-0 flex-1 font-ui text-[16px] font-semibold text-text-1b">{o.label}</span>
            </button>
          )
        })}
      </div>
      <SubmitButton
        label={multiSelected.size > 0 ? `Submit ${multiSelected.size} selected` : 'Submit'}
        counted={justCounted}
        disabled={multiSelected.size === 0 || submitting}
        onClick={onSubmit}
      />
    </>
  )
}

/* Q&A: submit many questions + upvote others. After a submit the input swaps
   for the "sent" confirmation (PROTOTYPE-MAP-v3 5e); the live "Top questions"
   list (with upvote interactivity) renders below in both states. */
function QaState(props: VoterViewProps) {
  const { poll, question, responses, textValue, submitting, moderated, qaSent, onTextChange, onSubmit, onAskAnother } = props
  const { qaEnvelopes, upvotes, onUpvote, hasUpvoted } = props
  return (
    <div className="animate-[var(--animate-tly-fade-up)]">
      <QuestionHeading text={question} small />
      {qaSent ? (
        <QaSentConfirmation moderated={!!moderated} onAskAnother={onAskAnother} />
      ) : (
        <div className="mt-5">
          <TextInput
            value={textValue}
            placeholder="Type your question"
            maxLength={config.authoring.maxResponseLength}
            disabled={submitting}
            onChange={onTextChange}
            onEnter={onSubmit}
          />
          <SubmitButton label="Ask" disabled={!textValue.trim() || submitting} onClick={onSubmit} />
        </div>
      )}
      {poll && (
        <div className="mt-7">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-6">Top questions</p>
          <ResultsView
            poll={poll}
            responses={responses}
            qaEnvelopes={qaEnvelopes}
            upvotes={upvotes}
            onUpvote={onUpvote}
            hasUpvoted={hasUpvoted}
            scale="voter"
          />
        </div>
      )}
    </div>
  )
}

/* Q&A sent confirmation (PROTOTYPE-MAP-v3 5e): a centered check badge, a heading
   and sub that differ by moderation, and an "Ask another" reset. */
function QaSentConfirmation({ moderated, onAskAnother }: { moderated: boolean; onAskAnother?: () => void }) {
  return (
    <div data-testid="qa-sent" className="flex flex-col items-center px-1 py-2.5 text-center">
      <span className="grid h-[52px] w-[52px] place-content-center rounded-full border-[1.5px] border-accent bg-accent-soft-2 text-[24px] text-accent">
        <Check className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 font-display text-[17px] font-extrabold tracking-[-0.01em] text-text-1">
        {moderated ? 'Sent for review' : 'Question posted'}
      </h2>
      <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-text-3b">
        {moderated
          ? 'The host will approve it before it appears on the screen.'
          : 'Your question is now live for others to upvote.'}
      </p>
      <button
        data-testid="qa-ask-another"
        type="button"
        onClick={onAskAnother}
        className="mt-4 rounded-[11px] border border-border-7 px-[18px] py-2.5 font-ui text-[13.5px] font-semibold text-text-2b transition-colors hover:border-border-strong"
      >
        Ask another
      </button>
    </div>
  )
}

/* Post-vote: results if the creator allows, else a hidden-results thanks. MC
   keeps its cards and fills in an inline pct + bar per the source; other types
   delegate to ResultsView. Quiz shows correctness before the tally. */
function VotedState(props: VoterViewProps) {
  const { resultsVisible, poll, responses, total, ownChoiceId, question, qaEnvelopes, upvotes, onUpvote, hasUpvoted } = props
  const quizFeedback = poll?.type === 'quiz' ? <QuizFeedback poll={poll} ownChoiceId={ownChoiceId} /> : null
  if (!resultsVisible || !poll) {
    return (
      <div className="flex animate-[var(--animate-tly-fade-up)] flex-col items-center pt-10 text-center">
        {quizFeedback ?? (
          <>
            <span className="grid h-12 w-12 place-content-center rounded-full bg-accent-soft text-accent">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <h2 className="mt-5 font-display text-[20px] font-extrabold tracking-[-0.02em] text-text-1">
              Your vote is counted
            </h2>
            <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-text-3">
              The host has hidden results for now. They show up here if the host reveals them.
            </p>
          </>
        )}
      </div>
    )
  }
  const isChoice = poll.type === 'choice' || poll.type === 'multi' || poll.type === 'quiz'
  // Own picks: multi reflects every chosen id, the rest reflect the single pick.
  const ownIds = new Set(poll.type === 'multi' ? props.ownChoiceIds ?? [] : ownChoiceId ? [ownChoiceId] : [])
  return (
    <div className="animate-[var(--animate-tly-fade-up)]">
      <QuestionHeading text={question} small />
      {quizFeedback ?? <VotedBanner />}
      {isChoice ? (
        <ChoiceResultCards poll={poll} responses={responses} ownIds={ownIds} />
      ) : (
        <ResultsView
          poll={poll}
          responses={responses}
          ownChoiceId={ownChoiceId}
          qaEnvelopes={qaEnvelopes}
          upvotes={upvotes}
          onUpvote={onUpvote}
          hasUpvoted={hasUpvoted}
          scale="voter"
        />
      )}
      <p className="tnum mt-5 font-mono text-[12px] text-text-5">
        {total} {total === 1 ? 'response' : 'responses'}
      </p>
    </div>
  )
}

/* "Voted" banner (§6.3): accent-soft wash, accent-border-soft hairline. */
function VotedBanner() {
  return (
    <div className="mt-3.5 flex items-center gap-2 rounded-[11px] border border-accent-border-soft bg-accent-soft px-3.5 py-2.5">
      <span className="text-[14px] font-semibold text-accent">Vote counted. Results are live.</span>
    </div>
  )
}

/* Post-vote MC cards (§6.3): each option keeps its card + marker and reveals a
   pct (Archivo 800) over an 8px bar. The voter's own pick(s) are accent; others
   are --data-muted, with the runner-up stepped up to --data-2. Multi totals are
   distinct voters (poll-data §) so per-option shares may sum past 100%. */
function ChoiceResultCards({ poll, responses, ownIds }: { poll: Poll; responses: Response[]; ownIds: Set<string> }) {
  const counts = new Map<string, number>(poll.options.map((o) => [o.id, 0]))
  for (const r of responses) {
    if (r.optionId && counts.has(r.optionId)) counts.set(r.optionId, (counts.get(r.optionId) ?? 0) + 1)
  }
  const total = poll.type === 'multi' ? new Set(responses.map((r) => r.deviceId)).size : responses.length
  const hasOwn = ownIds.size > 0
  // Rank by count to step the runner-up bar up to --data-2.
  const ranked = [...poll.options].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
  const leaderId = ranked[0]?.id
  const runnerUpId = ranked[1] && (counts.get(ranked[1].id) ?? 0) > 0 ? ranked[1].id : undefined
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {poll.options.map((o, i) => {
        const count = counts.get(o.id) ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const isOwn = ownIds.has(o.id)
        const fill = isOwn || (!hasOwn && o.id === leaderId)
          ? 'var(--accent)'
          : o.id === runnerUpId
            ? 'var(--data-2)'
            : 'var(--data-muted)'
        const pctColor = isOwn || (!hasOwn && o.id === leaderId) ? 'var(--accent)' : 'var(--text-3b)'
        return (
          <div
            key={o.id}
            data-testid={`result-row-${o.id}`}
            className={cn(
              'rounded-[14px] border-[1.5px] px-4 py-3.5',
              isOwn ? 'border-accent bg-accent-soft' : 'border-border-4 bg-bg-card-b',
            )}
          >
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  'grid h-[30px] w-[30px] shrink-0 place-content-center rounded-[9px] font-mono text-[13px] font-bold',
                  isOwn ? 'bg-accent text-accent-text' : 'border-[1.5px] border-border-7 text-text-3b',
                )}
              >
                {MARKERS[i] ?? '?'}
              </span>
              <span className="min-w-0 flex-1 font-ui text-[16px] font-semibold text-text-1b">{o.label}</span>
              <span
                data-testid={`result-count-${o.id}`}
                className="tnum font-display text-[19px] font-extrabold"
                style={{ color: pctColor }}
              >
                {pct}%
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-bg-track">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: fill, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }}
                aria-hidden
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Quiz post-submit banner: correct (accent) vs incorrect (muted) + the right
   answer when missed. Correctness reads the poll option flagged `correct`. */
function QuizFeedback({ poll, ownChoiceId }: { poll: Poll; ownChoiceId?: string }) {
  const correctOption = poll.options.find((o) => o.correct === true)
  const isCorrect = !!ownChoiceId && ownChoiceId === correctOption?.id
  return (
    <div data-testid="quiz-feedback" className="mt-3.5 flex items-center gap-3 rounded-[14px] border border-border-3 bg-bg-2 px-4 py-3">
      {isCorrect ? (
        <span className="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-accent text-accent-text">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-bg-3 text-text-2">
          <X className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      <div className="min-w-0">
        <p className={cn('font-display text-[15px] font-bold tracking-[-0.01em]', isCorrect ? 'text-accent' : 'text-text-1')}>
          {isCorrect ? 'Correct' : 'Not quite'}
        </p>
        {!isCorrect && correctOption && (
          <p className="truncate text-[13px] text-text-3">Answer: {correctOption.label}</p>
        )}
      </div>
    </div>
  )
}

function ClosedState() {
  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <span className="h-2.5 w-2.5 rounded-full bg-text-5" />
      <h2 className="mt-5 font-display text-[20px] font-extrabold tracking-[-0.02em] text-text-1">
        Voting is closed
      </h2>
      <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-text-3">
        This session is not taking votes right now. Hang tight for the next question.
      </p>
    </div>
  )
}

/* Locked (P0-2): voting is held for every type, inputs disabled. When the host
   reveals results (e.g. an onClose auto-reveal at lock), they show beneath the
   lock message so the room still sees the final tally. */
function LockedState(props: VoterViewProps) {
  const { poll, responses, total, resultsVisible, ownChoiceId, question, qaEnvelopes, upvotes, hasUpvoted } = props
  const showResults = resultsVisible && !!poll
  return (
    <div data-testid="voter-locked" className="animate-[var(--animate-tly-fade-up)]">
      <div className="flex flex-col items-center pt-8 text-center">
        <span className="grid h-12 w-12 place-content-center rounded-full bg-bg-3 text-text-3">
          <Lock className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <h2 className="mt-5 font-display text-[20px] font-extrabold tracking-[-0.02em] text-text-1">
          Voting is locked
        </h2>
        <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-text-3">
          The host has paused this poll. {showResults ? 'Here are the results so far.' : 'Hang tight for the next question.'}
        </p>
      </div>
      {showResults && poll && (
        <div className="mt-8 border-t border-border-2 pt-7">
          {poll.type === 'choice' || poll.type === 'multi' || poll.type === 'quiz' ? (
            <ChoiceResultCards poll={poll} responses={responses} ownIds={lockedOwnIds(props)} />
          ) : (
            <ResultsView
              poll={poll}
              responses={responses}
              ownChoiceId={ownChoiceId}
              qaEnvelopes={qaEnvelopes}
              upvotes={upvotes}
              hasUpvoted={hasUpvoted}
              scale="voter"
            />
          )}
          <p className="tnum mt-5 font-mono text-[12px] text-text-5">
            {total} {total === 1 ? 'response' : 'responses'}
          </p>
        </div>
      )}
    </div>
  )
}

/* Own picks for the locked results (multi reflects every chosen id). */
function lockedOwnIds(props: VoterViewProps): Set<string> {
  if (props.poll?.type === 'multi') return new Set(props.ownChoiceIds ?? [])
  return new Set(props.ownChoiceId ? [props.ownChoiceId] : [])
}

/* Name step (F2, PROTOTYPE-MAP-v3 4b): a single-field collect-a-name screen
   shown before answering when the session asks for names. One-thumb, with a
   "Stay anonymous" escape that advances without a typed name. */
function NameState(props: VoterViewProps) {
  const { nameDraft, onNameDraftChange, onNameSubmit, onNameSkip } = props
  return (
    <form
      data-testid="voter-name-step"
      className="flex flex-1 animate-[var(--animate-tly-fade-up)] flex-col justify-center pb-10"
      onSubmit={(e) => {
        e.preventDefault()
        onNameSubmit()
      }}
    >
      <h1 className="font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.01em] text-text-1">
        What should we call you?
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-3b">
        Shown next to anything you submit. You can stay anonymous.
      </p>
      <input
        data-testid="name-input"
        value={nameDraft}
        onChange={(e) => onNameDraftChange(e.target.value)}
        autoFocus
        autoComplete="name"
        maxLength={60}
        placeholder="Your name"
        aria-label="Your name"
        className={cn(
          'mt-3.5 w-full rounded-[12px] border-[1.5px] border-border-7 bg-bg-2 px-3.5 py-3 font-ui text-[15px] font-medium text-text-1 outline-none transition-colors',
          'placeholder:text-text-3b focus:border-accent',
        )}
      />
      <button
        data-testid="name-continue"
        type="submit"
        className="mt-3 rounded-[12px] bg-accent px-4 py-3 text-center font-ui text-[15px] font-bold text-accent-text transition-all duration-150 hover:bg-accent-hover"
      >
        Continue
      </button>
      <button
        data-testid="name-skip"
        type="button"
        onClick={onNameSkip}
        className="mt-2.5 text-center text-[13px] text-text-3b transition-colors hover:text-text-2"
      >
        Stay anonymous
      </button>
    </form>
  )
}

function NotFoundState({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <h2 className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-text-1">
        Session not found
      </h2>
      <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-text-3">
        We could not find a live session for code{' '}
        <span className="tnum font-mono font-bold text-text-1">{code || '----'}</span>. Check the code and try again.
      </p>
      <a
        href="/join"
        className="mt-6 rounded-[10px] border border-border-4 bg-bg-card-b px-4 py-2.5 font-ui text-[14px] font-semibold text-text-1 transition-colors hover:border-border-7"
      >
        Enter a different code
      </a>
    </div>
  )
}

/* Skeleton question while the session + poll resolve (no raw error/flash). */
function LoadingState() {
  const [show, setShow] = useState(false)
  // Defer the skeleton a beat so a fast resolve never flashes it.
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 120)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div className="animate-[var(--animate-tly-fade-up)]">
      <div className="h-7 w-3/4 rounded-md bg-bg-card-b" />
      <div className="mt-3 h-7 w-1/2 rounded-md bg-bg-card-b" />
      <div className="mt-6 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[56px] w-full rounded-[14px] bg-bg-card-b" />
        ))}
      </div>
    </div>
  )
}
