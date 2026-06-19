import type { LibraryPollCard } from '../../lib/library-data'

/*
 * Library "All polls" row (PROTOTYPE-MAP section 3.1). A glyph tile, the
 * question with a "type . responses . deck" subline, and Edit / Duplicate /
 * Delete controls. The middle column is the edit affordance; the trailing
 * glyph buttons duplicate and delete.
 */
export interface PollRowProps {
  poll: LibraryPollCard
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function PollRow({ poll, onEdit, onDuplicate, onDelete }: PollRowProps) {
  // "Multiple choice . 0 votes . Launch deck" — deck name only when a member.
  const meta = [poll.typeName, poll.responseLabel, ...poll.deckNames.slice(0, 1)].join(' · ')
  return (
    <div className="flex items-center gap-[14px] border-b border-border-2 px-[18px] py-[14px] transition-colors last:border-b-0 hover:bg-bg-subtle">
      <span
        className="grid h-[34px] w-[34px] flex-none place-content-center rounded-[9px] bg-bg-muted font-mono text-[14px] text-text-2"
        aria-hidden
      >
        {poll.glyph}
      </span>

      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="w-full truncate text-[15px] font-semibold text-text-1">{poll.question || 'Untitled poll'}</span>
        <span className="tnum mt-0.5 truncate text-[12.5px] text-text-3">{meta}</span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex-none rounded-[8px] bg-bg-muted px-[13px] py-[7px] text-[13px] font-semibold text-text-2 transition-colors hover:bg-[#e7ebf0] hover:text-text-1"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate"
        aria-label="Duplicate poll"
        className="grid h-8 w-8 flex-none place-content-center rounded-[8px] text-[15px] text-text-3 transition-colors hover:bg-bg-muted"
      >
        ⪉
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        aria-label="Delete poll"
        className="grid h-8 w-8 flex-none place-content-center rounded-[8px] text-[16px] text-text-3 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
      >
        ×
      </button>
    </div>
  )
}
