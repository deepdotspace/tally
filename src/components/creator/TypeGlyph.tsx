import { cn } from '../ui/utils'
import { typeMeta } from './typeMeta'
import type { PollType } from '../../types'

/*
 * Neutral type-glyph tile: a muted square with the type's mono glyph (identity
 * only, never a data fill). Selected flips to the accent fill (builder type
 * card). Sizes match the prototype: sm = deck card (26px), md = builder type
 * card (30px), lg = library poll row (34px), xl = deck-poll row (38px).
 */
const SIZE = {
  sm: { box: 'h-[26px] w-[26px] rounded-[7px]', text: 'text-[12px]' },
  md: { box: 'h-[30px] w-[30px] rounded-[8px]', text: 'text-[15px]' },
  lg: { box: 'h-[34px] w-[34px] rounded-[9px]', text: 'text-[14px]' },
  xl: { box: 'h-[38px] w-[38px] rounded-[10px]', text: 'text-[15px]' },
} as const

export interface TypeGlyphProps {
  type: PollType
  size?: keyof typeof SIZE
  selected?: boolean
  className?: string
}

export function TypeGlyph({ type, size = 'md', selected = false, className }: TypeGlyphProps) {
  const s = SIZE[size]
  // Builder card uses inset-2 neutral; list rows use the inset (bg-muted) neutral.
  const neutral = size === 'md' ? 'bg-bg-muted-2 text-text-2' : 'bg-bg-muted text-text-2'
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-content-center font-mono font-bold leading-none transition-colors',
        s.box,
        s.text,
        selected ? 'bg-accent text-accent-text' : neutral,
        className,
      )}
      aria-hidden
    >
      {typeMeta(type).glyph}
    </span>
  )
}
