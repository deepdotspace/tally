/**
 * Download menu for one saved poll on the Session-detail card (PROTOTYPE-MAP-v3
 * Feature 1). A quiet trigger opens a small two-row menu: Spreadsheet (.csv) and
 * Chart image (.png). CSV via toResultsCsv + downloadCsv; PNG via the canvas
 * builder in lib/export. Light app chrome; one menu open at a time, closed on
 * outside click. Consumes the frozen SessionPollResult contract.
 */

import { useState } from 'react'
import type { SessionPollResult } from '../../lib/library-data'
import { toResultsCsv, downloadCsv, downloadResultsImage, slugify } from '../../lib/export'

export function ExportMenu({ result }: { result: SessionPollResult }) {
  const [open, setOpen] = useState(false)
  const { poll, responses, upvotes, qaEnvelopes } = result
  const base = slugify(poll.title, 'tally-results')

  function exportCsv() {
    downloadCsv(`${base}.csv`, toResultsCsv(poll, responses, upvotes, qaEnvelopes))
    setOpen(false)
  }
  function exportPng() {
    downloadResultsImage(poll, responses, `${base}.png`, upvotes, qaEnvelopes)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[7px] rounded-[8px] border border-border-4 px-[11px] py-1.5 text-[12.5px] font-semibold text-text-2 transition-colors hover:border-border-7 hover:text-text-1"
      >
        <span className="text-[13px] leading-none" aria-hidden>
          &#8615;
        </span>
        Download
        <span className="text-[9px] text-text-4" aria-hidden>
          &#9662;
        </span>
      </button>

      {open && (
        <>
          {/* Click-catcher closes the menu on any outside click. */}
          <div className="fixed inset-0 z-[8]" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-10 z-[9] w-[236px] rounded-[12px] border border-border bg-bg-2 p-1.5"
            style={{ boxShadow: '0 18px 44px -16px rgba(20,30,50,0.32)', animation: 'tlyPop 0.14s ease' }}
          >
            <ExportRow
              badge="CSV"
              badgeBg="#EAF6EE"
              badgeColor="#1F9D57"
              title="Spreadsheet"
              sub="Opens in Sheets or Excel"
              onClick={exportCsv}
            />
            <ExportRow
              badge="PNG"
              badgeBg="#EAF3FE"
              badgeColor="#1E86F0"
              title="Chart image"
              sub="Picture of the result"
              onClick={exportPng}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface ExportRowProps {
  badge: string
  badgeBg: string
  badgeColor: string
  title: string
  sub: string
  onClick: () => void
}

function ExportRow({ badge, badgeBg, badgeColor, title, sub, onClick }: ExportRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[11px] rounded-[8px] px-[11px] py-2.5 text-left transition-colors hover:bg-bg-muted"
    >
      <span
        className="flex h-[30px] w-[30px] flex-[0_0_30px] items-center justify-center rounded-[8px] font-mono text-[11px] font-bold"
        style={{ background: badgeBg, color: badgeColor }}
      >
        {badge}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-text-1">{title}</span>
        <span className="block text-[11.5px] text-text-3">{sub}</span>
      </span>
    </button>
  )
}
