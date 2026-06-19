import { useLayoutEffect, useRef } from 'react'
import { ArrowBigUp } from 'lucide-react'
import { cn } from '../ui/utils'
import type { ResultScale } from './types'

/*
 * Q&A list (TALLY-DESIGN §6.9). One column of cards (bg --bg-card-b, border
 * --border-2b, radius 12px) pre-sorted by upvotes (qaItems). Each card carries a
 * vote column: a --accent up-chevron over a mono tabular count. Question text
 * wraps fully (readable on the projector); the asker's name shows beneath it when
 * the session collected one. The voter view passes onUpvote/hasUpvoted (the column
 * becomes a button, accent-soft active wash); presenter/dashboard omit them
 * (read-only). On reorder the cards FLIP so the list animates instead of jumping.
 */

export interface QaCard {
  recordId: string
  text: string
  upvotes: number
  /** Participant name when the session asks for one; '' / undefined hides it. */
  displayName?: string
}

export interface QaListProps {
  items: QaCard[]
  scale?: ResultScale
  /** Voter view only: cast an upvote for a question (the seam for W-voter-S2). */
  onUpvote?: (responseId: string) => void
  /** Whether this device already upvoted a question (disables its button). */
  hasUpvoted?: (responseId: string) => boolean
}

const SIZING: Record<ResultScale, { card: string; text: string; count: string; gap: string; name: string }> = {
  presenter: {
    card: 'px-[1.4cqi] py-[1.1cqi] gap-[1.4cqi]',
    text: 'text-[length:var(--text-pt-option)] font-ui leading-[1.3]',
    count: 'text-[length:var(--text-pt-eyebrow)]',
    gap: 'gap-3',
    name: 'text-[length:var(--text-pt-eyebrow)]',
  },
  voter: { card: 'px-3 py-3 gap-3', text: 'text-[15px] font-ui leading-snug', count: 'text-[14px]', gap: 'gap-2.5', name: 'text-[12px]' },
  dashboard: { card: 'px-3 py-[11px] gap-[11px]', text: 'text-[13.5px] font-ui leading-[1.3]', count: 'text-[13px]', gap: 'gap-[9px]', name: 'text-[11.5px]' },
}

export function QaList({ items, scale = 'dashboard', onUpvote, hasUpvoted }: QaListProps) {
  const s = SIZING[scale]
  const positions = useFlip(items.map((i) => i.recordId))

  if (items.length === 0) {
    return <p className="text-[13px] text-text-5">No questions yet.</p>
  }
  return (
    <div className={cn('flex w-full flex-col', s.gap)}>
      {items.map((q) => {
        const voted = hasUpvoted?.(q.recordId) ?? false
        return (
          <div
            key={q.recordId}
            ref={positions.ref(q.recordId)}
            data-testid={`qa-card-${q.recordId}`}
            className={cn('flex items-start rounded-[12px] border border-border-2b bg-bg-card-b', s.card)}
          >
            <VoteColumn count={q.upvotes} countClass={s.count} voted={voted} onUpvote={onUpvote ? () => onUpvote(q.recordId) : undefined} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className={cn('min-w-0 break-words text-text-2', s.text)}>{q.text}</p>
              {q.displayName && (
                <span className={cn('font-ui text-text-5', s.name)}>{q.displayName}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Up-chevron over a mono count. A button on the voter view, static otherwise. */
function VoteColumn({ count, countClass, voted, onUpvote }: { count: number; countClass: string; voted: boolean; onUpvote?: () => void }) {
  const inner = (
    <>
      <ArrowBigUp className="h-[1.2em] w-[1.2em]" strokeWidth={2.25} aria-hidden style={{ color: 'var(--accent)' }} />
      <span className={cn('tnum font-mono font-bold text-text-1', countClass)}>{count}</span>
    </>
  )
  const base = 'flex shrink-0 flex-col items-center gap-px'
  if (!onUpvote) {
    return <span className={cn(base, 'min-w-[30px]')}>{inner}</span>
  }
  return (
    <button
      type="button"
      onClick={onUpvote}
      disabled={voted}
      aria-pressed={voted}
      className={cn(base, 'rounded-[11px] border px-3 py-[7px] transition-all duration-150 disabled:cursor-default')}
      style={{
        borderColor: voted ? 'var(--accent)' : 'var(--border-6)',
        background: voted ? 'var(--accent-soft-2)' : 'transparent',
      }}
    >
      {inner}
    </button>
  )
}

/*
 * FLIP reorder: track each row's previous top; on reorder, jump each row from
 * its old position to the new one with a transform tween at the cloud timing.
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
      // Next frame, clear the transform so it tweens to its real position.
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
