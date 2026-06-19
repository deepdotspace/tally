import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Word cloud (PROTOTYPE-MAP 1.1, 3.9). Center-flow Archivo words, no rotation
 * (legibility). Size + weight map count via a rank-normalized weight f; the top
 * word is --accent (800), the rest step a neutral ramp by descending rank. The
 * ramp is token-based so it resolves dark on the presenter/voter and light on
 * the session-detail page. A growing word re-tweens font-size 0.5s; color
 * crossfades. Presenter sizes in cqi (1.9 + f*5.2); voter/dashboard in px.
 */

export interface WordCloudWord {
  text: string
  count: number
}

export interface WordCloudProps {
  /** (token, count) descending by count (aggregateWordCloud output). */
  words: WordCloudWord[]
  scale?: ResultScale
}

/** Per-scale font-size range the weight maps into; presenter is cqi, rest px. */
const RANGE: Record<ResultScale, { min: number; max: number; unit: string; gap: string }> = {
  presenter: { min: 1.9, max: 7.1, unit: 'cqi', gap: 'gap-x-[2.2cqi] gap-y-[0.6cqi]' },
  voter: { min: 16, max: 40, unit: 'px', gap: 'gap-x-3 gap-y-1.5' },
  dashboard: { min: 14, max: 36, unit: 'px', gap: 'gap-x-[14px] gap-y-0.5' },
}

/*
 * Neutral ramp for non-leading words, brightest first (PROTOTYPE-MAP 1.1).
 * Token-driven so it inverts with the theme: dark gives the #E4E8EC..#79828D
 * ramp, light gives the #1E232B..#A6AEB8 ramp.
 */
const NEUTRAL_RAMP = ['var(--text-1b)', 'var(--text-2b)', 'var(--text-3b)', 'var(--text-5)']

export function WordCloud({ words, scale = 'dashboard' }: WordCloudProps) {
  const r = RANGE[scale]
  const max = words.length > 0 ? Math.max(1, ...words.map((w) => w.count)) : 1
  const min = words.length > 0 ? Math.min(...words.map((w) => w.count)) : 0
  const span = Math.max(1, max - min)
  return (
    <div
      className={cn('flex w-full flex-wrap content-center items-center justify-center', r.gap)}
      style={scale === 'dashboard' ? { minHeight: 130 } : undefined}
    >
      {words.map((w, i) => {
        // Linear weight in [0,1]; a single distinct count sits at the top size.
        const f = max === min ? 1 : (w.count - min) / span
        const size = (r.min + f * (r.max - r.min)).toFixed(2)
        const isTop = i === 0
        const color = isTop ? 'var(--accent)' : NEUTRAL_RAMP[Math.min(NEUTRAL_RAMP.length - 1, Math.floor((1 - f) * NEUTRAL_RAMP.length))]
        const weight = isTop ? 800 : f > 0.5 ? 700 : 600
        return (
          <span
            key={w.text}
            data-testid={`cloud-word-${w.text}`}
            className="font-display leading-[1.05]"
            style={{
              fontSize: `${size}${r.unit}`,
              fontWeight: weight,
              color,
              transition: 'font-size 0.5s ease, color 0.5s ease',
            }}
          >
            {w.text}
          </span>
        )
      })}
      {words.length === 0 && <p className="text-[13px] text-text-5">No words yet.</p>}
    </div>
  )
}
