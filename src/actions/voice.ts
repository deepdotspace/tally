/**
 * Voice server action (the signature feature). Splits one spoken or typed
 * brainstorm into MANY poll drafts. BILLS THE CALLER, never the host:
 * createDeepSpaceAI(env, provider, { authToken: callerJwt }) routes through the
 * DeepSpace proxy and charges the JWT subject, exactly like actions/ai.ts.
 * Transcription (speech/speech-to-text) is the other billed call; it runs on the
 * client via the `integration` helper and is user-billed in src/integrations.ts.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { PollType } from '../types'
import { config } from '../config'

/** The nine types the model is allowed to choose from. Anything else is dropped. */
const POLL_TYPES: PollType[] = ['choice', 'multi', 'wordcloud', 'qa', 'scale', 'nps', 'ranking', 'numeric', 'quiz']
const POLL_TYPE_SET = new Set<string>(POLL_TYPES)

/** Output cap for the draft array. Higher than config.ai's single-poll cap: one
 * recording becomes many polls, so the JSON array needs room. */
const VOICE_MAX_OUTPUT_TOKENS = 3072

/** Types that carry an editable option list. Others draft with no options. */
function usesOptions(type: PollType): boolean {
  return type === 'choice' || type === 'multi' || type === 'ranking' || type === 'quiz'
}

/** One drafted poll the review board renders and the user keeps/edits/commits. */
interface Draft {
  type: PollType
  question: string
  options: string[]
}

/** System prompt for segmentation. No em dashes: models mimic the punctuation they are fed. */
const SEGMENT_SYSTEM =
  'You turn a spoken or written brainstorm into a set of separate audience polls. ' +
  'The speaker describes several polls one after another. Split their words into ' +
  'distinct polls. For each poll choose the single best fit from these nine types: ' +
  'choice (single select), multi (select many), wordcloud (one or two open words), ' +
  'qa (open questions with upvotes), scale (rate 1 to 5), nps (0 to 10 recommend), ' +
  'ranking (reorder items), numeric (guess a number, closest wins), quiz (one ' +
  'correct option). Write a clear, plain question for each. Give 3 to 5 distinct ' +
  'options only for choice, multi, ranking, and quiz; use an empty list for the ' +
  'others. Keep the wording grounded and specific to what was said. Do not invent ' +
  'extra polls. Do not use em dashes.'

/** Pull the first balanced JSON array out of model text, tolerant of prose / code fences. */
function parseJsonArray(text: string): unknown[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Coerce a model row into a valid Draft, or null if it cannot be salvaged. */
function toDraft(row: unknown): Draft | null {
  const r = row as { type?: unknown; question?: unknown; options?: unknown }
  const question = typeof r.question === 'string' ? r.question.trim() : ''
  if (!question) return null
  const rawType = typeof r.type === 'string' ? r.type.trim().toLowerCase() : ''
  const type: PollType = POLL_TYPE_SET.has(rawType) ? (rawType as PollType) : 'choice'
  const options = usesOptions(type)
    ? (Array.isArray(r.options) ? r.options : [])
        .filter((o): o is string => typeof o === 'string')
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, config.authoring.maxOptions)
    : []
  return { type, question: question.slice(0, config.authoring.maxTitleLength), options }
}

/** Turn an AI proxy failure into a creator-facing message (402 credits is the common case). */
function aiErrorMessage(err: unknown): string {
  const e = err as { statusCode?: number; responseBody?: string; message?: string }
  const body = typeof e?.responseBody === 'string' ? e.responseBody : ''
  const msg = typeof e?.message === 'string' ? e.message : ''
  if (e?.statusCode === 402 || body.includes('Insufficient credits') || msg.includes('Insufficient credits')) {
    return 'Insufficient credits. Add credits to your account to use AI features.'
  }
  return msg ? `AI request failed: ${msg}` : 'AI request failed, try again'
}

/**
 * draftPollsFromTranscript { transcript } -> split into many poll drafts, each
 * with an inferred type, question, and options when the type needs them. Billed
 * to the caller via callerJwt. Returns { drafts } or the credits error.
 */
export const draftPollsFromTranscript: ActionHandler<Env> = async ({ params, env, callerJwt }) => {
  const transcript = String(params.transcript ?? '').trim()
  if (transcript.length < 4) return { success: false, error: 'Say or write a little more to draft polls' }

  const ai = createDeepSpaceAI(env, config.ai.provider, { authToken: callerJwt })
  const prompt = [
    'Brainstorm to split into polls:',
    transcript,
    '',
    'Return JSON only: an array of { "type": string, "question": string, "options": string[] }.',
    'One array item per poll. options is [] for types that take no options.',
  ].join('\n')

  let text: string
  try {
    const result = await generateText({
      model: ai(config.ai.generateModel),
      system: SEGMENT_SYSTEM,
      prompt,
      maxOutputTokens: VOICE_MAX_OUTPUT_TOKENS,
    })
    text = result.text
  } catch (err) {
    return { success: false, error: aiErrorMessage(err) }
  }

  const drafts = parseJsonArray(text)
    .map(toDraft)
    .filter((d): d is Draft => d !== null)
  if (drafts.length === 0) return { success: false, error: 'Could not find any polls in that, try again' }
  return { success: true, data: { drafts } }
}
