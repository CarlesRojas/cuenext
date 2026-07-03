import { api } from '#/../convex/_generated/api'
import ReviewCard from '#/component/ReviewCard'
import { Button } from '#/component/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/component/ui/carousel'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { tmdbStale } from '#/lib/tmdbQuery'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useIntersectionObserver, useWindowSize } from 'usehooks-ts'

interface ReviewsProps {
  tmdbId: number
  media: MediaType
}

export function Reviews({ tmdbId, media }: ReviewsProps) {
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768
  const [isCollapsed, setIsCollapsed] = useState(false)

  const getReviews = useAction(media === 'movie' ? api.tmdb.getMovieReviews : api.tmdb.getTvReviews)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error } = useInfiniteQuery({
    queryKey: ['reviews', media, tmdbId],
    queryFn: async ({ pageParam = 1 }) => await getReviews({ tmdbId, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1
      return undefined
    },
    ...tmdbStale(),
    enabled: !!tmdbId,
  })

  const { ref } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px',
    onChange: isIntersecting => {
      if (isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
  })

  const allReviews = data?.pages.flatMap(page => page.results) || []

  if (error || !data?.pages[0]) return null
  if (allReviews.length === 0) return null

  return (
    <section className="flex flex-col">
      <Button
        variant="link"
        size="link"
        className={cn(
          'px-4',
          !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow transition-[padding]',
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-lg font-semibold opacity-80">User reviews</h2>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-neutral-500!"
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </motion.div>
      </Button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden px-4"
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
                {allReviews.map((review, index) => (
                  <CarouselItem
                    key={index}
                    className={cn(
                      'duration-slow basis-[90%] transition-[margin] md:basis-[50%] lg:basis-[40%] xl:basis-[30%]',
                      'first:md:ml-aside first:sidebar-collapsed:md:ml-aside-collapsed',
                      'last:md:mr-aside-collapsed last:sidebar-collapsed:md:mr-aside',
                    )}
                  >
                    <ReviewCard review={review} />
                  </CarouselItem>
                ))}

                <div ref={ref} className="col-span-full flex justify-center" />
              </CarouselContent>

              <CarouselNext className={cn('mouse:block z-10 hidden')} />
            </Carousel>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
