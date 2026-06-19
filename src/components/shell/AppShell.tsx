import * as React from 'react'

/*
 * Creator AppShell (TALLY-DESIGN §5 / Signal §4.1, mirrors
 * ../signal/src/components/shell/AppShell.tsx). Flex row, full viewport, no
 * overflow: a 268px sidebar beside a full-width main pane (bg-1). The main
 * region scrolls per screen. Pure layout — pass a <Sidebar/> and the screen.
 */
export interface AppShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-bg-1 text-text-1">
      {sidebar}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-1">
        {children}
      </main>
    </div>
  )
}
