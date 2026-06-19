/**
 * /voice — the signature feature (PROTOTYPE-MAP 3.6 + 5.4). Tap once, talk
 * through many polls, and Tally transcribes + drafts them with AI for you to
 * review and commit. A full in-app screen (the sidebar stays), not a modal.
 *
 * BILLING: both billed calls charge the signed-in creator, never the host.
 *   - Transcription: integration.post('speech/speech-to-text') -> the worker
 *     proxy forwards the caller's JWT because speech is user-billed (integrations.ts).
 *   - Drafting: the draftPollsFromTranscript action runs createDeepSpaceAI with
 *     authToken = callerJwt. The route is auth-gated, so every caller is signed in.
 *
 * Stage machine: record (idle / live) -> processing -> review, with a typed
 * branch off idle. The typed path always completes the flow when the mic is
 * blocked or a call fails, so the feature degrades gracefully.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { integration, useMutations, useUser } from 'deepspace'
import { Mic, X } from 'lucide-react'
import { useToast } from '../../components/ui'
import { useCreatorDecks } from '../../components/creator'
import { callAction } from '../../lib/actions-client'
import {
  VoiceKeyframes,
  RecordIdle,
  Recording,
  ProcessingStage,
  TypedStage,
  ReviewBoard,
  useVoiceRecorder,
  toVoiceDrafts,
  blankDraft,
  voiceDraftToPoll,
} from '../../components/voice'
import type { DestChip, RawDraft, VoiceDraft, VoiceStage } from '../../components/voice'
import type { Deck, Poll } from '../../types'

const MIC_BLOCKED_NOTE = 'Microphone unavailable. Write your polls out below and Tally will draft them the same way.'
const MIC_EMPTY_NOTE = 'We could not capture any audio. Write your polls out below instead.'

export default function VoicePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromDeckId = params.get('deck') ?? ''
  const { user } = useUser()
  const ownerId = user?.id ?? ''
  const { success, error: toastError } = useToast()
  const polls = useMutations<Poll>('polls')
  const decks = useMutations<Deck>('decks')
  const { rows: deckRows } = useCreatorDecks()
  const recorder = useVoiceRecorder()

  const [stage, setStage] = useState<VoiceStage>('record')
  const [drafts, setDrafts] = useState<VoiceDraft[]>([])
  const [typed, setTyped] = useState('')
  const [micNote, setMicNote] = useState<string | undefined>(undefined)
  const [dest, setDest] = useState(fromDeckId || 'new')
  const [busy, setBusy] = useState(false)
  const live = recorder.micState === 'recording'

  // Guard async results against an unmounted page (the flow has long awaits).
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  const fromDeck = useMemo(() => deckRows.find((d) => d.id === fromDeckId)?.deck ?? null, [deckRows, fromDeckId])

  const destChips = useMemo<DestChip[]>(() => {
    const base: DestChip[] = [
      { id: 'new', label: 'New deck' },
      { id: 'lib', label: 'Just my library' },
    ]
    const deckChips = deckRows.map((r) => ({ id: r.id, label: r.deck.title || 'Untitled deck' }))
    return [...base, ...deckChips]
  }, [deckRows])

  function close() {
    navigate(fromDeckId ? `/deck/${fromDeckId}` : '/library')
  }

  // Drafting: one transcript/text becomes many drafts via the caller-billed AI.
  async function draftFrom(text: string) {
    setStage('processing')
    const res = await callAction<{ drafts: RawDraft[] }>('draftPollsFromTranscript', { transcript: text })
    if (!mounted.current) return
    if (!res.success || !res.data) {
      toastError('Could not draft polls', res.error)
      // Keep the user moving: drop them on the typed path with what we have.
      setTyped(text)
      setMicNote(undefined)
      setStage('typed')
      return
    }
    setDrafts((prev) => [...prev, ...toVoiceDrafts(res.data!.drafts)])
    setStage('review')
  }

  async function startRec() {
    setMicNote(undefined)
    const granted = await recorder.start()
    if (!mounted.current) return
    // Mic blocked: fall back to typing with a clear note.
    if (!granted) {
      setMicNote(MIC_BLOCKED_NOTE)
      setStage('typed')
    }
  }

  async function stopRec() {
    const rec = await recorder.stop()
    if (!mounted.current) return
    // No audio at all: route to typed with the live transcript preserved.
    if (!rec) {
      setMicNote(MIC_EMPTY_NOTE)
      setStage('typed')
      return
    }

    // Transcribe the audio (caller-billed). Fall back to the live recognizer
    // transcript when there is no audio payload or transcription fails.
    let transcript = rec.liveTranscript
    if (rec.base64) {
      setStage('processing')
      const t = await integration.post<{ text?: string } | string>('speech/speech-to-text', {
        audio: rec.base64,
        model: 'whisper-1',
        response_format: 'json',
        temperature: 0,
      })
      if (!mounted.current) return
      if (t.success && t.data) {
        transcript = typeof t.data === 'string' ? t.data : (t.data.text ?? transcript)
      } else if (!transcript) {
        toastError('Could not transcribe the recording', t.error)
        setMicNote(MIC_EMPTY_NOTE)
        setStage('typed')
        return
      }
    }

    if (!transcript.trim()) {
      setMicNote(MIC_EMPTY_NOTE)
      setStage('typed')
      return
    }
    await draftFrom(transcript)
  }

  async function draftTyped() {
    if (typed.trim().length <= 3) return
    setBusy(true)
    await draftFrom(typed)
    if (mounted.current) setBusy(false)
  }

  function recordMore() {
    setMicNote(undefined)
    setStage('record')
  }

  function addManual() {
    setDrafts((prev) => [...prev, blankDraft()])
    setStage('review')
  }

  function changeDraft(lid: string, next: VoiceDraft) {
    setDrafts((prev) => prev.map((d) => (d.lid === lid ? next : d)))
  }
  function removeDraft(lid: string) {
    setDrafts((prev) => prev.filter((d) => d.lid !== lid))
  }

  // Commit: create kept polls, attach them to the chosen destination, navigate.
  async function commit() {
    if (!ownerId || busy) return
    const kept = drafts.filter((d) => d.keep && d.question.trim())
    if (kept.length === 0) return
    setBusy(true)
    try {
      const newIds: string[] = []
      for (const d of kept) {
        newIds.push(await polls.create(voiceDraftToPoll(d, ownerId)))
      }

      if (dest === 'lib') {
        success(`Added ${newIds.length} ${newIds.length === 1 ? 'poll' : 'polls'} to your library`)
        navigate('/library')
        return
      }

      let deckId = dest
      if (dest === 'new') {
        deckId = await decks.create({ title: 'Voice session', pollIds: newIds, ownerId })
      } else {
        const existing = deckRows.find((r) => r.id === deckId)?.deck
        await decks.put(deckId, { pollIds: [...(existing?.pollIds ?? []), ...newIds] })
      }
      success(`Added ${newIds.length} ${newIds.length === 1 ? 'poll' : 'polls'}`)
      navigate(`/deck/${deckId}`)
    } catch (err) {
      setBusy(false)
      toastError('Could not add the polls', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-1">
      <VoiceKeyframes />

      {/* Header bar */}
      <header className="flex flex-none items-center gap-2.5 border-b border-border bg-bg-2 px-6 py-4">
        <Mic className="h-[18px] w-[18px] text-accent" aria-hidden />
        <h1 className="font-display text-[16px] font-extrabold text-text-1">Create with voice</h1>
        <button
          type="button"
          onClick={close}
          className="ml-auto flex items-center gap-1.5 text-[13.5px] text-text-3 transition-colors hover:text-text-1"
        >
          Close <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      {/* Stages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === 'record' && !live && (
          <RecordIdle micState={recorder.micState} onStart={startRec} onToText={() => { setMicNote(undefined); setStage('typed') }} />
        )}
        {stage === 'record' && live && (
          <Recording elapsed={recorder.elapsed} liveText={recorder.liveText} readLevels={recorder.readLevels} onStop={stopRec} />
        )}
        {stage === 'processing' && <ProcessingStage />}
        {stage === 'typed' && (
          <TypedStage
            value={typed}
            onChange={setTyped}
            micNote={micNote}
            busy={busy}
            onDraft={draftTyped}
            onRecordInstead={recordMore}
          />
        )}
        {stage === 'review' && (
          <ReviewBoard
            drafts={drafts}
            onChangeDraft={changeDraft}
            onRemoveDraft={removeDraft}
            onAddManual={addManual}
            onRecordMore={recordMore}
            fromDeckName={fromDeck ? fromDeck.title || 'Untitled deck' : null}
            destChips={destChips}
            dest={dest}
            onDest={setDest}
            busy={busy}
            onCommit={commit}
          />
        )}
      </div>
    </div>
  )
}
