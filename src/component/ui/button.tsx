import { cn } from '#/lib/cn'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  "group relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-base font-semibold whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: [
          'bg-white text-black hover:bg-sky-500 hover:text-white focus-visible:bg-sky-500 focus-visible:text-white',
        ],
        ghost: [
          'text-white hover:bg-neutral-400/10 hover:text-white focus-visible:bg-neutral-400/10 focus-visible:text-white',
        ],
        link: ['text-white hover:text-sky-500 focus-visible:text-sky-500'],
      },
      size: {
        default: 'h-11 w-fit gap-2 px-4 py-2.5',
        full: 'h-11 w-full gap-2 px-4 py-2.5',
        icon: 'size-11',
        selector: 'm-1 h-9 w-fit gap-1 px-4',
        link: 'w-fit gap-2',
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
