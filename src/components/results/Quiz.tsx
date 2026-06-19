import { Check } from 'lucide-react'
import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Quiz results (TALLY-DESIGN §5.1 idiom). Option bars from tallyQuiz.perOption on
 * the cloud bar recipe (#14181E track, 999px fill, width 0.5s tween): once the
 * host reveals, the correct option fills --accent + a check, the rest --data-muted;
 * pre-reveal every bar reads --accent. The leaderboard lists top devices by correct
 * count under anonymized labels. Counts/percentages are mono / Archivo-800 tabular.
 */

export interface QuizOption {
  id: string
  label: string
  count: number
  correct: boolean
}

export interface QuizLeader {
  deviceId: string
  correct: number
  /** Participant name when the session asks for one; falls back to a device tag. */
  displayName?: string
}

export interface QuizProps {
  /** Per-option tallies with the correct flag (tallyQuiz.perOption). */
  options: QuizOption[]
  /** Top devices by correct count, desc (tallyQuiz.leaderboard). */
  leaderboard: QuizLeader[]
  /** Total responses; share = count / total. */
  total: number
  /** Host has revealed: marks the correct option and shows the leaderboard. */
  revealed?: boolean
  scale?: ResultScale
}

const SIZING: Record<ResultScale, { track: string; label: string; count: string; pct: string; check: string; gap: string; lead: string; rank: string }> = {
  presenter: {
    track: 'h-[1.7cqi]', label: 'text-[length:var(--text-pt-option)] font-ui font-semibold',
    count: 'text-[length:var(--text-pt-eyebrow)]', pct: 'text-[length:var(--text-pt-pct)]',
    check: 'h-[clamp(24px,2.6vw,40px)] w-[clamp(24px,2.6vw,40px)]', gap: 'gap-5',
    lead: 'text-[length:var(--text-pt-option)]', rank: 'h-8 w-8 text-[15px]',
  },
  voter: {
    track: 'h-2', label: 'text-[15px] font-ui font-semibold', count: 'text-[13px]',
    pct: 'text-[18px]', check: 'h-5 w-5', gap: 'gap-3', lead: 'text-[14px]', rank: 'h-7 w-7 text-[13px]',
  },
  dashboard: {
    track: 'h-[9px]', label: 'text-[13.5px] font-ui', count: 'text-[12px]',
    pct: 'text-[15px]', check: 'h-4 w-4', gap: 'gap-3', lead: 'text-[13px]', rank: 'h-[22px] w-[22px] text-[11px]',
  },
}

/** Anonymized leaderboard label from a deviceId (stable, no identity leak). */
function anonLabel(deviceId: string): string {
  let h = 0
  for (let i = 0; i < deviceId.length; i++) h = (h * 31 + deviceId.charCodeAt(i)) >>> 0
  return `Player ${(h % 900) + 100}`
}

export function Quiz({ options, leaderboard, total, revealed = false, scale = 'dashboard' }: QuizProps) {
  const s = SIZING[scale]
  const tween = '0.5s'
  if (options.length === 0) {
    return <p className="text-[13px] text-text-5">No options yet.</p>
  }
  return (
    <div className={cn('flex w-full flex-col', scale === 'presenter' ? 'gap-8' : 'gap-5')}>
      <div className={cn('flex w-full flex-col', s.gap)}>
        {options.map((o) => {
          const share = total > 0 ? o.count / total : 0
          const pct = Math.min(100, Math.round(share * 100))
          // Reveal marks the correct option accent + check, others muted; pre-reveal accent.
          const isCorrect = revealed && o.correct
          const muted = revealed && !o.correct
          return (
            <div key={o.id} data-testid={`quiz-row-${o.id}`} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn('flex min-w-0 items-center gap-2.5 text-text-2', s.label)}>
                  {isCorrect && (
                    <span
                      className={cn('inline-grid shrink-0 place-content-center rounded-full', s.check)}
                      style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                      data-testid={`quiz-correct-${o.id}`}
                    >
                      <Check className="h-[0.62em] w-[0.62em]" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 truncate">{o.label}</span>
                </span>
                <span className="flex items-baseline gap-2 whitespace-nowrap">
                  <span key={o.count} className={cn('tnum font-mono text-text-5', s.count)}>
                    {o.count}
                  </span>
                  <span
                    className={cn('tnum font-display font-extrabold tracking-[-0.02em]', muted ? 'text-text-1' : 'text-accent', s.pct)}
                  >
                    {pct}%
                  </span>
                </span>
              </div>
              <div className={cn('relative w-full overflow-hidden rounded-full bg-bg-track', s.track)}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: muted ? 'var(--data-muted)' : 'var(--accent)',
                    transition: `width ${tween} cubic-bezier(0.22, 1, 0.36, 1)`,
                    minWidth: o.count > 0 ? '6px' : '0',
                  }}
                  aria-hidden
                />
              </div>
            </div>
          )
        })}
      </div>
      {revealed && leaderboard.length > 0 && (
        <div className="flex w-full flex-col gap-2.5" data-testid="quiz-leaderboard">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3b">Leaderboard</span>
          <div className="flex w-full flex-col gap-2">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.deviceId} className={cn('flex items-center gap-3', s.lead)} data-testid={`quiz-leader-${i}`}>
                <span
                  className={cn('inline-grid shrink-0 place-content-center rounded-[6px] bg-bg-3 font-mono font-bold tnum', s.rank)}
                  style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-3b)' }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-ui font-semibold text-text-1">{p.displayName || anonLabel(p.deviceId)}</span>
                <span className="tnum shrink-0 font-mono font-bold text-accent">{p.correct}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
