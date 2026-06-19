/*
 * Stable per-device id for anonymous voters (Party Pack cid pattern, mirrors
 * ../partypack/src/shared/identity.ts:18). Minted once and persisted in
 * localStorage so a voter's choices survive reconnects without any sign-in.
 * SSR-safe: every accessor guards `typeof window`.
 */

import { useState } from 'react'

const DEVICE_KEY = 'tally.deviceId'

/** Mint a fresh cid: `c-<rand><ts>`, both base36 (Party Pack format). */
function mint(): string {
  return `c-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/** The stable device id, minted on first read. '' during SSR. */
export function readDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = mint()
      window.localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    // Private mode / storage disabled — a per-session id still works.
    return mint()
  }
}

/** Hook form: a stable device id for the lifetime of the component tree. */
export function useDeviceId(): string {
  const [id] = useState(readDeviceId)
  return id
}
