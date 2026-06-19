import * as React from 'react'

/*
 * Drawn microphone glyph (PROTOTYPE-MAP: the voice mic button). A capsule body
 * with a stand and base, stroked in currentColor so callers set the tint via
 * text color. Used by the sidebar voice button; other surfaces reuse it.
 */
export function MicGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
