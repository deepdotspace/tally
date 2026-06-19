/*
 * Stat counters. Four cards that count up to their value when the section
 * scrolls into view (the prototype's reveal + 1400ms cubic ease-out). Tally is
 * newly launched, so the values are HONEST zero-friction facts, not invented
 * adoption numbers: no signups, no installs, free to start, no signups for the
 * audience. The non-numeric "Free" card shows its word directly.
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Reveal } from './Reveal'

const display = "'Archivo', sans-serif"
const mono = "'JetBrains Mono', monospace"

const cards = [
  { value: 0, label: 'signups to vote', accent: false },
  { value: 0, label: 'apps to install', accent: false },
  { value: null as number | null, display: 'Free', label: 'to start, no card needed', accent: true },
  { value: 0, label: 'signups asked of your audience', accent: false },
]

function useCountUp(target: number, run: boolean, reduce: boolean) {
  const [n, setN] = useState(reduce ? target : 0)
  const started = useRef(false)
  useEffect(() => {
    if (!run || started.current) return
    started.current = true
    if (reduce) {
      setN(target)
      return
    }
    const dur = 1400
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setN(Math.round(target * e))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [run, target, reduce])
  return n
}

function StatCard({ card, run, reduce }: { card: (typeof cards)[number]; run: boolean; reduce: boolean }) {
  const n = useCountUp(card.value ?? 0, run, reduce)
  const big = card.value === null ? card.display : n.toLocaleString('en-US')
  return (
    <div style={{ background: '#0D1015', border: '1px solid #181C22', borderRadius: 16, padding: 24 }}>
      <div style={{ fontFamily: display, fontWeight: 900, fontSize: 44, letterSpacing: '-0.03em', color: card.accent ? '#4FB0FF' : '#F2F5F8', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {big}
      </div>
      <div style={{ fontSize: 14, color: '#8A929C', marginTop: 10 }}>{card.label}</div>
    </div>
  )
}

export function Stats() {
  const reduce = useReducedMotion()
  const [run, setRun] = useState(false)

  return (
    <section id="stats" style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '50px 32px 60px' }}>
      <Reveal y={30}>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', color: '#4FB0FF', marginBottom: 14 }}>WHY TALLY</div>
        <h2 style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 44px)', lineHeight: 1.02, letterSpacing: '-0.03em', color: '#F2F5F8', maxWidth: 620, textWrap: 'balance' }}>
          Built to be read from the back row.
        </h2>
      </Reveal>
      <Reveal y={40} delay={80} onReveal={() => setRun(true)}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 40 }}>
          {cards.map((c) => (
            <StatCard key={c.label} card={c} run={run} reduce={!!reduce} />
          ))}
        </div>
      </Reveal>
    </section>
  )
}
