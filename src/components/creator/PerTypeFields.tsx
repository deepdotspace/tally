import { X, Plus, Check } from 'lucide-react'
import { cn } from '../ui/utils'
import { config } from '../../config'
import type { PollOption } from '../../types'

/*
 * Per-type builder fields (PROTOTYPE-MAP 3.3 column 2). Scale exposes a min/max
 * pair; numeric adds an optional target; NPS is fixed 0 to 10. Quiz reuses the
 * options list with a tap-the-letter mark-correct so the leaderboard has an
 * answer to score against. The no-options hint lives in the page.
 */

export interface ScaleFieldsProps {
  min: number
  max: number
  onChange: (next: { min: number; max: number }) => void
  disabled?: boolean
}

/** Min/max bounds for a scale poll. */
export function ScaleFields({ min, max, onChange, disabled }: ScaleFieldsProps) {
  return (
    <div className="flex items-end gap-3">
      <NumberField label="Lowest" value={min} disabled={disabled} onChange={(v) => onChange({ min: v, max })} />
      <span className="pb-2.5 text-[13px] text-text-3">to</span>
      <NumberField label="Highest" value={max} disabled={disabled} onChange={(v) => onChange({ min, max: v })} />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-text-3">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ''}
        disabled={disabled}
        min={config.ranges.scaleMin}
        max={config.authoring.maxOptions}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
        className="tnum w-24 rounded-[11px] border-[1.5px] border-border-3 bg-bg-2 px-3.5 py-2.5 text-[15px] text-text-1 outline-none transition-colors focus:border-accent disabled:opacity-60"
      />
    </label>
  )
}

export interface NumericFieldsProps {
  min?: number
  max?: number
  target?: number
  onChange: (next: { min?: number; max?: number; target?: number }) => void
  disabled?: boolean
}

/*
 * Numeric guess bounds. All three are optional: with no min/max voters guess any
 * number; target marks the closest-guess answer. An empty input clears the value.
 */
export function NumericFields({ min, max, target, onChange, disabled }: NumericFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <OptionalNumber label="Lowest (optional)" value={min} disabled={disabled} onChange={(v) => onChange({ min: v })} />
        <OptionalNumber label="Highest (optional)" value={max} disabled={disabled} onChange={(v) => onChange({ max: v })} />
        <OptionalNumber label="Target (optional)" value={target} disabled={disabled} onChange={(v) => onChange({ target: v })} />
      </div>
      <p className="text-[12px] text-text-3">
        Voters enter a number. Tally shows the average and, when you set a target, the closest guess.
      </p>
    </div>
  )
}

/** A number input that may be empty (clears to undefined); any value allowed. */
function OptionalNumber({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value?: number
  onChange: (v: number | undefined) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-text-3">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        disabled={disabled}
        placeholder="--"
        onChange={(e) => {
          const raw = e.target.value.trim()
          if (raw === '') return onChange(undefined)
          const n = Number(raw)
          if (Number.isFinite(n)) onChange(n)
        }}
        className="tnum w-28 rounded-[11px] border-[1.5px] border-border-3 bg-bg-2 px-3.5 py-2.5 text-[15px] text-text-1 outline-none transition-colors focus:border-accent disabled:opacity-60"
      />
    </label>
  )
}

export interface QuizOptionsProps {
  options: PollOption[]
  onChange: (next: PollOption[]) => void
  disabled?: boolean
}

let quizSeq = 0
function newQuizId() {
  quizSeq += 1
  return `opt-${Date.now().toString(36)}-q${quizSeq}`
}

/*
 * Quiz options editor: the same inline list as OptionChips, but the letter
 * marker is clickable to mark the single correct answer. Exactly one may be
 * correct; picking a new one clears the rest. Without a correct option the
 * leaderboard cannot score.
 */
export function QuizOptions({ options, onChange, disabled }: QuizOptionsProps) {
  const atMax = options.length >= config.authoring.maxOptions

  function add() {
    if (atMax || disabled) return
    onChange([...options, { id: newQuizId(), label: '' }])
  }

  function update(id: string, label: string) {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  function remove(id: string) {
    onChange(options.filter((o) => o.id !== id))
  }

  function markCorrect(id: string) {
    onChange(options.map((o) => ({ ...o, correct: o.id === id })))
  }

  return (
    <div className="flex flex-col gap-[9px]">
      {options.map((o, i) => {
        const isLast = i === options.length - 1
        const correct = o.correct === true
        return (
          <div key={o.id} className="flex items-center gap-[11px]">
            <button
              type="button"
              onClick={() => markCorrect(o.id)}
              disabled={disabled}
              aria-pressed={correct}
              aria-label={correct ? 'Correct answer' : 'Mark as correct'}
              title="Mark correct"
              data-testid={`quiz-correct-${i}`}
              className={cn(
                'grid h-7 w-7 shrink-0 place-content-center rounded-[8px] font-mono text-[12px] font-bold transition-colors disabled:cursor-not-allowed',
                correct ? 'bg-correct text-white' : 'bg-bg-muted-2 text-text-2 hover:text-text-1',
              )}
            >
              {correct ? <Check className="h-3.5 w-3.5" aria-hidden /> : String.fromCharCode(65 + i)}
            </button>
            <input
              data-testid={`quiz-input-${i}`}
              value={o.label}
              disabled={disabled}
              onChange={(e) => update(o.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isLast) {
                  e.preventDefault()
                  add()
                }
              }}
              maxLength={config.authoring.maxTitleLength}
              className="min-w-0 flex-1 rounded-[11px] border-[1.5px] border-border-3 bg-bg-2 px-3.5 py-2.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-accent disabled:opacity-60"
              placeholder="Answer option"
            />
            <button
              type="button"
              onClick={() => remove(o.id)}
              disabled={disabled || options.length <= 2}
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
        disabled={atMax || disabled}
        data-testid="quiz-add"
        className={cn(
          'flex items-center gap-2 self-start rounded-[11px] border-[1.5px] border-dashed border-border-4 px-3.5 py-[9px] text-[13.5px] font-semibold text-text-2 transition-colors hover:border-accent hover:text-accent',
          (atMax || disabled) && 'cursor-not-allowed opacity-50 hover:border-border-4 hover:text-text-2',
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {atMax ? `Max ${config.authoring.maxOptions} options` : 'Add option'}
      </button>

      <p className="text-[12.5px] text-text-3">Tap a letter to mark the correct answer.</p>
    </div>
  )
}
