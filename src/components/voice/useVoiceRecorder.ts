/*
 * Mic capture for the voice stage. Owns getUserMedia, a MediaRecorder (mono,
 * compressed webm/opus so the transcription payload stays small), a Web Audio
 * analyser the waveform reads each frame, and a running timer. It also runs the
 * browser SpeechRecognition (when present) for a live interim transcript; the
 * authoritative transcript still comes from server transcription of the audio.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Captured audio plus the live transcript the recognizer produced. */
export interface Recording {
  /** Base64 (no data: prefix) webm/opus blob, ready for speech/speech-to-text. */
  base64: string
  /** Raw byte size, to gate against the transcription payload limit. */
  bytes: number
  /** What the live recognizer heard, if any (a fallback / preview). */
  liveTranscript: string
}

export type MicState = 'idle' | 'requesting' | 'recording' | 'denied'

/** Approx ceiling for an inline base64 transcription payload (~8 MB of audio). */
const MAX_AUDIO_BYTES = 8 * 1024 * 1024

/** Minimal shape of the browser SpeechRecognition we touch (not in lib.dom). */
interface SpeechRec {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: (() => void) | null
}

export interface VoiceRecorder {
  micState: MicState
  elapsed: number
  /** Live transcript text the recognizer has produced so far. */
  liveText: string
  /** Read 0..1 levels into `out` for the waveform; true if real analyser data. */
  readLevels(out: Float32Array): boolean
  /** Begin capture; resolves true when the mic was granted, false if blocked. */
  start(): Promise<boolean>
  /** Stop + resolve the captured recording. null if nothing usable was captured. */
  stop(): Promise<Recording | null>
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function useVoiceRecorder(): VoiceRecorder {
  const [micState, setMicState] = useState<MicState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [liveText, setLiveText] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const finalRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    try {
      recRef.current?.stop()
    } catch {
      /* recognizer already stopped */
    }
    recRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const readLevels = useCallback((out: Float32Array) => {
    const analyser = analyserRef.current
    const freq = freqRef.current
    if (!analyser || !freq) return false
    analyser.getByteFrequencyData(freq)
    const n = out.length
    const step = Math.max(1, Math.floor(freq.length / n))
    for (let i = 0; i < n; i += 1) out[i] = (freq[i * step] ?? 0) / 255
    return true
  }, [])

  const start = useCallback(async () => {
    setMicState('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      setMicState('denied')
      return false
    }
    streamRef.current = stream
    chunksRef.current = []
    finalRef.current = ''
    setLiveText('')
    setElapsed(0)

    // Analyser drives the live waveform.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      freqRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    } catch {
      /* waveform falls back to the synthetic meter */
    }

    // MediaRecorder captures compressed audio for server transcription.
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start()
    recorderRef.current = recorder

    // Live interim transcript when the browser supports SpeechRecognition.
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
    const Recognizer = SR.SpeechRecognition ?? SR.webkitSpeechRecognition
    if (Recognizer) {
      const rec = new Recognizer()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = navigator.language || 'en-US'
      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current += r[0].transcript
          else interim += r[0].transcript
        }
        setLiveText((finalRef.current + interim).trim())
      }
      rec.onerror = () => {}
      try {
        rec.start()
        recRef.current = rec
      } catch {
        /* recognizer optional */
      }
    }

    setMicState('recording')
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return true
  }, [])

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const liveTranscript = finalRef.current.trim() || liveText.trim()

    const blob = await new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current) : null)
        return
      }
      recorder.onstop = () => resolve(chunksRef.current.length ? new Blob(chunksRef.current) : null)
      try {
        recorder.stop()
      } catch {
        resolve(null)
      }
    })
    recorderRef.current = null
    cleanup()
    setMicState('idle')

    if (!blob || blob.size === 0) {
      return liveTranscript ? { base64: '', bytes: 0, liveTranscript } : null
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      // Too large to send inline; hand back the live transcript so the flow continues.
      return { base64: '', bytes: blob.size, liveTranscript }
    }
    const base64 = toBase64(new Uint8Array(await blob.arrayBuffer()))
    return { base64, bytes: blob.size, liveTranscript }
  }, [cleanup, liveText])

  return { micState, elapsed, liveText, readLevels, start, stop }
}
