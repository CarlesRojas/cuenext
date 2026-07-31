import { api } from '#/../convex/_generated/api'
import ReviewCard from '#/component/ReviewCard'
import { ReviewDialog } from '#/component/ReviewDialog'
import { UserReviewCard } from '#/component/UserReviewCard'
import { Button } from '#/component/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '#/component/ui/carousel'
import { movieExtrasQuery, showExtrasQuery } from '#/hooks/useMediaExtras'
import { useReviewActions, useTitleReviews } from '#/hooks/useTitleReviews'
import { cn } from '#/lib/cn'
import { tmdbStale } from '#/lib/tmdbQuery'
import type { MediaType } from '#/type/media'
import type { TmdbReviewsResponse } from '#/type/tmdb'
import { faChevronDown, faPen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useIntersectionObserver, useWindowSize } from 'usehooks-ts'

interface ReviewsProps {
  tmdbId: number
  media: MediaType
  title: string
  poster?: string | null
  backdrop?: string | null
}

export function Reviews({ tmdbId, media, title, poster, backdrop }: ReviewsProps) {
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)

  const getReviews = useAction(media === 'movie' ? api.tmdb.getMovieReviews : api.tmdb.getTvReviews)
  const queryClient = useQueryClient()

  // Reviews written on CueNext are ours: they live in our own tables, carry their upvotes,
  // and are listed ahead of the imported TMDB ones.
  const { reviews: userReviews, myReview } = useTitleReviews(media, tmdbId)
  const { isSignedIn, requireSignIn } = useReviewActions()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, error } = useInfiniteQuery({
    queryKey: ['reviews', media, tmdbId],
    queryFn: async ({ pageParam = 1 }): Promise<TmdbReviewsResponse> => {
      // The first page ships with the bundled detail query the rest of the page already
      // fetches, so only later pages need their own action call.
      if (pageParam === 1) {
        const extras =
          media === 'movie'
            ? await queryClient.ensureQueryData(movieExtrasQuery(tmdbId))
            : await queryClient.ensureQueryData(showExtrasQuery(tmdbId))
        if (extras.reviews) return extras.reviews
      }
      return await getReviews({ tmdbId, page: pageParam })
    },
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

  const tmdbReviews = error || !data?.pages[0] ? [] : data.pages.flatMap(page => page.results)
  const hasReviews = userReviews.length > 0 || tmdbReviews.length > 0

  const onWrite = () => {
    if (!isSignedIn) {
      requireSignIn()
      return
    }

    setIsReviewDialogOpen(true)
  }

  return (
    <section className="flex flex-col">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-4',
          !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow pr-8 transition-[padding]',
        )}
      >
        <Button variant="link" size="link" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h2 className="text-lg font-semibold opacity-80">User reviews</h2>
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-neutral-500!"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </motion.div>
        </Button>

        <Button variant="secondary" size="pill" onClick={onWrite}>
          <FontAwesomeIcon icon={faPen} className="size-3.5" />
          <span>{myReview && myReview.content ? 'Edit your review' : 'Write a review'}</span>
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden px-4"
          >
            {!hasReviews && (
              <p
                className={cn(
                  'py-4 text-sm tracking-wide text-white/40',
                  !isMobile && 'pl-aside sidebar-collapsed:pl-aside-collapsed duration-slow transition-[padding]',
                )}
              >
                {'No reviews yet. Be the first to review it.'}
              </p>
            )}

            {hasReviews && (
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
                  {userReviews.map(review => (
                    <CarouselItem
                      key={review.id}
                      className={cn(
                        'duration-slow basis-[90%] transition-[margin] md:basis-[50%] lg:basis-[40%] xl:basis-[30%]',
                        'first:md:ml-aside first:sidebar-collapsed:md:ml-aside-collapsed',
                        'last:md:mr-aside-collapsed last:sidebar-collapsed:md:mr-aside',
                      )}
                    >
                      <UserReviewCard review={review} />
                    </CarouselItem>
                  ))}

                  {tmdbReviews.map((review, index) => (
                    <CarouselItem
                      key={`tmdb-${index}`}
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewDialog
        type={media}
        tmdbId={tmdbId}
        title={title}
        poster={poster}
        backdrop={backdrop}
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
      />
    </section>
  )
}
