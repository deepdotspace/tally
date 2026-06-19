import { Navigate } from 'react-router-dom'

/* The deck manager folded into the Library + Deck detail (v2 IA). Redirect. */
export default function DecksRedirect() {
  return <Navigate to="/library" replace />
}
