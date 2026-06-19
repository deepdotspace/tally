import { X, Plus } from 'lucide-react'
import { cn } from '../ui/utils'
import type { PollOption } from '../../types'
import { config } from '../../config'

/*
 * Editable option list for the builder (PROTOTYPE-MAP 3.3 column 2). Each row is
 * a neutral letter marker (A/B/C) + a text input; "Add option" appends a blank
 * row and Enter on the last input does the same. Empties are dropped on save, so
 * no seed row lingers. Caps at config maxOptions for UI legibility, not a cap.
 */
export interface OptionChipsProps {
  options: PollOption[]
  onChange: (next: PollOption[]) => void
}

let optionSeq = 0
function newOptionId() {
  optionSeq += 1
  return `opt-${Date.now().toString(36)}-${optionSeq}`
}

export function OptionChips({ options, onChange }: OptionChipsProps) {
  const atMax = options.length >= config.authoring.maxOptions

  function add() {
    if (atMax) return
    onChange([...options, { id: newOptionId(), label: '' }])
  }

  function update(id: string, label: string) {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  function remove(id: string) {
    onChange(options.filter((o) => o.id !== id))
  }

  return (
    <div className="flex flex-col gap-[9px]">
      {options.map((o, i) => {
        const isLast = i === options.length - 1
        return (
          <div key={o.id} className="flex items-center gap-[11px]">
            <span className="grid h-7 w-7 shrink-0 place-content-center rounded-[8px] bg-bg-muted-2 font-mono text-[12px] font-bold text-text-2">
              {String.fromCharCode(65 + i)}
            </span>
            <input
              data-testid={`option-input-${i}`}
              value={o.label}
              onChange={(e) => update(o.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isLast) {
                  e.preventDefault()
                  add()
                }
              }}
              maxLength={config.authoring.maxTitleLength}
              className="min-w-0 flex-1 rounded-[11px] border-[1.5px] border-border-3 bg-bg-2 px-3.5 py-2.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-accent"
              placeholder="Option label"
            />
            <button
              type="button"
              onClick={() => remove(o.id)}
              disabled={options.length <= 2}
              aria-label="Remove option"
              className="grid h-8 w-8 shrink-0 place-content-center rounded-[8px] text-text-4 transition-colors hover:bg-bg-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-4"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        disabled={atMax}
        data-testid="option-add"
        className={cn(
          'flex items-center gap-2 self-start rounded-[11px] border-[1.5px] border-dashed border-border-4 px-3.5 py-[9px] text-[13.5px] font-semibold text-text-2 transition-colors hover:border-accent hover:text-accent',
          atMax && 'cursor-not-allowed opacity-50 hover:border-border-4 hover:text-text-2',
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {atMax ? `Max ${config.authoring.maxOptions} options` : 'Add option'}
      </button>
    </div>
  )
}
