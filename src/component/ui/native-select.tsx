import * as React from 'react'

import { cn } from '#/lib/cn'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: 'sm' | 'default'
}

function NativeSelect({ className, size = 'default', ...props }: NativeSelectProps) {
  return (
    <div
      className={cn('group/native-select relative w-fit max-w-full has-[select:disabled]:opacity-50', className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          'h-9 w-fit max-w-full gap-1 overflow-hidden px-4 pr-10 text-ellipsis',
          "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl text-base font-semibold whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
          'border border-neutral-500/40 bg-black/50 text-white backdrop-blur-md backface-hidden',
          'hover:bg-neutral-500/25 focus-visible:bg-neutral-500/25',
          'min-w-0 appearance-none transition-colors outline-none select-none disabled:pointer-events-none disabled:cursor-not-allowed',
        )}
        {...props}
      />

      <FontAwesomeIcon
        icon={faChevronDown}
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400 select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<'option'>) {
  return (
    <option data-slot="native-select-option" className={cn('bg-[Canvas] text-[CanvasText]', className)} {...props} />
  )
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
