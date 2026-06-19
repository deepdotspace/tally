import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Choice / multi horizontal bars (TALLY-DESIGN §5.1). Each row: a label + an
 * Archivo-800 percentage over a #14181E track holding a 999px-radius fill. The
 * LEADING option fills --accent; non-leading fill --data-muted (voter 2nd place
 * --data-2). The viewer's own pick (voter view) always reads accent. Fills tween
 * width 0.5s cubic-bezier(0.22,1,0.36,1) so votes read as growth, never relayout.
 * Counts are JetBrains-Mono tabular. Three scales: presenter, voter, dashboard.
 */

export interface ChoiceOption {
  id: string
  label: string
  count: number
}

export interface ChoiceBarsProps {
  options: ChoiceOption[]
  /** Total responses; share = count / total. For multi this is voters, not picks. */
  total: number
  /** Multi-select: shares can sum past 100%; shows a "select up to N" hint. */
  multi?: boolean
  /** The viewer's own choice id (voter view): theirs reads accent, others mute. */
  ownChoiceId?: string
  scale?: ResultScale
}

/** Per-scale sizing for the track, labels, and counts. */
const SIZING: Record<ResultScale, { track: string; label: string; count: string; pct: string; gap: string }> = {
  presenter: {
    track: 'h-[1.7cqi]',
    label: 'text-[length:var(--text-pt-option)] font-ui font-semibold',
    count: 'text-[length:var(--text-pt-eyebrow)]',
    pct: 'text-[length:var(--text-pt-pct)]',
    gap: 'gap-5',
  },
  voter: {
    track: 'h-2',
    label: 'text-[15px] font-ui font-semibold',
    count: 'text-[13px]',
    pct: 'text-[18px]',
    gap: 'gap-3',
  },
  dashboard: {
    track: 'h-[9px]',
    label: 'text-[13.5px] font-ui',
    count: 'text-[12px]',
    pct: 'text-[15px]',
    gap: 'gap-3',
  },
}

export function ChoiceBars({ options, total, multi, ownChoiceId, scale = 'dashboard' }: ChoiceBarsProps) {
  const s = SIZING[scale]
  const tween = '0.5s'
  // The leading option (highest count) owns the accent; ties pick the first.
  const leadId = options.reduce<{ id: string; count: number }>(
    (lead, o) => (o.count > lead.count ? { id: o.id, count: o.count } : lead),
    { id: '', count: -1 },
  ).id
  return (
    <div className={cn('flex w-full flex-col', s.gap)}>
      {multi && <p className="text-[12px] text-text-5">Select up to {options.length}</p>}
      {options.map((o) => {
        const share = total > 0 ? o.count / total : 0
        const pct = Math.min(100, Math.round(share * 100))
        const isOwn = ownChoiceId != null && o.id === ownChoiceId
        const isLead = o.id === leadId
        // Voter: own pick accent, leader 2nd-place tone, rest muted. Otherwise
        // leader accent, rest muted (single-accent-owns-the-data, §0).
        const fill = ownChoiceId != null
          ? (isOwn ? 'var(--accent)' : isLead ? 'var(--data-2)' : 'var(--data-muted)')
          : (isLead ? 'var(--accent)' : 'var(--data-muted)')
        const pctAccent = ownChoiceId != null ? isOwn : isLead
        return (
          <div key={o.id} data-testid={`result-row-${o.id}`} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className={cn('min-w-0 truncate text-text-2', s.label)}>{o.label}</span>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                <span
                  key={o.count}
                  data-testid={`result-count-${o.id}`}
                  className={cn('tnum font-mono text-text-5', s.count)}
                >
                  {o.count}
                </span>
                <span
                  className={cn(
                    'tnum font-display font-extrabold tracking-[-0.02em]',
                    pctAccent ? 'text-accent' : 'text-text-1',
                    s.pct,
                  )}
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
                  background: fill,
                  transition: `width ${tween} cubic-bezier(0.22, 1, 0.36, 1)`,
                  // The smallest non-zero share still reads as a sliver of fill.
                  minWidth: o.count > 0 ? '6px' : '0',
                }}
                aria-hidden
              />
            </div>
          </div>
        )
      })}
      {options.length === 0 && <p className="text-[13px] text-text-5">No options yet.</p>}
      <span className="sr-only">{multi ? 'Multiple-choice' : 'Single-choice'} results.</span>
    </div>
  )
}
