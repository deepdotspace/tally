import { useLayoutEffect, useRef } from 'react'
import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Ranking results (TALLY-DESIGN §6.9). Options sorted best-first by mean rank,
 * each a numbered row: a mono rank chip (--bg-3; rank 1 reads --accent, rest
 * --text-3b) + label + an inverse-mean-rank bar (--bg-track track, leading fill
 * --accent / rest --data-muted) that tweens width 0.5s. On aggregate reorder the
 * rows FLIP (measure old top, translate, then tween) so order changes animate.
 */

export interface RankingRow {
  id: string
  label: string
  /** Mean rank across responses (1 = best). Infinity for options with no ranks. */
  meanRank: number
  count: number
}

export interface RankingProps {
  /** Rows pre-sorted best-first (aggregateRanking). */
  rows: RankingRow[]
  scale?: ResultScale
}

const SIZING: Record<ResultScale, { chip: string; chipText: string; track: string; label: string; gap: string }> = {
  presenter: {
    chip: 'h-[clamp(40px,4.4cqi,64px)] w-[clamp(40px,4.4cqi,64px)] rounded-[10px]',
    chipText: 'text-[length:var(--text-pt-eyebrow)]',
    track: 'h-[1.4cqi]',
    label: 'text-[length:var(--text-pt-option)] font-ui font-semibold',
    gap: 'gap-5',
  },
  voter: {
    chip: 'h-8 w-8 rounded-[7px]', chipText: 'text-[13px]', track: 'h-2',
    label: 'text-[15px] font-ui font-semibold', gap: 'gap-3',
  },
  dashboard: {
    chip: 'h-[22px] w-[22px] rounded-[6px]', chipText: 'text-[11px]', track: 'h-[7px]',
    label: 'text-[13.5px] font-ui', gap: 'gap-[11px]',
  },
}

export function Ranking({ rows, scale = 'dashboard' }: RankingProps) {
  const s = SIZING[scale]
  const tween = '0.5s'
  const positions = useFlip(rows.map((r) => r.id))
  const ranked = rows.filter((r) => Number.isFinite(r.meanRank))
  // Bar share is inverse mean rank: rank 1 fills most, the worst least.
  const worst = ranked.length > 0 ? Math.max(...ranked.map((r) => r.meanRank)) : 1
  const best = ranked.length > 0 ? Math.min(...ranked.map((r) => r.meanRank)) : 1

  if (rows.length === 0) {
    return <p className="text-[13px] text-text-5">No options yet.</p>
  }
  return (
    <div className={cn('flex w-full flex-col', s.gap)}>
      {rows.map((r, i) => {
        const has = Number.isFinite(r.meanRank)
        // Map [best,worst] mean rank to [100,28]% width; flat range fills full.
        const span = worst - best
        const width = has ? (span > 0 ? 28 + ((worst - r.meanRank) / span) * 72 : 100) : 0
        const isLead = i === 0
        return (
          <div
            key={r.id}
            ref={positions.ref(r.id)}
            data-testid={`ranking-row-${r.id}`}
            className="flex items-center gap-[11px]"
          >
            <span
              className={cn('inline-grid shrink-0 place-content-center bg-bg-3 font-mono font-bold tnum', s.chip, s.chipText)}
              style={{ color: isLead ? 'var(--accent)' : 'var(--text-3b)' }}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={cn('min-w-0 truncate text-text-2', s.label)}>{r.label}</span>
              <div className={cn('relative w-full overflow-hidden rounded-full bg-bg-track', s.track)}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(width)}%`,
                    background: isLead ? 'var(--accent)' : 'var(--data-muted)',
                    transition: `width ${tween} cubic-bezier(0.22, 1, 0.36, 1)`,
                    minWidth: has ? '6px' : '0',
                  }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/*
 * FLIP reorder (mirrors QaList): track each row's previous top; on reorder jump
 * each row from old to new with a transform tween at the cloud bar timing.
 */
function useFlip(ids: string[]) {
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const prevTops = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const tops = new Map<string, number>()
    for (const [id, el] of nodes.current) tops.set(id, el.getBoundingClientRect().top)
    for (const [id, el] of nodes.current) {
      const prev = prevTops.current.get(id)
      const next = tops.get(id)
      if (prev == null || next == null || prev === next) continue
      const delta = prev - next
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
      })
    }
    prevTops.current = tops
  }, [ids.join('|')])

  return {
    ref: (id: string) => (el: HTMLDivElement | null) => {
      if (el) nodes.current.set(id, el)
      else nodes.current.delete(id)
    },
  }
}
