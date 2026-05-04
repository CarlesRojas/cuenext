import { Button } from '#/component/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/component/ui/carousel'
import { cn } from '#/lib/cn'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'motion/react'
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
}: SectionProps) {
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [isCollapsed, setIsCollapsed] = useLocalStorage(`CUENEXT-section-${sectionKey}-collapsed`, defaultCollapsed)

  return (
    <section className={cn('flex flex-col', className)}>
      <div className={cn(
        'px-4 flex items-center gap-4',
        !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow transition-[padding]',
      )}>
        <Button
          variant="link"
          size="link"
          className={cn(
            !canCollapse && 'pointer-events-none!',
          )}
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
            <Carousel
              key={`${Math.floor(width / 200)}-${isMobile}`}
              opts={{ align: 'start', dragFree: true, slidesToScroll: 'auto' }}
              className="w-full"
            >
              <CarouselPrevious
                className={cn(
                  'mouse:block z-10 hidden',
                  !isMobile && 'left-aside sidebar-collapsed:left-aside-collapsed duration-slow ml-2 transition-[left]',
                )}
              />

              <CarouselContent className={cn('z-0 -ml-4 pt-3 pb-8 md:-ml-8')}>
                {React.Children.map(
                  children,
                  (child, index) =>
                    !!child && (
                      <CarouselItem
                        key={index}
                        className={cn(
                          'duration-slow basis-auto transition-[margin]',
                          'first:md:ml-aside first:sidebar-collapsed:md:ml-aside-collapsed',
                          'last:md:mr-aside-collapsed last:sidebar-collapsed:md:mr-aside',
                        )}
                      >
                        {child}
                      </CarouselItem>
                    ),
                )}
              </CarouselContent>

              <CarouselNext className={cn('mouse:block z-10 hidden')} />
            </Carousel>

            {below && (
              <div
                className={cn(
                  '-mt-4',
                  !isMobile && '-mx-4 pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow transition-[padding]',
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
