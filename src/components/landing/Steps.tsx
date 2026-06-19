/*
 * How-it-works steps. Three scroll-revealed cards (Ask / Share / Watch), each
 * with its own micro-animation: a typing caret on the new-poll mock, a rippling
 * QR + code, and breathing live bars. Copy and motion match the prototype.
 */

import { useReducedMotion } from 'framer-motion'
import { Reveal } from './Reveal'
import { steps } from './content'

const display = "'Archivo', sans-serif"
const mono = "'JetBrains Mono', monospace"

function AskMock({ reduce }: { reduce: boolean }) {
  return (
    <div style={{ background: '#08090C', border: '1px solid #161A20', borderRadius: 13, padding: 15 }}>
      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: '#5A636E' }}>NEW POLL</div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: '#F2F5F8', marginTop: 8, lineHeight: 1.2 }}>
        Which session after lunch?
        <span className="tly-anim" style={{ display: 'inline-block', width: 2, height: 15, background: '#4FB0FF', marginLeft: 3, verticalAlign: -2, animation: reduce ? 'none' : 'tlyCaret 1.1s step-end infinite' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
        {[{ l: 'A', w: '100%' }, { l: 'B', w: '60%' }].map((o) => (
          <div key={o.l} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: '#14181E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 10, color: '#9AA3AE' }}>{o.l}</span>
            <div style={{ flex: 1, height: 9, background: '#14181E', borderRadius: 5, width: o.w }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ShareMock({ reduce }: { reduce: boolean }) {
  return (
    <div style={{ background: '#08090C', border: '1px solid #161A20', borderRadius: 13, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 56, height: 56, flex: '0 0 56px' }}>
        <div className="tly-anim" style={{ position: 'absolute', inset: 0, border: '2px solid #4FB0FF', borderRadius: 12, opacity: 0.5, animation: reduce ? 'none' : 'tlyRipple 2.6s ease-out infinite' }} />
        <div style={{ width: 56, height: 56, background: '#F2F5F8', borderRadius: 10, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 2, padding: 6 }}>
          <div style={{ background: '#08090C', gridColumn: '1 / 3', gridRow: '1 / 3', borderRadius: 2 }} />
          <div />
          <div style={{ background: '#08090C', gridColumn: '4 / 6', gridRow: '1 / 3', borderRadius: 2 }} />
          <div />
          <div style={{ background: '#08090C' }} />
          <div />
          <div style={{ background: '#08090C', gridColumn: '1 / 3', gridRow: '4 / 6', borderRadius: 2 }} />
          <div />
          <div style={{ background: '#08090C', borderRadius: 2 }} />
        </div>
      </div>
      <div>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: '#5A636E' }}>CODE</div>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 22, letterSpacing: '0.14em', color: '#F2F5F8', marginTop: 3 }}>428 193</div>
        <div style={{ fontSize: 11, color: '#4FB0FF', marginTop: 3 }}>tally.app.space</div>
      </div>
    </div>
  )
}

function WatchMock({ reduce }: { reduce: boolean }) {
  const bars = [{ c: '#4FB0FF', d: '0s' }, { c: '#2A3038', d: '0.5s' }, { c: '#2A3038', d: '1s' }]
  return (
    <div style={{ background: '#08090C', border: '1px solid #161A20', borderRadius: 13, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
        <span className="tly-anim" style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6A4D', animation: 'tlyBlink 1.6s infinite' }} />
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: '#9AA3AE' }}>LIVE</span>
        <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 12, color: '#4FB0FF' }}>127</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ height: 10, background: '#14181E', borderRadius: 5, overflow: 'hidden' }}>
            <div className="tly-anim" style={{ height: '100%', width: '100%', background: b.c, borderRadius: 5, transformOrigin: 'left', transform: reduce ? 'scaleX(0.75)' : undefined, animation: reduce ? 'none' : `tlyBreathe 3s ease-in-out infinite ${b.d}` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCKS = [AskMock, ShareMock, WatchMock]
const RANGES = [0, 130, 260]

export function Steps() {
  const reduce = !!useReducedMotion()
  return (
    <section id="steps" style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '40px 32px 70px' }}>
      <Reveal y={30}>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', color: '#4FB0FF', marginBottom: 14 }}>HOW IT WORKS</div>
        <h2 style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 44px)', lineHeight: 1.02, letterSpacing: '-0.03em', color: '#F2F5F8', maxWidth: 640, textWrap: 'balance' }}>
          From a question to the whole room, in seconds.
        </h2>
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 44 }}>
        {steps.map((s, i) => {
          const Mock = MOCKS[i]
          return (
            <Reveal key={s.n} y={44} delay={RANGES[i]}>
              <div style={{ background: '#0D1015', border: '1px solid #181C22', borderRadius: 18, padding: 22, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                  <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 12, color: '#4FB0FF' }}>{s.n}</span>
                  <span style={{ fontSize: 13, color: '#646D78', letterSpacing: '0.04em' }}>{s.tag}</span>
                </div>
                <Mock reduce={reduce} />
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 18, color: '#F2F5F8', marginTop: 18 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: '#8A929C', marginTop: 6, lineHeight: 1.5 }}>{s.body}</div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
