/**
 * /deck/:id — the poll detail screen (PROTOTYPE-MAP 3.2). A 940px column:
 * breadcrumb, an editable poll title, a status chip + "N questions . last" line,
 * an action cluster (delete / voice / add existing / add question / present), and
 * the ordered question list with reorder arrows + per-question Edit / Duplicate /
 * Remove. Reorder calls the host-checked `reorderDeck` action; Present opens (or
 * reuses) a live session and routes to the presenter. Empty polls show a dashed
 * call to action.
 *
 * The collection names stay `decks` (a poll) and `polls` (a question): this screen
 * renames the vocabulary in the UI only, never in the data.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutations, useUser } from 'deepspace'
import { Mic, Plus, Play, X, Copy, ListPlus } from 'lucide-react'
import { useToast } from '../../../components/ui'
import { cn } from '../../../components/ui/utils'
import {
  AddExistingQuestions,
  TypeGlyph,
  typeMeta,
  useCreatorDecks,
  useCreatorPolls,
  useDeckSession,
} from '../../../components/creator'
import type { AttachMode, ExistingQuestion } from '../../../components/creator'
import { StartSessionSheet, type GoLiveOptions } from '../../../components/present-setup'
import { callAction } from '../../../lib/actions-client'
import { responseLabel, useLibrary } from '../../../lib/library-data'
import type { Deck, Poll } from '../../../types'

interface ActionData {
  recordId?: string
}

export default function DeckDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const ownerId = user?.id ?? ''
  const { success, error: toastError } = useToast()
  const decks = useMutations<Deck>('decks')
  const polls = useMutations<Poll>('polls')

  const { rows: deckRows, status } = useCreatorDecks()
  const { rows: pollRows } = useCreatorPolls()
  const { session, status: sessionStatus } = useDeckSession(id, ownerId)
  const { decks: deckCards, polls: pollCards } = useLibrary()

  const deckRow = useMemo(() => deckRows.find((d) => d.id === id) ?? null, [deckRows, id])
  const deck = deckRow?.deck ?? null
  const card = useMemo(() => deckCards.find((d) => d.id === id) ?? null, [deckCards, id])
  const live = !!session && session.state === 'live'

  // Resolve the deck's polls in their stored order.
  const pollById = useMemo(() => new Map(pollRows.map((p) => [p.id, p.poll])), [pollRows])
  const orderedPolls = useMemo(
    () => (deck ? deck.pollIds.map((pid) => ({ id: pid, poll: pollById.get(pid) })) : []),
    [deck, pollById],
  )

  // The polls each question already sits in. Membership lives in decks.pollIds
  // (useLibrary derives it there); polls.deckId is a back-reference nothing reads.
  const pollsByQuestion = useMemo(
    () => new Map(pollCards.map((p) => [p.id, p.deckNames])),
    [pollCards],
  )

  // Everything in the library this poll does not already hold, for the picker.
  const candidates = useMemo<ExistingQuestion[]>(() => {
    const held = new Set(deck?.pollIds ?? [])
    return pollRows
      .filter((r) => !held.has(r.id))
      .map((r) => ({
        id: r.id,
        title: r.poll.title,
        type: r.poll.type,
        inPolls: pollsByQuestion.get(r.id) ?? [],
      }))
  }, [pollRows, deck, pollsByQuestion])

  // The deck's Q&A polls, for the Start-session sheet's per-poll moderation rows.
  const setupQaPolls = useMemo(
    () =>
      orderedPolls
        .filter((row): row is { id: string; poll: Poll } => !!row.poll && row.poll.type === 'qa')
        .map((row) => ({
          id: row.id,
          question: row.poll.title || 'Untitled question',
          moderated: !!row.poll.settings.moderated,
        })),
    [orderedPolls],
  )

  // Local title mirror so renames feel instant; persisted on each input.
  const [title, setTitle] = useState('')
  const [titleLoaded, setTitleLoaded] = useState(false)
  useEffect(() => {
    if (deck && !titleLoaded) {
      setTitle(deck.title)
      setTitleLoaded(true)
    }
  }, [deck, titleLoaded])

  const [busy, setBusy] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  // Wait for the freshly opened session's code before routing to the presenter.
  const [presenting, setPresenting] = useState(false)
  useEffect(() => {
    if (presenting && session?.code) {
      setPresenting(false)
      navigate(`/present/${session.code}`)
    }
  }, [presenting, session?.code, navigate])

  if (status === 'loading' && !deck) return <Centered>Loading the poll.</Centered>
  if (!deck) return <Centered>This poll no longer exists.</Centered>

  const pollCount = deck.pollIds.length
  const deckPollIds = deck.pollIds
  const lastLabel = card?.lastPresentedLabel ?? 'Not presented yet'

  function renameDeck(next: string) {
    setTitle(next)
    void decks.put(id, { title: next.trim() || 'Untitled poll' })
  }

  async function reorder(from: number, to: number) {
    if (busy || from === to || to < 0 || to >= pollCount) return
    setBusy(true)
    const res = await callAction('reorderDeck', { deckId: id, fromIndex: from, toIndex: to })
    setBusy(false)
    if (!res.success) toastError('Could not reorder', res.error)
  }

  // Present: reuse a live session if one exists, else open the Start-session sheet.
  function present() {
    if (busy || presenting) return
    if (session?.code) {
      navigate(`/present/${session.code}`)
      return
    }
    if (pollCount === 0) return
    setSetupOpen(true)
  }

  // Go live: write the chosen Q&A moderation flags back, open the session, then
  // route once the live-session query delivers the join code.
  async function goLive(opts: GoLiveOptions) {
    if (busy || presenting) return
    setBusy(true)
    for (const q of setupQaPolls) {
      const next = opts.modByPoll[q.id]
      const poll = pollById.get(q.id)
      if (poll && next !== undefined && next !== q.moderated) {
        try {
          await polls.put(q.id, { settings: { ...poll.settings, moderated: next } })
        } catch {
          // A failed write-back is non-fatal: the poll keeps its saved moderation flag.
        }
      }
    }
    const res = await callAction<ActionData>('createSession', {
      deckId: id,
      askNames: opts.askNames,
    })
    setBusy(false)
    if (!res.success) {
      toastError('Could not start presenting', res.error)
      return
    }
    setSetupOpen(false)
    setPresenting(true)
  }

  async function deleteDeck() {
    if (busy) return
    if (!window.confirm('Delete this poll? The questions inside stay in your library.')) return
    setBusy(true)
    try {
      await decks.remove(id)
      success('Poll deleted')
      navigate('/library')
    } catch (err) {
      setBusy(false)
      toastError('Could not delete the poll', err instanceof Error ? err.message : undefined)
    }
  }

  async function duplicatePoll(poll: Poll | undefined) {
    if (!poll || busy) return
    setBusy(true)
    try {
      const copy: Poll = { ...poll, title: `${poll.title} (copy)`, deckId: '', order: Date.now() }
      const newId = await polls.create(copy)
      // Append the copy to this deck so it shows up here.
      await decks.put(id, { pollIds: [...deckPollIds, newId] })
      success('Question duplicated')
    } catch (err) {
      toastError('Could not duplicate the question', err instanceof Error ? err.message : undefined)
    }
    setBusy(false)
  }

  // Attach questions the creator already has, in the order they picked them.
  // 'share' links the same question record, so it stays in every other poll that
  // holds it; 'copy' clones each one first so edits here never touch the original.
  async function addExisting(ids: string[], mode: AttachMode) {
    if (busy || ids.length === 0) return
    setBusy(true)
    try {
      const held = new Set(deckPollIds)
      const appended: string[] = []
      for (const pid of ids) {
        if (mode === 'copy') {
          const src = pollById.get(pid)
          if (src) appended.push(await polls.create(copyOf(src, id)))
        } else if (!held.has(pid)) {
          held.add(pid)
          appended.push(pid)
        }
      }
      if (appended.length) {
        await decks.put(id, { pollIds: [...deckPollIds, ...appended] })
        success(`Added ${appended.length} ${appended.length === 1 ? 'question' : 'questions'}`)
      }
      setAddOpen(false)
    } catch (err) {
      toastError('Could not add the questions', err instanceof Error ? err.message : undefined)
    }
    setBusy(false)
  }

  // A question another poll also holds is only detached here; one this poll alone
  // holds is deleted from the library too.
  async function removeQuestion(pollId: string) {
    if (busy) return
    const shared = (pollsByQuestion.get(pollId)?.length ?? 0) > 1
    const ok = window.confirm(
      shared
        ? 'Remove this question from this poll? It stays in your library and in the other polls that use it.'
        : 'Delete this question?',
    )
    if (!ok) return
    setBusy(true)
    try {
      await decks.put(id, { pollIds: deckPollIds.filter((p) => p !== pollId) })
      if (!shared) await polls.remove(pollId)
      success(shared ? 'Removed from this poll' : 'Question deleted')
    } catch (err) {
      const what = shared ? 'Could not remove the question' : 'Could not delete the question'
      toastError(what, err instanceof Error ? err.message : undefined)
    }
    setBusy(false)
  }

  const presentLoading = busy || presenting || sessionStatus === 'loading'

  return (
    <div className="mx-auto w-full max-w-[940px] px-10 pb-[60px] pt-7">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] text-text-3">
        <button type="button" onClick={() => navigate('/library')} className="transition-colors hover:text-text-1">
          Library
        </button>
        <span aria-hidden>/</span>
        <span className="truncate text-text-2">{title || 'Untitled poll'}</span>
      </nav>

      {/* Title row + action cluster */}
      <div className="mt-3.5 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => renameDeck(e.target.value)}
            placeholder="Untitled poll"
            aria-label="Poll name"
            className="w-full bg-transparent font-display text-[30px] font-extrabold tracking-[-0.03em] text-text-1 outline-none placeholder:text-text-4"
          />
          <div className="mt-1.5 flex items-center gap-2.5">
            <StatusChip live={live} />
            <span className="tnum text-[13.5px] text-text-3">
              {pollCount} {pollCount === 1 ? 'question' : 'questions'} · {lastLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2.5 pt-1.5">
          <IconButton title="Delete poll" onClick={deleteDeck} variant="danger">
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton title="Add questions with your voice" onClick={() => navigate(`/voice?deck=${id}`)} variant="accent">
            <Mic className="h-4 w-4" aria-hidden />
          </IconButton>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={candidates.length === 0}
            data-testid="deck-add-existing"
            title={
              candidates.length === 0
                ? 'Every question in your library is already in this poll'
                : 'Add a question you already have'
            }
            className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-1 transition-colors hover:border-border-7 disabled:opacity-50"
          >
            <ListPlus className="h-4 w-4" aria-hidden /> Add existing
          </button>
          <button
            type="button"
            onClick={() => navigate(`/build?deck=${id}`)}
            className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-1 transition-colors hover:border-border-7"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add question
          </button>
          <button
            type="button"
            onClick={present}
            disabled={presentLoading}
            data-testid="deck-present"
            className="flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> Present
          </button>
        </div>
      </div>

      {/* Question list / empty state */}
      {orderedPolls.length === 0 ? (
        <div className="mt-[26px] flex w-full flex-col items-center justify-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-border-4 px-6 py-10">
          <p className="text-[14px] text-text-3">This poll is empty. Add your first question.</p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(`/build?deck=${id}`)}
              className="flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-bold text-accent-text transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" aria-hidden /> New question
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={candidates.length === 0}
              data-testid="deck-empty-add-existing"
              className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-1 transition-colors hover:border-border-7 disabled:opacity-50"
            >
              <ListPlus className="h-4 w-4" aria-hidden /> Add existing
            </button>
          </div>
        </div>
      ) : (
        <ol className="mt-[26px] flex flex-col gap-2.5">
          {orderedPolls.map((row, i) => (
            <PollRow
              key={row.id}
              index={i}
              poll={row.poll}
              isFirst={i === 0}
              isLast={i === orderedPolls.length - 1}
              onUp={() => reorder(i, i - 1)}
              onDown={() => reorder(i, i + 1)}
              onEdit={() => navigate(`/build?deck=${id}&poll=${row.id}`)}
              onDuplicate={() => duplicatePoll(row.poll)}
              onDelete={() => removeQuestion(row.id)}
              shared={(pollsByQuestion.get(row.id)?.length ?? 0) > 1}
            />
          ))}
        </ol>
      )}

      {/* Add-existing picker: attaches library questions to the end of this poll. */}
      {addOpen && (
        <AddExistingQuestions
          pollName={title || 'Untitled poll'}
          questions={candidates}
          busy={busy}
          onAdd={addExisting}
          onCancel={() => setAddOpen(false)}
        />
      )}

      {/* Start-session setup sheet: configures name + Q&A moderation, then goes live. */}
      {setupOpen && (
        <StartSessionSheet
          deckName={title || 'Untitled poll'}
          pollCount={pollCount}
          qaPolls={setupQaPolls}
          busy={busy}
          onGoLive={goLive}
          onCancel={() => setSetupOpen(false)}
        />
      )}
    </div>
  )
}

/* Ready / Draft status chip (PROTOTYPE-MAP statusMeta). */
function StatusChip({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11.5px] font-bold',
        live ? 'bg-accent-tint text-accent' : 'bg-bg-muted text-[#7a8794]',
      )}
    >
      {live ? 'Ready' : 'Draft'}
    </span>
  )
}

/* 40px square outline button in the action cluster (delete + voice). */
function IconButton({
  title,
  onClick,
  variant,
  children,
}: {
  title: string
  onClick: () => void
  variant: 'danger' | 'accent'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-10 w-10 place-content-center rounded-[10px] border border-border-4 bg-bg-2 text-text-3 transition-colors',
        variant === 'danger' ? 'hover:border-danger-border hover:text-danger' : 'text-accent hover:border-accent hover:bg-accent-tint-2',
      )}
    >
      {children}
    </button>
  )
}

/* One ordered question row: reorder arrows + number + glyph + question + actions. */
function PollRow({
  index,
  poll,
  isFirst,
  isLast,
  onUp,
  onDown,
  onEdit,
  onDuplicate,
  onDelete,
  shared,
}: {
  index: number
  poll: Poll | undefined
  isFirst: boolean
  isLast: boolean
  onUp: () => void
  onDown: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  /** True when another poll also holds this question, so removing only detaches. */
  shared: boolean
}) {
  const meta = poll ? typeMeta(poll.type) : null
  return (
    <li className="flex items-center gap-3.5 rounded-[14px] border border-border bg-bg-2 px-4 py-3.5 transition-colors hover:border-border-6">
      {/* Reorder stack */}
      <div className="flex flex-none flex-col">
        <Arrow dir="up" disabled={isFirst} onClick={onUp} />
        <Arrow dir="down" disabled={isLast} onClick={onDown} />
      </div>

      <span className="tnum w-5 flex-none text-center font-mono text-[14px] font-bold text-text-6">{index + 1}</span>

      {poll && <TypeGlyph type={poll.type} size="xl" />}

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15.5px] font-semibold text-text-1">{poll?.title || 'Question removed'}</p>
        {meta && (
          <p className="tnum truncate text-[12.5px] text-text-3">
            {meta.name} · {poll ? responseLabel(poll, 0) : ''}
          </p>
        )}
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex-none rounded-[8px] bg-bg-muted px-3 py-1.5 text-[13px] font-semibold text-text-2 transition-colors hover:bg-[#e7ebf0] hover:text-text-1"
      >
        Edit
      </button>
      <RowGlyph title="Duplicate question" onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" aria-hidden />
      </RowGlyph>
      <RowGlyph title={shared ? 'Remove from this poll' : 'Delete question'} onClick={onDelete} danger>
        <X className="h-4 w-4" aria-hidden />
      </RowGlyph>
    </li>
  )
}

/* A reorder arrow; muted + non-interactive at the list ends. */
function Arrow({ dir, disabled, onClick }: { dir: 'up' | 'down'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'up' ? 'Move up' : 'Move down'}
      className={cn(
        'grid h-[18px] w-[22px] place-content-center rounded-[5px] text-[11px] leading-none transition-colors',
        disabled ? 'cursor-default text-text-7' : 'text-text-3 hover:bg-bg-muted',
      )}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  )
}

/* 32px square glyph action (Duplicate / Remove) on a question row. */
function RowGlyph({
  title,
  onClick,
  danger,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 flex-none place-content-center rounded-[8px] text-text-3 transition-colors',
        danger ? 'hover:bg-danger-bg hover:text-danger' : 'hover:bg-bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/* A fresh copy of a question, with new option ids so votes never collide. */
function copyOf(src: Poll, deckId: string): Poll {
  const stamp = Date.now().toString(36)
  return {
    ...src,
    options: src.options.map((o, i) => ({ ...o, id: `opt-${stamp}-${i}` })),
    settings: { ...src.settings },
    deckId,
    order: Date.now(),
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[940px] px-10 pb-[60px] pt-7">
      <p className="text-[14px] text-text-3">{children}</p>
    </div>
  )
}
