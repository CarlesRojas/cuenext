import { cn } from '#/lib/cn'
import { X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

type Props = ComponentProps<'input'> & {
  backgroundColor?: string
  icon?: ReactNode
  onClear?: () => void
}

function Input({
  className,
  type,
  backgroundColor,
  icon,
  onClear,
  ...props
}: Props) {
  return (
    <div
      className={cn(
        'group relative z-10 h-10 max-h-10 min-h-10 w-fit border border-neutral-400 bg-neutral-300/50 focus-within:bg-neutral-300/70 hover:bg-neutral-300/70',
        'dark:border-neutral-600 dark:bg-neutral-700/50 dark:focus-within:bg-neutral-700/70 dark:hover:bg-neutral-700/70',
      )}
    >
      <div className="target-tl pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-focus-within:block group-hover:block dark:bg-white/70" />
      <div className="target-tr pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-focus-within:block group-hover:block dark:bg-white/70" />
      <div className="target-bl pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-focus-within:block group-hover:block dark:bg-white/70" />
      <div className="target-br pointer-events-none absolute -inset-1.5 z-10 hidden bg-black/70 group-focus-within:block group-hover:block dark:bg-white/70" />

      {icon && (
        <div
          className={cn(
            'absolute top-1/2 left-2 -translate-y-1/2 text-black/60 group-focus-within:text-black group-hover:text-black',
            'dark:text-white/50 dark:group-focus-within:text-white dark:group-hover:text-white',
          )}
        >
          {icon}
        </div>
      )}

      <input
        type={type}
        data-slot="input"
        className={cn(
          'relative h-full w-full min-w-0 bg-transparent px-3 py-1 text-base outline-none placeholder:text-black/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'dark:placeholder:text-white/50',
          icon && 'pl-9',
          onClear && 'pr-9',
          className,
        )}
        {...props}
      />

      {onClear && (
        <button
          className={cn(
            'absolute top-1/2 right-0 flex h-full w-9 max-w-9 min-w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-black/60 hover:text-black focus-visible:text-black',
            'dark:text-white/50 dark:hover:text-white dark:focus-visible:text-white',
          )}
          onClick={onClear}
          type="button"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export { Input }
