import type { RecordData } from 'deepspace'
import { Eye, EyeOff, Lock, Unlock, RotateCcw, Smartphone, Square, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { ResultsView } from '../results'
import { QR } from '../../lib/qr'
import { BarMark } from '../ui'
import { cn } from '../ui/utils'
import { AudiencePhone } from './AudiencePhone'
import { ModeratePanel } from './ModeratePanel'
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiStatus, AiTheme } from './AiSummaryPanel'
import type { Poll, Response, Upvote } from '../../types'

/** Which right-side panel is open. The three panels are mutually exclusive. */
export type PresenterPanel = 'phone' | 'moderate' | 'ai' | null

/** Text types whose answers the AI Summary can group (PROTOTYPE-MAP-v3 6). */
const TEXT_TYPES = new Set<Poll['type']>(['wordcloud', 'qa'])

/*
 * Presenter / projection view (PROTOTYPE-MAP 3.7) — the signature surface.
 * A full-bleed dark projection read from the back of a room. It wraps itself in
 * data-theme="dark" so every token resolves the dark palette regardless of the
 * creator's app theme; descendants (ResultsView, AudiencePhone) stay token-driven.
 * Presentational: the route page wires the live data + host-control callbacks.
 */

/** Votable types that hide their results until the host reveals (PROTOTYPE-MAP 5.3). */
const HIDES_UNTIL_REVEAL = new Set<Poll['type']>(['choice', 'multi', 'quiz', 'nps', 'scale', 'numeric'])

export interface PresenterViewProps {
  /** The live poll; its title is the question and its type selects the viz. */
  poll: Poll
  /** Raw response rows for this poll in this session (from useResponses). */
  responses: Response[]
  /** Q&A: raw response envelopes (q.records) so cards carry their recordId. */
  qaEnvelopes?: RecordData<Response>[]
  /** Q&A: live upvote rows (from useUpvotes). */
  upvotes?: Upvote[]
  /** The join code (e.g. "PLAY42"). */
  code: string
  /** Host without scheme, e.g. "tally.app.space" (window.location.host at runtime). */
  host: string
  /** Total distinct voters counted into the current poll ("N votes in"). */
  totalVotes: number
  /** Deck title for the control bar (falls back to the question). */
  deckName: string
  /** Whether the host has revealed results to the room. */
  revealed: boolean
  /** Whether voting is locked on the current poll. */
  locked: boolean
  /** Which right-side panel is open (phone / moderate / ai), or null. */
  panel: PresenterPanel
  /** Whether this Q&A poll holds questions for review (drives the Moderate control). */
  moderated?: boolean
  /** Count of questions awaiting approval (the Moderate control's badge). */
  pendingCount?: number
  /** Whether session-wide hold-for-review is on (the Moderate panel toggle state). */
  moderationOn?: boolean
  /** AI Summary state for the current poll (held by the route page, persists across toggles). */
  ai?: { status: AiStatus; themes: AiTheme[]; total: number; error: string | null }
  /** 1-based question position in a deck; null for a single-poll session. */
  questionIndex?: number | null
  /** Total polls in the deck; null for a single-poll session. */
  questionTotal?: number | null
  /** Host controls. A non-host call 403s harmlessly server-side. */
  onReveal: () => void
  onLock: () => void
  onReset: () => void
  /** Toggle one of the mutually-exclusive right-side panels. */
  onPanel: (panel: Exclude<PresenterPanel, null>) => void
  /** Set a question's state by recordId: approve (1), return to pending (0), or dismiss (2). */
  onModerate?: (responseId: string, approved: 0 | 1 | 2) => void
  /** Flip session-wide hold-for-review (the Moderate panel toggle). */
  onToggleModerate?: (on: boolean) => void
  /** Run / refresh the AI summary for the current poll. */
  onAiRun?: () => void
  onEnd: () => void
  onPrev: () => void
  onNext: () => void
  onJump: (index: number) => void
  /** Per-button busy key so the active control shows its pending state. */
  busy?: string | null
}

/*
 * Question type scale (PROTOTYPE-MAP 1.2). The board fits a projector, so the
 * rung drops as the option list grows: xl for short questions on sparse boards;
 * sm for long questions or busy boards (> 6 options); default otherwise.
 */
function questionScaleVar(question: string, optionCount: number): string {
  const words = question.trim().split(/\s+/).filter(Boolean).length
  if (question.length > 80 || optionCount > 6) return 'var(--text-pt-question-sm)'
  if (words > 0 && words <= 6 && question.length <= 36 && optionCount <= 3) {
    return 'var(--text-pt-question-xl)'
  }
  return 'var(--text-pt-question)'
}

export function PresenterView(props: PresenterViewProps) {
  const { poll, responses, qaEnvelopes, upvotes, code, host, totalVotes } = props
  const { deckName, revealed, locked, panel, questionIndex, questionTotal } = props
  const question = poll.title
  const joinUrl = `https://${host}/v/${code}`
  const questionSize = questionScaleVar(question, poll.options.length)
  const hasDeck = questionIndex != null && questionTotal != null && questionTotal > 1
  // Votable types stay hidden until reveal; cloud / Q&A / ranking always show live.
  const hidden = HIDES_UNTIL_REVEAL.has(poll.type) && !revealed

  return (
    <div data-theme="dark" className="flex h-screen w-screen flex-col overflow-hidden bg-bg-0 text-text-1">
      <ControlBar {...props} hasDeck={hasDeck} />

      <div className="flex min-h-0 flex-1">
        {/* Main stage: sized container so the cqh/cqi scale tracks the frame. */}
        <main className="relative flex min-w-0 flex-1 flex-col" style={{ containerType: 'size' }}>
          <div className="flex min-h-0 flex-1 flex-col px-[3.2cqw] py-[4cqh]">
            <StatusRow locked={locked} />
            <div
              className="mt-[3cqh] grid min-h-0 flex-1 gap-[4cqw]"
              style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)' }}
            >
              {/* Left: oversized question + the animating result body. */}
              <div className="flex min-h-0 flex-col">
                <h1
                  className="flex-none font-display font-extrabold tracking-[-0.025em] text-text-1"
                  style={{ fontSize: questionSize, lineHeight: 1.04, textWrap: 'balance' }}
                >
                  {question}
                </h1>
                <div className="mt-[3cqh] flex min-h-0 flex-1 items-center">
                  {hidden ? (
                    <HiddenBody />
                  ) : (
                    <div className="max-h-full w-full overflow-y-auto">
                      <ResultsView poll={poll} responses={responses} qaEnvelopes={qaEnvelopes} upvotes={upvotes} scale="presenter" />
                    </div>
                  )}
                </div>
              </div>

              <JoinPanel code={code} host={host} joinUrl={joinUrl} totalVotes={totalVotes} />
            </div>

            {hasDeck && (
              <DeckNav
                index={questionIndex as number}
                total={questionTotal as number}
                onPrev={props.onPrev}
                onNext={props.onNext}
                onJump={props.onJump}
              />
            )}
          </div>
        </main>

        {panel === 'phone' && (
          <aside
            className="flex w-[320px] flex-none flex-col gap-4 border-l border-border bg-bg-nav px-[18px] py-[22px]"
            data-testid="presenter-phone-panel"
          >
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-3b">Audience view</span>
            <AudiencePhone poll={poll} />
          </aside>
        )}
        {panel === 'moderate' && (
          <ModeratePanel
            envelopes={qaEnvelopes ?? []}
            upvotes={upvotes ?? []}
            moderated={props.moderated ?? false}
            moderationOn={props.moderationOn ?? false}
            onSet={(id, approved) => props.onModerate?.(id, approved)}
            onToggleModerate={(on) => props.onToggleModerate?.(on)}
          />
        )}
        {panel === 'ai' && props.ai && (
          <AiSummaryPanel
            status={props.ai.status}
            themes={props.ai.themes}
            total={props.ai.total}
            error={props.ai.error}
            onRun={() => props.onAiRun?.()}
          />
        )}
      </div>
    </div>
  )
}

/* LIVE / LOCKED status row: a coral blink dot + a wide-tracked mono eyebrow. */
function StatusRow({ locked }: { locked: boolean }) {
  return (
    <div className="flex flex-none items-center gap-[1cqw]">
      <span
        className="inline-block rounded-full animate-tly-blink"
        style={{ width: '1.4cqh', height: '1.4cqh', background: locked ? 'var(--text-4)' : 'var(--live)' }}
        aria-hidden
      />
      <span
        className="font-mono font-medium uppercase text-text-3b"
        style={{ fontSize: '1.5cqh', letterSpacing: '0.22em' }}
      >
        {locked ? 'Locked' : 'Live'}
      </span>
    </div>
  )
}

/* Hidden-results body for a votable poll before reveal (PROTOTYPE-MAP 3.7). */
function HiddenBody() {
  return (
    <div className="flex w-full flex-col gap-[1.4cqh]">
      <p className="font-display font-extrabold text-text-5" style={{ fontSize: '3.2cqh' }}>
        Voting is open
      </p>
      <p className="text-text-7" style={{ fontSize: '2cqh' }}>
        Results are hidden. Press Reveal when you are ready.
      </p>
    </div>
  )
}

/* Top control bar: deck name + i/n, then Reveal / Lock / Reset / panels / End. */
function ControlBar(props: PresenterViewProps & { hasDeck: boolean }) {
  const { deckName, poll, revealed, locked, panel, questionIndex, questionTotal, hasDeck, busy } = props
  const isQa = poll.type === 'qa'
  const isText = TEXT_TYPES.has(poll.type)
  const moderated = props.moderated ?? false
  const pendingCount = props.pendingCount ?? 0
  return (
    <header className="flex flex-none items-center gap-3 border-b border-border px-[22px] py-[14px]">
      <BarMark size={22} />
      <span className="min-w-0 truncate font-display text-[15px] font-extrabold tracking-[-0.02em] text-text-1">
        {deckName || poll.title}
      </span>
      {hasDeck && (
        <span className="tnum font-mono text-[12px] text-text-5">
          {questionIndex} / {questionTotal}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <CtlButton
          on={revealed}
          loading={busy === 'reveal'}
          onClick={props.onReveal}
          icon={revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          label={revealed ? 'Hide' : 'Reveal'}
        />
        <CtlButton
          on={locked}
          loading={busy === 'lock'}
          onClick={props.onLock}
          icon={locked ? <Unlock aria-hidden /> : <Lock aria-hidden />}
          label={locked ? 'Unlock' : 'Lock'}
        />
        <CtlButton loading={busy === 'reset'} onClick={props.onReset} icon={<RotateCcw aria-hidden />} label="Reset" />
        <CtlButton on={panel === 'phone'} onClick={() => props.onPanel('phone')} icon={<Smartphone aria-hidden />} label="Phone" />
        {/* Moderate + AI Summary live behind a divider, only for the types they apply to. */}
        {(isQa || isText) && <span className="h-[22px] w-px bg-border-6" aria-hidden />}
        {isQa && (
          <CtlButton
            on={panel === 'moderate'}
            onClick={() => props.onPanel('moderate')}
            icon={<ShieldCheck aria-hidden />}
            label="Moderate"
            badge={moderated && pendingCount > 0 ? pendingCount : undefined}
          />
        )}
        {isText && (
          <CtlButton
            on={panel === 'ai'}
            onClick={() => props.onPanel('ai')}
            icon={<AiBadge />}
            label="Summary"
          />
        )}
        <button
          type="button"
          data-testid="presenter-end"
          onClick={props.onEnd}
          disabled={busy === 'end'}
          className="flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 font-ui text-[13px] font-semibold transition-colors disabled:opacity-60"
          style={{ background: 'var(--end-bg)', borderColor: 'var(--end-border)', color: 'var(--end-text)' }}
        >
          <Square className="h-3.5 w-3.5" aria-hidden /> End
        </button>
      </div>
    </header>
  )
}

/*
 * A presenter control toggle. "on" reads accent (border + soft wash + text);
 * idle reads a muted outline. Icons are sized down from the lucide default.
 */
function CtlButton({
  on,
  loading,
  onClick,
  icon,
  label,
  badge,
}: {
  on?: boolean
  loading?: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  /** Optional pending-count pill (moderation queue). */
  badge?: number
}) {
  return (
    <button
      type="button"
      data-testid={`presenter-ctl-${label.toLowerCase()}`}
      onClick={onClick}
      disabled={loading}
      aria-pressed={on}
      className={cn(
        'flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 font-ui text-[13px] font-semibold transition-colors disabled:opacity-60 [&_svg]:h-3.5 [&_svg]:w-3.5',
        on
          ? 'border-accent bg-accent-soft-2 text-accent'
          : 'border-border-7 text-text-2b hover:border-border-strong',
      )}
    >
      {icon}
      {label}
      {badge != null && (
        <span
          className="tnum rounded-full px-1.5 py-px font-mono text-[10px] font-bold"
          style={{ background: 'var(--live)', color: '#2a0f06' }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/* The small blue "AI" badge that marks the AI Summary control. */
function AiBadge() {
  return (
    <span className="rounded-[3px] bg-[#1e86f0] px-1 py-px font-mono text-[9px] font-bold text-white">AI</span>
  )
}

/* Join panel: "Join at <host>/v" + the mono code chip + a scannable QR on a
   white quiet-zone card + the running total-votes count. */
function JoinPanel({ code, host, joinUrl, totalVotes }: { code: string; host: string; joinUrl: string; totalVotes: number }) {
  return (
    <aside
      className="flex min-w-0 flex-col items-center justify-center gap-[2cqh] rounded-[2cqh] border border-border-3 bg-bg-2"
      style={{ padding: '2.6cqh 2cqw' }}
    >
      <div className="flex flex-col items-center gap-[1cqh]">
        <span className="font-ui text-text-3b" style={{ fontSize: '1.7cqh' }}>Join at</span>
        <span className="font-display font-extrabold tracking-[-0.01em] text-accent" style={{ fontSize: '2.8cqh' }}>
          {host}/v
        </span>
      </div>
      <CodeChip code={code} />
      <div className="rounded-[1.4cqh] bg-[#f2f5f8] p-[1.4cqh]" aria-label="Scan to join">
        <QR value={joinUrl} size={132} className="block" />
      </div>
      <div className="flex flex-col items-center gap-[0.4cqh]">
        <span className="tnum font-display font-extrabold text-text-1" style={{ fontSize: '3cqh' }}>{totalVotes}</span>
        <span className="font-ui text-text-4" style={{ fontSize: '1.5cqh' }}>votes in</span>
      </div>
    </aside>
  )
}

/* The join code in JetBrains Mono 700, large + wide-tracked, with a CODE label. */
function CodeChip({ code }: { code: string }) {
  return (
    <div className="flex max-w-full flex-col items-center gap-[0.6cqh] rounded-[1.2cqh] border border-border-5 bg-bg-track px-[2cqw] py-[1.4cqh]">
      <span className="font-mono uppercase tracking-[0.2em] text-text-5" style={{ fontSize: '1.3cqh' }}>Code</span>
      <span
        className="tnum font-mono font-bold text-text-1"
        style={{ fontSize: 'clamp(28px, 4.4cqw, 72px)', letterSpacing: '0.12em', lineHeight: 1.1 }}
      >
        {code.toUpperCase()}
      </span>
    </div>
  )
}

/* Control footer: Prev + a dot per poll (active is a wide accent pill) + Next. */
function DeckNav({
  index,
  total,
  onPrev,
  onNext,
  onJump,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onJump: (index: number) => void
}) {
  const cur = index - 1
  return (
    <div className="flex flex-none items-center justify-center gap-3.5 pt-[2.4cqh]">
      <NavEnd onClick={onPrev} disabled={cur <= 0} dir="prev" />
      <div className="flex items-center gap-2" data-testid="presenter-dots">
        {Array.from({ length: total }, (_, i) => {
          const active = i === cur
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to poll ${i + 1}`}
              aria-current={active}
              onClick={() => onJump(i)}
              className="h-2 rounded-full transition-all duration-200"
              style={{ width: active ? 22 : 8, background: active ? 'var(--accent)' : 'var(--data-muted)' }}
            />
          )
        })}
      </div>
      <NavEnd onClick={onNext} disabled={cur >= total - 1} dir="next" />
    </div>
  )
}

/* Prev (outline) / Next (accent) deck-nav button; disabled mutes at the ends. */
function NavEnd({ onClick, disabled, dir }: { onClick: () => void; disabled: boolean; dir: 'prev' | 'next' }) {
  const isNext = dir === 'next'
  return (
    <button
      type="button"
      data-testid={`presenter-${dir}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 font-ui text-[13px] font-semibold transition-colors',
        isNext
          ? 'border-transparent bg-accent text-accent-text disabled:bg-bg-3 disabled:text-text-7'
          : 'border-border-7 text-text-2b disabled:border-border-3 disabled:text-text-7',
      )}
    >
      {isNext ? (
        <>Next <ArrowRight className="h-3.5 w-3.5" aria-hidden /></>
      ) : (
        <><ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Prev</>
      )}
    </button>
  )
}
