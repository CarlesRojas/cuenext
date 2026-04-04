import { Button } from '#/component/ui/button'
import { cn } from '#/lib/cn'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ComponentProps } from 'react'

type Props = ComponentProps<'input'> & {
  onClear?: () => void
  containerClassName?: string
}

function Input({ className, containerClassName, type, onClear, ...props }: Props) {
  return (
    <div className={cn('group relative z-10 h-11 max-h-11 min-h-11 w-fit', containerClassName)}>
      <input
        type={type}
        data-slot="input"
        className={cn(
          'relative h-full w-full min-w-0 bg-transparent px-3 text-base text-white outline-none placeholder:text-white/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          onClear && 'pr-9',
          className,
        )}
        {...props}
      />

      {onClear && (
        <Button
          className="absolute top-1/2 right-0 flex h-full -translate-y-1/2 cursor-pointer items-center justify-center"
          variant="input"
          size="input"
          onClick={onClear}
          type="button"
        >
          <FontAwesomeIcon icon={faXmark} className="size-4" />
        </Button>
      )}
    </div>
  )
}

export { Input }
