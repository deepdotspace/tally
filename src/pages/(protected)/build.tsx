/**
 * /build — the poll builder (PROTOTYPE-MAP 3.3). A top bar (back + title +
 * Cancel + Save) over a three-column grid: a vertical list of the nine question
 * types, the question + options editor (with per-type settings), and a dark
 * audience-phone live preview. The preview hides on narrow widths. All nine
 * types are creatable; option types (choice/multi/ranking/quiz) take an options
 * editor, quiz marks one correct, and scale/nps/numeric carry their bounds.
 *
 * Entry context comes from the query string: `?deck=<id>` adds the saved poll to
 * that deck (and Cancel/Save return to it); `?poll=<id>` loads a poll to edit.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutations, useUser } from 'deepspace'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '../../components/ui'
import { cn } from '../../components/ui/utils'
import {
  TypeGrid,
  SegmentedToggle,
  OptionChips,
  ScaleFields,
  NumericFields,
  QuizOptions,
  AiGenerate,
  PreviewCard,
  usePollSession,
  useCreatorDecks,
} from '../../components/creator'
import { usePoll } from '../../lib/poll-data'
import { config } from '../../config'
import type { Deck, Poll, PollOption, PollSettings, PollType } from '../../types'

// All nine types are creatable end to end. Gated by config.questionTypes so the
// founder can hide any one type everywhere without touching code.
const ALL_TYPES: PollType[] = ['choice', 'multi', 'wordcloud', 'qa', 'scale', 'nps', 'ranking', 'numeric', 'quiz']
const ENABLED_TYPES: PollType[] = ALL_TYPES.filter((t) => config.questionTypes[t])

/** Types that take an editable list of options (choice, multi, ranking, quiz). */
function usesOptions(type: PollType) {
  return type === 'choice' || type === 'multi' || type === 'ranking' || type === 'quiz'
}

function blankOptions(): PollOption[] {
  return [
    { id: `opt-seed-1`, label: '' },
    { id: `opt-seed-2`, label: '' },
  ]
}

/**
 * Per-type setting defaults (SPEC §9). Starts from config.defaults; overrides
 * dedup (off for Q&A, one voter may ask many; on for ranking/numeric/quiz, one
 * vote each) and the scale/nps/numeric bounds. resultsVisible stays on.
 */
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
  // Numeric is an open guess: no preset bounds, the host sets optional ones.
  return base
}

export default function BuildPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('poll')
  const deckId = params.get('deck') ?? ''
  const { user } = useUser()
  const ownerId = user?.id ?? ''
  const { success, error: toastError } = useToast()
  const polls = useMutations<Poll>('polls')
  const decks = useMutations<Deck>('decks')
  // The deck this poll is authored from, so a new poll can join its running order.
  const { rows: deckRows } = useCreatorDecks()
  const targetDeck = useMemo(() => deckRows.find((d) => d.id === deckId)?.deck ?? null, [deckRows, deckId])

  const { poll: existing } = usePoll(editId ?? undefined)
  // A live session for the poll being edited locks structural edits.
  const { session } = usePollSession(editId ?? undefined, ownerId)

  const [type, setType] = useState<PollType>('choice')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<PollOption[]>(blankOptions())
  const [settings, setSettings] = useState<PollSettings>(() => defaultSettingsForType('choice'))
  const [saving, setSaving] = useState(false)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // Hydrate the form once from an existing poll when editing.
  useEffect(() => {
    if (existing && editId && loadedId !== editId) {
      setType(existing.type)
      setTitle(existing.title)
      setOptions(existing.options.length ? existing.options : blankOptions())
      setSettings({ ...defaultSettingsForType(existing.type), ...existing.settings })
      setLoadedId(editId)
    }
  }, [existing, editId, loadedId])

  const locked = !!session

  // Switching type resets the per-type fields and defaults, so a scale poll never
  // carries stale options and dedup follows the new type. Locked while live.
  function changeType(next: PollType) {
    if (next === type || locked) return
    setType(next)
    setSettings(defaultSettingsForType(next))
    setOptions(usesOptions(next) ? blankOptions() : [])
  }

  // Apply an AI draft: fill the question, and (for option types) replace the
  // option list with the generated labels. The creator edits everything after.
  function applyAiDraft(draft: { question: string; options: string[] }) {
    if (locked) return
    if (draft.question) setTitle(draft.question)
    if (usesOptions(type) && draft.options.length >= 2) {
      setOptions(draft.options.map((label, i) => ({ id: `opt-ai-${Date.now().toString(36)}-${i}`, label })))
    }
  }

  const filledOptions = useMemo(() => options.filter((o) => o.label.trim().length > 0), [options])
  const optionsValid = !usesOptions(type) || filledOptions.length >= 2
  // Quiz needs exactly one correct option among the filled ones, else the
  // leaderboard is always empty (poll-data tallyQuiz scores by the correct flag).
  const quizValid = type !== 'quiz' || filledOptions.some((o) => o.correct === true)
  const canSave = title.trim().length > 0 && optionsValid && quizValid && !saving && !!ownerId

  // Cancel/Save return to the deck this poll belongs to, else the library.
  const backTarget = deckId ? `/deck/${deckId}` : '/library'
  const backLabel = deckId ? 'Deck' : 'Library'

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    const payload: Poll = {
      title: title.trim(),
      type,
      // Option types keep their labels; quiz also keeps the correct flag. Other
      // types (wordcloud, qa, scale, nps, numeric) save with no options.
      options: usesOptions(type)
        ? filledOptions.map((o) => ({ id: o.id, label: o.label.trim(), ...(type === 'quiz' && o.correct ? { correct: true } : {}) }))
        : [],
      settings,
      deckId,
      order: existing?.order ?? Date.now(),
      ownerId,
    }
    try {
      if (editId && existing) {
        await polls.put(editId, payload)
        success('Poll saved')
      } else {
        const id = await polls.create(payload)
        // A new poll authored from a deck joins that deck's running order.
        if (deckId && targetDeck) {
          await decks.put(deckId, { pollIds: [...targetDeck.pollIds, id] })
        }
        success('Poll created')
      }
      navigate(backTarget)
    } catch (err) {
      setSaving(false)
      toastError('Could not save the poll', err instanceof Error ? err.message : undefined)
    }
  }

  const title16 = editId ? 'Edit poll' : 'New poll'
  const hasOpts = usesOptions(type)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-1">
      {/* Top bar */}
      <header className="flex flex-none items-center gap-3 border-b border-border bg-bg-2 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="flex shrink-0 items-center gap-1.5 text-[13.5px] text-text-3 transition-colors hover:text-text-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
        </button>
        <span className="h-5 w-px bg-border" aria-hidden />
        <h1 className="truncate pl-3 font-display text-[16px] font-extrabold text-text-1">{title16}</h1>
        <div className="ml-auto flex flex-none items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            className="rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2 text-[13.5px] font-semibold text-text-1 transition-colors hover:border-border-7"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="build-create"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-[10px] bg-accent px-5 py-2 text-[13.5px] font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {editId ? 'Save' : 'Create'}
          </button>
        </div>
      </header>

      {locked && (
        <p className="flex-none border-b border-border bg-bg-2 px-6 py-2 text-[12.5px] text-text-3">
          This poll has a live session. Close it to change the question or options.
        </p>
      )}

      {/* Three columns: type list / editor / dark preview. */}
      <div className="grid min-h-0 flex-1 overflow-hidden [grid-template-columns:minmax(180px,220px)_minmax(0,1fr)] xl:[grid-template-columns:minmax(190px,230px)_minmax(0,1fr)_minmax(300px,350px)]">
        {/* Column 1 — question types */}
        <aside className="min-h-0 overflow-y-auto border-r border-border bg-bg-2 px-3.5 py-[18px]">
          <Eyebrow>Question type</Eyebrow>
          <div className="mt-3">
            <TypeGrid value={type} onChange={changeType} enabled={ENABLED_TYPES} />
          </div>
        </aside>

        {/* Column 2 — editor */}
        <section className="min-h-0 overflow-y-auto px-[34px] py-[30px]">
          <div className="flex max-w-[640px] flex-col gap-7">
            <div className="flex flex-col gap-2.5">
              <Eyebrow>Question</Eyebrow>
              <textarea
                data-testid="build-question"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={config.authoring.maxTitleLength}
                disabled={locked}
                rows={2}
                placeholder="Type your question"
                className="w-full resize-none rounded-[13px] border-[1.5px] border-border-3 bg-bg-2 px-4 py-[15px] font-display text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-accent disabled:opacity-60"
              />
              {!locked && <AiGenerate type={type} onResult={applyAiDraft} />}
            </div>

            {/* Options editor or the per-type no-options hint. */}
            <div className="flex flex-col gap-2.5">
              <Eyebrow>{hasOpts ? optionsLabel(type) : 'Answers'}</Eyebrow>
              {type === 'quiz' ? (
                <QuizOptions options={options} onChange={locked ? () => {} : setOptions} disabled={locked} />
              ) : hasOpts ? (
                <OptionChips options={options} onChange={locked ? () => {} : setOptions} />
              ) : (
                <NoOptionsHint type={type} />
              )}
            </div>

            {/* Per-type bounds: scale / nps / numeric. */}
            {(type === 'scale' || type === 'nps' || type === 'numeric') && (
              <div className="flex flex-col gap-2.5">
                <Eyebrow>Range</Eyebrow>
                {type === 'numeric' ? (
                  <NumericFields
                    min={settings.min}
                    max={settings.max}
                    target={settingsTarget(settings)}
                    onChange={(b) => setSettings((s) => ({ ...s, ...b }))}
                    disabled={locked}
                  />
                ) : (
                  <ScaleFields
                    min={settings.min ?? config.ranges.scaleMin}
                    max={settings.max ?? config.ranges.scaleMax}
                    onChange={(b) => setSettings((s) => ({ ...s, ...b }))}
                    disabled={locked}
                  />
                )}
              </div>
            )}

            {/* Per-poll settings: reveal mode, results, dedup, timer, moderation. */}
            <div className="flex flex-col gap-2.5">
              <Eyebrow>Settings</Eyebrow>
              <div className="flex flex-col divide-y divide-border-2 rounded-[12px] border border-border bg-bg-2">
                <RevealRow
                  value={settings.revealMode ?? 'manual'}
                  onChange={(v) => setSettings((s) => ({ ...s, revealMode: v }))}
                />
                {(settings.revealMode ?? 'manual') === 'manual' && (
                  <SettingRow
                    label="Show results right away"
                    hint="Start with the bars visible to voters, or keep them hidden until you reveal."
                    value={settings.resultsVisible}
                    onChange={(v) => setSettings((s) => ({ ...s, resultsVisible: v }))}
                  />
                )}
                <SettingRow
                  label="One vote per device"
                  hint="Reject a second vote from the same device."
                  value={settings.dedup}
                  onChange={(v) => setSettings((s) => ({ ...s, dedup: v }))}
                />
                <TimerRow
                  value={settings.timerSeconds ?? 0}
                  onChange={(v) => setSettings((s) => ({ ...s, timerSeconds: v }))}
                />
                {type === 'qa' && (
                  <SettingRow
                    label="Hold questions for review"
                    hint="When on, questions wait for your approval before they appear on the big screen. You can also switch this while presenting."
                    value={settings.moderated ?? false}
                    onChange={(v) => setSettings((s) => ({ ...s, moderated: v }))}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Column 3 — dark audience-phone preview (hidden on narrow widths). */}
        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-bg-subtle px-[22px] py-[22px] xl:block">
          <div className="flex items-center justify-between">
            <Eyebrow>Audience sees</Eyebrow>
            <span className="font-mono text-[10px] text-text-4">PHONE</span>
          </div>
          <div className="mt-4 flex justify-center">
            <div className="w-[230px]">
              <PreviewCard type={type} question={title} options={options} />
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] text-text-3">
            A {captionTypeName(type)} poll, as it appears on a voter's phone.
          </p>
        </aside>
      </div>
    </div>
  )
}

/* Mono uppercase section eyebrow (PROTOTYPE-MAP 1.2). */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-text-3">{children}</span>
  )
}

/** Options eyebrow: "Items to rank" for ranking, "Options" otherwise. */
function optionsLabel(type: PollType): string {
  return type === 'ranking' ? 'Items to rank' : 'Options'
}

/** Lowercase type name for the preview caption. */
function captionTypeName(type: PollType): string {
  if (type === 'choice' || type === 'multi') return 'multiple choice'
  if (type === 'wordcloud') return 'word cloud'
  if (type === 'qa') return 'Q and A'
  if (type === 'scale') return 'rating'
  if (type === 'nps') return 'NPS'
  if (type === 'ranking') return 'ranking'
  if (type === 'numeric') return 'numeric'
  return 'quiz'
}

/* The no-options explainer box for wordcloud / qa / rating / nps / numeric. */
function NoOptionsHint({ type }: { type: PollType }) {
  return (
    <div className="rounded-[13px] border border-border bg-bg-muted-3 px-5 py-5 text-[14px] leading-relaxed text-text-2">
      {noOptHint(type)}
    </div>
  )
}

function noOptHint(type: PollType): string {
  switch (type) {
    case 'wordcloud':
      return 'Voters type one or two words. The most common answers grow largest on screen.'
    case 'qa':
      return 'Voters submit questions and upvote each other. The top questions rise to the top.'
    case 'scale':
      return 'Voters tap a rating from one to five stars.'
    case 'nps':
      return 'Voters pick a number from zero to ten. Tally computes your NPS automatically.'
    default:
      return 'Voters enter a number. The closest guess to the answer wins.'
  }
}

/** Read the optional numeric target off settings. */
function settingsTarget(settings: PollSettings): number | undefined {
  const t = (settings as { target?: unknown }).target
  return typeof t === 'number' ? t : undefined
}

function SettingRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-text-1">{label}</p>
        <p className="text-[12px] text-text-3">{hint}</p>
      </div>
      <SegmentedToggle value={value} onChange={onChange} />
    </div>
  )
}

type RevealMode = NonNullable<PollSettings['revealMode']>

const REVEAL_MODES: { id: RevealMode; label: string }[] = [
  { id: 'manual', label: 'Manual reveal' },
  { id: 'onClose', label: 'When the poll closes' },
  { id: 'never', label: 'Never show voters' },
]

/* Three-way reveal selector: manual / on close / never (segmented). */
function RevealRow({ value, onChange }: { value: RevealMode; onChange: (v: RevealMode) => void }) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-text-1">When voters see results</p>
        <p className="text-[12px] text-text-3">Reveal on your cue, automatically when the poll closes, or keep results on the projector only.</p>
      </div>
      <div className="inline-flex flex-wrap gap-0.5 rounded-[var(--radius)] border border-border bg-bg-1 p-0.5">
        {REVEAL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={value === m.id}
            data-testid={`reveal-${m.id}`}
            className={cn(
              'rounded-[5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              value === m.id ? 'bg-accent-tint text-accent' : 'text-text-3 hover:text-text-2',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* Optional per-poll countdown in seconds; 0 (or empty) turns it off. */
function TimerRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-text-1">Countdown</p>
        <p className="text-[12px] text-text-3">Seconds before voting auto-locks. 0 turns the timer off.</p>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value > 0 ? value : ''}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) && n > 0 ? Math.round(n) : 0)
        }}
        className="tnum w-24 shrink-0 rounded-[10px] border border-border-3 bg-bg-1 px-3 py-1.5 text-[14px] text-text-1 outline-none focus:border-accent"
      />
    </div>
  )
}
