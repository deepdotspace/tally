/*
 * Hero live-demo card. An auto-playing session: the question cycles through
 * examples (swap every 7.2s), votes stream in every 120ms (cap 112) so the
 * result bars race and the count ticks, rising vote-ping dots, and a floating
 * phone showing a tapped option with a "Voted" confirmation. Honors
 * reduced-motion: it settles on the first poll's true distribution, still.
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { heroPolls } from './content'

const VOTE_CAP = 112

export function HeroDemo() {
  const reduce = useReducedMotion()
  const [poll, setPoll] = useState(0)
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0])
  const [total, setTotal] = useState(0)
  const pollRef = useRef(0)

  useEffect(() => {
    pollRef.current = poll
  }, [poll])

  useEffect(() => {
    if (reduce) {
      // Settle on a plausible filled distribution without any motion.
      const w = heroPolls[0].w
      const sum = w.reduce((a, b) => a + b, 0)
      setPoll(0)
      setCounts(w.map((x) => Math.round((x / sum) * 90)))
      setTotal(90)
      return
    }
    const fill = setInterval(() => {
      setTotal((t) => {
        if (t > VOTE_CAP) return t
        const w = heroPolls[pollRef.current].w
        let roll = Math.random()
        let k = 0
        for (let i = 0; i < w.length; i++) {
          roll -= w[i]
          if (roll <= 0) {
            k = i
            break
          }
        }
        setCounts((c) => {
          const next = c.slice()
          next[k] += 1
          return next
        })
        return t + 1
      })
    }, 120)
    const swap = setInterval(() => {
      setPoll((p) => (p + 1) % heroPolls.length)
      setCounts([0, 0, 0, 0])
      setTotal(0)
    }, 7200)
    return () => {
      clearInterval(fill)
      clearInterval(swap)
    }
  }, [reduce])

  const p = heroPolls[poll]
  const denom = total || 1
  const max = Math.max(...counts)
  const rows = p.opts.map((label, i) => {
    const lead = counts[i] === max && total > 0
    return {
      label,
      pct: Math.round((counts[i] / denom) * 100),
      fill: lead ? '#4FB0FF' : '#2A3038',
      col: lead ? '#4FB0FF' : '#9AA3AE',
    }
  })

  return (
    <div style={{ minWidth: 0, position: 'relative', paddingBottom: 30 }}>
      <div
        style={{
          position: 'relative',
          background: '#0E1217',
          border: '1px solid #1F252D',
          borderRadius: 20,
          padding: 26,
          boxShadow: '0 40px 100px -36px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <div
          className="tly-anim"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(79,176,255,0.06), transparent)',
            animation: 'tlySheen 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, position: 'relative' }}>
          <span className="tly-anim" style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6A4D', animation: 'tlyBlink 1.6s infinite' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', color: '#9AA3AE' }}>PRESENTING</span>
          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#4FB0FF', fontVariantNumeric: 'tabular-nums' }}>
            {total} votes
          </span>
        </div>

        <div style={{ minHeight: 58, position: 'relative' }}>
          <div
            key={poll}
            className="tly-anim"
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 800,
              fontSize: 25,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: '#F2F5F8',
              animation: reduce ? 'none' : 'tlyHeroSlide .5s cubic-bezier(.22,1,.36,1)',
            }}
          >
            {p.q}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22, position: 'relative' }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: '#DDE2E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 17, fontVariantNumeric: 'tabular-nums', color: r.col }}>{r.pct}%</span>
              </div>
              <div style={{ height: 11, background: '#14181E', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: r.fill, borderRadius: 999, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid #1B2029', position: 'relative' }}>
          <span style={{ fontSize: 13, color: '#9AA3AE' }}>
            Join at <span style={{ color: '#4FB0FF', fontWeight: 700 }}>tally.app.space</span>
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 19, letterSpacing: '0.16em', color: '#F2F5F8' }}>428 193</span>
        </div>

        {[
          { left: 36, size: 7, delay: '0s' },
          { left: 92, size: 6, delay: '0.7s' },
          { left: 150, size: 8, delay: '1.3s' },
          { left: 210, size: 6, delay: '1.9s' },
        ].map((d) => (
          <span
            key={d.left}
            className="tly-anim"
            style={{
              position: 'absolute',
              bottom: 70,
              left: d.left,
              width: d.size,
              height: d.size,
              borderRadius: '50%',
              background: '#4FB0FF',
              animation: `tlyPing 2.4s ease-out infinite ${d.delay}`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      <div
        className="tly-anim"
        style={{
          position: 'absolute',
          right: -10,
          bottom: -8,
          width: 140,
          background: '#12161B',
          border: '1px solid #232A33',
          borderRadius: 22,
          padding: 14,
          boxShadow: '0 30px 70px -22px rgba(0,0,0,0.85)',
          animation: 'tlyFloat 5s ease-in-out infinite',
        }}
      >
        <div style={{ fontSize: 9, color: '#646D78', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' }}>YOUR PHONE</div>
        <div
          className="tly-anim"
          style={{
            position: 'relative',
            marginTop: 9,
            padding: '9px 10px',
            background: 'rgba(79,176,255,0.10)',
            border: '1.5px solid #4FB0FF',
            borderRadius: 11,
            fontSize: 12.5,
            color: '#E4E8EC',
            fontWeight: 600,
            animation: 'tlyTap 2.4s ease-in-out infinite',
          }}
        >
          Lightning talks
          <span
            className="tly-anim"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              width: 16,
              height: 16,
              marginTop: -8,
              borderRadius: '50%',
              background: 'rgba(79,176,255,0.4)',
              animation: 'tlyRipple 2.4s ease-out infinite',
            }}
          />
        </div>
        <div style={{ marginTop: 8, padding: 8, background: '#4FB0FF', color: '#06121E', borderRadius: 10, textAlign: 'center', fontSize: 11.5, fontWeight: 700 }}>
          Voted &#10003;
        </div>
      </div>
    </div>
  )
}
