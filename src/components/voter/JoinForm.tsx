import { ArrowRight } from 'lucide-react'
import { BarMark } from '../ui'
import { cn } from '../ui/utils'

/*
 * Pure join / code-entry form (PROTOTYPE-MAP 3.8). The narrow form column, a big
 * mono code input + an accent submit. Dark phone world (data-theme wrapper) to
 * match the voter view. Renders from props so the route page owns the value +
 * navigation.
 */

export interface JoinFormProps {
  code: string
  onChange: (code: string) => void
  onSubmit: () => void
}

export function JoinForm({ code, onChange, onSubmit }: JoinFormProps) {
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) onSubmit()
  }
  return (
    <div data-theme="dark" className="min-h-screen w-full bg-bg-0">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 pb-7 pt-4">
        <header className="flex items-center border-b border-border-2 py-3">
          <div className="flex items-center gap-2.5">
            <BarMark size={24} />
            <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-text-1">Tally</span>
          </div>
        </header>

        <form onSubmit={submit} className="flex flex-1 flex-col justify-center pb-16">
          <div className="animate-[var(--animate-tly-fade-up)]">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-3b">
              Join the room
            </p>
            <h1 className="mt-3 font-display text-[clamp(28px,8vw,40px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-text-1">
              Enter the code
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-text-3">
              The host shows a short code on screen. Type it in to start voting. No signup.
            </p>

            <input
              value={code}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={12}
              placeholder="ABC123"
              aria-label="Session code"
              className={cn(
                'tnum mt-7 w-full rounded-[13px] border-[1.5px] border-border-4 bg-bg-card-b px-4 py-4 text-center font-mono text-[32px] font-bold uppercase tracking-[0.16em] text-text-1 outline-none transition-colors',
                'placeholder:text-text-3b placeholder:tracking-[0.16em] focus:border-accent',
              )}
            />

            <button
              type="submit"
              disabled={!code.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-4 py-3.5 font-ui text-[15px] font-bold text-accent-text transition-all duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
            >
              Join <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
