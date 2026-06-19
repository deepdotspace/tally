/*
 * Poll-type identity for the cloud design (TALLY-DESIGN §6.10). Replaces the
 * per-type rainbow letter chips with a single neutral chip carrying a mono
 * glyph. One entry per PollType: the display name, a short sub-label, and the
 * glyph rendered in the chip. Data viz stays single-accent; this is identity
 * only, never a data fill.
 */
import type { PollType } from '../../types'

export interface TypeMeta {
  name: string
  sub: string
  glyph: string
}

export const TYPE_META: Record<PollType, TypeMeta> = {
  choice: { name: 'Multiple choice', sub: 'Single select', glyph: '◉' },
  multi: { name: 'Multiple choice', sub: 'Multi-select', glyph: '☑' },
  wordcloud: { name: 'Word cloud', sub: 'Short open text', glyph: 'Aa' },
  qa: { name: 'Open Q and A', sub: 'Upvotable questions', glyph: '❝' },
  scale: { name: 'Rating scale', sub: '1 to 5 or 1 to 10', glyph: '★' },
  nps: { name: 'NPS', sub: '0 to 10 likelihood', glyph: '%' },
  ranking: { name: 'Ranking', sub: 'Reorder options', glyph: '☰' },
  numeric: { name: 'Numeric guess', sub: 'Closest wins', glyph: '#' },
  quiz: { name: 'Quiz', sub: 'One correct + leaderboard', glyph: '✓' },
}

/** The nine types in builder display order (TALLY-DESIGN §6.10). */
export const TYPE_ORDER: PollType[] = [
  'choice', 'multi', 'wordcloud', 'qa', 'scale', 'nps', 'ranking', 'numeric', 'quiz',
]

export function typeMeta(type: PollType): TypeMeta {
  return TYPE_META[type]
}
