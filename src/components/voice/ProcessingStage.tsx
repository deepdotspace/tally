/* Stage C: the processing spinner shown while transcribe -> draft runs. */

export function ProcessingStage() {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center px-6 py-16 text-center">
      <span
        className="h-12 w-12 rounded-full border-[3px] border-border-3 border-t-accent"
        style={{ animation: 'tlySpin 0.8s linear infinite' }}
        aria-hidden
      />
      <h2 className="mt-6 font-display text-[17px] font-bold text-text-1">Finding your polls</h2>
      <p className="mt-1.5 text-[13.5px] text-text-3">Splitting your recording into separate polls</p>
    </div>
  )
}
