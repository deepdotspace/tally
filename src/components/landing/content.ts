/*
 * Landing copy and demo data. Grounded and human: say what the product does,
 * use honest numbers, no hype, no fabricated adoption metrics, no em dashes.
 */

/** Rotating questions for the hero auto-demo (swap every 7.2s). */
export const heroPolls = [
  { q: 'Where should we hold the next offsite?', opts: ['Lisbon', 'Tokyo', 'Mexico City', 'Reykjavik'], w: [0.3, 0.34, 0.22, 0.14] },
  { q: 'Which should we build first?', opts: ['Dark mode', 'Offline sync', 'Team spaces', 'Faster search'], w: [0.24, 0.16, 0.22, 0.38] },
  { q: 'How was this morning?', opts: ['Loved it', 'Solid', 'A bit fast', 'Lost me'], w: [0.46, 0.3, 0.16, 0.08] },
]

/** Three how-it-works steps. */
export const steps = [
  {
    n: '01',
    tag: 'ASK',
    title: 'Write the question',
    body: 'Pick from nine question types and type your prompt. No setup, no slides to wire up.',
  },
  {
    n: '02',
    tag: 'SHARE',
    title: 'Drop the code',
    body: 'The room scans the QR or types six digits. They answer in one thumb, no account needed.',
  },
  {
    n: '03',
    tag: 'WATCH',
    title: 'It fills in live',
    body: 'Bars grow and counts tick as votes land. Reveal, lock, or reset whenever you want.',
  },
]

/** All nine question types named in the chip row. */
export const typeChips = [
  'Multiple choice',
  'Multi-select',
  'Word cloud',
  'Open Q&A',
  'Rating scale',
  'NPS',
  'Ranking',
  'Numeric guess',
  'Quiz',
]

/*
 * Stat counters. Tally is newly launched, so these are HONEST zero-friction
 * facts, not invented adoption numbers. Each counts up to its value on scroll.
 */
export const stats = [
  { value: 0, suffix: '', label: 'signups to vote', accent: false },
  { value: 0, suffix: '', label: 'apps to install', accent: false },
  { value: 0, suffix: '', label: 'cost to start', accent: true, display: 'Free' },
] as const
