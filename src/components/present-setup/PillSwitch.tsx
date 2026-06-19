/*
 * The shared pill switch (PROTOTYPE-MAP-v3 section 1): a 42x24 track with an
 * 18px sliding dot. On = accent track; off = neutral. Used by the Start-session
 * sheet's toggles. Light surface only (the dark presenter variant is separate).
 */

interface PillSwitchProps {
  on: boolean
  onChange: (next: boolean) => void
  label: string
}

export function PillSwitch({ on, onChange, label }: PillSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{ background: on ? '#1E86F0' : '#D2D7DE' }}
      className="relative h-6 w-[42px] flex-none rounded-full transition-[background] duration-150"
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left] duration-150"
        style={{ left: on ? 21 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
      />
    </button>
  )
}
