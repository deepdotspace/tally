import { cn } from '../ui/utils'

/*
 * Two-state segmented control (TALLY-DESIGN §5.2 settings). Mirrors the Signal
 * venue-toggle recipe: the active segment is the lime-on wash, the other stays
 * neutral. Used for per-poll settings (results-visible, dedup, allow-change).
 */
export interface SegmentedToggleProps {
  value: boolean
  onChange: (next: boolean) => void
  /** Label for the true segment (left) and false segment (right). */
  onLabel?: string
  offLabel?: string
  /** Optional stable hook for tests; lands on the wrapper. */
  'data-testid'?: string
}

export function SegmentedToggle({ value, onChange, onLabel = 'On', offLabel = 'Off', ...rest }: SegmentedToggleProps) {
  return (
    <div data-testid={rest['data-testid']} className="inline-flex rounded-[var(--radius)] border border-border bg-bg-2 p-0.5">
      <Segment active={value} onClick={() => onChange(true)}>{onLabel}</Segment>
      <Segment active={!value} onClick={() => onChange(false)}>{offLabel}</Segment>
    </div>
  )
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-[5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-text-3 hover:text-text-2',
      )}
    >
      {children}
    </button>
  )
}
