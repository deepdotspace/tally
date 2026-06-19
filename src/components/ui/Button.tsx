import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from './utils'

/*
 * Tally buttons (Signal recipe, mirrors ../signal/src/components/ui/Button.tsx:12).
 * primary/default = accent fill with on-accent text (lime/black in dark,
 * black/lime in light). secondary = raised bg-2 surface. outline = stronger
 * border. ghost = bare. Display weight 700 on primary, 600 on secondary.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] font-ui transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-[var(--accent-text)] font-bold hover:brightness-[1.06]',
        default:
          'bg-[var(--accent)] text-[var(--accent-text)] font-bold hover:brightness-[1.06]',
        secondary:
          'bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-2)] font-semibold hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]',
        outline:
          'bg-[var(--bg-2)] border border-[var(--border-2)] text-[var(--text-1)] font-semibold hover:bg-[var(--bg-3)]',
        ghost:
          'text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]',
        destructive:
          'bg-[#ef5a52] text-white font-semibold hover:brightness-[1.06]',
      },
      size: {
        sm: 'px-2.5 py-1 text-[12px] [&_svg]:size-3.5',
        md: 'px-4 py-2 text-[13px] [&_svg]:size-4',
        default: 'px-4 py-2 text-[13px] [&_svg]:size-4',
        lg: 'px-[18px] py-[9px] text-[14px] [&_svg]:size-4',
        icon: 'h-8 w-8 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))
    if (asChild) {
      return <Slot className={classes} ref={ref} {...props}>{children}</Slot>
    }
    return (
      <button className={classes} ref={ref} disabled={disabled || loading} {...props}>
        {loading && (
          <span className="h-4 w-4 animate-[var(--animate-rs-spin)] rounded-full border-[1.5px] border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
