import type { RecordData } from 'deepspace'
import { ChoiceBars } from './ChoiceBars'
import { WordCloud } from './WordCloud'
import { ScaleHistogram } from './ScaleHistogram'
import { NpsResult } from './NpsResult'
import { QaList } from './QaList'
import { Ranking } from './Ranking'
import { Numeric } from './Numeric'
import { Quiz } from './Quiz'
import type { ResultScale } from './types'
import type { Poll, Response, Upvote } from '../../types'
import { config } from '../../config'
import {
  aggregateChoice,
  aggregateWordCloud,
  aggregateScale,
  aggregateRanking,
  aggregateNumeric,
  tallyQuiz,
  npsScore,
  qaItems,
} from '../../lib/poll-data'

/*
 * Shared live results. One component the presenter, voter, and session-detail
 * surfaces render; it switches on poll.type and AGGREGATES the raw rows
 * internally (via lib/poll-data) so no surface re-aggregates. Each viz renders
 * the bar/histogram/word recipe and tweens as rows arrive. Every consumer
 * supplies its own type label/eyebrow chrome, so this renders only the viz.
 */

export interface ResultsViewProps {
  /** The poll being shown; its type selects the viz, its settings the bounds. */
  poll: Poll
  /** Raw response rows for this poll in this session (from useResponses). */
  responses: Response[]
  /** Render context. presenter = room-legible, voter = mobile, dashboard = compact. */
  scale: ResultScale
  /** Voter view: the viewer's own choice id (theirs renders lime, others mute). */
  ownChoiceId?: string
  /** Q&A: raw response envelopes (q.records), so each card carries its recordId. */
  qaEnvelopes?: RecordData<Response>[]
  /** Q&A: live upvote rows (from useUpvotes), counted into the cards. */
  upvotes?: Upvote[]
  /** Q&A voter view: cast an upvote (the seam W-voter-S2 wires; omit = read-only). */
  onUpvote?: (responseId: string) => void
  /** Q&A: whether this device already upvoted a question (disables its button). */
  hasUpvoted?: (responseId: string) => boolean
}

export function ResultsView({
  poll,
  responses,
  scale,
  ownChoiceId,
  qaEnvelopes,
  upvotes,
  onUpvote,
  hasUpvoted,
}: ResultsViewProps) {
  return renderViz()

  function renderViz() {
    switch (poll.type) {
      case 'choice':
      case 'multi': {
        const { options, total } = aggregateChoice(responses, poll)
        return <ChoiceBars options={options} total={total} multi={poll.type === 'multi'} ownChoiceId={ownChoiceId} scale={scale} />
      }
      case 'wordcloud':
        return <WordCloud words={aggregateWordCloud(responses)} scale={scale} />
      case 'scale': {
        const min = poll.settings.min ?? config.ranges.scaleMin
        const max = poll.settings.max ?? config.ranges.scaleMax
        const { buckets, average } = aggregateScale(responses, min, max)
        return <ScaleHistogram buckets={buckets} average={average} scale={scale} />
      }
      case 'nps': {
        const { score, promoters, passives, detractors, total } = npsScore(responses)
        const { buckets, average } = aggregateScale(responses, config.ranges.npsMin, config.ranges.npsMax)
        return <NpsResult score={score} promoters={promoters} passives={passives} detractors={detractors} total={total} average={average} buckets={buckets} scale={scale} />
      }
      case 'qa': {
        const items = qaItems(qaEnvelopes ?? [], upvotes ?? []).map((i) => ({
          recordId: i.recordId,
          text: i.response.text,
          upvotes: i.upvotes,
          displayName: i.response.displayName,
        }))
        return <QaList items={items} scale={scale} onUpvote={onUpvote} hasUpvoted={hasUpvoted} />
      }
      case 'ranking':
        return <Ranking rows={aggregateRanking(responses, poll)} scale={scale} />
      case 'numeric': {
        // `target` is an optional numeric-only setting carried in the settings JSON.
        const target = (poll.settings as { target?: number }).target
        const { buckets, average, closest } = aggregateNumeric(responses, {
          target: typeof target === 'number' ? target : undefined,
        })
        return <Numeric buckets={buckets} average={average} closest={closest} scale={scale} />
      }
      case 'quiz': {
        const { perOption, leaderboard } = tallyQuiz(responses, poll)
        // ResultsView only renders a quiz once the surface has decided to show it,
        // so the correct marking + leaderboard are revealed here.
        return <Quiz options={perOption} leaderboard={leaderboard} total={responses.length} revealed scale={scale} />
      }
    }
  }
}
