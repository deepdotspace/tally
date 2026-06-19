/*
 * Tally theme model — two modes, dark (primary) and light.
 *
 * Mode lives on <html data-theme>. Color values live in src/themes.css; the
 * foundation is the cloud design (TALLY-DESIGN §1, §7). This file is the typed
 * metadata + the poll-type lookups screens reuse.
 */

export type ThemeMode = 'dark' | 'light'

/**
 * Tally app constants (brand mark + wordmark). The brand mark is now the
 * BarMark glyph (components/ui/BarMark.tsx); `glyph` is the legacy "T" letter
 * kept only for back-compat until usages swap to BarMark in a later wave.
 */
export const TALLY = {
  name: 'Tally',
  tag: 'Live polls',
  glyph: 'T',
} as const

/** localStorage key for the persisted mode choice. */
export const THEME_STORAGE_KEY = 'tally-theme'

/**
 * Poll types and their dashboard identity. Type identity is the mono glyph
 * (PROTOTYPE-MAP); the legacy `letter` is kept where existing screens read it.
 */
export const POLL_TYPES = [
  { id: 'choice', letter: 'C', label: 'Choice' },
  { id: 'multi', letter: 'M', label: 'Multiple choice' },
  { id: 'wordcloud', letter: 'W', label: 'Word cloud' },
  { id: 'scale', letter: 'S', label: 'Scale' },
  { id: 'nps', letter: 'N', label: 'NPS' },
  { id: 'ranking', letter: 'R', label: 'Ranking' },
  { id: 'numeric', letter: '#', label: 'Numeric' },
  { id: 'qa', letter: 'Q', label: 'Q and A' },
  { id: 'quiz', letter: '?', label: 'Quiz' },
] as const

export type PollType = (typeof POLL_TYPES)[number]['id']

/** Metadata for a poll type, or undefined for an unknown id. */
export function pollTypeMeta(id: PollType) {
  return POLL_TYPES.find((t) => t.id === id)
}
