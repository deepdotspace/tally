import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JoinForm } from '../components/voter'

/* /join — anonymous code entry. Navigates to /v/<CODE> on submit. */
export default function JoinPage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  function submit() {
    const c = code.trim().toUpperCase()
    if (c) navigate(`/v/${encodeURIComponent(c)}`)
  }

  return <JoinForm code={code} onChange={setCode} onSubmit={submit} />
}
