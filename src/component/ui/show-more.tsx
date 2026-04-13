import { Button } from '#/component/ui/button'
import { cn } from '#/lib/cn'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { useEffect, useRef, useState } from 'react'
import { useEventListener } from 'usehooks-ts'

const showMoreVariants = cva('duration-slow transition-all', {
  variants: {
    variant: {
      default: 'leading-normal font-medium tracking-wide text-ellipsis text-white/60',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface ShowMoreProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof showMoreVariants> {
  text: string
  lines?: number
  expandText?: string
  collapseText?: string
  buttonVariant?: VariantProps<typeof Button>['variant']
  buttonSize?: VariantProps<typeof Button>['size']
  onClick?: () => void
  containerClassName?: string
}

function ShowMore({
  text,
  lines = 3,
  expandText = 'Expand',
  collapseText = 'Collapse',
  buttonVariant = 'showMore',
  buttonSize = 'showMore',
  variant = 'default',
  className,
  containerClassName,
  onClick,
  ...props
}: ShowMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const checkTruncation = () => {
    if (textRef.current) setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight)
  }

  useEffect(checkTruncation, [text, lines])
  useEventListener('resize', checkTruncation)

  return (
    <div className={cn('relative flex w-full flex-col', containerClassName)} {...props}>
      <p
        ref={textRef}
        className={cn(
          showMoreVariants({ variant }),
          className,
          'pointer-events-none absolute w-full opacity-0 select-none',
        )}
        style={{ WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, display: '-webkit-box', overflow: 'hidden' }}
      >
        {text}
      </p>

      <p
        className={cn(showMoreVariants({ variant }), className)}
        style={
          !isExpanded
            ? { WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, display: '-webkit-box', overflow: 'hidden' }
            : undefined
        }
      >
        {text}
      </p>

      {isTruncated && (
        <Button variant={buttonVariant} size={buttonSize} onClick={() => (onClick ? onClick() : toggleExpanded())}>
          {isExpanded ? collapseText : expandText}
        </Button>
      )}
    </div>
  )
}

export { ShowMore, showMoreVariants }
