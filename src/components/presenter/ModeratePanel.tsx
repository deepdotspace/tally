import { useMemo } from 'react'
import type { RecordData } from 'deepspace'
import { Check } from 'lucide-react'
import type { Response, Upvote } from '../../types'

/*
 * Moderate panel (PROTOTYPE-MAP-v3 5d) — the host's live Q&A review queue. A
 * right-side dark column shown for moderated Q&A polls. Pending questions
 * (approved === 0) get Approve / Hide; the already-approved list mirrors what is
 * on the screen. The projection filters to approved === 1 via qaItems, so this
 * panel only drives the queue; it never renders results itself. Lives inside the
 * presenter's data-theme="dark" wrapper, so tokens resolve the dark palette.
 */

export interface ModeratePanelProps {
  /** Raw response envelopes for this poll (includes unapproved) so we can split. */
  envelopes: RecordData<Response>[]
  /** Live upvotes, to sort the approved list by popularity. */
  upvotes: Upvote[]
  /** Whether moderation is on for this poll (per-poll setting OR session-wide). */
  moderated: boolean
  /** Approve (1), return to pending (0), or dismiss (2) one question by its recordId. */
  onSet: (responseId: string, approved: 0 | 1 | 2) => void
  /** Whether session-wide hold-for-review is on (the header toggle state). */
  moderationOn: boolean
  /** Flip session-wide hold-for-review live. */
  onToggleModerate: (on: boolean) => void
}

export function ModeratePanel({ envelopes, upvotes, moderated, moderationOn, onSet, onToggleModerate }: ModeratePanelProps) {
  const { pending, approved } = useMemo(() => {
    const tally = new Map<string, number>()
    for (const u of upvotes) tally.set(u.responseId, (tally.get(u.responseId) ?? 0) + 1)
    const questions = envelopes.filter((r) => r.data.text.trim() !== '')
    const pend = questions
      .filter((r) => r.data.approved === 0)
      .sort((a, b) => a.data.createdAt - b.data.createdAt)
    const appr = questions
      .filter((r) => r.data.approved === 1)
      .map((r) => ({ rec: r, votes: tally.get(r.recordId) ?? 0 }))
      .sort((a, b) => b.votes - a.votes || a.rec.data.createdAt - b.rec.data.createdAt)
    return { pending: pend, approved: appr }
  }, [envelopes, upvotes])

  return (
    <aside
      className="flex w-[372px] flex-none flex-col overflow-hidden border-l border-border bg-bg-nav"
      data-testid="presenter-moderate-panel"
    >
      <header className="flex-none border-b border-border px-5 pb-4 pt-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-5">Moderation</span>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-1b">Hold questions for review</p>
            <p className="mt-0.5 text-[12px] text-text-5">
              {moderationOn ? 'Questions wait for your approval' : 'Questions appear instantly'}
            </p>
          </div>
          <ModToggle on={moderationOn} onToggle={onToggleModerate} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
        {!moderated ? (
          <EmptyBox>
            Moderation is off. Every question appears on the screen as soon as it is sent. Flip the
            switch above to review questions before they show.
          </EmptyBox>
        ) : (
          <>
            <SectionHeader label="Pending" count={pending.length} countClass="text-[#ff8a6e]" />
            {pending.length === 0 ? (
              <EmptyBox>Nothing waiting. New questions will appear here for your approval.</EmptyBox>
            ) : (
              <div className="flex flex-col gap-[9px]">
                {pending.map((r) => (
                  <PendingCard
                    key={r.recordId}
                    text={r.data.text}
                    by={r.data.displayName}
                    onApprove={() => onSet(r.recordId, 1)}
                    onHide={() => onSet(r.recordId, 2)}
                  />
                ))}
              </div>
            )}

            <div className="mb-3 mt-[22px]">
              <SectionHeader label="On the screen" count={approved.length} countClass="text-accent" />
            </div>
            {approved.length > 0 && (
              <div className="flex flex-col gap-2">
                {approved.map(({ rec, votes }) => (
                  <ApprovedRow
                    key={rec.recordId}
                    text={rec.data.text}
                    by={rec.data.displayName}
                    votes={votes}
                    onHide={() => onSet(rec.recordId, 0)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

/* Uppercase section label + a tabular mono count in its accent. */
function SectionHeader({ label, count, countClass }: { label: string; count: number; countClass: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-text-3b">{label}</span>
      <span className={`tnum font-mono text-[11px] ${countClass}`}>{count}</span>
    </div>
  )
}

/* A pending question with Approve (accent) + Hide (outline) actions. */
function PendingCard({
  text,
  by,
  onApprove,
  onHide,
}: {
  text: string
  by: string
  onApprove: () => void
  onHide: () => void
}) {
  return (
    <div className="rounded-[11px] border border-[#2a2017] border-l-2 border-l-[#ff8a6e] bg-bg-card-b p-[13px]">
      <p className="text-[14px] leading-[1.35] text-text-1b">{text}</p>
      <p className="mt-1.5 text-[12px] text-text-3b">{(by ?? '').trim() || 'Anonymous'}</p>
      <div className="mt-[11px] flex gap-2">
        <button
          type="button"
          data-testid="moderate-approve"
          onClick={onApprove}
          className="flex-1 rounded-[9px] bg-accent py-2 text-[13px] font-bold text-accent-text transition-colors hover:bg-[#3d9bfa]"
        >
          Approve
        </button>
        <button
          type="button"
          data-testid="moderate-hide"
          onClick={onHide}
          className="rounded-[9px] border border-border-7 px-3.5 py-2 text-[13px] font-semibold text-text-2b transition-colors hover:border-[#4a535e]"
        >
          Hide
        </button>
      </div>
    </div>
  )
}

/* An approved question (on the screen) with a Hide link to pull it back. */
function ApprovedRow({
  text,
  by,
  votes,
  onHide,
}: {
  text: string
  by: string
  votes: number
  onHide: () => void
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-[11px] border border-border-2b bg-surface px-[13px] py-[11px]">
      <Check className="mt-0.5 h-[13px] w-[13px] flex-none text-[var(--correct)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-text-2b">{text}</p>
        <p className="tnum mt-1 text-[11.5px] text-text-5">
          {((by ?? '').trim() || 'Anonymous')} · {votes} upvotes
        </p>
      </div>
      <button
        type="button"
        onClick={onHide}
        className="flex-none text-[12px] text-text-5 transition-colors hover:text-[#ff8a6e]"
      >
        Hide
      </button>
    </div>
  )
}

/* A pill on/off switch for live moderation (role=switch, token-driven for dark). */
function ModToggle({ on, onToggle }: { on: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Hold questions for review"
      data-testid="moderate-toggle"
      onClick={() => onToggle(!on)}
      className="relative h-[24px] w-[42px] flex-none rounded-full transition-colors"
      style={{ background: on ? 'var(--accent)' : 'var(--border-7)' }}
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all duration-150"
        style={{ left: on ? '21px' : '3px' }}
      />
    </button>
  )
}

/* A centered dark info box used for the empty / moderation-off states. */
function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border-2b bg-bg-card-b p-[18px] text-center text-[13px] leading-[1.5] text-text-5">
      {children}
    </div>
  )
}
