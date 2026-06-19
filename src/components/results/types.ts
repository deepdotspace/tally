/*
 * Results module viz prop contract. The viz components (ChoiceBars, WordCloud,
 * ScaleHistogram, NpsResult, QaList) take these pre-shaped inputs. ResultsView
 * is the one place that touches the domain Poll/Response (it aggregates raw
 * rows via lib/poll-data); the viz components below stay domain-agnostic.
 */

/** Poll types ResultsView can render. Mirrors themes.ts PollType by value. */
export type ResultsPollType =
  | 'choice'
  | 'multi'
  | 'wordcloud'
  | 'scale'
  | 'nps'
  | 'ranking'
  | 'numeric'
  | 'qa'
  | 'quiz'

/** Render context: presenter (room), voter (mobile), dashboard (compact). */
export type ResultScale = 'presenter' | 'voter' | 'dashboard'

/** One result row: an option/answer with its tally (ChoiceBars input). */
export interface ResultOption {
  id: string
  label: string
  count: number
}
