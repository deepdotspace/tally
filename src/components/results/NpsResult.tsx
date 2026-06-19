import { ScaleHistogram, type ScaleBucket } from './ScaleHistogram'
import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * NPS result (PROTOTYPE-MAP 3.9). A big NPS score (Archivo 800 --accent) beside
 * the average (Archivo 800 --text-1), then the 0-10 histogram colored by ZONE
 * hue, not opacity: 0-6 = --live coral (detractor), 7-8 = neutral grey passive
 * (--text-4, token-driven so it reads on dark + light), 9-10 = --accent
 * (promoter). Numbers are mono tabular.
 */

export interface NpsResultProps {
  score: number
  promoters: number
  passives: number
  detractors: number
  total: number
  /** Mean of all 0-10 ratings; shown beside the NPS score. */
  average: number
  /** 0-10 histogram buckets (aggregateScale over 0..10). */
  buckets: ScaleBucket[]
  scale?: ResultScale
}

/* Coral-band zone color by value (PROTOTYPE-MAP 3.9): detractor / passive / promoter. */
function npsZone(value: number): string {
  if (value <= 6) return 'var(--live)'
  if (value <= 8) return 'var(--text-4)'
  return 'var(--accent)'
}

const SIZING: Record<ResultScale, { score: string; unit: string; gap: string }> = {
  presenter: { score: 'text-[length:var(--text-pt-count)]', unit: 'text-[length:var(--text-pt-eyebrow)]', gap: 'gap-8' },
  voter: { score: 'text-[44px]', unit: 'text-[13px]', gap: 'gap-4' },
  dashboard: { score: 'text-[32px]', unit: 'text-[12px]', gap: 'gap-3.5' },
}

export function NpsResult({ score, average, buckets, scale = 'dashboard' }: NpsResultProps) {
  const s = SIZING[scale]
  return (
    <div className={cn('flex w-full flex-col', s.gap)}>
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2" data-testid="nps-split">
        <Stat value={score} unit="NPS" accent sizing={s} />
        <Stat value={Number(average.toFixed(1))} unit="avg" sizing={s} />
      </div>
      <ScaleHistogram buckets={buckets} average={average} scale={scale} colorFor={npsZone} showAverage={false} />
    </div>
  )
}

/* One big number + its unit; the NPS score reads accent, the average text-1. */
function Stat({ value, unit, accent, sizing }: { value: number; unit: string; accent?: boolean; sizing: { score: string; unit: string } }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn('tnum font-display font-extrabold leading-none tracking-[-0.02em]', accent ? 'text-accent' : 'text-text-1', sizing.score)}>
        {value}
      </span>
      <span className={cn('text-text-5', sizing.unit)}>{unit}</span>
    </span>
  )
}
