import type { Poll } from '../../types'

/*
 * Audience phone (PROTOTYPE-MAP 3.7 audience panel, 3.8 affordances). A small
 * dark phone the presenter can toggle beside the stage to show the room what a
 * voter sees: the LIVE eyebrow, the question, and the per-type ANSWER affordance
 * (not the results). Static / non-interactive (it mirrors the phone, it does not
 * vote). Token-driven; lives inside the presenter's data-theme="dark" wrapper.
 */

const MARKERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function AudiencePhone({ poll }: { poll: Poll }) {
  return (
    <div
      className="rounded-[34px] border border-border bg-bg-0 px-4 py-[18px]"
      style={{ boxShadow: '0 24px 60px -28px rgba(0,0,0,0.8)' }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-live animate-tly-blink" aria-hidden />
          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-text-3b">Live</span>
        </div>
        <h3 className="font-display text-[19px] font-extrabold leading-[1.12] text-text-1 text-pretty">{poll.title}</h3>
        <Affordance poll={poll} />
      </div>
    </div>
  )
}

/* The dark answer affordance for the poll type (PROTOTYPE-MAP 3.8). */
function Affordance({ poll }: { poll: Poll }) {
  switch (poll.type) {
    case 'scale':
      return (
        <div className="flex gap-1.5 text-[28px] leading-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ color: i < 4 ? 'var(--accent)' : 'var(--data-muted)' }}>★</span>
          ))}
        </div>
      )
    case 'nps':
      return (
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <span
              key={n}
              className="grid aspect-square place-content-center rounded-[8px] font-mono text-[12px]"
              style={
                n === 9
                  ? { background: 'var(--accent)', color: 'var(--accent-text)' }
                  : { background: 'var(--bg-muted-3)', border: '1px solid var(--border-4)', color: 'var(--text-3b)' }
              }
            >
              {n}
            </span>
          ))}
        </div>
      )
    case 'numeric':
      return (
        <div
          className="grid place-content-center rounded-[13px] border border-border-4 bg-bg-muted-3 py-4 font-mono text-[24px] font-bold text-text-1"
        >
          2,800
        </div>
      )
    case 'wordcloud':
      return <InputBox>Type a word...</InputBox>
    case 'qa':
      return <InputBox>Ask a question...</InputBox>
    case 'ranking':
      return (
        <div className="flex flex-col gap-2">
          {sampleRows(poll).map((label, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-[10px] border border-border-4 bg-bg-muted-3 px-3 py-2.5 text-[13px] text-text-1b"
            >
              <span className="font-mono text-[13px] text-text-5">≡</span>
              <span className="min-w-0 truncate">{label}</span>
            </div>
          ))}
        </div>
      )
    default:
      // choice / multi / quiz: option rows, the first shown as "selected".
      return (
        <div className="flex flex-col gap-2.5">
          {sampleRows(poll).map((label, i) => {
            const selected = i === 0
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[13px] border-[1.5px] px-3.5 py-[13px]"
                style={
                  selected
                    ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
                    : { borderColor: 'var(--border-4)', background: 'var(--bg-muted-3)' }
                }
              >
                <span
                  className="grid h-[26px] w-[26px] shrink-0 place-content-center rounded-[8px] font-mono text-[12px] font-bold"
                  style={
                    selected
                      ? { background: 'var(--accent)', color: 'var(--accent-text)' }
                      : { border: '1.5px solid var(--border-7)', color: 'var(--text-3b)' }
                  }
                >
                  {MARKERS[i] ?? '?'}
                </span>
                <span className="min-w-0 flex-1 truncate font-ui text-[14px] font-semibold text-text-1b">{label}</span>
              </div>
            )
          })}
        </div>
      )
  }
}

/* A single input-styled box (wordcloud / qa placeholder). */
function InputBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[13px] border border-border-4 bg-bg-muted-3 px-3.5 py-3 text-[14px] text-text-5">{children}</div>
  )
}

/* The first few option labels, padded with placeholders so an early/empty poll
   still reads as a filled phone. */
function sampleRows(poll: Poll): string[] {
  const labels = poll.options.map((o) => o.label.trim()).filter(Boolean).slice(0, 4)
  return labels.length > 0 ? labels : ['Option A', 'Option B', 'Option C']
}
