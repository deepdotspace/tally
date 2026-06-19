/**
 * /session/:id - the saved results snapshot for one CLOSED session
 * (PROTOTYPE-MAP 3.5). An 860px column: a History breadcrumb, the session name,
 * a "N participants . date" line, then one result card per poll in deck order.
 * Each card carries a mono type chip, a right-aligned response count, the
 * question, and the saved viz via ResultsView. Reads useSessionResults (Wave 1),
 * which loads responses WITHOUT a live gate, so past results stay readable.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { ResultsView } from '../../../components/results'
import { ExportMenu } from '../../../components/results/ExportMenu'
import { SessionAiSummary } from '../../../components/results/SessionAiSummary'
import { typeMeta } from '../../../components/creator'
import { responseLabel, useSessionResults } from '../../../lib/library-data'
import type { SessionPollResult } from '../../../lib/library-data'

export default function SessionDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { name, participantCount, dateLabel, polls, status, session } = useSessionResults(id)

  if (status === 'loading' && !session) return <Centered>Loading the session.</Centered>
  if (!session) return <Centered>This session no longer exists.</Centered>

  return (
    <div className="mx-auto h-full w-full max-w-[860px] overflow-y-auto px-10 pb-[60px] pt-7">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] text-text-3">
        <button type="button" onClick={() => navigate('/history')} className="transition-colors hover:text-text-1">
          History
        </button>
        <span aria-hidden>/</span>
        <span className="truncate text-text-2">{name || 'Session'}</span>
      </nav>

      <h1 className="mt-3.5 font-display text-[28px] font-extrabold tracking-[-0.03em] text-text-1">
        {name || 'Session'}
      </h1>
      <p className="tnum mt-1.5 text-[13.5px] text-text-3">
        {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
        {dateLabel ? ` · ${dateLabel}` : ''}
      </p>

      {polls.length === 0 ? (
        <p className="mt-[26px] rounded-[14px] border border-border bg-bg-2 px-6 py-12 text-center text-[14px] text-text-3">
          No saved results for this session.
        </p>
      ) : (
        <div className="mt-[26px] flex flex-col gap-3.5">
          {polls.map((p) => (
            <ResultCard key={p.pollId} result={p} sessionId={id} />
          ))}
        </div>
      )}
    </div>
  )
}

/* One saved-poll card: type chip + response count + Download, the question,
 * the viz, and an AI summary on the open-text (word cloud + Q&A) cards. */
function ResultCard({ result, sessionId }: { result: SessionPollResult; sessionId: string }) {
  const { poll, responses } = result
  const meta = typeMeta(poll.type)
  const label = responseLabel(poll, responses.length)
  const isText = poll.type === 'wordcloud' || poll.type === 'qa'
  return (
    <section className="rounded-[14px] border border-border bg-bg-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-[6px] bg-bg-muted px-[9px] py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          {meta.name}
        </span>
        <div className="flex items-center gap-3">
          <span className="tnum font-mono text-[12px] text-text-4">{label}</span>
          <ExportMenu result={result} />
        </div>
      </div>
      <h2 className="mt-3 font-display text-[19px] font-bold tracking-[-0.01em] text-text-1">{poll.title}</h2>
      <div className="mt-4">
        <ResultsView
          poll={poll}
          responses={responses}
          qaEnvelopes={result.qaEnvelopes}
          upvotes={result.upvotes}
          scale="dashboard"
        />
      </div>
      {isText && <SessionAiSummary sessionId={sessionId} pollId={result.pollId} responseLabel={label} />}
    </section>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[860px] px-10 pb-[60px] pt-7">
      <p className="text-[14px] text-text-3">{children}</p>
    </div>
  )
}
