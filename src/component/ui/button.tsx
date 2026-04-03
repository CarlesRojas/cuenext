import { cn } from '#/lib/cn'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  "group relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-base font-semibold whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: [
          'bg-white text-black hover:bg-sky-500 hover:text-white focus-visible:bg-sky-500 focus-visible:text-white',
        ],
        ghost: ['text-black/70 hover:text-black', 'text-white/80 hover:text-white'],
        white: [
          'border border-neutral-800 bg-neutral-800/40 text-white hover:bg-neutral-800/60 focus-visible:bg-neutral-800/60',
        ],
        input: [
          'border border-neutral-600 bg-neutral-700/50 text-white hover:bg-neutral-700/70 focus-visible:bg-neutral-700/70',
        ],
        constructive: [
          'border border-green-900 bg-green-900/40 text-white hover:bg-green-900/60 focus-visible:bg-green-900/60',
        ],
        destructive: ['border border-red-900 bg-red-900/40 text-white hover:bg-red-900/60 focus-visible:bg-red-900/60'],
      },
      size: {
        default: 'h-11 px-4 py-2.5',
        full: 'h-11 w-full px-4 py-2.5',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
export { Button, buttonVariants }
