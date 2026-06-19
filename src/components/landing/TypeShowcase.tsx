/*
 * "Nine ways to ask" showcase. A single card crossfades through six result
 * panels (multiple choice, word cloud, NPS, ranking, numeric, open Q&A) every
 * 2.6s, then a wrap of nine chips names every type. Honors reduced-motion by
 * holding the first panel. The panels carry the prototype's exact result looks.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { typeChips } from './content'

const mono = "'JetBrains Mono', monospace"
const display = "'Archivo', sans-serif"

const panelLabel = (text: string) => (
  <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', color: '#4FB0FF' }}>{text}</div>
)

function MultipleChoice() {
  const rows = [
    { label: 'Lightning talks', pct: 46, fill: '#4FB0FF', col: '#4FB0FF' },
    { label: 'Workshop', pct: 30, fill: '#2A3038', col: '#9AA3AE' },
    { label: 'Panel', pct: 24, fill: '#2A3038', col: '#9AA3AE' },
  ]
  return (
    <div style={{ padding: '28px 32px' }}>
      {panelLabel('MULTIPLE CHOICE')}
      <div style={{ fontFamily: display, fontWeight: 800, fontSize: 26, color: '#F2F5F8', marginTop: 12, letterSpacing: '-0.02em' }}>
        Which session should we run after lunch?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 22, maxWidth: 560 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: '0 0 130px', fontSize: 14, color: '#DDE2E7' }}>{r.label}</span>
            <div style={{ flex: 1, height: 12, background: '#14181E', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${r.pct}%`, background: r.fill, borderRadius: 999 }} />
            </div>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: r.col, fontVariantNumeric: 'tabular-nums' }}>{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WordCloud() {
  const words = [
    { t: 'energizing', s: '5cqi', w: 800, c: '#4FB0FF', pulse: '0s' },
    { t: 'useful', s: '3.4cqi', w: 700, c: '#C2C9D1' },
    { t: 'clear', s: '4.2cqi', w: 800, c: '#E4E8EC' },
    { t: 'fast', s: '2.6cqi', w: 600, c: '#79828D' },
    { t: 'fun', s: '3.8cqi', w: 700, c: '#9AA3AE', pulse: '1.5s' },
    { t: 'dense', s: '2.4cqi', w: 600, c: '#5A636E' },
    { t: 'sharp', s: '3.2cqi', w: 700, c: '#C2C9D1' },
    { t: 'solid', s: '2.8cqi', w: 600, c: '#79828D' },
  ]
  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {panelLabel('WORD CLOUD')}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', alignContent: 'center', gap: '2px 18px' }}>
        {words.map((w) => (
          <span
            key={w.t}
            className={w.pulse ? 'tly-anim' : undefined}
            style={{
              fontFamily: display,
              fontWeight: w.w,
              fontSize: w.s,
              color: w.c,
              animation: w.pulse ? `tlyWordPulse 4s ease-in-out infinite ${w.pulse}` : undefined,
            }}
          >
            {w.t}
          </span>
        ))}
      </div>
    </div>
  )
}

function Nps() {
  const bars = [
    { h: 14, c: '#FF6A4D' }, { h: 9, c: '#FF6A4D' }, { h: 18, c: '#FF6A4D' }, { h: 14, c: '#FF6A4D' },
    { h: 22, c: '#FF6A4D' }, { h: 30, c: '#FF6A4D' }, { h: 40, c: '#FF6A4D' },
    { h: 52, c: '#7A828D' }, { h: 70, c: '#7A828D' }, { h: 100, c: '#4FB0FF' }, { h: 84, c: '#4FB0FF' },
  ]
  return (
    <div style={{ padding: '28px 32px' }}>
      {panelLabel('NPS 0 TO 10')}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontFamily: display, fontWeight: 900, fontSize: 52, color: '#4FB0FF', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>58</span>
          <span style={{ fontSize: 14, color: '#646D78' }}>NPS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: '#F2F5F8', fontVariantNumeric: 'tabular-nums' }}>8.4</span>
          <span style={{ fontSize: 14, color: '#646D78' }}>average</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 88, marginTop: 22, maxWidth: 520 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, height: `${b.h}%`, background: b.c, borderRadius: 3, opacity: b.c === '#FF6A4D' ? 0.8 : 1 }} />
        ))}
      </div>
    </div>
  )
}

function Ranking() {
  const rows = [
    { n: '1', label: 'Faster load times', pct: 92, lead: true },
    { n: '2', label: 'Better search', pct: 64, lead: false },
    { n: '3', label: 'Offline mode', pct: 48, lead: false },
  ]
  return (
    <div style={{ padding: '28px 32px' }}>
      {panelLabel('RANKING')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18, maxWidth: 540 }}>
        {rows.map((r) => (
          <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: r.lead ? '#4FB0FF' : '#14181E', color: r.lead ? '#06121E' : '#9AA3AE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: 13 }}>{r.n}</span>
            <span style={{ flex: '0 0 150px', fontSize: 15, color: '#E4E8EC' }}>{r.label}</span>
            <div style={{ flex: 1, height: 10, background: '#14181E', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${r.pct}%`, background: r.lead ? '#4FB0FF' : '#2A3038', borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Numeric() {
  const bars = [22, 44, 100, 78, 50, 30, 16]
  return (
    <div style={{ padding: '28px 32px' }}>
      {panelLabel('NUMERIC GUESS')}
      <div style={{ fontSize: 14, color: '#646D78', marginTop: 14 }}>Average guess</div>
      <div style={{ fontFamily: display, fontWeight: 900, fontSize: 56, color: '#4FB0FF', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>2,847</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56, marginTop: 18, maxWidth: 420 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: h === 100 || h === 78 ? '#4FB0FF' : '#2A3038', borderRadius: 3 }} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#646D78', marginTop: 14 }}>
        Closest so far <span style={{ color: '#9AA3AE', fontWeight: 700, fontFamily: mono }}>2,800</span>
      </div>
    </div>
  )
}

function OpenQa() {
  const rows = [
    { v: '42', col: '#4FB0FF', q: 'Will the slides be shared afterward?' },
    { v: '28', col: '#646D78', q: 'How do you handle very large rooms?' },
  ]
  return (
    <div style={{ padding: '28px 32px' }}>
      {panelLabel('OPEN Q&A')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 18, maxWidth: 600 }}>
        {rows.map((r) => (
          <div key={r.v} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '13px 15px', background: '#12161B', border: '1px solid #1C2128', borderRadius: 13 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
              <span style={{ fontSize: 12, color: r.col }}>&#9650;</span>
              <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 14, color: '#F2F5F8' }}>{r.v}</span>
            </div>
            <span style={{ flex: 1, fontSize: 15, color: '#DDE2E7' }}>{r.q}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PANELS: ReactNode[] = [<MultipleChoice />, <WordCloud />, <Nps />, <Ranking />, <Numeric />, <OpenQa />]

export function TypeShowcase() {
  const reduce = useReducedMotion()
  const [cyc, setCyc] = useState(0)

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setCyc((c) => (c + 1) % PANELS.length), 2600)
    return () => clearInterval(t)
  }, [reduce])

  return (
    <>
      <div
        style={{
          position: 'relative',
          height: 340,
          background: '#0E1217',
          border: '1px solid #1F252D',
          borderRadius: 20,
          padding: '28px 32px',
          marginTop: 36,
          containerType: 'inline-size',
          overflow: 'hidden',
        }}
      >
        {PANELS.map((panel, k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: cyc === k ? 1 : 0,
              transform: `scale(${cyc === k ? 1 : 0.97})`,
              transition: reduce ? 'none' : 'opacity .6s ease, transform .6s ease',
              pointerEvents: 'none',
            }}
          >
            {panel}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 18 }}>
        {typeChips.map((name) => (
          <div key={name} style={{ padding: '8px 14px', background: '#0E1217', border: '1px solid #1C2128', borderRadius: 999, fontSize: 13.5, color: '#DDE2E7', fontWeight: 600 }}>
            {name}
          </div>
        ))}
      </div>
    </>
  )
}
