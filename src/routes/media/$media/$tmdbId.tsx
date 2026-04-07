import { api } from '#/../convex/_generated/api'
import BackButton from '#/component/BackButton'
import { MovieDetails } from '#/component/MovieDetails'
import { ShowDetails } from '#/component/ShowDetails'
import { ShowSeasons } from '#/component/ShowSeasons'
import { WatchProviders } from '#/component/WatchProviders'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useWindowSize } from 'usehooks-ts'

export const Route = createFileRoute('/media/$media/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId, media } = Route.useParams()
  const tmdbIdNumber = Number(tmdbId)

  const [showHeader, setShowHeader] = useState(false)
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const show = useQuery({
    ...convexAction(api.tmdb.getShowDetails, { tmdbId: tmdbIdNumber }),
    enabled: media === 'tv',
  })

  const movie = useQuery({
    ...convexAction(api.tmdb.getMovieDetails, { tmdbId: tmdbIdNumber }),
    enabled: media === 'movie',
  })

  const displayName = media === 'movie' ? movie.data?.title : show.data?.name

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container')
    if (!scrollContainer) return

    const onScroll = () => {
      const scrollY = scrollContainer.scrollTop

      // Same as the padding-top on ShowDetails and MovieDetails components
      let multiplier = 0.2
      if (width >= 1280) multiplier = 0.35
      else if (width >= 1024) multiplier = 0.3
      else if (width >= 768) multiplier = 0.25

      const triggerHeight = scrollContainer.clientHeight * multiplier
      setShowHeader(scrollY > triggerHeight)
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll)
    }
  }, [width])

  return (
    <div className="relative flex w-full flex-col">
      <header
        className={cn(
          'screen-px screen-py pointer-events-none fixed top-0 right-0 left-0 z-40 mx-[unset] w-full pb-8 opacity-0 backdrop-blur-md transition-opacity duration-200',
          isMobile && '-top-14',
          showHeader && 'pointer-events-auto opacity-100',
        )}
        style={{
          maskImage: isMobile
            ? 'linear-gradient(to bottom, black 80%, transparent)'
            : 'linear-gradient(to bottom, black 70%, transparent)',
        }}
      >
        <div className="relative flex w-full items-baseline gap-4">
          <BackButton disabled />

          <h1 className="line-clamp-2 text-3xl leading-8 font-extrabold tracking-tight text-white md:text-4xl md:leading-10">
            {displayName}
          </h1>
        </div>
      </header>

      <header className="md:left-aside fixed top-4 left-4 z-50 w-fit rounded-full md:top-8">
        <BackButton />
      </header>

      <div className="flex w-full flex-col gap-4">
        {media === 'movie' && movie.data && <MovieDetails movie={movie.data} />}
        {media === 'tv' && show.data && <ShowDetails show={show.data} />}

        {media === 'tv' && show.data && <ShowSeasons show={show.data} />}

        <WatchProviders tmdbId={tmdbIdNumber} media={media as MediaType} />
      </div>
    </div>
  )
}
