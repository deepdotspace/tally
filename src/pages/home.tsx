import { Navigate } from 'react-router-dom'

/* Legacy `/home` route folded into `/` (the public front door). Redirect. */
export default function HomeRedirect() {
  return <Navigate to="/" replace />
}
