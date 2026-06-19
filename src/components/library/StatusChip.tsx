import type { DeckStatus } from '../../lib/library-data'

/*
 * Deck status pill (PROTOTYPE-MAP statusMeta). A deck currently hosting a live
 * session reads "Ready" (accent on accent-tint); otherwise "Draft" (muted on a
 * neutral inset). Status is derived in the data layer, never stored.
 */
const META: Record<DeckStatus, { label: string; color: string; bg: string }> = {
  ready: { label: 'Ready', color: 'var(--accent)', bg: 'var(--accent-tint)' },
  draft: { label: 'Draft', color: 'var(--status-draft)', bg: 'var(--bg-muted)' },
}

export function StatusChip({ status }: { status: DeckStatus }) {
  const m = META[status]
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  )
}
