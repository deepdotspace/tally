/**
 * /library — the authed home (PROTOTYPE-MAP section 3.1). The Decks grid and the
 * flat All-polls list, with New deck / New poll, deck Present, and per-poll
 * Edit / Duplicate / Delete. Data comes from useLibrary (Wave 1); deck/poll CRUD
 * runs through useMutations; presenting opens a session via the createSession
 * action and navigates to the projection once the join code resolves.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Eyebrow,
  useToast,
} from '../../components/ui'
import { DeckCard, PollRow } from '../../components/library'
import { useLibrary } from '../../lib/library-data'
import { useCreatorDecks, useCreatorPolls, useDeckSession } from '../../components/creator'
import { StartSessionSheet, type GoLiveOptions } from '../../components/present-setup'
import { callAction } from '../../lib/actions-client'
import type { Deck, Poll, PollOption } from '../../types'

export default function LibraryPage() {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const { decks, polls, ownerId } = useLibrary()
  const { rows: deckRows } = useCreatorDecks()
  const { rows: pollRows } = useCreatorPolls()
  const deckMut = useMutations<Deck>('decks')
  const pollMut = useMutations<Poll>('polls')

  // Raw polls keyed by id, for duplicate + the setup sheet's Q&A rows.
  const pollById = useMemo(() => new Map(pollRows.map((r) => [r.id, r.poll])), [pollRows])
  const deckById = useMemo(() => new Map(deckRows.map((r) => [r.id, r.deck])), [deckRows])

  // The deck whose Start-session sheet is open (anonymous + no held questions by default).
  const [setupDeckId, setSetupDeckId] = useState<string | null>(null)
  const [goingLive, setGoingLive] = useState(false)
  const [pendingPresent, setPendingPresent] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; question: string } | null>(null)

  // The deck + its Q&A polls that the setup sheet is configuring.
  const setupDeck = setupDeckId ? deckById.get(setupDeckId) ?? null : null
  const setupQaPolls = useMemo(() => {
    if (!setupDeck) return []
    return setupDeck.pollIds
      .map((pid) => ({ pid, poll: pollById.get(pid) }))
      .filter((x): x is { pid: string; poll: Poll } => !!x.poll && x.poll.type === 'qa')
      .map(({ pid, poll }) => ({
        id: pid,
        question: poll.title || 'Untitled question',
        moderated: !!poll.settings.moderated,
      }))
  }, [setupDeck, pollById])

  const readyCount = decks.filter((d) => d.status === 'ready').length

  async function newDeck() {
    if (!ownerId) return
    try {
      const id = await deckMut.create({ title: 'Untitled deck', pollIds: [], ownerId })
      navigate(`/deck/${id}`)
    } catch (err) {
      toastError('Could not create the deck', err instanceof Error ? err.message : undefined)
    }
  }

  // Present: jump straight in if a session is already live, else open the
  // Start-session setup sheet (a no-op for an empty deck).
  function present(deckId: string) {
    const deck = decks.find((d) => d.id === deckId)
    const liveCode = deck?.liveSession?.data.code
    if (liveCode) {
      navigate(`/present/${liveCode}`)
      return
    }
    if (!deckById.get(deckId)?.pollIds.length) return
    setSetupDeckId(deckId)
  }

  // Go live: write the chosen Q&A moderation flags back onto the polls, open the
  // session, and let the resolver navigate once the join code arrives.
  async function goLive(opts: GoLiveOptions) {
    if (!setupDeckId || goingLive) return
    setGoingLive(true)
    for (const q of setupQaPolls) {
      const next = opts.modByPoll[q.id]
      if (next !== undefined && next !== q.moderated) {
        try {
          const poll = pollById.get(q.id)
          if (poll) await pollMut.put(q.id, { settings: { ...poll.settings, moderated: next } })
        } catch {
          // A failed write-back is non-fatal: moderateQa still gates the session.
        }
      }
    }
    const res = await callAction('createSession', {
      deckId: setupDeckId,
      askNames: opts.askNames,
      moderateQa: opts.moderateQa,
    })
    if (!res.success) {
      setGoingLive(false)
      toastError('Could not start presenting', res.error)
      return
    }
    setPendingPresent(setupDeckId)
    setSetupDeckId(null)
    setGoingLive(false)
  }

  async function duplicate(pollId: string) {
    const poll = pollById.get(pollId)
    if (!poll || !ownerId) return
    // Clone with fresh option ids so votes never collide with the original.
    const options: PollOption[] = poll.options.map((o) => ({ ...o, id: newOptionId() }))
    try {
      await pollMut.create({
        title: poll.title ? `${poll.title} (copy)` : 'Untitled poll',
        type: poll.type,
        options,
        settings: { ...poll.settings },
        deckId: '',
        order: Date.now(),
        ownerId,
      })
      success('Poll duplicated')
    } catch (err) {
      toastError('Could not duplicate', err instanceof Error ? err.message : undefined)
    }
  }

  async function removePoll() {
    if (!confirmDelete) return
    const { id } = confirmDelete
    setConfirmDelete(null)
    try {
      await pollMut.remove(id)
      success('Poll deleted')
    } catch (err) {
      toastError('Could not delete', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="mx-auto h-full w-full max-w-[980px] overflow-y-auto px-10 pb-[60px] pt-10">
      {/* Header. */}
      <div className="flex items-end gap-4">
        <div>
          <h1 className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-text-1">Library</h1>
          <p className="mt-1 text-[14.5px] text-text-2">
            <span className="font-bold text-accent">{readyCount}</span>{' '}
            {readyCount === 1 ? 'deck' : 'decks'} ready to present
          </p>
        </div>
        <div className="ml-auto flex items-center gap-[9px]">
          <button
            type="button"
            onClick={newDeck}
            className="flex items-center gap-1.5 rounded-[10px] border border-border-strong bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-2 transition-colors hover:border-border-7 hover:text-text-1"
          >
            <span aria-hidden>+</span> New deck
          </button>
          <button
            type="button"
            onClick={() => navigate('/build')}
            className="flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-bold text-accent-text transition-colors hover:bg-accent-hover"
          >
            <span aria-hidden>+</span> New poll
          </button>
        </div>
      </div>

      {/* Decks. */}
      <section className="mt-9">
        <Eyebrow className="text-[11px] tracking-[0.07em]">Decks</Eyebrow>
        {decks.length === 0 ? (
          <p className="mt-4 rounded-[16px] border border-dashed border-border-strong px-6 py-10 text-center text-[14px] text-text-3">
            No decks yet. Create one to group polls into a presentation.
          </p>
        ) : (
          <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3.5">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onOpen={() => navigate(`/deck/${deck.id}`)}
                onPresent={() => present(deck.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* All polls. */}
      <section className="mt-9">
        <Eyebrow className="text-[11px] tracking-[0.07em]">All polls</Eyebrow>
        <div className="mt-3.5 overflow-hidden rounded-[16px] border border-border bg-bg-2">
          {polls.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-text-3">No polls yet. Create your first one.</p>
          ) : (
            polls.map((poll) => (
              <PollRow
                key={poll.id}
                poll={poll}
                onEdit={() => navigate(`/build?poll=${poll.id}`)}
                onDuplicate={() => duplicate(poll.id)}
                onDelete={() => setConfirmDelete({ id: poll.id, question: poll.question })}
              />
            ))
          )}
        </div>
      </section>

      {/* Start-session setup sheet: configures name + Q&A moderation, then goes live. */}
      {setupDeck && (
        <StartSessionSheet
          deckName={setupDeck.title || 'Untitled deck'}
          pollCount={setupDeck.pollIds.length}
          qaPolls={setupQaPolls}
          busy={goingLive}
          onGoLive={goLive}
          onCancel={() => setSetupDeckId(null)}
        />
      )}

      {/* Reactive Present resolver: mounts only while opening a session. */}
      {pendingPresent && (
        <PresentResolver
          deckId={pendingPresent}
          ownerId={ownerId}
          onResolved={(code) => {
            setPendingPresent(null)
            navigate(`/present/${code}`)
          }}
        />
      )}

      {/* Delete confirmation. */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this poll?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.question || 'This poll'} will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removePoll}>
              Delete poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* Watches a deck's live session and reports its join code once it appears. */
function PresentResolver({
  deckId,
  ownerId,
  onResolved,
}: {
  deckId: string
  ownerId: string
  onResolved: (code: string) => void
}) {
  const { session } = useDeckSession(deckId, ownerId)
  const code = session?.code
  useEffect(() => {
    if (code) onResolved(code)
  }, [code, onResolved])
  return null
}

/* A fresh option id (random + time), so a clone's votes never collide. */
function newOptionId(): string {
  return `o-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
