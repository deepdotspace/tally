/**
 * /r/:code — public, read-only results permalink (SPEC §7 S3, TALLY-DESIGN §2+§4).
 *
 * A clean, chrome-free live results page: the question + the live result viz +
 * a small footer. No join code, no QR, no controls, no answer affordance. It
 * mirrors the presenter data wiring (resolve session by code, follow the active
 * poll, render ResultsView read-only) but drops everything a viewer cannot act
 * on. Anonymous, and updates live via the useQuery WS subscriptions.
 *
 * Embeddable as-is (no chrome): <iframe src="https://tally.app.space/r/<code>">
 * renders this page inline on any site.
 */

import { useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ResultsView } from '../../components/results'
import { useSessionByCode, usePoll, useResponses, useUpvotes, NO_MATCH } from '../../lib/poll-data'
import type { Response } from '../../types'

export default function ResultsPermalinkPage() {
  const { code = '' } = useParams<{ code: string }>()
  const upper = code.toUpperCase()

  const { session, sessionId, status: sessionStatus } = useSessionByCode(upper)
  // A deck advances currentPollId; a single-poll session uses pollId.
  const activePollId = session?.currentPollId || session?.pollId
  const { poll, status: pollStatus } = usePoll(activePollId)
  const respScope = sessionId ?? undefined
  const respPoll = poll ? activePollId : undefined
  const { responses } = useResponses(respScope, respPoll)
  // Raw envelopes + upvotes feed the Q&A cards (qaItems needs recordIds).
  const qa = useQuery<Response>('responses', { where: respScope && respPoll ? { sessionId: respScope, pollId: respPoll } : { recordId: NO_MATCH } })
  const { upvotes } = useUpvotes(respScope, respPoll)

  const host = typeof window !== 'undefined' ? window.location.host : 'tally.app.space'

  if (sessionStatus === 'loading') return <PermalinkShell host={host}>Loading the results.</PermalinkShell>

  if (!session) {
    return (
      <PermalinkShell host={host}>No live session here.</PermalinkShell>
    )
  }

  if (!poll || pollStatus === 'loading') {
    return <PermalinkShell host={host}>Waiting for the question.</PermalinkShell>
  }

  // Same gate a viewer gets: hidden until reveal unless the host has revealed,
  // and never shown when the poll hides results from the audience.
  const settings = poll.settings
  const visible =
    settings.resultsVisible !== false &&
    (!settings.hideUntilReveal || (session.resultsRevealed ?? 0) > 0)

  return (
    <Page host={host}>
      <h1
        className="flex-none font-display font-bold tracking-[-0.02em] text-text-1"
        style={{ fontSize: 'var(--text-pt-question)', lineHeight: 1.04, textWrap: 'pretty' }}
      >
        {poll.title}
      </h1>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {visible ? (
          <div className="max-h-full w-full overflow-y-auto">
            <ResultsView poll={poll} responses={responses} qaEnvelopes={qa.records} upvotes={upvotes} scale="presenter" />
          </div>
        ) : (
          <ResultsHidden />
        )}
      </div>
    </Page>
  )
}

/* The page frame: full-bleed dark world, question + viz stack, small footer.
   data-theme="dark" pins the projection palette so the shared/embedded results
   page matches the presenter on any app theme (and inside an iframe). */
function Page({ children, host }: { children: React.ReactNode; host: string }) {
  return (
    <div data-theme="dark" className="flex h-screen w-screen flex-col overflow-hidden bg-bg-0 text-text-1">
      <main className="flex min-h-0 flex-1 flex-col gap-7 px-12 pb-4 pt-10">{children}</main>
      <Footer host={host} />
    </div>
  )
}

/* Small attribution footer, no join affordance (this is a results-only view). */
function Footer({ host }: { host: string }) {
  return (
    <footer className="flex flex-none items-center justify-end border-t border-border px-12 py-5">
      <span className="font-display text-[length:var(--text-pt-eyebrow)] font-medium text-text-3">{host}</span>
    </footer>
  )
}

/* Centered status state (loading / no session / waiting), same dark world. */
function PermalinkShell({ children, host }: { children: React.ReactNode; host: string }) {
  return (
    <div data-theme="dark" className="flex h-screen w-screen flex-col bg-bg-0 text-text-1">
      <div className="flex min-h-0 flex-1 items-center justify-center gap-3 px-12">
        <span
          className="inline-block h-2.5 w-2.5 animate-[var(--animate-rs-pulse)] rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <p className="font-display text-[length:var(--text-pt-question-sm)] font-bold tracking-[-0.02em] text-text-2">
          {children}
        </p>
      </div>
      <Footer host={host} />
    </div>
  )
}

/* Designed "results hidden" state: the host has not revealed results yet. */
function ResultsHidden() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border-2 bg-bg-2 px-8 py-16 text-center">
      <p className="font-display text-[length:var(--text-pt-option)] font-bold text-text-2">
        Results are hidden
      </p>
      <p className="text-[length:var(--text-pt-eyebrow)] text-text-3">
        The host has not revealed results yet.
      </p>
    </div>
  )
}
