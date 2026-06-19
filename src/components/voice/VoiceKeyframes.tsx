/*
 * Voice-only keyframes (the concentric mic rings + the processing spinner).
 * Scoped here because the global stylesheet is owned elsewhere; the stages apply
 * them with inline `animation` strings. tlyRing/tlySpin match the prototype.
 */

export function VoiceKeyframes() {
  return (
    <style>{`
@keyframes tlyRing { from { transform: scale(0.78); opacity: 0.55; } to { transform: scale(1.85); opacity: 0; } }
@keyframes tlySpin { to { transform: rotate(360deg); } }
@keyframes tlyDot { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
`}</style>
  )
}
