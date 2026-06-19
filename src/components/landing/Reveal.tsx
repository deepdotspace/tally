/*
 * Scroll reveal. Fades + lifts its children in once they enter the viewport
 * (the prototype's tlyReveal). Honors reduced-motion by rendering visible with
 * no transform. `delay` staggers siblings; `onReveal` fires once on entry.
 */

import { type ReactNode, useEffect, useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

export function Reveal({
  children,
  delay = 0,
  y = 40,
  onReveal,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  onReveal?: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  const reduce = useReducedMotion()
  const shown = inView || reduce

  useEffect(() => {
    if (shown) onReveal?.()
  }, [shown, onReveal])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: `translate3d(0, ${shown ? 0 : y}px, 0)`,
        transition: reduce
          ? 'none'
          : `opacity .8s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .8s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
