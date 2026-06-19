import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Numeric results (TALLY-DESIGN §6.9). A running AVERAGE call-out (Archivo 800
 * --accent, the single accent data point) over a binned histogram whose bars are
 * neutral --data-muted (numeric is not zoned), tweened height 0.5s. When the poll
 * set a target the CLOSEST guess shows in a neutral chip. Numbers are mono tabular.
 */

export interface NumericBucket {
  lo: number
  hi: number
  count: number
}

export interface NumericProps {
  /** Histogram buckets across the observed range (aggregateNumeric). */
  buckets: NumericBucket[]
  /** Running mean of all guesses. */
  average: number
  /** Closest guess to the target, when the poll set one. */
  closest?: { value: number }
  scale?: ResultScale
}

const SIZING: Record<ResultScale, { avg: string; eyebrow: string; track: string; callout: string }> = {
  presenter: {
    avg: 'text-[length:var(--text-pt-count)]', eyebrow: 'text-[length:var(--text-pt-eyebrow)]',
    track: 'h-[clamp(120px,22vh,300px)]', callout: 'text-[length:var(--text-pt-option)]',
  },
  voter: { avg: 'text-[38px]', eyebrow: 'text-[12px]', track: 'h-[90px]', callout: 'text-[16px]' },
  dashboard: { avg: 'text-[38px]', eyebrow: 'text-[12px]', track: 'h-[46px]', callout: 'text-[15px]' },
}

/** Trim trailing zeros so 12.00 reads as 12 but 12.50 stays 12.5. */
function fmt(n: number): string {
  return Number(n.toFixed(1)).toString()
}

export function Numeric({ buckets, average, closest, scale = 'dashboard' }: NumericProps) {
  const s = SIZING[scale]
  const tween = '0.5s'
  const max = buckets.length > 0 ? Math.max(1, ...buckets.map((b) => b.count)) : 1
  return (
    <div className={cn('flex w-full flex-col', scale === 'presenter' ? 'gap-6' : 'gap-3')}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className={cn('text-text-5', s.eyebrow)}>Average guess</span>
          <span
            key={average}
            className={cn('tnum font-display font-extrabold leading-[1.1] tracking-[-0.02em] text-accent', s.avg)}
            data-testid="numeric-average"
          >
            {fmt(average)}
          </span>
        </div>
        {closest && (
          <div className="flex flex-col items-end gap-1" data-testid="numeric-closest">
            <span className={cn('text-text-5', s.eyebrow)}>Closest</span>
            <span className={cn('flex items-center gap-2 font-display font-extrabold tracking-[-0.02em] text-text-1', s.callout)}>
              <span className="tnum">{fmt(closest.value)}</span>
            </span>
          </div>
        )}
      </div>
      {buckets.length === 0 ? (
        <p className="text-[13px] text-text-5">No guesses yet.</p>
      ) : (
        <div className={cn('flex w-full items-end gap-1', s.track)}>
          {buckets.map((b, i) => {
            const heightPct = Math.max(4, Math.round((b.count / max) * 100))
            return (
              <div
                key={i}
                data-testid={`numeric-bucket-${i}`}
                className="rounded-t-[3px] rounded-b-[1px]"
                style={{
                  flex: 1,
                  height: `${heightPct}%`,
                  minHeight: '3px',
                  background: 'var(--data-muted)',
                  transition: `height ${tween} cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
                aria-hidden
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
