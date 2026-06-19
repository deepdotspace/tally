/* Voice feature surfaces: the dark mic stages, processing, typed fallback, and
 * the review board, plus the recorder hook and draft helpers. */
export { VoiceKeyframes } from './VoiceKeyframes'
export { RecordIdle, Recording } from './MicStage'
export { ProcessingStage } from './ProcessingStage'
export { TypedStage } from './TypedStage'
export { ReviewBoard } from './ReviewBoard'
export type { DestChip } from './ReviewBoard'
export { useVoiceRecorder } from './useVoiceRecorder'
export type { Recording as RecordingResult, MicState } from './useVoiceRecorder'
export {
  toVoiceDrafts,
  blankDraft,
  draftValid,
  voiceDraftToPoll,
} from './voice-data'
export type { VoiceStage, VoiceDraft, RawDraft } from './voice-data'
