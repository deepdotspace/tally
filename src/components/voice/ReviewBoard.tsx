/*
 * Stage E: the review board, the destination of every path. A header (count +
 * Record more + Add manually), the scrollable draft list with an "Add another"
 * card, and a commit footer with the destination picker (New deck / library /
 * an existing deck) and the "Add N polls" button.
 */

import { Mic, Plus } from 'lucide-react'
import { cn } from '../ui/utils'
import { ReviewCard } from './ReviewCard'
import { draftValid } from './voice-data'
import type { VoiceDraft } from './voice-data'

/** A destination chip: a special target or one of the user's decks. */
export interface DestChip {
  id: string
  label: string
}

export interface ReviewBoardProps {
  drafts: VoiceDraft[]
  onChangeDraft: (lid: string, next: VoiceDraft) => void
  onRemoveDraft: (lid: string) => void
  onAddManual: () => void
  onRecordMore: () => void
  /** Non-null when voice was opened from a deck; pins the destination to it. */
  fromDeckName: string | null
  destChips: DestChip[]
  dest: string
  onDest: (id: string) => void
  busy: boolean
  onCommit: () => void
}

export function ReviewBoard({
  drafts,
  onChangeDraft,
  onRemoveDraft,
  onAddManual,
  onRecordMore,
  fromDeckName,
  destChips,
  dest,
  onDest,
  busy,
  onCommit,
}: ReviewBoardProps) {
  const keptValid = drafts.filter((d) => d.keep && draftValid(d))
  const keptCount = keptValid.length
  const countLabel = `${drafts.length} ${drafts.length === 1 ? 'poll' : 'polls'} drafted`

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex-none px-7 pb-3.5 pt-[22px]">
        <div className="mx-auto flex max-w-[760px] items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-text-1">Review your polls</h1>
            <p className="mt-1 text-[14px] text-text-2">
              {countLabel}. Keep the ones you like, edit anything, skip the rest.
            </p>
          </div>
          <div className="flex flex-none items-center gap-2.5">
            <button
              type="button"
              onClick={onRecordMore}
              className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-3.5 py-2 text-[13.5px] font-semibold text-text-2 transition-colors hover:border-accent hover:text-text-1"
            >
              <Mic className="h-4 w-4 text-accent" aria-hidden /> Record more
            </button>
            <button
              type="button"
              onClick={onAddManual}
              className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-3.5 py-2 text-[13.5px] font-semibold text-text-2 transition-colors hover:border-border-7 hover:text-text-1"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add manually
            </button>
          </div>
        </div>
      </div>

      {/* Draft list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-5 pt-1">
        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {drafts.map((d) => (
            <ReviewCard
              key={d.lid}
              draft={d}
              onChange={(next) => onChangeDraft(d.lid, next)}
              onRemove={() => onRemoveDraft(d.lid)}
            />
          ))}
          <button
            type="button"
            onClick={onAddManual}
            data-testid="voice-add-manual"
            className="rounded-[14px] border-[1.5px] border-dashed border-border-4 px-4 py-4 text-center text-[13.5px] font-semibold text-text-3 transition-colors hover:border-accent hover:text-accent"
          >
            + Add another poll
          </button>
        </div>
      </div>

      {/* Commit footer */}
      <div className="flex-none border-t border-border bg-bg-2 px-7 py-3.5">
        <div className="mx-auto flex max-w-[760px] items-center gap-4">
          <div className="min-w-0 flex-1">
            {fromDeckName ? (
              <p className="text-[13.5px] text-text-2">
                Adding to <span className="font-bold text-text-1">{fromDeckName}</span>
              </p>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="flex-none text-[13px] text-text-3">Add to</span>
                <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1">
                  {destChips.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onDest(c.id)}
                      className={cn(
                        'flex-none rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                        dest === c.id
                          ? 'border-accent bg-accent-tint text-accent'
                          : 'border-border-3 bg-bg-2 text-text-2 hover:border-border-7',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCommit}
            disabled={keptCount === 0 || busy}
            data-testid="voice-commit"
            className="flex-none rounded-[11px] bg-accent px-5 py-2.5 text-[14.5px] font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? 'Adding…' : `Add ${keptCount} ${keptCount === 1 ? 'poll' : 'polls'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
