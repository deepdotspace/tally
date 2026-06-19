/*
 * Live recording waveform. Draws 46 rounded bars each animation frame from the
 * recorder's analyser (real mic frequency data); when no analyser is available
 * it falls back to a synthetic sine meter so the surface still reads as live.
 */

import { useEffect, useRef } from 'react'

const BARS = 46
const W = 1160
const H = 240

export interface WaveformProps {
  /** Fill `out` with 0..1 levels; returns true when the data is real mic data. */
  readLevels: (out: Float32Array) => boolean
}

export function Waveform({ readLevels }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const readRef = useRef(readLevels)
  readRef.current = readLevels

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const levels = new Float32Array(BARS)
    let raf = 0
    let t = 0

    const draw = () => {
      t += 0.08
      const real = readRef.current(levels)
      ctx.clearRect(0, 0, W, H)
      const gap = 6
      const bw = (W - gap * (BARS - 1)) / BARS
      for (let i = 0; i < BARS; i += 1) {
        // Synthetic fallback: a gentle traveling sine so the meter feels alive.
        const v = real ? levels[i] : 0.18 + 0.34 * Math.abs(Math.sin(t + i * 0.4))
        const bh = Math.max(6, v * H)
        const x = i * (bw + gap)
        const y = (H - bh) / 2
        ctx.fillStyle = `rgba(79,176,255,${0.32 + 0.62 * v})`
        roundRect(ctx, x, y, bw, bh, Math.min(bw / 2, 6))
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} width={W} height={H} className="block h-[120px] w-full" aria-hidden />
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
