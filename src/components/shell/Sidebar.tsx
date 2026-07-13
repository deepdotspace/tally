import * as React from 'react'
import { ChevronsUpDown, LogOut } from 'lucide-react'

import { TALLY } from '../../themes'
import { MicGlyph } from './MicGlyph'

/*
 * Creator sidebar (PROTOTYPE-MAP section 2.2). 232px white column with a
 * hairline right border: bar-chart logo + wordmark, a "New poll" + voice mic
 * action row, the Library/History nav with mono counts + active state, and the
 * account footer. The app chrome is light-primary; pure layout from props.
 */
export interface SidebarNavItem {
  /** Stable key + active matcher (e.g. 'library', 'history'). */
  id: string
  label: string
  /** Mono glyph rendered in the leading column. */
  glyph: string
  /** Count shown right-aligned in JetBrains Mono. */
  count: number
  active: boolean
  onClick: () => void
}

export interface SidebarProps {
  onHome?: () => void
  onNewPoll?: () => void
  onVoiceNew?: () => void
  navItems: SidebarNavItem[]
  accountName?: string
  accountEmail?: string
  accountImageUrl?: string
  /** Signs the user out; the account footer surfaces it as "Log out". */
  onSignOut?: () => void
}

export function Sidebar({
  onHome,
  onNewPoll,
  onVoiceNew,
  navItems,
  accountName,
  accountEmail,
  accountImageUrl,
  onSignOut,
}: SidebarProps) {
  return (
    <aside
      className="flex h-full w-[232px] flex-none flex-col border-r border-border bg-bg-2 px-[14px] py-[18px]"
    >
      {/* Logo row: accent bar-chart square + wordmark. */}
      <button
        type="button"
        onClick={onHome}
        className="mb-5 flex items-center gap-[10px] px-2 pb-5 pt-1.5 text-left"
      >
        <LogoMark />
        <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-text-1">
          {TALLY.name}
        </span>
      </button>

      {/* Action row: New poll + a square voice mic button. */}
      <div className="mb-4 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onNewPoll}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-accent px-[11px] py-[11px] text-[14.5px] font-bold text-accent-text transition-colors hover:bg-accent-hover"
        >
          <span aria-hidden className="text-[16px] leading-none">
            +
          </span>
          New poll
        </button>
        <button
          type="button"
          onClick={onVoiceNew}
          title="Create a poll with your voice"
          aria-label="Create a poll with your voice"
          className="grid h-11 w-11 flex-none place-content-center rounded-[11px] bg-accent text-accent-text transition-colors hover:bg-accent-hover"
        >
          <MicGlyph className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Nav: Library + History with mono counts and active state. */}
      <nav className="flex flex-1 flex-col gap-1.5">
        {navItems.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}
      </nav>

      {/* Account footer: opens a menu with the signed-in identity + Log out. */}
      <AccountMenu
        accountName={accountName}
        accountEmail={accountEmail}
        accountImageUrl={accountImageUrl}
        onSignOut={onSignOut}
      />
    </aside>
  )
}

/*
 * Account footer button that opens a small menu above itself with the signed-in
 * identity and a Log out action. Closes on outside-click or Escape. signOut is
 * passed in so the Sidebar stays a pure-layout component.
 */
function AccountMenu({
  accountName,
  accountEmail,
  accountImageUrl,
  onSignOut,
}: {
  accountName?: string
  accountEmail?: string
  accountImageUrl?: string
  onSignOut?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const label = accountName || accountEmail || 'Account'
  const initials = label[0]!.toUpperCase()

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative mt-auto border-t border-[var(--bg-0)] pt-2.5">
      {open && (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full mb-1.5 overflow-hidden rounded-[12px] border border-border bg-bg-2 p-1.5 shadow-lg"
        >
          <div className="px-2.5 py-1.5">
            <p className="truncate text-[13px] font-semibold text-text-1">{accountName || 'Account'}</p>
            {accountEmail && <p className="truncate text-[11px] text-text-3">{accountEmail}</p>}
          </div>
          <div className="my-1 h-px bg-border" aria-hidden />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false)
              onSignOut?.()
            }}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] font-medium text-text-1 transition-colors hover:bg-bg-muted"
          >
            <LogOut aria-hidden className="h-[15px] w-[15px] flex-none text-text-3" />
            Log out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[11px] px-2 py-2 text-left transition-colors hover:bg-bg-muted"
      >
        {accountImageUrl ? (
          <img
            src={accountImageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-[30px] w-[30px] flex-none rounded-full object-cover"
          />
        ) : (
          <span
            className="grid h-[30px] w-[30px] flex-none place-content-center rounded-full bg-border font-mono text-[11px] font-medium text-text-2"
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span data-testid="sidebar-account-name" className="truncate text-[13px] font-semibold text-text-1">
            {label}
          </span>
          <span className="text-[11px] text-text-3">Free plan</span>
        </span>
        <ChevronsUpDown aria-hidden className="h-4 w-4 flex-none text-text-3" />
      </button>
    </div>
  )
}

/* A single nav row: mono glyph + label + right-aligned mono count. */
function NavRow({ item }: { item: SidebarNavItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={
        'flex items-center gap-[11px] rounded-[10px] px-[11px] py-2.5 transition-colors ' +
        (item.active ? 'bg-bg-muted' : 'hover:bg-bg-muted')
      }
    >
      <span
        className={
          'w-[18px] text-center font-mono text-[14px] leading-none ' +
          (item.active ? 'text-accent' : 'text-text-3')
        }
        aria-hidden
      >
        {item.glyph}
      </span>
      <span className={'text-[14px] ' + (item.active ? 'font-bold text-text-1' : 'font-medium text-text-2')}>
        {item.label}
      </span>
      <span className="tnum ml-auto font-mono text-[11px] text-text-4">{item.count}</span>
    </button>
  )
}

/* Brand square: 28x28 accent tile holding a 3-bar mini chart (white bars). */
function LogoMark() {
  const bars = [7, 13, 9]
  return (
    <span
      className="grid h-7 w-7 flex-none place-content-center rounded-[8px] bg-accent"
      aria-hidden
    >
      <span className="flex items-end gap-[2px]">
        {bars.map((h, i) => (
          <span key={i} className="w-[3px] rounded-[1px] bg-accent-text" style={{ height: h }} />
        ))}
      </span>
    </span>
  )
}
