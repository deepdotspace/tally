/**
 * Tally config — the single place the founder tunes the app (SPEC §9).
 * Every limit, flag, default, and AI parameter lives here. No magic numbers
 * anywhere else in the codebase.
 *
 * Tally has NO feature caps (unlimited polls, participants, and responses are
 * a product promise, SPEC §3.10). The only limits below are soft anti-abuse
 * guards, not feature gates.
 */

import type { PollType, PollSettings } from './types'

export const config = {
  /**
   * Anti-abuse guards only. NOT feature caps. A free polling app has no money
   * at stake, so these stay generous; they exist to blunt a scripted flood,
   * not to limit real classrooms or events.
   */
  antiAbuse: {
    /** Soft per-session participant ceiling (distinct deviceIds). Generous. */
    maxParticipants: 5000,
    /** Vote rate-limit: at most `maxVotes` writes per `windowMs` per deviceId. */
    rateLimit: {
      maxVotes: 20,
      windowMs: 10_000,
    },
  },

  /** Authoring limits that protect the UI, not the product promise. */
  authoring: {
    /** Max options on a choice/multi/ranking poll (UI legibility, not a cap). */
    maxOptions: 26,
    /** Max characters in a question title. */
    maxTitleLength: 280,
    /** Max characters in an open-text / wordcloud / Q&A response. */
    maxResponseLength: 280,
    /** Join-code length and alphabet (no ambiguous chars: no 0/O/1/I). */
    joinCodeLength: 6,
    joinCodeAlphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    /** Attempts to mint a non-colliding join code before giving up. */
    joinCodeMaxAttempts: 6,
  },

  /**
   * Per-question-type feature flags. Turn a type off to hide it everywhere
   * (builder, voter, presenter) without touching code. Staged per SPEC §7:
   * S1 (choice) on; S2/S3 default on; quiz is the bounded last item.
   */
  questionTypes: {
    choice: true,
    multi: true,
    wordcloud: true,
    qa: true,
    scale: true,
    nps: true,
    ranking: true,
    numeric: true,
    quiz: true,
  } satisfies Record<PollType, boolean>,

  /** Default per-poll settings. A poll may override any of these at build time. */
  defaults: {
    resultsVisible: true,
    dedup: true,
    anonymous: true,
    moderated: false,
    revealMode: 'manual',
  } satisfies PollSettings,

  /**
   * Live-session recency model. The presenter beats `heartbeatMs`; a session is
   * stale (abandoned) once `activeTimeoutMs` passes with no beat (~2 missed beats).
   */
  session: {
    heartbeatMs: 60_000,
    activeTimeoutMs: 120_000,
  },

  /** Scale / NPS / numeric bounds used when a poll does not set its own. */
  ranges: {
    scaleMin: 1,
    scaleMax: 5,
    npsMin: 0,
    npsMax: 10,
  },

  /**
   * Moderation source for Q&A / open text (S3). The profanity list is a local
   * word list the moderation helper imports; swap the source here to change it.
   */
  moderation: {
    profanityListSource: 'src/lib/profanity-list' as const,
  },

  /**
   * AI features (S4) bill the END USER for their own usage (SPEC §2). Gated to
   * signed-in creators. Models + token caps are cost-relevant; verify before
   * relying on them.
   */
  ai: {
    // Provider must be one of createDeepSpaceAI's: 'anthropic' | 'openai' | 'cerebras'
    // (worker.d.ts Provider). Google/Gemini does NOT route through the proxy.
    provider: 'anthropic' as const,
    // Cheap Anthropic model, proven through the proxy in signal + the-platform.
    summaryModel: 'claude-haiku-4-5',
    generateModel: 'claude-haiku-4-5',
    // Output cap (maxOutputTokens). Generous for grouped themes / one poll.
    maxOutputTokens: 1024,
    prompts: {
      // No em dashes in any prompt: models mimic the punctuation they are fed.
      summarize:
        'You are summarizing open-ended audience responses to a single poll question. ' +
        'Group similar answers into a few clear themes. For each theme give a short label ' +
        'and an approximate count. Keep it grounded and specific. Do not invent responses. ' +
        'Do not use em dashes.',
      generatePoll:
        'You generate audience-poll questions for a live classroom or event. ' +
        'Given a topic, produce one clear question and a small set of distinct, ' +
        'plausible options. Keep the wording plain and grounded. Do not use em dashes.',
    },
  },
} as const

export type Config = typeof config
