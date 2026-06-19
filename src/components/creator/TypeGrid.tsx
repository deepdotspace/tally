import { cn } from '../ui/utils'
import { TypeGlyph } from './TypeGlyph'
import { typeMeta, TYPE_ORDER } from './typeMeta'
import type { PollType } from '../../types'

/*
 * Builder LEFT pane — the QUESTION TYPE list (PROTOTYPE-MAP 3.3 column 1). A
 * vertical column of type cards, each a mono glyph tile + name + one-line sub.
 * The selected card gets the accent border + tint wash and an accent-filled
 * glyph. Disabled types (gated by config) dim with a "Soon" sub. Selection +
 * the enabled set come from the page; this is pure presentation.
 */
export interface TypeGridProps {
  value: PollType
  onChange: (next: PollType) => void
  /** Types the builder can create end to end right now. */
  enabled: PollType[]
}

export function TypeGrid({ value, onChange, enabled }: TypeGridProps) {
  return (
    <div className="flex flex-col gap-2">
      {TYPE_ORDER.map((id) => {
        const meta = typeMeta(id)
        const isEnabled = enabled.includes(id)
        const active = value === id
        return (
          <button
            key={id}
            data-testid={`type-${id}`}
            type="button"
            disabled={!isEnabled}
            onClick={() => isEnabled && onChange(id)}
            aria-pressed={active}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[12px] border-[1.5px] px-3 py-[11px] text-left transition-all duration-150',
              active ? 'border-accent bg-accent-tint' : 'border-border bg-bg-2 hover:border-border-6',
              !isEnabled && 'cursor-not-allowed opacity-45 hover:border-border',
            )}
          >
            <TypeGlyph type={id} size="md" selected={active} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-bold text-text-1">{meta.name}</span>
              <span className="truncate text-[11.5px] text-text-3">{isEnabled ? meta.sub : 'Soon'}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
