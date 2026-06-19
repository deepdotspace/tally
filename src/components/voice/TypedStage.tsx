/*
 * Stage D: the typed fallback. A textarea to write the polls out; "Draft polls"
 * runs the same segmentation on the text. Also the destination when the mic is
 * blocked, in which case an amber mic note explains why.
 */

export interface TypedStageProps {
  value: string
  onChange: (v: string) => void
  /** Optional amber note (shown when the mic was blocked or capture failed). */
  micNote?: string
  busy: boolean
  onDraft: () => void
  onRecordInstead: () => void
}

const PLACEHOLDER =
  'Write out each poll, one after another. For example: which feature should we build next, dark mode, search, or offline. Then, how likely are you to recommend us. Then, one word for how today felt.'

export function TypedStage({ value, onChange, micNote, busy, onDraft, onRecordInstead }: TypedStageProps) {
  const canDraft = value.trim().length > 3 && !busy
  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-10">
      <h1 className="text-center font-display text-[26px] font-extrabold tracking-[-0.03em] text-text-1">
        Write out your polls
      </h1>

      {micNote && (
        <p className="mt-4 rounded-[11px] border border-[#F3DFC0] bg-[#FFF6EC] px-4 py-3 text-[12.5px] text-[#8A6A3A]">
          {micNote}
        </p>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={PLACEHOLDER}
        data-testid="voice-typed"
        className="mt-5 w-full resize-none rounded-[14px] border-[1.5px] border-border-3 bg-bg-2 px-4 py-3.5 font-ui text-[15px] leading-[1.6] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-accent"
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onRecordInstead}
          className="text-[13px] text-text-3 transition-colors hover:text-accent"
        >
          Use the mic instead
        </button>
        <button
          type="button"
          onClick={onDraft}
          disabled={!canDraft}
          data-testid="voice-draft-typed"
          className="rounded-[11px] bg-accent px-5 py-2.5 text-[14px] font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Drafting…' : 'Draft polls'}
        </button>
      </div>
    </div>
  )
}
