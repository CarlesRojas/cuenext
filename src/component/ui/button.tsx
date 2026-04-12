import { cn } from '#/lib/cn'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-base font-semibold whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: [
          'bg-white text-black hover:bg-sky-500 hover:text-white focus-visible:bg-sky-500 focus-visible:text-white',
        ],
        secondary: [
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden',
          'hover:bg-neutral-500/25 focus-visible:bg-neutral-500/25',
        ],
        negative: [
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden [&_svg]:text-red-400/80',
          'hover:bg-neutral-500/25 focus-visible:bg-neutral-500/25',
        ],
        ghost: ['text-white hover:bg-neutral-400/10 focus-visible:bg-neutral-400/10'],
        link: ['text-white hover:text-sky-500 focus-visible:text-sky-500'],
        frost: [
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden hover:bg-black/80 focus-visible:bg-black/80',
          'data-[checked=true]:bg-sky-500/80 data-[checked=true]:hover:bg-sky-600/80 data-[checked=true]:focus-visible:bg-sky-600/80',
        ],
        input: ['text-white/70 hover:text-white focus-visible:text-white'],

        favorite: [
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden',
          'data-[state=off]:hover:bg-neutral-500/25 data-[state=off]:focus-visible:bg-neutral-500/25',

          'data-[state=on]:border-rose-500/40 data-[state=on]:bg-rose-500/15 data-[state=on]:text-rose-500',
          'data-[state=on]:hover:bg-rose-500/25 data-[state=on]:focus-visible:bg-rose-500/25',
        ],

        watch: [
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden',
          'data-[state=off]:hover:bg-neutral-500/25 data-[state=off]:focus-visible:bg-neutral-500/25',

          'data-[state=on]:border-sky-500/40 data-[state=on]:bg-sky-500/20 data-[state=on]:text-sky-500',
          'data-[state=on]:hover:bg-sky-500/40 data-[state=on]:focus-visible:bg-sky-500/40',
        ],
      },
      size: {
        default: 'h-11 w-fit gap-2 px-4 py-2.5',
        full: 'h-11 w-full gap-2 px-4 py-2.5',
        icon: 'size-11',
        iconSmall: 'size-9',
        small: 'm-1 h-9 w-fit gap-1 px-4',
        link: 'w-fit gap-2',
        input: 'size-8',
        showMore: 'mx-1 h-fit w-fit px-2',
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
