/*
 * One review card on the board: keep toggle, a changeable type chip (opens the
 * nine-type grid), an editable question, and either an options editor (with quiz
 * correct-marking) or a short per-type hint. Mirrors the prototype review card.
 */

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '../ui/utils'
import { TYPE_ORDER, typeMeta } from '../creator/typeMeta'
import { config } from '../../config'
import type { PollType } from '../../types'
import { noOptHint, optionsLabel, retypeDraft, usesOptions } from './voice-data'
import type { VoiceDraft } from './voice-data'

export interface ReviewCardProps {
  draft: VoiceDraft
  onChange: (next: VoiceDraft) => void
  onRemove: () => void
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function ReviewCard({ draft, onChange, onRemove }: ReviewCardProps) {
  const [showType, setShowType] = useState(false)
  const meta = typeMeta(draft.type)
  const hasOpts = usesOptions(draft.type)

  function setType(next: PollType) {
    onChange(retypeDraft(draft, next))
    setShowType(false)
  }
  function setOption(i: number, label: string) {
    const options = draft.options.slice()
    options[i] = label
    onChange({ ...draft, options })
  }
  function delOption(i: number) {
    const options = draft.options.filter((_, j) => j !== i)
    const correctIndex = draft.correctIndex === i ? -1 : draft.correctIndex > i ? draft.correctIndex - 1 : draft.correctIndex
    onChange({ ...draft, options, correctIndex })
  }
  function addOption() {
    if (draft.options.length >= config.authoring.maxOptions) return
    onChange({ ...draft, options: [...draft.options, ''] })
  }

  return (
    <div
      className={cn(
        'rounded-[16px] border-[1.5px] bg-bg-2 p-[18px] transition-opacity duration-150',
        draft.keep ? 'border-border opacity-100' : 'border-border-2 opacity-50',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange({ ...draft, keep: !draft.keep })}
          aria-pressed={draft.keep}
          aria-label={draft.keep ? 'Keeping this poll' : 'Skipped'}
          className={cn(
            'grid h-6 w-6 flex-none place-content-center rounded-[7px] border-[1.5px] transition-colors',
            draft.keep ? 'border-accent bg-accent text-white' : 'border-border-6 bg-bg-2 text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </button>
        <span className={cn('text-[12.5px] font-semibold', draft.keep ? 'text-accent' : 'text-text-4')}>
          {draft.keep ? 'Keeping' : 'Skipped'}
        </span>

        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowType((s) => !s)}
            className="flex items-center gap-1.5 rounded-[8px] bg-bg-muted px-2.5 py-[5px] text-[12.5px] font-semibold text-text-2 transition-colors hover:bg-[#e7ebf0]"
          >
            <span className="font-mono" aria-hidden>{meta.glyph}</span> {meta.name} <span aria-hidden>▾</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this poll"
          className="ml-auto grid h-[30px] w-[30px] place-content-center rounded-[8px] text-text-4 transition-colors hover:bg-danger-bg hover:text-danger"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Type chip grid */}
      {showType && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TYPE_ORDER.filter((t) => config.questionTypes[t]).map((t) => {
            const m = typeMeta(t)
            const on = t === draft.type
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                  on ? 'border-accent bg-accent-tint text-accent' : 'border-border-3 bg-bg-2 text-text-2 hover:border-border-7',
                )}
              >
                <span className="font-mono" aria-hidden>{m.glyph}</span> {m.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Question */}
      <textarea
        value={draft.question}
        onChange={(e) => onChange({ ...draft, question: e.target.value })}
        rows={1}
        placeholder="Type your question"
        maxLength={config.authoring.maxTitleLength}
        className="mt-3 w-full resize-none rounded-[11px] border-[1.5px] border-border-2 bg-bg-subtle px-3.5 py-2.5 font-display text-[18px] font-bold leading-[1.25] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-accent focus:bg-bg-2"
      />

      {/* Options editor or per-type hint */}
      {hasOpts ? (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.07em] text-text-4">
            {optionsLabel(draft.type)}
          </p>
          <div className="flex flex-col gap-1.5">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => draft.type === 'quiz' && onChange({ ...draft, correctIndex: draft.correctIndex === i ? -1 : i })}
                  disabled={draft.type !== 'quiz'}
                  aria-label={draft.type === 'quiz' ? 'Mark correct' : `Option ${i + 1}`}
                  className={cn(
                    'grid h-[26px] w-[26px] flex-none place-content-center rounded-[7px] font-mono text-[12px] font-bold transition-colors',
                    draft.type === 'quiz' && draft.correctIndex === i
                      ? 'bg-[#3EC98A] text-white'
                      : 'bg-bg-muted text-text-2b',
                    draft.type === 'quiz' && 'cursor-pointer',
                  )}
                >
                  {LETTERS[i] ?? '?'}
                </button>
                <input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="min-w-0 flex-1 rounded-[9px] border-[1.5px] border-border-2 bg-bg-2 px-3 py-2 font-ui text-[14px] text-text-1 outline-none transition-colors focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => delOption(i)}
                  aria-label="Delete option"
                  className="grid h-7 w-7 flex-none place-content-center rounded-[7px] text-text-4 transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="self-start rounded-full border-[1.5px] border-dashed border-border-4 px-3 py-1.5 text-[12.5px] font-semibold text-text-3 transition-colors hover:border-accent hover:text-accent"
            >
              + Add option
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-[11px] border border-border bg-bg-muted-3 px-3.5 py-3 text-[13px] text-text-2b">
          {noOptHint(draft.type)}
        </p>
      )}
    </div>
  )
}
