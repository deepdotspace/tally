import { Navigate } from 'react-router-dom'

/* The dashboard folded into the Library (v2 IA). Redirect any lingering link. */
export default function DashboardRedirect() {
  return <Navigate to="/library" replace />
}
