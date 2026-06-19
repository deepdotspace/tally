/**
 * Free results export (SPEC §7 S3, a real wedge: rivals paywall this). Builds a
 * CSV string shaped per poll type from the day-0 aggregation helpers, and a PNG
 * of the rendered results node. Client-side only, no backend, no new data path.
 */

import type { RecordData } from 'deepspace'
import type { Poll, Response, Upvote } from '../types'
import { config } from '../config'
import {
  aggregateChoice,
  aggregateWordCloud,
  aggregateScale,
  aggregateRanking,
  aggregateNumeric,
  npsScore,
  qaItems,
} from './poll-data'

/** Escape one CSV field: quote when it holds a comma, quote, or newline. */
function csvField(value: string | number): string {
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Join a 2D array of cells into a CSV string (CRLF rows, per RFC 4180). */
function csvRows(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n')
}

/**
 * Build a CSV for one poll's results, shaped by type. choice/multi ->
 * option,votes,percent; wordcloud -> word,count; scale -> value,count + an
 * average row; nps -> value,count + a score summary; qa -> question,upvotes
 * (approved only). qaEnvelopes carry recordIds for the upvote tally.
 */
export function toResultsCsv(
  poll: Poll,
  responses: Response[],
  upvotes: Upvote[] = [],
  qaEnvelopes: RecordData<Response>[] = [],
): string {
  switch (poll.type) {
    case 'choice':
    case 'multi':
    case 'quiz':
    case 'ranking': {
      const { options, total } = aggregateChoice(responses, poll)
      const rows: (string | number)[][] = [['option', 'votes', 'percent']]
      for (const o of options) {
        const pct = total ? Math.round((o.count / total) * 100) : 0
        rows.push([o.label, o.count, `${pct}%`])
      }
      return csvRows(rows)
    }
    case 'wordcloud': {
      const words = aggregateWordCloud(responses)
      const rows: (string | number)[][] = [['word', 'count'], ...words.map((w) => [w.text, w.count])]
      return csvRows(rows)
    }
    case 'numeric': {
      // Numbers list each raw guess plus a count + average, not a word/count tally.
      const target = (poll.settings as { target?: number }).target
      const { average, closest } = aggregateNumeric(responses, {
        target: typeof target === 'number' ? target : undefined,
      })
      const values = responses.map((r) => r.value).filter((v) => Number.isFinite(v))
      const rows: (string | number)[][] = [['guess'], ...values.map((v) => [v])]
      rows.push([], ['count', values.length], ['average', average.toFixed(2)])
      if (closest) rows.push(['closest to target', closest.value])
      return csvRows(rows)
    }
    case 'scale': {
      const min = poll.settings.min ?? config.ranges.scaleMin
      const max = poll.settings.max ?? config.ranges.scaleMax
      const { buckets, average } = aggregateScale(responses, min, max)
      const rows: (string | number)[][] = [['value', 'count'], ...buckets.map((b) => [b.value, b.count])]
      rows.push(['average', average.toFixed(2)])
      return csvRows(rows)
    }
    case 'nps': {
      const { score, promoters, passives, detractors } = npsScore(responses)
      const { buckets } = aggregateScale(responses, config.ranges.npsMin, config.ranges.npsMax)
      const rows: (string | number)[][] = [['value', 'count'], ...buckets.map((b) => [b.value, b.count])]
      rows.push([], ['nps score', score], ['promoters', promoters], ['passives', passives], ['detractors', detractors])
      return csvRows(rows)
    }
    case 'qa': {
      const items = qaItems(qaEnvelopes, upvotes)
      // Name is populated only when the session asked for one; blank otherwise.
      const rows: (string | number)[][] = [
        ['question', 'name', 'upvotes'],
        ...items.map((i) => [i.response.text, i.response.displayName ?? '', i.upvotes]),
      ]
      return csvRows(rows)
    }
    default:
      return csvRows([['option', 'votes', 'percent']])
  }
}

/** Trigger a client-side file download from a string via a Blob object URL. */
function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a CSV string as a file (UTF-8 BOM so Excel reads accents). */
export function downloadCsv(filename: string, csv: string): void {
  downloadBlob(filename, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
}

/** One labelled bar in a PNG chart: a label, a numeric value, and a 0..1 share. */
interface ChartBar {
  label: string
  value: string
  share: number
}

/**
 * Reduce one poll's results to a flat bar list for the PNG chart, shaped per
 * type. Shares are 0..1 of the largest bar so the top bar always fills the track.
 */
function resultBars(
  poll: Poll,
  responses: Response[],
  upvotes: Upvote[] = [],
  qaEnvelopes: RecordData<Response>[] = [],
): ChartBar[] {
  const scaled = (rows: { label: string; n: number; value?: string }[]): ChartBar[] => {
    const peak = Math.max(1, ...rows.map((r) => r.n))
    return rows.map((r) => ({ label: r.label, value: r.value ?? String(r.n), share: r.n / peak }))
  }
  switch (poll.type) {
    case 'choice':
    case 'multi':
    case 'quiz': {
      const { options, total } = aggregateChoice(responses, poll)
      return scaled(
        options.map((o) => ({
          label: o.label,
          n: o.count,
          value: `${o.count} (${total ? Math.round((o.count / total) * 100) : 0}%)`,
        })),
      )
    }
    case 'ranking': {
      // Already sorted best-first by mean rank; the top item fills, the rest taper.
      const rows = aggregateRanking(responses, poll).filter((r) => r.count > 0)
      return rows.map((r, i) => ({
        label: r.label,
        value: `#${r.meanRank.toFixed(1)}`,
        share: rows.length ? (rows.length - i) / rows.length : 1,
      }))
    }
    case 'wordcloud':
      return scaled(aggregateWordCloud(responses).slice(0, 12).map((w) => ({ label: w.text, n: w.count })))
    case 'scale': {
      const min = poll.settings.min ?? config.ranges.scaleMin
      const max = poll.settings.max ?? config.ranges.scaleMax
      const { buckets } = aggregateScale(responses, min, max)
      return scaled(buckets.map((b) => ({ label: String(b.value), n: b.count })))
    }
    case 'nps': {
      const { buckets } = aggregateScale(responses, config.ranges.npsMin, config.ranges.npsMax)
      return scaled(buckets.map((b) => ({ label: String(b.value), n: b.count })))
    }
    case 'numeric': {
      const { buckets } = aggregateNumeric(responses)
      return scaled(
        buckets.map((b) => ({ label: `${Math.round(b.lo)} to ${Math.round(b.hi)}`, n: b.count })),
      )
    }
    case 'qa': {
      const items = qaItems(qaEnvelopes, upvotes).slice(0, 12)
      return scaled(items.map((i) => ({ label: i.response.text, n: i.upvotes, value: `${i.upvotes} up` })))
    }
    default:
      return []
  }
}

/** Round-rect path helper for canvas bar tracks/fills (no roundRect dependency). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

/**
 * Render a poll's result chart to a 1200xH PNG on white and download it: the
 * Tally mark + wordmark, the question, then one horizontal bar per result
 * (top bar in accent, the rest muted). Pure canvas, no DOM capture.
 */
export function downloadResultsImage(
  poll: Poll,
  responses: Response[],
  filename: string,
  upvotes: Upvote[] = [],
  qaEnvelopes: RecordData<Response>[] = [],
): void {
  const bars = resultBars(poll, responses, upvotes, qaEnvelopes)
  const W = 1200
  const pad = 64
  const rowH = 64
  const top = 168
  const H = Math.max(420, top + bars.length * rowH + 64)
  const ratio = 2

  const canvas = document.createElement('canvas')
  canvas.width = W * ratio
  canvas.height = H * ratio
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(ratio, ratio)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Brand: a 30x30 accent square + the Tally wordmark.
  ctx.fillStyle = '#1E86F0'
  roundRect(ctx, pad, 46, 30, 30, 7)
  ctx.fill()
  ctx.fillStyle = '#15191F'
  ctx.font = '800 26px Archivo, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Tally', pad + 42, 62)

  // Question (truncated so it stays on one line).
  const q = poll.title.length > 58 ? `${poll.title.slice(0, 57)}…` : poll.title
  ctx.fillStyle = '#15191F'
  ctx.font = '800 34px Archivo, sans-serif'
  ctx.fillText(q, pad, 120)

  if (bars.length === 0) {
    ctx.fillStyle = '#8A929C'
    ctx.font = '500 19px "Hanken Grotesk", sans-serif'
    ctx.fillText('No responses to chart yet.', pad, top + 10)
  }

  bars.forEach((bar, i) => {
    const y = top + i * rowH
    ctx.fillStyle = '#5A646F'
    ctx.font = '600 19px "Hanken Grotesk", sans-serif'
    const label = bar.label.length > 52 ? `${bar.label.slice(0, 51)}…` : bar.label
    ctx.fillText(label, pad, y + 12)

    const trackY = y + 28
    const trackW = W - pad * 2
    const trackH = 18
    ctx.fillStyle = '#EAEDF1'
    roundRect(ctx, pad, trackY, trackW, trackH, 9)
    ctx.fill()
    ctx.fillStyle = i === 0 ? '#1E86F0' : '#C8D0DA'
    roundRect(ctx, pad, trackY, Math.max(trackH, trackW * Math.max(0, Math.min(1, bar.share))), trackH, 9)
    ctx.fill()

    ctx.fillStyle = '#15191F'
    ctx.font = '800 20px Archivo, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(bar.value, W - pad, y + 12)
    ctx.textAlign = 'left'
  })

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(filename, blob)
  }, 'image/png')
}

/** Slugify a poll title for a filename: lowercase, words to hyphens, trimmed. */
export function slugify(title: string, fallback = 'poll'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || fallback
}
