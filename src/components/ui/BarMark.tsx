import * as React from 'react'

import { cn } from './utils'

/*
 * Tally brand mark (TALLY-DESIGN §3) — replaces the "T" letter chip. A rounded
 * accent square with three ascending bars (heights 7/12/9). Metrics scale from
 * the 26px reference so it stays proportional at any size. The bars are the
 * on-accent glyph color; in light mode that token resolves to white.
 */
export interface BarMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number
}

const REF = 26
const BARS = [7, 12, 9]

function BarMark({ size = 26, className, style, ...props }: BarMarkProps) {
  const k = size / REF
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: 7 * k,
        background: 'var(--accent)',
        ...style,
      }}
      aria-hidden
      {...props}
    >
      <span className="flex items-end" style={{ gap: 2 * k }}>
        {BARS.map((h, i) => (
          <span
            key={i}
            style={{
              width: 3 * k,
              height: h * k,
              borderRadius: 1 * k,
              background: 'var(--accent-text)',
            }}
          />
        ))}
      </span>
    </span>
  )
}

export { BarMark }
