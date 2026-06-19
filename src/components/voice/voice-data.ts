/*
 * Voice flow types + helpers shared across the stages. A VoiceDraft is the
 * editable shape of one drafted poll on the review board; voiceDraftToPoll turns
 * a kept draft into a real Poll payload for useMutations('polls').
 */

import { config } from '../../config'
import type { Poll, PollOption, PollSettings, PollType } from '../../types'

/** The five mutually-exclusive screens, driven by stage + (record idle vs live). */
export type VoiceStage = 'record' | 'processing' | 'typed' | 'review'

/** One editable draft on the review board. `lid` is a stable local key. */
export interface VoiceDraft {
  lid: string
  type: PollType
  question: string
  options: string[]
  /** Index of the correct option (quiz only); -1 when none chosen. */
  correctIndex: number
  /** Whether this draft will be committed. */
  keep: boolean
}

/** A draft as returned by the draftPollsFromTranscript action. */
export interface RawDraft {
  type: PollType
  question: string
  options: string[]
}

/** Types that take an editable option list. Others draft with no options. */
export function usesOptions(type: PollType): boolean {
  return type === 'choice' || type === 'multi' || type === 'ranking' || type === 'quiz'
}

let lidSeq = 0
/** A stable local id for a draft card (React key + edit targeting). */
export function newLid(): string {
  lidSeq += 1
  return `d-${Date.now().toString(36)}-${lidSeq}`
}

/** Wrap action drafts into editable cards (all kept by default). */
export function toVoiceDrafts(raw: RawDraft[]): VoiceDraft[] {
  return raw.map((r) => ({
    lid: newLid(),
    type: r.type,
    question: r.question,
    options: usesOptions(r.type) ? r.options.slice() : [],
    correctIndex: -1,
    keep: true,
  }))
}

/** A blank manual draft the user fills in by hand. */
export function blankDraft(): VoiceDraft {
  return { lid: newLid(), type: 'choice', question: '', options: ['', ''], correctIndex: -1, keep: true }
}

/** Switching a draft's type resets options + the correct marker to fit it. */
export function retypeDraft(d: VoiceDraft, next: PollType): VoiceDraft {
  return {
    ...d,
    type: next,
    options: usesOptions(next) ? (d.options.length ? d.options : ['', '']) : [],
    correctIndex: -1,
  }
}

/** A draft is committable when its question is set and option types have >= 2 filled. */
export function draftValid(d: VoiceDraft): boolean {
  if (!d.question.trim()) return false
  if (!usesOptions(d.type)) return true
  return d.options.filter((o) => o.trim()).length >= 2
}

/* Per-type setting defaults, mirroring the builder so voice polls behave the same. */
function defaultSettingsForType(type: PollType): PollSettings {
  const base: PollSettings = { ...config.defaults }
  if (type === 'qa') base.dedup = false
  if (type === 'ranking' || type === 'numeric' || type === 'quiz') base.dedup = true
  if (type === 'scale') {
    base.min = config.ranges.scaleMin
    base.max = config.ranges.scaleMax
  }
  if (type === 'nps') {
    base.min = config.ranges.npsMin
    base.max = config.ranges.npsMax
  }
  return base
}

let optSeq = 0
function newOptionId(): string {
  optSeq += 1
  return `opt-v-${Date.now().toString(36)}-${optSeq}`
}

/** Convert a kept draft into a Poll payload for useMutations('polls'). */
export function voiceDraftToPoll(d: VoiceDraft, ownerId: string): Poll {
  const filled = d.options.map((o) => o.trim()).filter(Boolean)
  const options: PollOption[] = usesOptions(d.type)
    ? filled.map((label, i) => ({
        id: newOptionId(),
        label,
        ...(d.type === 'quiz' && i === d.correctIndex ? { correct: true } : {}),
      }))
    : []
  return {
    title: d.question.trim().slice(0, config.authoring.maxTitleLength),
    type: d.type,
    options,
    settings: defaultSettingsForType(d.type),
    deckId: '',
    order: Date.now(),
    ownerId,
  }
}

/** Short per-type hint for the review card when a type takes no options. */
export function noOptHint(type: PollType): string {
  switch (type) {
    case 'wordcloud':
      return 'Voters type a word or two. The common answers grow largest.'
    case 'qa':
      return 'Voters submit and upvote questions. The top ones rise.'
    case 'scale':
      return 'Voters tap a rating on the scale.'
    case 'nps':
      return 'Voters pick 0 to 10. Tally computes the NPS.'
    case 'numeric':
      return 'Voters enter a number. The closest guess wins.'
    default:
      return 'No options needed for this type.'
  }
}

/** Label above the option editor (ranking renames it). */
export function optionsLabel(type: PollType): string {
  return type === 'ranking' ? 'Items to rank' : 'Options'
}
