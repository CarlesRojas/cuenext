import { Button } from '#/component/ui/button'
import type { CarouselApi } from '#/component/ui/carousel'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/component/ui/carousel'
import { cn } from '#/lib/cn'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import React, { useRef, useState } from 'react'
import { useResizeObserver, useWindowSize } from 'usehooks-ts'

interface SectionProps {
  title: string
  children: ReactNode
  canCollapse?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export function Section({ title, children, canCollapse = true, defaultCollapsed = false, className }: SectionProps) {
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [api, setApi] = useState<CarouselApi>()

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const carouselRef = useRef<HTMLDivElement>(null)

  const { width: carouselWidth = 0 } = useResizeObserver({
    ref: carouselRef as React.RefObject<HTMLDivElement>,
    box: 'border-box',
  })

  const itemWidth = isMobile ? 128 : 176
  const itemGap = 16
  const leftPadding = isMobile ? 16 : 332
  const rightPadding = 16
  const visibleSlides = Math.max(
    1,
    Math.floor((carouselWidth - rightPadding - leftPadding + itemGap * 2) / (itemWidth + itemGap)),
  )

  return (
    <section className={cn('flex flex-col gap-4 py-4', className)}>
      <Button
        variant="link"
        size="link"
        className={cn('px-4', !isMobile && 'pl-aside', !canCollapse && 'pointer-events-none!')}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="tracking text-xl font-semibold">{title}</h2>

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

      <AnimatePresence initial={false}>
        {(!isCollapsed || !canCollapse) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="group relative w-full overflow-hidden"
            ref={carouselRef}
          >
            <Carousel
              setApi={setApi}
              opts={{ align: 'start', dragFree: true, slidesToScroll: isMobile ? 'auto' : visibleSlides }}
              className={cn('w-full', !isMobile && 'w-dvw')}
            >
              <CarouselContent className={cn('mr-4 -ml-4 px-4 py-4', !isMobile && 'pl-aside')}>
                {React.Children.map(children, (child, index) => (
                  <CarouselItem key={index} className="basis-auto">
                    {child}
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className={cn('mouse:block hidden', !isMobile && 'left-aside ml-2')} />
              <CarouselNext className={cn('mouse:block hidden')} />
            </Carousel>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
