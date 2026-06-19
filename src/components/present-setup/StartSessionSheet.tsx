/*
 * Start-session setup sheet (PROTOTYPE-MAP-v3 section 2). The new front door to
 * presenting: the host sets an optional "Ask voters for their name" toggle and a
 * per-Q&A "Hold questions for review" toggle, then presses Go live. Anonymous is
 * the default. The parent owns createSession + the moderation write-back; this
 * sheet is presentational and holds only its own toggle state.
 */

import { useState } from 'react'
import { PillSwitch } from './PillSwitch'

/** A Q&A poll in the deck, with its saved moderation flag for seeding. */
export interface SetupQaPoll {
  id: string
  question: string
  moderated: boolean
}

/** The host's choices, handed to the parent on Go live. */
export interface GoLiveOptions {
  askNames: 0 | 1
  /** Session-wide: 1 when any Q&A poll is held for review. */
  moderateQa: 0 | 1
  /** Per-Q&A poll moderation, to write back onto each poll. */
  modByPoll: Record<string, boolean>
}

interface StartSessionSheetProps {
  deckName: string
  pollCount: number
  qaPolls: SetupQaPoll[]
  busy?: boolean
  onGoLive: (opts: GoLiveOptions) => void
  onCancel: () => void
}

export function StartSessionSheet({ deckName, pollCount, qaPolls, busy, onGoLive, onCancel }: StartSessionSheetProps) {
  // Anonymous is the default; each Q&A row seeds from its saved moderated flag.
  const [nameOn, setNameOn] = useState(false)
  const [mod, setMod] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(qaPolls.map((q) => [q.id, q.moderated])),
  )

  function goLive() {
    const moderateQa = qaPolls.some((q) => mod[q.id]) ? 1 : 0
    onGoLive({ askNames: nameOn ? 1 : 0, moderateQa, modByPoll: mod })
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-6"
      style={{ background: 'rgba(12,16,22,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start session"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] overflow-hidden rounded-[20px] bg-white animate-tly-pop"
        style={{ boxShadow: '0 40px 120px -30px rgba(10,20,40,0.55)' }}
      >
        {/* Header: eyebrow, deck title, poll count. */}
        <div className="px-6 pb-[18px] pt-[22px]">
          <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: '#A6AEB8' }}>
            START SESSION
          </p>
          <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.02em]" style={{ color: '#15191F' }}>
            {deckName}
          </h2>
          <p className="tnum mt-1 text-[13.5px]" style={{ color: '#8A929C' }}>
            {pollCount} {pollCount === 1 ? 'poll' : 'polls'}
          </p>
        </div>

        {/* Body: name toggle + optional per-Q&A moderation group. */}
        <div className="px-6">
          <div className="flex items-start gap-[13px] py-[18px]" style={{ borderTop: '1px solid #EEF0F3' }}>
            <PillSwitch on={nameOn} onChange={setNameOn} label="Ask voters for their name" />
            <div>
              <p className="text-[15px] font-semibold" style={{ color: '#15191F' }}>
                Ask voters for their name
              </p>
              <p className="mt-[3px] text-[13px] leading-[1.45]" style={{ color: '#8A929C' }}>
                Optional. By default everyone answers anonymously. A name only shows next to questions a person submits.
              </p>
            </div>
          </div>

          {qaPolls.length > 0 && (
            <div className="pb-1.5 pt-4" style={{ borderTop: '1px solid #EEF0F3' }}>
              <p
                className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.05em]"
                style={{ color: '#A6AEB8' }}
              >
                Q&amp;A moderation
              </p>
              {qaPolls.map((q) => (
                <div key={q.id} className="flex items-center gap-[13px] py-[11px]">
                  <PillSwitch
                    on={!!mod[q.id]}
                    onChange={(next) => setMod((m) => ({ ...m, [q.id]: next }))}
                    label={`Hold questions for review: ${q.question}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold" style={{ color: '#15191F' }}>
                      {q.question}
                    </p>
                    <p className="mt-px text-[12px]" style={{ color: '#8A929C' }}>
                      Hold questions for review before they show
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Cancel + Go live. */}
        <div
          className="flex items-center gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid #EEF0F3', background: '#FAFBFC' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition-colors"
            style={{ border: '1px solid #DCE0E6', color: '#5A646F' }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="setup-go-live"
            onClick={goLive}
            disabled={busy}
            className="ml-auto flex items-center gap-2 rounded-[10px] px-[22px] py-[11px] text-[14.5px] font-bold text-white transition-colors hover:bg-[#1577DD] disabled:opacity-60"
            style={{ background: '#1E86F0' }}
          >
            <span aria-hidden className="text-[10px] leading-none">
              ▶
            </span>
            Go live
          </button>
        </div>
      </div>
    </div>
  )
}
