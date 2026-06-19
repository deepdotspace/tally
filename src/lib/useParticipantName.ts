/*
 * Per-session participant name for the "ask for names" mode, persisted in
 * localStorage so a voter is not re-prompted on reconnect (mirrors useDeviceId).
 * Keyed by join code so a name does not leak across sessions. Empty is allowed
 * (clears the stored name). SSR-safe: every accessor guards `typeof window`.
 */

import { useState } from 'react'

const nameKey = (code: string) => `tally:name:${code}`

/** Read the stored name for a session code, or '' (SSR / unset / storage off). */
function readName(code: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(nameKey(code)) ?? ''
  } catch {
    return ''
  }
}

/** Hook form: the participant's name for one session, with a trimming setter. */
export function useParticipantName(code: string): { name: string; setName: (n: string) => void } {
  const [name, setNameState] = useState(() => readName(code))

  function setName(n: string) {
    const trimmed = n.trim()
    setNameState(trimmed)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(nameKey(code), trimmed)
    } catch {
      // Private mode / storage disabled: the in-memory name still works this session.
    }
  }

  return { name, setName }
}
