/*
 * The two dark mic surfaces. RecordIdle is the big pulsing mic on a dark stage
 * (the entry); Recording is the live dark card with the waveform, timer, live
 * transcript, and the Done button. Both are dark insets on the light Voice page,
 * so they use the prototype's literal dark hexes rather than theme tokens.
 */

import { Mic, Square } from 'lucide-react'
import { Waveform } from './Waveform'
import type { MicState } from './useVoiceRecorder'

/** mm:ss for the recording timer. */
function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const EXAMPLE =
  'First, which feature should we build next: dark mode, search, or offline. Next, how likely are people to recommend us. Then one word for how today felt.'

export interface RecordIdleProps {
  micState: MicState
  onStart: () => void
  onToText: () => void
}

/** Stage A: the idle dark stage with the big pulsing mic. */
export function RecordIdle({ micState, onStart, onToText }: RecordIdleProps) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center px-6 py-10 text-center">
      <h1 className="font-display text-[30px] font-extrabold tracking-[-0.03em] text-text-1">Talk through your polls</h1>
      <p className="mt-3 max-w-[440px] text-[15.5px] leading-[1.55] text-text-2b">
        Describe every poll you want, one after another. Take your time. When you stop, Tally turns the whole thing
        into polls you can review.
      </p>

      <div className="mt-7 w-full rounded-[20px] bg-[#0A0C0F] px-6 py-11">
        <div className="relative mx-auto grid h-[104px] w-[104px] place-content-center">
          <span
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#4FB0FF]"
            style={{ animation: 'tlyRing 2.2s ease-out infinite' }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#4FB0FF]"
            style={{ animation: 'tlyRing 2.2s ease-out infinite', animationDelay: '1.1s' }}
            aria-hidden
          />
          <button
            type="button"
            onClick={onStart}
            disabled={micState === 'requesting'}
            data-testid="voice-start"
            aria-label="Tap to start talking"
            className="relative grid h-[104px] w-[104px] place-content-center rounded-full bg-[#4FB0FF] text-white transition-transform hover:scale-[1.03] disabled:opacity-70"
            style={{ boxShadow: '0 12px 44px -8px rgba(79,176,255,0.6)' }}
          >
            <Mic className="h-[34px] w-[34px]" strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <p className="mt-[26px] text-[15px] font-semibold text-[#E4E8EC]">
          {micState === 'requesting' ? 'Allow the microphone to start' : 'Tap to start talking'}
        </p>
        <p className="mx-auto mt-3 max-w-[420px] text-[13px] leading-[1.55] text-[#646D78]">
          Try: <span className="text-[#9AA3AE]">{`"${EXAMPLE}"`}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onToText}
        className="mt-5 text-[13px] text-text-3 transition-colors hover:text-accent"
      >
        Prefer to type? Write them out instead
      </button>
    </div>
  )
}

export interface RecordingProps {
  elapsed: number
  liveText: string
  readLevels: (out: Float32Array) => boolean
  onStop: () => void
}

/** Stage B: the live recording dark card (waveform + timer + transcript). */
export function Recording({ elapsed, liveText, readLevels, onStop }: RecordingProps) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-10">
      <div className="rounded-[20px] bg-[#0A0C0F] p-[26px]">
        <div className="flex items-center gap-2.5">
          <span
            className="h-[9px] w-[9px] rounded-full bg-[#FF6A4D]"
            style={{ animation: 'tlyDot 1.2s ease-in-out infinite' }}
            aria-hidden
          />
          <span className="font-mono text-[12px] font-semibold tracking-[0.16em] text-[#9AA3AE]">RECORDING</span>
          <span className="tnum ml-auto font-mono text-[17px] font-bold text-[#F2F5F8]">{fmt(elapsed)}</span>
        </div>

        <div className="mt-5">
          <Waveform readLevels={readLevels} />
        </div>

        <p className="mt-4 max-h-[132px] overflow-y-auto border-t border-[#1B2029] pt-4 text-[15px] leading-[1.55] text-[#C2C9D1]">
          {liveText || 'Listening, keep talking…'}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onStop}
            data-testid="voice-stop"
            className="flex items-center gap-2 rounded-[13px] bg-accent px-5 py-3 text-[14.5px] font-bold text-accent-text transition-colors hover:bg-accent-hover"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> Done, draft my polls
          </button>
        </div>
      </div>
    </div>
  )
}
