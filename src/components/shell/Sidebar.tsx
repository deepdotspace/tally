import * as React from 'react'

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
  accountImageUrl?: string
}

export function Sidebar({
  onHome,
  onNewPoll,
  onVoiceNew,
  navItems,
  accountName,
  accountImageUrl,
}: SidebarProps) {
  const initials = (accountName?.[0] ?? 'U').toUpperCase()
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

      {/* Account footer. */}
      <div className="mt-auto flex items-center gap-2.5 border-t border-[var(--bg-0)] px-2 pt-2.5">
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
            {accountName || 'Account'}
          </span>
          <span className="text-[11px] text-text-3">Free plan</span>
        </span>
      </div>
    </aside>
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
