import { cn } from '#/lib/cn'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'

const buttonVariants = cva(
  "group font-goldman relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-lg font-medium tracking-wide whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: [
          'border border-sky-600 bg-sky-400/40 text-black hover:bg-sky-400/60 focus-visible:bg-sky-400/60',
          'dark:border-sky-900 dark:bg-sky-900/40 dark:text-white dark:hover:bg-sky-900/60 dark:focus-visible:bg-sky-900/60',
        ],
        ghost: [
          'text-black/70 hover:text-black',
          'dark:text-white/80 dark:hover:text-white',
        ],
        white: [
          'border border-neutral-300 bg-neutral-300/40 text-black hover:bg-neutral-300/60 focus-visible:bg-neutral-300/60',
          'dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-white dark:hover:bg-neutral-800/60 dark:focus-visible:bg-neutral-800/60',
        ],
        input: [
          'border border-neutral-400 bg-neutral-300/50 text-black hover:bg-neutral-300/70 focus-visible:bg-neutral-300/70',
          'dark:border-neutral-600 dark:bg-neutral-700/50 dark:text-white dark:hover:bg-neutral-700/70 dark:focus-visible:bg-neutral-700/70',
        ],
        constructive: [
          'border border-green-600 bg-green-400/40 text-black hover:bg-green-400/60 focus-visible:bg-green-400/60',
          'dark:border-green-900 dark:bg-green-900/40 dark:text-white dark:hover:bg-green-900/60 dark:focus-visible:bg-green-900/60',
        ],
        destructive: [
          'border border-red-600 bg-red-400/40 text-black hover:bg-red-400/60 focus-visible:bg-red-400/60',
          'dark:border-red-900 dark:bg-red-900/40 dark:text-white dark:hover:bg-red-900/60 dark:focus-visible:bg-red-900/60',
        ],
      },
      size: {
        default: 'h-10 min-w-28 px-4 py-2 has-[>svg]:px-3',
        fit: 'h-fit min-w-28 p-4',
        icon: 'size-10',
        smallIcon: 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type Props = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  children,
  variant,
  size,
  asChild = false,
  ...props
}: Props) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      type="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      <div
        className={cn(
          'size-fit',
          (size === 'icon' || size === 'smallIcon') && 'size-5',
        )}
      >
        <div className="target-tl pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-hover:block group-focus-visible:block dark:bg-white/70" />
        <div className="target-tr pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-hover:block group-focus-visible:block dark:bg-white/70" />
        <div className="target-bl pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-hover:block group-focus-visible:block dark:bg-white/70" />
        <div className="target-br pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-hover:block group-focus-visible:block dark:bg-white/70" />

        <div className="z-10 inline-flex size-full items-center justify-center gap-2">
          {children}
        </div>
      </div>
    </Comp>
  )
}

export { Button, buttonVariants }
