/**
 * /history — past sessions you have presented (PROTOTYPE-MAP 3.4). A 940px column
 * of closed-session rows from useClosedSessions: a left date block, the session
 * name, a "N participants . N polls . date" line, then View results / Run again /
 * Delete. "Run again" clones the deck via the cloneDeck action and opens the new
 * deck; Delete confirms through the shared Dialog, then removes the session.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import { Copy, X } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '../../components/ui'
import { cn } from '../../components/ui/utils'
import { callAction } from '../../lib/actions-client'
import { useClosedSessions } from '../../lib/library-data'
import type { ClosedSessionRow } from '../../lib/library-data'
import type { Session } from '../../types'

interface CloneData {
  recordId?: string
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const sessions = useMutations<Session>('sessions')
  const { rows } = useClosedSessions()

  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ClosedSessionRow | null>(null)

  // Clone the session's deck into a fresh draft and open it (PROTOTYPE-MAP 2.3).
  async function runAgain(row: ClosedSessionRow) {
    if (busy || !row.deckId) return
    setBusy(true)
    const res = await callAction<CloneData>('cloneDeck', { deckId: row.deckId })
    setBusy(false)
    if (!res.success || !res.data?.recordId) {
      toastError('Could not run again', res.error)
      return
    }
    navigate(`/deck/${res.data.recordId}`)
  }

  async function deleteSession() {
    if (!confirmDelete) return
    const { sessionId } = confirmDelete
    setConfirmDelete(null)
    try {
      await sessions.remove(sessionId)
      success('Session deleted')
    } catch (err) {
      toastError('Could not delete', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="mx-auto h-full w-full max-w-[940px] overflow-y-auto px-10 pb-[60px] pt-10">
      <h1 className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-text-1">History</h1>
      <p className="mt-1 text-[14.5px] text-text-2">Past sessions you have presented.</p>

      {rows.length === 0 ? (
        <p className="mt-7 rounded-[14px] border border-border bg-bg-2 px-6 py-12 text-center text-[14px] text-text-3">
          No sessions yet. Present a deck and it will show up here.
        </p>
      ) : (
        <ul className="mt-7 flex flex-col gap-2.5">
          {rows.map((row) => (
            <SessionRow
              key={row.sessionId}
              row={row}
              runDisabled={busy || !row.deckId}
              onView={() => navigate(`/session/${row.sessionId}`)}
              onRunAgain={() => runAgain(row)}
              onDelete={() => setConfirmDelete(row)}
            />
          ))}
        </ul>
      )}

      {/* Delete confirmation. */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.name || 'This session'} and its saved results will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSession}>
              Delete session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* One past-session row: date block + name/meta + View results / Run again / Delete. */
function SessionRow({
  row,
  runDisabled,
  onView,
  onRunAgain,
  onDelete,
}: {
  row: ClosedSessionRow
  runDisabled: boolean
  onView: () => void
  onRunAgain: () => void
  onDelete: () => void
}) {
  const { day, month } = splitDate(row.closedAt)
  return (
    <li className="flex items-center gap-4 rounded-[14px] border border-border bg-bg-2 px-[18px] py-4 transition-colors hover:border-border-6">
      {/* Date block */}
      <div className="grid h-11 w-11 flex-none place-content-center rounded-[11px] bg-bg-muted text-center leading-none">
        <span className="font-display text-[16px] font-extrabold text-text-1">{day}</span>
        <span className="mt-0.5 font-mono text-[9px] uppercase text-text-3">{month}</span>
      </div>

      {/* Name + meta */}
      <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[16px] font-semibold text-text-1">{row.name || 'Untitled session'}</p>
        <p className="tnum mt-0.5 truncate text-[12.5px] text-text-3">
          {row.participantCount} {row.participantCount === 1 ? 'participant' : 'participants'} · {row.pollCount}{' '}
          {row.pollCount === 1 ? 'poll' : 'polls'} · {row.dateLabel}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="flex-none rounded-[8px] bg-bg-muted px-3 py-1.5 text-[13px] font-semibold text-text-2 transition-colors hover:bg-[#e7ebf0] hover:text-text-1"
      >
        View results
      </button>
      <button
        type="button"
        onClick={onRunAgain}
        disabled={runDisabled}
        className="flex flex-none items-center gap-1.5 rounded-[8px] bg-accent-tint px-3 py-1.5 text-[13px] font-bold text-accent transition-colors hover:bg-accent-tint-hover disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden /> Run again
      </button>
      <button
        type="button"
        title="Delete session"
        aria-label="Delete session"
        onClick={onDelete}
        className={cn(
          'grid h-[34px] w-[34px] flex-none place-content-center rounded-[8px] text-text-3 transition-colors',
          'hover:bg-danger-bg hover:text-danger',
        )}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}

/* Split an epoch into a big day number + a short uppercase month for the date block. */
function splitDate(ms: number): { day: string; month: string } {
  if (!ms) return { day: '--', month: '' }
  const d = new Date(ms)
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
  }
}
