/**
 * AI server actions (SPEC §7 S4). Both BILL THE CALLER, never the host:
 * createDeepSpaceAI(env, provider, { authToken: callerJwt }) routes through the
 * DeepSpace proxy and charges the JWT subject (worker.d.ts DeepSpaceAIOptions).
 * The /api/actions route already requires a JWT, so both are signed-in only.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Response } from '../types'
import { config } from '../config'
import { queryRecords } from './_helpers'

/** Fewest text responses worth summarizing; below this we skip the model. */
const MIN_RESPONSES_TO_SUMMARIZE = 3

/** Pull the first balanced JSON object out of model text, tolerant of prose. */
function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
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
 * summarizeResponses { sessionId, pollId } -> group a poll's open-text / Q&A
 * answers into themes. Returns { themes: { label, count }[] }. Returns a clear
 * failure (no model call) when there are too few text responses.
 */
export const summarizeResponses: ActionHandler<Env> = async ({ params, tools, env, callerJwt }) => {
  const sessionId = String(params.sessionId ?? '')
  const pollId = String(params.pollId ?? '')
  if (!sessionId || !pollId) return { success: false, error: 'sessionId and pollId required' }

  const rows = await queryRecords<Response>(tools, 'responses', { where: { sessionId, pollId } })
  const texts = rows.map((r) => (r.data.text ?? '').trim()).filter(Boolean)
  if (texts.length < MIN_RESPONSES_TO_SUMMARIZE) {
    return { success: false, error: 'Not enough text responses to summarize yet' }
  }

  const ai = createDeepSpaceAI(env, config.ai.provider, { authToken: callerJwt })
  const prompt = [
    'Responses to group into themes (one per line):',
    ...texts.map((t) => `- ${t}`),
    '',
    'Return JSON only: { "themes": [{ "label": string, "count": number }] }.',
  ].join('\n')

  let text: string
  try {
    const result = await generateText({
      model: ai(config.ai.summaryModel),
      system: config.ai.prompts.summarize,
      prompt,
      maxOutputTokens: config.ai.maxOutputTokens,
    })
    text = result.text
  } catch (err) {
    return { success: false, error: aiErrorMessage(err) }
  }

  const parsed = parseJsonObject(text) as { themes?: unknown } | null
  const rawThemes = Array.isArray(parsed?.themes) ? parsed.themes : []
  const themes = rawThemes
    .map((t) => t as { label?: unknown; count?: unknown })
    .map((t) => ({
      label: typeof t.label === 'string' ? t.label.trim() : '',
      count: typeof t.count === 'number' && t.count > 0 ? Math.round(t.count) : 0,
    }))
    .filter((t) => t.label)
  if (themes.length === 0) return { success: false, error: 'Could not summarize, try again' }
  return { success: true, data: { themes } }
}

/**
 * generatePoll { topic, type? } -> one poll question + a small set of distinct
 * options the builder can prefill. Returns { question, options }.
 */
export const generatePoll: ActionHandler<Env> = async ({ params, env, callerJwt }) => {
  const topic = String(params.topic ?? '').trim()
  if (!topic) return { success: false, error: 'topic required' }
  const type = typeof params.type === 'string' ? params.type : ''

  const ai = createDeepSpaceAI(env, config.ai.provider, { authToken: callerJwt })
  const prompt = [
    `Topic: ${topic}`,
    type ? `Poll type: ${type}` : '',
    'Return JSON only: { "question": string, "options": string[] }.',
    'Use 3 to 5 distinct options.',
  ]
    .filter(Boolean)
    .join('\n')

  let text: string
  try {
    const result = await generateText({
      model: ai(config.ai.generateModel),
      system: config.ai.prompts.generatePoll,
      prompt,
      maxOutputTokens: config.ai.maxOutputTokens,
    })
    text = result.text
  } catch (err) {
    return { success: false, error: aiErrorMessage(err) }
  }

  const parsed = parseJsonObject(text) as { question?: unknown; options?: unknown } | null
  const question = typeof parsed?.question === 'string' ? parsed.question.trim() : ''
  const options = (Array.isArray(parsed?.options) ? parsed.options : [])
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, config.authoring.maxOptions)
  if (!question || options.length < 2) return { success: false, error: 'Could not generate a poll, try again' }
  return { success: true, data: { question, options } }
}
