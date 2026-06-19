import * as React from 'react'
import { useCallback, useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'

import { cn } from './utils'
import { THEME_STORAGE_KEY, type ThemeMode } from '../../themes'

/*
 * Theme toggle (Signal §4.6 recipe, mirrors ../signal ThemeToggle + lib/theme).
 * 32x32 round button: sun in dark (click -> light), moon in light (click ->
 * dark). The boot script in index.html applies the stored mode before first
 * paint; this handles runtime toggling. Self-contained, no shared theme module.
 */

const CHANGE_EVENT = 'tally-theme-change'

function read(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function toggle(): void {
  const next: ThemeMode = read() === 'dark' ? 'light' : 'dark'
  const root = document.documentElement
  root.setAttribute('data-theme', next)
  root.style.colorScheme = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private mode / storage disabled: in-memory only is acceptable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb)
  return () => window.removeEventListener(CHANGE_EVENT, cb)
}

/** Reactive hook: current mode plus a toggle. */
export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
  const mode = useSyncExternalStore(subscribe, read, () => 'dark' as ThemeMode)
  return { mode, toggle: useCallback(toggle, []) }
}

function ThemeToggle({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  const { mode, toggle } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      className={cn(
        'grid h-8 w-8 place-content-center rounded-full text-[var(--text-2)] transition-colors hover:bg-[var(--bg-1)] hover:text-[var(--text-1)]',
        className,
      )}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export { ThemeToggle }
