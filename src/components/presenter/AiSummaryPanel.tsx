/*
 * AI Summary panel (PROTOTYPE-MAP-v3 6b) — groups a text poll's answers into a
 * few themes with proportional bars. A right-side dark column. On demand it runs
 * summarizeResponses, which BILLS THE SIGNED-IN HOST for their own usage. The
 * result is held by the route page per poll, so toggling the panel does not
 * re-run the model. States: idle -> loading -> done | empty. Lives inside the
 * presenter's data-theme="dark" wrapper, so tokens resolve the dark palette.
 */

/** A grouped theme with its share of the total, computed from the action's counts. */
export interface AiTheme {
  label: string
  count: number
  pct: number
}

/** Per-poll summary status held by the route page (persists across toggles). */
export type AiStatus = 'idle' | 'loading' | 'done' | 'empty'

export interface AiSummaryPanelProps {
  status: AiStatus
  themes: AiTheme[]
  /** Total responses grouped (sum of theme counts). */
  total: number
  /** A failure message (e.g. insufficient credits); shown under the run button. */
  error: string | null
  /** Run / refresh the summary for the current poll. */
  onRun: () => void
}

export function AiSummaryPanel({ status, themes, total, error, onRun }: AiSummaryPanelProps) {
  return (
    <aside
      className="flex w-[340px] flex-none flex-col overflow-hidden border-l border-border bg-bg-nav"
      data-testid="presenter-ai-panel"
    >
      <header className="flex flex-none items-center gap-2 border-b border-border p-5">
        <AiBadge />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-5">Response themes</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {status === 'idle' && <Idle onRun={onRun} error={error} />}
        {status === 'loading' && <Loading />}
        {status === 'empty' && (
          <p className="text-[13.5px] leading-[1.55] text-text-5">
            Not enough responses yet. Once a handful more come in, you can group them into themes.
          </p>
        )}
        {status === 'done' && <Done themes={themes} total={total} onRun={onRun} error={error} />}
      </div>
    </aside>
  )
}

/* The small blue "AI" badge that marks every AI affordance. */
function AiBadge() {
  return (
    <span className="rounded-[3px] bg-[#1e86f0] px-1 py-px font-mono text-[9px] font-bold text-white">AI</span>
  )
}

/* Idle: a blurb, the Summarize-now button, and the credit note. */
function Idle({ onRun, error }: { onRun: () => void; error: string | null }) {
  return (
    <div>
      <p className="text-[13.5px] leading-[1.55] text-text-3b">
        Read every written answer and group it into a few clear themes, so you can grasp the room at a glance.
      </p>
      <button
        type="button"
        data-testid="ai-summarize-run"
        onClick={onRun}
        className="mt-4 w-full rounded-[11px] bg-accent py-3 text-center text-[14px] font-bold text-accent-text transition-colors hover:bg-[#3d9bfa]"
      >
        Summarize now
      </button>
      {error ? (
        <p className="mt-2.5 text-center text-[11.5px] text-live">{error}</p>
      ) : (
        <p className="mt-2.5 text-center text-[11.5px] text-text-5">Uses a few of your AI credits</p>
      )}
    </div>
  )
}

/* Loading: a spinner over a status line. */
function Loading() {
  return (
    <div className="flex flex-col items-center py-[30px]">
      <span
        className="h-[30px] w-[30px] rounded-full border-[3px] border-border-3 border-t-accent"
        style={{ animation: 'var(--animate-rs-spin)' }}
        aria-hidden
      />
      <p className="mt-4 text-[13.5px] text-text-3b">Grouping responses</p>
    </div>
  )
}

/* Done: the grouped themes with proportional bars + a Refresh link. */
function Done({
  themes,
  total,
  onRun,
  error,
}: {
  themes: AiTheme[]
  total: number
  onRun: () => void
  error: string | null
}) {
  return (
    <div>
      <p className="tnum mb-4 text-[12px] text-text-5">{total} responses grouped</p>
      {themes.map((t, i) => (
        <div key={i} className="mb-[15px]">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[14px] font-semibold text-text-1b">{t.label}</span>
            <span className="tnum font-mono text-[13px] font-bold text-accent">{t.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-track">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${t.pct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        data-testid="ai-summarize-refresh"
        onClick={onRun}
        className="text-[12.5px] text-text-5 transition-colors hover:text-accent"
      >
        Refresh themes
      </button>
      {error && <p className="mt-2 text-[11.5px] text-live">{error}</p>}
    </div>
  )
}
