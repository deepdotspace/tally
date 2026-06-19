/**
 * Gated creator chrome. Any file under src/pages/(protected)/ requires sign-in
 * (AuthGate) and renders inside the light app shell: a 232px Sidebar beside the
 * route outlet (PROTOTYPE-MAP section 2). The authoring app is light-primary.
 *
 * The `(protected)` folder is a Generouted route group; parentheses mean it
 * does not appear in the URL. Children may call data hooks safely because
 * _app.tsx mounts <RecordProvider> above this layout.
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AuthGate, useUser } from 'deepspace'
import { AppShell, Sidebar } from '../../components/shell'
import type { SidebarNavItem } from '../../components/shell'
import { useLibrary, useClosedSessions } from '../../lib/library-data'

export default function ProtectedLayout() {
  return (
    <AuthGate>
      <CreatorShell />
    </AuthGate>
  )
}

function CreatorShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useUser()
  const { decks } = useLibrary()
  const { rows: sessions } = useClosedSessions()

  // Library owns the authoring surfaces; History owns the past-sessions surfaces.
  const onLibrary = pathname === '/library' || pathname.startsWith('/deck') || pathname.startsWith('/build')
  const onHistory = pathname.startsWith('/history') || pathname.startsWith('/session')

  const navItems: SidebarNavItem[] = [
    { id: 'library', label: 'Library', glyph: '▤', count: decks.length, active: onLibrary, onClick: () => navigate('/library') },
    { id: 'history', label: 'History', glyph: '⧖', count: sessions.length, active: onHistory, onClick: () => navigate('/history') },
  ]

  return (
    <AppShell
      sidebar={
        <Sidebar
          onHome={() => navigate('/library')}
          onNewPoll={() => navigate('/build')}
          onVoiceNew={() => navigate('/voice')}
          navItems={navItems}
          accountName={user?.name || user?.email}
          accountImageUrl={user?.imageUrl}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}
