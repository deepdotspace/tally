/**
 * Shared TypeScript contracts for Tally records and their type-specific
 * shapes. Imported by every wave (schemas, actions, voter, presenter, build).
 * These are the seams: change a shape here, the whole app sees it.
 *
 * Records carry an index signature so they flow through the SDK's
 * `<T extends Record<string, unknown>>` generics without per-call casts.
 * `options`/`settings`/`pollIds` are json columns: the SDK parses them on
 * read, so they are real objects/arrays here, not strings.
 */

/** The nine question types. How a poll collects and shows answers (SPEC §7). */
export type PollType =
  | 'choice' // single-select multiple choice
  | 'multi' // multi-select multiple choice
  | 'wordcloud' // open text -> live cloud
  | 'qa' // open-text Q&A with upvotes
  | 'scale' // rating / star scale
  | 'nps' // 0-10 net promoter
  | 'ranking' // reorder options
  | 'numeric' // numeric guess (average + closest)
  | 'quiz' // light quiz mode (one correct option)

/** One selectable option on a poll. `correct` is only meaningful for `quiz`. */
export interface PollOption {
  id: string
  label: string
  imageKey?: string
  correct?: boolean
}

/** Per-poll behaviour. Defaults live in config.ts; a poll may override them. */
export interface PollSettings {
  /** Show the live results to voters (vs presenter-only until reveal). */
  resultsVisible: boolean
  /** One vote per device: reject a second vote from the same deviceId. */
  dedup: boolean
  /** Let a voter change an existing vote instead of being rejected. */
  allowVoteChange: boolean
  /** Collect responses anonymously (no display name shown). */
  anonymous: boolean
  /** Hide all results until the host reveals them. */
  hideUntilReveal: boolean
  /** Scale/numeric bounds (scale, nps, numeric types). */
  min?: number
  max?: number
  /** Numeric: optional target value; the closest guess is highlighted. */
  target?: number
  /** Q&A / wordcloud: hold responses for host approval before display. */
  moderated?: boolean
  /** Optional per-poll countdown in seconds; undefined/0 = off. */
  timerSeconds?: number
  /** When voters see results: on host reveal, when the poll closes, or never. */
  revealMode?: 'manual' | 'onClose' | 'never'
}

/** A creator-owned poll (the `polls` collection). */
export interface Poll {
  title: string
  type: PollType
  options: PollOption[]
  settings: PollSettings
  deckId: string
  order: number
  ownerId: string
  [key: string]: unknown
}

/** A live session state (the `sessions` collection). The thing voters join. */
export type SessionState = 'lobby' | 'live' | 'closed'

export interface Session {
  code: string
  pollId: string
  deckId: string
  /** Snapshot taken at open: the deck title or the single poll's question (History label). */
  name: string
  state: SessionState
  currentPollId: string
  resultsRevealed: number
  locked: number
  hostId: string
  startedAt: number
  closedAt: number
  /** 0 off, 1 collect + show participant names. */
  askNames: number
  /** 0 off, 1 hold all Q&A questions for host approval (session-wide override). */
  moderateQa: number
  /** ms when the current poll began; drives the countdown timer. */
  pollStartedAt: number
  [key: string]: unknown
}

/**
 * One vote (the `responses` collection). The answer lives in the field that
 * matches the poll type: `optionId` (choice/multi/quiz), `value`
 * (scale/nps/numeric), or `text` (wordcloud/qa). `upvotes`/`approved` are
 * for Q&A. Unused fields keep their schema defaults.
 *
 * Ranking has no own field: it stores its ordered optionId array as JSON in
 * `text` (encode/decode via rankingToText/textToRanking in lib/poll-data). No
 * schema change. `approved`: 1 shows the response, 0 holds it for moderation.
 */
export interface Response {
  sessionId: string
  pollId: string
  deviceId: string
  optionId: string
  value: number
  text: string
  upvotes: number
  approved: number
  createdAt: number
  /** Participant name when the session asks for one; '' otherwise. */
  displayName: string
  [key: string]: unknown
}

/**
 * One Q&A upvote (the `upvotes` collection, S2). Append-only, one row per
 * device per question (`responseId`). Counted client-side; the `responses`
 * `upvotes` column is unused for Q&A and stays at its default.
 */
export interface Upvote {
  sessionId: string
  pollId: string
  responseId: string
  deviceId: string
  createdAt: number
  [key: string]: unknown
}

/** An ordered sequence of polls (the `decks` collection, S2). */
export interface Deck {
  title: string
  pollIds: string[]
  ownerId: string
  [key: string]: unknown
}
