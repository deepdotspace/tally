import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn } from '../ui/utils'
import type { VoterChoiceOption } from './VoterView'

/*
 * Per-type voter answer affordances (TALLY-DESIGN §6.3, §6.4). Each is a
 * full-width, one-thumb control: scale/nps render as the cloud mono value chips
 * (accent fill when picked), wordcloud/qa use a single text field. Pure inputs;
 * the route page owns the selection state and the writes.
 */

/** Mono value-chip recipe shared by the scale/nps buttons (§6.4). */
const TILE_BASE =
  'flex items-center justify-center rounded-[11px] border-[1.5px] font-mono font-bold tabular-nums transition-all duration-150 disabled:cursor-default'
const TILE_ON = 'border-accent bg-accent text-accent-text'
const TILE_OFF = 'border-border-4 bg-bg-card-b text-text-2b hover:border-border-7'

/* Scale: a row of value chips across [min,max]; the chosen value reads accent. */
export function ScaleInput({
  min,
  max,
  selected,
  disabled,
  onSelect,
}: {
  min: number
  max: number
  selected: number | null
  disabled?: boolean
  onSelect: (value: number) => void
}) {
  const values = rangeOf(min, max)
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((v) => (
        <button
          key={v}
          data-testid={`scale-value-${v}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(v)}
          className={cn(TILE_BASE, 'min-h-[56px] text-[18px]', selected === v ? TILE_ON : TILE_OFF)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/* NPS: eleven 0-10 tiles. Wraps to two rows on narrow screens, thumb-sized. */
export function NpsInput({
  selected,
  disabled,
  onSelect,
}: {
  selected: number | null
  disabled?: boolean
  onSelect: (value: number) => void
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {rangeOf(0, 10).map((v) => (
        <button
          key={v}
          data-testid={`nps-value-${v}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(v)}
          className={cn(TILE_BASE, 'min-h-[52px] text-[17px]', selected === v ? TILE_ON : TILE_OFF)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/* Numeric guess: one big number field. min/max are hints (placeholder + bounds),
   not a hard reject. Enter submits; the chosen value is owned above. */
export function NumericInput({
  value,
  min,
  max,
  disabled,
  onChange,
  onEnter,
}: {
  value: string
  min?: number
  max?: number
  disabled?: boolean
  onChange: (value: string) => void
  onEnter: () => void
}) {
  const hint =
    min !== undefined && max !== undefined
      ? `${min} to ${max}`
      : min !== undefined
        ? `${min} or more`
        : max !== undefined
          ? `up to ${max}`
          : 'Your number'
  return (
    <>
      <input
        data-testid="numeric-answer"
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder={hint}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          'min-h-[64px] w-full rounded-[13px] border-[1.5px] border-border-4 bg-bg-card-b px-4 py-3 text-center font-display text-[32px] font-bold tabular-nums text-text-1 outline-none transition-colors',
          'placeholder:text-[18px] placeholder:font-semibold placeholder:text-text-3b focus:border-accent disabled:opacity-50',
        )}
      />
      {(min !== undefined || max !== undefined) && (
        <p className="mt-2 text-center text-[12px] text-text-3b">Enter a number {hint.toLowerCase()}.</p>
      )}
    </>
  )
}

/* Ranking: a reorderable list the voter arranges top to bottom. Up/down buttons
   move a row (no drag dependency); the order is owned above and submitted as JSON. */
export function RankingInput({
  options,
  disabled,
  onMove,
}: {
  options: VoterChoiceOption[]
  disabled?: boolean
  onMove: (index: number, dir: -1 | 1) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o, i) => (
        <div
          key={o.id}
          data-testid={`rank-row-${o.id}`}
          className="flex min-h-[56px] items-center gap-3 rounded-[14px] border-[1.5px] border-border-4 bg-bg-card-b px-3 py-2"
        >
          <span className="grid h-7 w-7 shrink-0 place-content-center rounded-[7px] bg-accent font-mono text-[13px] font-bold tabular-nums text-accent-text">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-ui text-[15px] font-semibold text-text-1b">{o.label}</span>
          <div className="flex shrink-0 flex-col">
            <RankMoveButton dir={-1} label={`Move ${o.label} up`} disabled={disabled || i === 0} onClick={() => onMove(i, -1)} testid={`rank-up-${o.id}`}>
              <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
            </RankMoveButton>
            <RankMoveButton dir={1} label={`Move ${o.label} down`} disabled={disabled || i === options.length - 1} onClick={() => onMove(i, 1)} testid={`rank-down-${o.id}`}>
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
            </RankMoveButton>
          </div>
        </div>
      ))}
    </div>
  )
}

function RankMoveButton({
  label,
  disabled,
  onClick,
  testid,
  children,
}: {
  dir: -1 | 1
  label: string
  disabled?: boolean
  onClick: () => void
  testid: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-6 w-7 place-content-center rounded-[4px] text-text-3b transition-colors hover:bg-bg-3 hover:text-text-1 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/* Single open-text field for wordcloud + qa. Enter submits; submit owned above. */
export function TextInput({
  value,
  placeholder,
  maxLength,
  disabled,
  onChange,
  onEnter,
}: {
  value: string
  placeholder: string
  maxLength: number
  disabled?: boolean
  onChange: (value: string) => void
  onEnter: () => void
}) {
  return (
    <input
      data-testid="text-answer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter()
        }
      }}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      autoComplete="off"
      autoCorrect="off"
      className={cn(
        'min-h-[56px] w-full rounded-[13px] border-[1.5px] border-border-4 bg-bg-card-b px-4 py-3.5 font-ui text-[16px] font-medium text-text-1 outline-none transition-colors',
        'placeholder:text-text-3b focus:border-accent disabled:opacity-50',
      )}
    />
  )
}

/* The full-width accent submit shared by every answer affordance (§6.3). */
export function SubmitButton({
  label,
  counted,
  disabled,
  onClick,
}: {
  label: string
  counted?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      data-testid="vote-submit"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-4 py-3.5 font-ui text-[15px] font-bold text-accent-text transition-all duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
    >
      {counted ? (
        <>
          <Check className="h-4 w-4" strokeWidth={3} /> Counted
        </>
      ) : (
        label
      )}
    </button>
  )
}

/* Inclusive [min,max] integer range; empty (defensive) when reversed. */
function rangeOf(min: number, max: number): number[] {
  if (max < min) return []
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}
