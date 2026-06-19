import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Scale histogram (TALLY-DESIGN §5.2). One vertical bar per value across the
 * inclusive [min,max] range; height = share of the busiest bucket, tweened
 * height 0.5s cubic-bezier(0.22,1,0.36,1). Bar color defaults to --accent; NPS
 * passes colorFor to paint the coral/neutral/accent zones (§1.6). The index
 * label under each bar is JetBrains-Mono. An Archivo-800 average call-out sits
 * top-right when showAverage. Counts are mono tabular.
 */

export interface ScaleBucket {
  value: number
  count: number
}

export interface ScaleHistogramProps {
  /** Per-value buckets across [min,max], every value present (aggregateScale). */
  buckets: ScaleBucket[]
  /** Mean of all in-range votes; shown in the average call-out. */
  average: number
  scale?: ResultScale
  /** Optional per-value bar color (NPS coral-band zones); default --accent. */
  colorFor?: (value: number) => string
  /** Whether to show the Archivo-800 average call-out (hidden for NPS). */
  showAverage?: boolean
}

const SIZING: Record<ResultScale, { track: string; index: string; count: string; avg: string; unit: string }> = {
  presenter: {
    track: 'h-[clamp(160px,26vh,360px)]',
    index: 'text-[length:var(--text-pt-eyebrow)]',
    count: 'text-[length:var(--text-pt-eyebrow)]',
    avg: 'text-[length:var(--text-pt-count)]',
    unit: 'text-[length:var(--text-pt-eyebrow)]',
  },
  voter: { track: 'h-[90px]', index: 'text-[9px]', count: 'text-[11px]', avg: 'text-[28px]', unit: 'text-[12px]' },
  dashboard: { track: 'h-[64px]', index: 'text-[8px]', count: 'text-[11px]', avg: 'text-[28px]', unit: 'text-[12px]' },
}

export function ScaleHistogram({
  buckets,
  average,
  scale = 'dashboard',
  colorFor,
  showAverage = true,
}: ScaleHistogramProps) {
  const s = SIZING[scale]
  const max = buckets.length > 0 ? Math.max(1, ...buckets.map((b) => b.count)) : 1
  return (
    <div className={cn('flex w-full flex-col', scale === 'presenter' ? 'gap-6' : 'gap-3')}>
      {showAverage && (
        <div className="flex items-baseline gap-1.5">
          <span className={cn('tnum font-display font-extrabold leading-none tracking-[-0.02em] text-accent', s.avg)}>
            {average.toFixed(1)}
          </span>
          <span className={cn('text-text-5', s.unit)}>avg</span>
        </div>
      )}
      <div className={cn('flex w-full items-end gap-1', s.track)}>
        {buckets.map((b) => {
          const heightPct = Math.round((b.count / max) * 100)
          return (
            <div key={b.value} data-testid={`scale-bucket-${b.value}`} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px] rounded-b-[2px]"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: '3px',
                    background: colorFor ? colorFor(b.value) : 'var(--accent)',
                    opacity: 0.9,
                    transition: 'height 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  aria-hidden
                />
              </div>
              <span className={cn('tnum font-mono text-text-6', s.index)}>{b.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
