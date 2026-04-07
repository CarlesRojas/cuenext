import { cn } from '#/lib/cn'
import * as React from 'react'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-neutral-400 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
