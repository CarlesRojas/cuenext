import { Button } from '#/component/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/component/ui/carousel'
import { cn } from '#/lib/cn'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import type { ReactNode } from 'react'
import React from 'react'
import { useLocalStorage, useWindowSize } from 'usehooks-ts'

interface SectionProps {
  sectionKey: string
  title: ReactNode
  children?: ReactNode
  canCollapse?: boolean
  defaultCollapsed?: boolean
  className?: string
  below?: ReactNode
  besidesTitle?: ReactNode

  // Stacks the covers two to a column so the row reads in pairs:
  // 1 3 5 7
  // 2 4 6 8
  // Exception: exactly two covers sit side by side in a single row instead.
  twoRows?: boolean

  // Its own column after the covers, centred on the row's height, so a "See all"
  // button never gets paired with a cover.
  end?: ReactNode
}

export function Section({
  sectionKey,
  title,
  children,
  canCollapse = true,
  defaultCollapsed = false,
  className,
  below,
  besidesTitle,
  twoRows = false,
  end,
}: SectionProps) {
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [isCollapsed, setIsCollapsed] = useLocalStorage(`CUENEXT-section-${sectionKey}-collapsed`, defaultCollapsed)

  // Each cover gets a layoutId so, when one leaves the row (watched, untracked...), the rest
  // glide to their new spot. A layoutId rather than plain layout because in two-row mode a
  // cover can hop to another column, which remounts it under a new parent.
  const items = React.Children.toArray(children)
    .filter(Boolean)
    .map(item => {
      const key = React.isValidElement(item) ? item.key : null
      if (key === null) return item

      return (
        <motion.div key={key} layoutId={String(key)} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {item}
        </motion.div>
      )
    })
  const columns: Array<Array<ReactNode>> = []
  if (!twoRows || items.length === 2) items.forEach(item => columns.push([item]))
  else for (let index = 0; index < items.length; index += 2) columns.push(items.slice(index, index + 2))
  if (end) columns.push([end])

  const itemClassName = cn(
    'duration-slow basis-auto transition-[margin]',
    'first:md:ml-aside first:sidebar-collapsed:md:ml-aside-collapsed',
    'last:md:mr-aside-collapsed last:sidebar-collapsed:md:mr-aside',
  )

  return (
    <section className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'flex items-center gap-4 px-4',
          !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow transition-[padding]',
        )}
      >
        <Button
          variant="link"
          size="link"
          className={cn(!canCollapse && 'pointer-events-none!')}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h2 className="text-lg font-semibold opacity-80">{title}</h2>

          {canCollapse && (
            <motion.div
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-neutral-500!"
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </motion.div>
          )}
        </Button>

        {!!besidesTitle && besidesTitle}
      </div>

      <AnimatePresence initial={false}>
        {(!isCollapsed || !canCollapse) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="group relative w-full overflow-hidden px-4"
          >
            <LayoutGroup id={sectionKey}>
              <Carousel
                key={`${Math.floor(width / 200)}-${isMobile}`}
                opts={{ align: 'start', dragFree: true, slidesToScroll: 'auto' }}
                className="w-full"
              >
                <CarouselPrevious
                  className={cn(
                    'mouse:block z-10 hidden',
                    !isMobile &&
                      'left-aside sidebar-collapsed:left-aside-collapsed duration-slow ml-2 transition-[left]',
                  )}
                />

                <CarouselContent className={cn('z-0 -ml-4 pt-3 pb-8 md:-ml-8')}>
                  {columns.map((column, index) => (
                    <CarouselItem key={index} className={itemClassName}>
                      {column.length === 1 ? column[0] : <div className="flex flex-col gap-4">{column}</div>}
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselNext className={cn('mouse:block z-10 hidden')} />
              </Carousel>
            </LayoutGroup>

            {below && (
              <div
                className={cn(
                  '-mt-4',
                  !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow -mx-4 transition-[padding]',
                )}
              >
                {below}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
