/*
 * `/` is the public front door and the landing the Tally logo returns to. It is
 * the marketing landing for everyone (signed in or out); a signed-in host reaches
 * their app from the landing CTA or the sidebar. The motion-led landing is
 * React.lazy()'d so framer-motion stays in a separate chunk, out of the app bundle.
 */

import { Suspense, lazy } from 'react'

const Landing = lazy(() => import('../components/landing/Landing'))

export default function Index() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090C' }} />}>
      <Landing />
    </Suspense>
  )
}
