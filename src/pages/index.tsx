/*
 * `/` is the public front door. Signed-out visitors see the marketing landing;
 * signed-in hosts skip it and land in the Library (the app starts there). Auth
 * has already resolved here (AuthBoot waits on isLoaded in _app.tsx), so there
 * is no flash of the wrong surface.
 *
 * The motion-led landing is React.lazy()'d so framer-motion and all landing
 * code stay in a separate chunk, out of the signed-in app bundle.
 */

import { Suspense, lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from 'deepspace'

const Landing = lazy(() => import('../components/landing/Landing'))

export default function Index() {
  const { isSignedIn } = useAuth()
  if (isSignedIn) return <Navigate to="/library" replace />
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#07090C' }} />}>
      <Landing />
    </Suspense>
  )
}
