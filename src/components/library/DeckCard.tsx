import type { LibraryDeckCard } from '../../lib/library-data'
import { StatusChip } from './StatusChip'

/*
 * Library deck card (PROTOTYPE-MAP section 3.1). White rounded card: a status
 * chip + poll count, the deck name, a row of up to five type-glyph tiles, and a
 * footer with the last-presented label and a "Present" pill. Clicking the card
 * opens the deck; the Present pill opens a session without selecting the card.
 */
export interface DeckCardProps {
  deck: LibraryDeckCard
  onOpen: () => void
  onPresent: () => void
}

export function DeckCard({ deck, onOpen, onPresent }: DeckCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group flex cursor-pointer flex-col rounded-[16px] border border-border bg-bg-2 p-[18px] transition-[border-color,box-shadow] duration-150 hover:border-border-6 hover:shadow-[0_8px_24px_-14px_rgba(20,30,50,0.25)]"
    >
      {/* Status + poll count. */}
      <div className="flex items-center justify-between">
        <StatusChip status={deck.status} />
        <span className="tnum font-mono text-[12px] text-text-4">
          {deck.pollCount} {deck.pollCount === 1 ? 'poll' : 'polls'}
        </span>
      </div>

      {/* Name. */}
      <h3 className="mt-[13px] font-display text-[18px] font-bold leading-[1.2] tracking-[-0.01em] text-text-1">
        {deck.name}
      </h3>

      {/* Type-glyph row (first five polls). */}
      {deck.glyphs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {deck.glyphs.map((g, i) => (
            <span
              key={i}
              className="grid h-[26px] w-[26px] place-content-center rounded-[7px] bg-bg-muted font-mono text-[12px] text-text-2"
              aria-hidden
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Footer: last presented + Present pill. */}
      <div className="mt-[14px] flex items-center justify-between border-t border-border-2 pt-[14px]">
        <span className="text-[12.5px] text-text-3">{deck.lastPresentedLabel}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPresent()
          }}
          className="flex items-center gap-1.5 rounded-[8px] bg-accent-tint px-[13px] py-[7px] text-[13px] font-bold text-accent transition-colors hover:bg-[var(--accent-tint-hover)]"
        >
          <span aria-hidden className="text-[9px] leading-none">
            ▶
          </span>
          Present
        </button>
      </div>
    </div>
  )
}
