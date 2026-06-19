import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import {
  createSession,
  advanceDeck,
  revealResults,
  lockSession,
  resetPoll,
  closeSession,
  setResponseApproved,
  setSessionModeration,
  reorderDeck,
  cloneDeck,
} from './sessions'
import { submitVote } from './votes'
import { summarizeResponses, generatePoll } from './ai'
import { draftPollsFromTranscript } from './voice'

export const actions: Record<string, ActionHandler<Env>> = {
  // Session lifecycle + host control (host-only, ownership re-checked server-side)
  createSession,
  advanceDeck,
  revealResults,
  lockSession,
  resetPoll,
  closeSession,
  // Deck editing: reorder polls within a deck; clone a deck + its polls (Run again)
  reorderDeck,
  cloneDeck,
  // Q&A moderation: host approves/hides a held response (approve-before-show)
  setResponseApproved,
  // Q&A moderation: flip session-wide hold-for-review live from the presenter
  setSessionModeration,

  // Voting (authoritative dedup + rate-limit)
  submitVote,

  // AI (signed-in only, billed to the caller via callerJwt, never the host)
  summarizeResponses,
  generatePoll,
  // Voice: split a spoken/typed brainstorm into many poll drafts (caller-billed)
  draftPollsFromTranscript,
}
