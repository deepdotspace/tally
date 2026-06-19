/**
 * AI summary of written answers for open-text poll cards on Session detail
 * (PROTOTYPE-MAP-v3 Feature 4, the LIGHT variant). Groups word-cloud / Q&A
 * answers into themes with proportional bars via the user-billed
 * summarizeResponses action (402 surfaces as an Insufficient-credits message).
 * The result is held in component state so it does not re-run on re-render.
 * Distinct from the presenter's dark AI panel; do not import that one.
 */

import { useState } from 'react'
import { callAction } from '../../lib/actions-client'

interface Theme {
  label: string
  count: number
  pct: number
}

type Status = 'idle' | 'loading' | 'done' | 'empty' | 'error'

interface ApiTheme {
  label: string
  count: number
}

export function SessionAiSummary({
  sessionId,
  pollId,
  responseLabel,
}: {
  sessionId: string
  pollId: string
  /** "N responses" / "N questions" copy for the loading line. */
  responseLabel: string
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [themes, setThemes] = useState<Theme[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  async function run() {
    setStatus('loading')
    setError('')
    const res = await callAction<{ themes: ApiTheme[] }>('summarizeResponses', { sessionId, pollId })
    if (!res.success || !res.data) {
      const msg = res.error ?? 'AI request failed, try again'
      // The action returns this exact phrasing when there are too few responses.
      if (/not enough/i.test(msg)) {
        setStatus('empty')
        return
      }
      setError(msg)
      setStatus('error')
      return
    }
    const raw = res.data.themes.filter((t) => t.label).slice(0, 5)
    const sum = raw.reduce((a, t) => a + (t.count > 0 ? t.count : 0), 0)
    const grouped = raw
      .map((t) => ({ label: t.label, count: Math.max(0, t.count), pct: sum ? Math.round((t.count / sum) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
    if (grouped.length === 0) {
      setError('Could not summarize, try again')
      setStatus('error')
      return
    }
    setThemes(grouped)
    setTotal(sum)
    setStatus('done')
  }

  return (
    <div className="mt-[18px] border-t border-border-2 pt-4">
      {status === 'idle' && <IdleRow onRun={run} />}
      {status === 'loading' && <LoadingRow responseLabel={responseLabel} />}
      {status === 'empty' && (
        <p className="text-[13.5px] leading-[1.5] text-text-3">
          Not enough responses yet to summarize. Themes appear once a handful more come in.
        </p>
      )}
      {status === 'error' && <ErrorRow message={error} onRun={run} />}
      {status === 'done' && <DonePanel themes={themes} total={total} />}
    </div>
  )
}

function IdleRow({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onRun}
        className="group flex items-center gap-[9px] rounded-[10px] border border-border bg-bg-muted-3 px-3.5 py-[9px] text-[13.5px] font-semibold text-text-1 transition-colors hover:border-accent hover:text-accent"
      >
        <AiBadge />
        Summarize answers into themes
      </button>
      <span className="text-[12px] text-text-4">Uses a few of your AI credits</span>
    </div>
  )
}

function LoadingRow({ responseLabel }: { responseLabel: string }) {
  return (
    <div className="flex items-center gap-[11px]">
      <span
        className="h-[18px] w-[18px] rounded-full"
        style={{
          border: '2.5px solid var(--border-4)',
          borderTopColor: '#1E86F0',
          animation: 'rs-spin 0.8s linear infinite',
        }}
        aria-hidden
      />
      <span className="text-[13.5px] text-text-2">Reading {responseLabel} and grouping them into themes</span>
    </div>
  )
}

function ErrorRow({ message, onRun }: { message: string; onRun: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[13.5px] text-danger">{message}</span>
      <button type="button" onClick={onRun} className="text-[13px] font-semibold text-accent hover:underline">
        Try again
      </button>
    </div>
  )
}

function DonePanel({ themes, total }: { themes: Theme[]; total: number }) {
  return (
    <div>
      <div className="mb-3.5 flex items-center gap-[9px]">
        <span
          className="rounded-[6px] px-2 py-[3px] font-mono text-[10px] font-bold tracking-[0.08em]"
          style={{ color: '#1E86F0', background: '#EAF3FE' }}
        >
          AI SUMMARY
        </span>
        <span className="tnum text-[12px] text-text-4">{total} responses grouped &middot; a few credits used</span>
      </div>
      {themes.map((t, i) => (
        <div key={`${t.label}-${i}`} className="mb-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14.5px] font-semibold text-text-1">{t.label}</span>
            <span className="tnum font-mono text-[13px] font-bold" style={{ color: '#1E86F0' }}>
              {t.count}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: '#EAEDF1' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${t.pct}%`, background: '#1E86F0', transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The small "AI" badge that leads the Summarize button (light variant). */
function AiBadge() {
  return (
    <span
      className="rounded-[4px] px-[5px] py-[2px] font-mono text-[10px] font-bold leading-none text-white"
      style={{ background: '#1E86F0' }}
    >
      AI
    </span>
  )
}
