import type { PollOption, PollType } from '../../types'

/*
 * Builder LIVE PREVIEW card (PROTOTYPE-MAP 3.3 column 3). A dark audience-phone
 * impression of the current poll: a LIVE eyebrow, the question, and a sample
 * filled affordance for the chosen type. It pins the dark tokens locally so it
 * stays dark inside the light builder (the phone is always a dark device). This
 * is a faithful impression, self-contained and not the live voter view.
 */

// Pinned dark scale (PROTOTYPE-MAP 1.1 dark palette) so the card reads dark.
const DARK_BG = '#0a0c0f'
const BORDER = '#1b2029'
const TRACK = '#14181e'
const ACCENT = '#4fb0ff'
const DATA_MUTED = '#2a3038'
const OPTION_BG = '#12161b'
const OPTION_BORDER = '#222a33'

// Sample bar weights so an empty/early poll still shows the filling-in shape.
const SAMPLE = [0.82, 0.58, 0.41, 0.22, 0.14]

export interface PreviewCardProps {
  type: PollType
  question: string
  options: PollOption[]
}

export function PreviewCard({ type, question, options }: PreviewCardProps) {
  const filled = options.filter((o) => o.label.trim().length > 0)

  return (
    <div
      className="rounded-[30px] border p-[15px] pt-4"
      style={{ background: DARK_BG, borderColor: BORDER, colorScheme: 'dark', boxShadow: '0 20px 50px -24px rgba(20,30,50,0.5)' }}
    >
      <div className="flex flex-col gap-4">
        {/* LIVE eyebrow */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full animate-[var(--animate-tly-blink)]"
            style={{ background: '#ff6a4d' }}
            aria-hidden
          />
          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.14em]" style={{ color: '#9aa3ae' }}>
            Live
          </span>
        </div>

        {/* Question */}
        <h3
          className="font-display text-[17px] font-extrabold leading-[1.12]"
          style={{ color: '#f2f5f8', textWrap: 'pretty' }}
        >
          {question.trim() || 'Your question goes here'}
        </h3>

        {/* Per-type sample affordance. */}
        <Sample type={type} filled={filled} />
      </div>
    </div>
  )
}

/* The dark, sample-filled affordance for the chosen type. */
function Sample({ type, filled }: { type: PollType; filled: PollOption[] }) {
  if (type === 'choice' || type === 'multi' || type === 'quiz') {
    if (filled.length === 0) return <Empty>Add options to see them on screen.</Empty>
    return (
      <div className="flex flex-col gap-2.5">
        {filled.slice(0, 5).map((o, i) => (
          <Bar key={o.id} marker={String.fromCharCode(65 + i)} label={o.label} pct={SAMPLE[i] ?? 0.1} leading={i === 0} />
        ))}
      </div>
    )
  }
  if (type === 'ranking') {
    if (filled.length === 0) return <Empty>Add items to rank.</Empty>
    return (
      <div className="flex flex-col gap-2">
        {filled.slice(0, 5).map((o, i) => (
          <div
            key={o.id}
            className="flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px]"
            style={{ background: OPTION_BG, borderColor: OPTION_BORDER, color: '#e4e8ec' }}
          >
            <span className="font-mono text-[13px]" style={{ color: '#646d78' }}>≡</span>
            <span className="min-w-0 truncate">{o.label}</span>
          </div>
        ))}
      </div>
    )
  }
  if (type === 'scale') {
    return (
      <div className="flex gap-1.5 text-[28px] leading-none">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ color: i < 4 ? ACCENT : DATA_MUTED }}>★</span>
        ))}
      </div>
    )
  }
  if (type === 'nps') {
    return (
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <span
            key={n}
            className="grid aspect-square place-content-center rounded-[8px] font-mono text-[12px]"
            style={
              n === 9
                ? { background: ACCENT, color: '#06121e' }
                : { background: OPTION_BG, border: `1px solid ${OPTION_BORDER}`, color: '#9aa3ae' }
            }
          >
            {n}
          </span>
        ))}
      </div>
    )
  }
  if (type === 'numeric') {
    return (
      <div
        className="grid place-content-center rounded-[12px] border py-4 font-mono text-[24px] font-bold"
        style={{ background: OPTION_BG, borderColor: OPTION_BORDER, color: '#f2f5f8' }}
      >
        2,800
      </div>
    )
  }
  if (type === 'wordcloud') {
    return (
      <div
        className="rounded-[12px] border px-3.5 py-3 text-[14px]"
        style={{ background: OPTION_BG, borderColor: OPTION_BORDER, color: '#646d78' }}
      >
        Type a word...
      </div>
    )
  }
  // qa
  return (
    <div
      className="rounded-[12px] border px-3.5 py-3 text-[14px]"
      style={{ background: OPTION_BG, borderColor: OPTION_BORDER, color: '#646d78' }}
    >
      Ask a question...
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-snug" style={{ color: '#9aa3ae' }}>{children}</p>
}

/* One choice/quiz option row: mono marker + label + the filling bar. */
function Bar({ marker, label, pct, leading }: { marker: string; label: string; pct: number; leading: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[12px] font-bold" style={{ color: leading ? ACCENT : '#646d78' }}>{marker}</span>
        <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: '#e4e8ec' }}>{label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(pct * 100)}%`, background: leading ? ACCENT : DATA_MUTED, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </div>
    </div>
  )
}
