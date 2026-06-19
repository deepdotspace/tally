import * as React from 'react'

import { cn } from './utils'

/*
 * Eyebrow / section label (Signal label treatment, SIGNAL-DESIGN §2.1):
 * uppercase, 0.15em tracking, bold, muted. Used for "Topics"-style section
 * headers and presenter eyebrows ("Join at", "Live"). Pass a className to
 * override size or color (e.g. presenter scale via text-pt-eyebrow).
 */
function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'font-ui text-[10.5px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]',
        className,
      )}
      {...props}
    />
  )
}

export { Eyebrow }
