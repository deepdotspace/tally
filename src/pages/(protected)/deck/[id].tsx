/**
 * /deck/:id — the deck detail screen (PROTOTYPE-MAP 3.2). A 940px column:
 * breadcrumb, an editable deck title, a status chip + "N polls . last" line, an
 * action cluster (delete / voice / add poll / present), and the ordered poll
 * list with reorder arrows + per-poll Edit / Duplicate / Delete. Reorder calls
 * the host-checked `reorderDeck` action; Present opens (or reuses) a live
 * session and routes to the presenter. Empty decks show a dashed call to action.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutations, useUser } from 'deepspace'
import { Mic, Plus, Play, X, Copy } from 'lucide-react'
import { useToast } from '../../../components/ui'
import { cn } from '../../../components/ui/utils'
import { TypeGlyph, typeMeta, useCreatorDecks, useCreatorPolls, useDeckSession } from '../../../components/creator'
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
  const { decks: deckCards } = useLibrary()

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
  // Wait for the freshly opened session's code before routing to the presenter.
  const [presenting, setPresenting] = useState(false)
  useEffect(() => {
    if (presenting && session?.code) {
      setPresenting(false)
      navigate(`/present/${session.code}`)
    }
  }, [presenting, session?.code, navigate])

  if (status === 'loading' && !deck) return <Centered>Loading the deck.</Centered>
  if (!deck) return <Centered>This deck no longer exists.</Centered>

  const pollCount = deck.pollIds.length
  const deckPollIds = deck.pollIds
  const lastLabel = card?.lastPresentedLabel ?? 'Not presented yet'

  function renameDeck(next: string) {
    setTitle(next)
    void decks.put(id, { title: next.trim() || 'Untitled deck' })
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
    if (!window.confirm('Delete this deck? The polls inside stay in your library.')) return
    setBusy(true)
    try {
      await decks.remove(id)
      success('Deck deleted')
      navigate('/library')
    } catch (err) {
      setBusy(false)
      toastError('Could not delete the deck', err instanceof Error ? err.message : undefined)
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
      success('Poll duplicated')
    } catch (err) {
      toastError('Could not duplicate the poll', err instanceof Error ? err.message : undefined)
    }
    setBusy(false)
  }

  async function deletePoll(pollId: string) {
    if (busy) return
    if (!window.confirm('Delete this poll?')) return
    setBusy(true)
    try {
      await decks.put(id, { pollIds: deckPollIds.filter((p) => p !== pollId) })
      await polls.remove(pollId)
      success('Poll deleted')
    } catch (err) {
      toastError('Could not delete the poll', err instanceof Error ? err.message : undefined)
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
        <span className="truncate text-text-2">{title || 'Untitled deck'}</span>
      </nav>

      {/* Title row + action cluster */}
      <div className="mt-3.5 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => renameDeck(e.target.value)}
            placeholder="Untitled deck"
            aria-label="Deck name"
            className="w-full bg-transparent font-display text-[30px] font-extrabold tracking-[-0.03em] text-text-1 outline-none placeholder:text-text-4"
          />
          <div className="mt-1.5 flex items-center gap-2.5">
            <StatusChip live={live} />
            <span className="tnum text-[13.5px] text-text-3">
              {pollCount} {pollCount === 1 ? 'poll' : 'polls'} · {lastLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2.5 pt-1.5">
          <IconButton title="Delete deck" onClick={deleteDeck} variant="danger">
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton title="Create a poll with your voice" onClick={() => navigate(`/voice?deck=${id}`)} variant="accent">
            <Mic className="h-4 w-4" aria-hidden />
          </IconButton>
          <button
            type="button"
            onClick={() => navigate(`/build?deck=${id}`)}
            className="flex items-center gap-1.5 rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-1 transition-colors hover:border-border-7"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add poll
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

      {/* Poll list / empty state */}
      {orderedPolls.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate(`/build?deck=${id}`)}
          className="mt-[26px] flex w-full flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-border-4 px-6 py-10 text-[14px] text-text-3 transition-colors hover:border-accent hover:text-accent"
        >
          This deck is empty. Add your first poll.
        </button>
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
              onDelete={() => deletePoll(row.id)}
            />
          ))}
        </ol>
      )}

      {/* Start-session setup sheet: configures name + Q&A moderation, then goes live. */}
      {setupOpen && (
        <StartSessionSheet
          deckName={title || 'Untitled deck'}
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

/* One ordered poll row: reorder arrows + number + glyph + question + actions. */
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
        <p className="truncate text-[15.5px] font-semibold text-text-1">{poll?.title || 'Poll removed'}</p>
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
      <RowGlyph title="Duplicate" onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" aria-hidden />
      </RowGlyph>
      <RowGlyph title="Delete" onClick={onDelete} danger>
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

/* 32px square glyph action (Duplicate / Delete) on a poll row. */
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[940px] px-10 pb-[60px] pt-7">
      <p className="text-[14px] text-text-3">{children}</p>
    </div>
  )
}
