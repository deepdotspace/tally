import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button, Input } from '../ui'
import { callAction } from '../../lib/actions-client'
import type { PollType } from '../../types'

/*
 * AI poll draft for the builder (SPEC §7 S4, §2). A topic input + button calls
 * generatePoll, which BILLS THE SIGNED-IN CREATOR for their own usage, never the
 * host. On success the parent prefills the question and (for option types) the
 * options. Secondary affordance: the manual fields stay fully usable.
 */
export interface AiGenerateProps {
  type: PollType
  /** Apply the model's draft to the builder state (parent maps options). */
  onResult: (result: { question: string; options: string[] }) => void
}

export function AiGenerate({ type, onResult }: AiGenerateProps) {
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    const t = topic.trim()
    if (!t || busy) return
    setBusy(true)
    setError(null)
    const res = await callAction<{ question: string; options: string[] }>('generatePoll', { topic: t, type })
    setBusy(false)
    if (!res.success || !res.data) {
      setError(res.error ?? 'Could not generate a poll')
      return
    }
    onResult(res.data)
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-bg-2 p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Draft with AI
      </div>
      <div className="flex items-center gap-2">
        <Input
          data-testid="ai-generate-topic"
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void generate() } }}
          maxLength={120}
          disabled={busy}
          placeholder="A topic to draft a question from"
          className="flex-1 border-border bg-bg-1 text-[14px] text-text-1 focus-visible:border-accent focus-visible:ring-0"
        />
        <Button
          data-testid="ai-generate-run"
          variant="secondary"
          onClick={() => void generate()}
          disabled={!topic.trim() || busy}
          loading={busy}
        >
          Generate
        </Button>
      </div>
      {error ? (
        <p className="text-[12px] text-live">{error}</p>
      ) : (
        <p className="text-[11.5px] text-text-3">Runs on your own DeepSpace credits, never the room's. You can edit everything after.</p>
      )}
    </div>
  )
}
