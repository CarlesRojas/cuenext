import { cn } from '#/lib/cn'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ComponentProps, ReactNode } from 'react'

type Props = ComponentProps<'input'> & {
  backgroundColor?: string
  icon?: ReactNode
  onClear?: () => void
}

function Input({ className, type, backgroundColor, icon, onClear, ...props }: Props) {
  return (
    <div
      className={cn(
        'group relative z-10 h-10 max-h-10 min-h-10 w-fit border border-neutral-600 bg-neutral-700/50 focus-within:bg-neutral-700/70 hover:bg-neutral-700/70',
        '',
      )}
    >
      <div className="target-tl pointer-events-none absolute -inset-1.5 z-10 hidden bg-white/70 group-focus-within:block group-hover:block" />
      <div className="target-tr pointer-events-none absolute -inset-1.5 z-10 hidden bg-white/70 group-focus-within:block group-hover:block" />
      <div className="target-bl pointer-events-none absolute -inset-1.5 z-10 hidden bg-white/70 group-focus-within:block group-hover:block" />
      <div className="target-br pointer-events-none absolute -inset-1.5 z-10 hidden bg-white/70 group-focus-within:block group-hover:block" />

      {icon && (
        <div className="absolute top-1/2 left-2 -translate-y-1/2 text-white/50 group-focus-within:text-white group-hover:text-white">
          {icon}
        </div>
      )}

      <input
        type={type}
        data-slot="input"
        className={cn(
          'relative h-full w-full min-w-0 bg-transparent px-3 py-1 text-base outline-none placeholder:text-white/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          icon && 'pl-9',
          onClear && 'pr-9',
          className,
        )}
        {...props}
      />

      {onClear && (
        <button
          className="absolute top-1/2 right-0 flex h-full w-9 max-w-9 min-w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-white/50 hover:text-white focus-visible:text-white"
          onClick={onClear}
          type="button"
        >
          <FontAwesomeIcon icon={faXmark} className="size-4" />
        </button>
      )}
    </div>
  )
}

export { Input }
