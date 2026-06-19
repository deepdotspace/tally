/*
 * Tally's public landing (PROTOTYPE-MAP section 3.10, Tally Landing.dc.html).
 * A dark, motion-led marketing page: a hero with an auto-playing live demo, a
 * three-step story, the nine-ways-to-ask showcase, scroll-counting stats, a
 * closing CTA band, and a footer. Wrapped in data-theme="dark" so it always
 * reads the dark palette regardless of the app's light chrome.
 *
 * Default export so it can be React.lazy()'d: framer-motion and all landing
 * code stay out of the signed-in app bundle. CTAs route to /library (the
 * AuthGate there handles sign-in) and /join (anonymous, no account).
 */

import { useNavigate } from '../../router'
import { HeroDemo } from './HeroDemo'
import { Steps } from './Steps'
import { TypeShowcase } from './TypeShowcase'
import { Stats } from './Stats'
import { Reveal } from './Reveal'
import './landing.css'

const display = "'Archivo', sans-serif"
const mono = "'JetBrains Mono', monospace"

function scrollTo(sel: string) {
  const el = document.querySelector(sel)
  if (el) {
    const y = el.getBoundingClientRect().top + window.pageYOffset - 16
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

function BrandSquare({ size, radius, bars }: { size: number; radius: number; bars: number[] }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: '#4FB0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: size > 24 ? 3 : 2.5, height: h, background: '#06121E', borderRadius: 1 }} />
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const start = () => navigate('/library')
  const join = () => navigate('/join')

  return (
    // The app-root parent is height:100vh; overflow:hidden, so the landing owns
    // its own vertical scroll (this is a long marketing page, not a single screen).
    <div data-theme="dark" className="tly-land" style={{ background: '#07090C', height: '100%', overflowX: 'hidden', overflowY: 'auto', position: 'relative' }}>
      <div
        className="tly-anim"
        style={{
          position: 'fixed',
          top: -260,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1100,
          height: 700,
          background: 'radial-gradient(closest-side, rgba(79,176,255,0.10), rgba(79,176,255,0))',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'tlyDrift 16s ease-in-out infinite',
        }}
      />

      <nav style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px', background: 'rgba(7,9,12,0.72)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #14171D' }}>
        <BrandSquare size={27} radius={7} bars={[7, 13, 9]} />
        <span style={{ fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Tally</span>
        <div style={{ marginLeft: 30, display: 'flex', gap: 22 }}>
          <button type="button" onClick={() => scrollTo('#steps')} className="tly-navlink" style={{ fontSize: 14, color: '#9AA3AE', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 0, padding: 0, fontFamily: 'inherit' }}>How it works</button>
          <button type="button" onClick={() => scrollTo('#types')} className="tly-navlink" style={{ fontSize: 14, color: '#9AA3AE', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 0, padding: 0, fontFamily: 'inherit' }}>Question types</button>
          <button type="button" onClick={() => scrollTo('#stats')} className="tly-navlink" style={{ fontSize: 14, color: '#9AA3AE', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 0, padding: 0, fontFamily: 'inherit' }}>Why Tally</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
          <button type="button" onClick={join} style={{ fontSize: 14, fontWeight: 600, color: '#C2C9D1', cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 0, fontFamily: 'inherit' }}>Join with a code</button>
          <button type="button" onClick={start} style={{ padding: '9px 18px', background: '#4FB0FF', color: '#06121E', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', border: 0, fontFamily: 'inherit' }}>Start a poll</button>
        </div>
      </nav>

      <section style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 48, alignItems: 'center', maxWidth: 1200, margin: '0 auto', padding: '70px 32px 90px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 13px', border: '1px solid #222A33', borderRadius: 999, marginBottom: 26, background: 'rgba(255,255,255,0.02)' }}>
            <span className="tly-anim" style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6A4D', animation: 'tlyBlink 1.6s infinite' }} />
            <span style={{ fontSize: 12.5, color: '#9AA3AE' }}>Live audience polling, free for any room</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: display, fontWeight: 900, fontSize: 'clamp(44px, 5.4vw, 66px)', lineHeight: 0.96, letterSpacing: '-0.038em', color: '#F2F5F8', textWrap: 'balance' }}>
            Ask the room.<br />Watch the answers <span style={{ color: '#4FB0FF' }}>land.</span>
          </h1>
          <p style={{ margin: '26px 0 0', fontSize: 18, lineHeight: 1.5, color: '#A6AEB8', maxWidth: 470 }}>
            A question on the big screen, a six digit code in their hands, and results that fill in as fast as people tap. No accounts, no app, no friction.
          </p>
          <div style={{ display: 'flex', gap: 13, marginTop: 34, flexWrap: 'wrap' }}>
            <button type="button" onClick={start} style={{ padding: '14px 24px', background: '#4FB0FF', color: '#06121E', borderRadius: 13, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', whiteSpace: 'nowrap', border: 0, fontFamily: 'inherit' }}>Start a poll, free</button>
            <button type="button" onClick={() => scrollTo('#steps')} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 22px', background: 'transparent', border: '1px solid #2A323C', color: '#E4E8EC', borderRadius: 13, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4FB0FF' }} />
              <span style={{ whiteSpace: 'nowrap' }}>See it fill in</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 30, fontSize: 13, color: '#646D78', flexWrap: 'wrap' }}>
            <span>No signup for voters</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2E343D' }} />
            <span>Any phone</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2E343D' }} />
            <span>Free to start</span>
          </div>
        </div>

        <HeroDemo />
      </section>

      <Steps />

      <section id="types" style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '50px 32px 70px' }}>
        <Reveal y={30}>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.16em', color: '#4FB0FF', marginBottom: 14 }}>QUESTION TYPES</div>
          <h2 style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 44px)', lineHeight: 1.02, letterSpacing: '-0.03em', color: '#F2F5F8', maxWidth: 640, textWrap: 'balance' }}>
            One tool, nine ways to ask.
          </h2>
          <p style={{ margin: '16px 0 0', fontSize: 16, color: '#9AA3AE', maxWidth: 480 }}>
            Every type renders on the same calm dark surface, with one blue that always means the votes.
          </p>
        </Reveal>
        <Reveal y={40} delay={120}>
          <TypeShowcase />
        </Reveal>
      </section>

      <Stats />

      <section id="cta" style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '30px 32px 60px' }}>
        <Reveal y={40}>
          <div style={{ position: 'relative', padding: '64px 40px', background: 'linear-gradient(180deg, #10151B, #0A0D11)', border: '1px solid #1F252D', borderRadius: 24, textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(closest-side, rgba(79,176,255,0.14), rgba(79,176,255,0))', pointerEvents: 'none' }} />
            <h2 style={{ margin: 0, position: 'relative', fontFamily: display, fontWeight: 900, fontSize: 'clamp(34px, 4.4vw, 54px)', letterSpacing: '-0.035em', color: '#F2F5F8', lineHeight: 1, textWrap: 'balance' }}>
              Put it on the big screen.
            </h2>
            <p style={{ margin: '18px auto 0', position: 'relative', fontSize: 17, color: '#9AA3AE', maxWidth: 440 }}>
              Free to start. Your audience never signs up. Ready before the room finishes settling in.
            </p>
            <div style={{ display: 'inline-flex', gap: 13, marginTop: 30, position: 'relative', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" onClick={start} style={{ padding: '15px 28px', background: '#4FB0FF', color: '#06121E', borderRadius: 13, fontWeight: 700, fontSize: 16, cursor: 'pointer', whiteSpace: 'nowrap', border: 0, fontFamily: 'inherit' }}>Start a poll, free</button>
              <button type="button" onClick={join} style={{ padding: '15px 26px', border: '1px solid #2A323C', background: 'transparent', color: '#E4E8EC', borderRadius: 13, fontWeight: 600, fontSize: 16, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>Join with a code</button>
            </div>
          </div>
        </Reveal>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 36, paddingTop: 26, borderTop: '1px solid #14171D', flexWrap: 'wrap' }}>
          <BrandSquare size={22} radius={6} bars={[6, 10, 8]} />
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 16 }}>Tally</span>
          <span style={{ fontSize: 13, color: '#646D78', marginLeft: 6 }}>Live audience polling</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 22, fontSize: 13.5, color: '#8A929C' }}>
            <a href="https://github.com/deepdotspace" style={{ cursor: 'pointer' }}>GitHub</a>
            <a href="https://deep.space" style={{ cursor: 'pointer' }}>Made on DeepSpace</a>
          </div>
        </div>
      </section>
    </div>
  )
}
