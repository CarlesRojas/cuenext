import { api } from '#/../convex/_generated/api'
import { ProgressiveImage } from '#/component/ProgressiveImage'
import type { Country } from '#/hooks/useCountryDetection'
import { useCountryDetection } from '#/hooks/useCountryDetection'
import type { MediaType } from '#/type/media'
import type { TmdbProvider } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface WatchProvidersProps {
  tmdbId: number
  media: MediaType
  releaseDate?: string
}

interface ProviderListProps {
  providers: TmdbProvider[]
  type: string
}

function ProviderList({ providers, type }: ProviderListProps) {
  if (!providers.length) return null

  const typeLabels: Record<string, string> = {
    flatrate: 'Stream',
    buy: 'Buy',
    rent: 'Rent',
    free: 'Free',
    ads: 'Free with Ads',
  }

  const filteredProviders = providers.filter(provider => {
    const currentName = provider.provider_name.toLowerCase()

    const hasIncludedProvider = providers.some(otherProvider => {
      if (otherProvider.provider_id === provider.provider_id) return false
      const otherName = otherProvider.provider_name.toLowerCase()
      return currentName.includes(otherName) && otherName.length < currentName.length
    })

    return !hasIncludedProvider
  })

  if (filteredProviders.length === 0) return null

  return (
    <div className="flex w-fit basis-auto flex-col gap-2 rounded-2xl border border-neutral-500/40 bg-neutral-800 p-2 shadow-xl">
      <h4 className="text-sm font-medium opacity-80">{typeLabels[type]}</h4>

      <div className="flex flex-wrap gap-2">
        {filteredProviders.map(provider => (
          <div
            key={provider.provider_id}
            className="flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-500/30 bg-neutral-800"
          >
            <ProgressiveImage
              paths={[provider.logo_path]}
              alt={provider.provider_name}
              className="aspect-square size-12 scale-[1.05] object-cover"
              minSize="w342"
              maxSize="w342"
              loading="lazy"
              title={provider.provider_name}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function WatchProviders({ tmdbId, media, releaseDate }: WatchProvidersProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)

  useCountryDetection({ onDetected: country => setSelectedCountry(country) })

  const movieProviders = useQuery({
    ...convexAction(api.tmdb.getMovieWatchProviders, { tmdbId }),
    enabled: media === 'movie',
  })

  const showProviders = useQuery({
    ...convexAction(api.tmdb.getShowWatchProviders, { tmdbId }),
    enabled: media === 'tv',
  })

  const data = media === 'movie' ? movieProviders.data : showProviders.data
  const isLoading = media === 'movie' ? movieProviders.isLoading : showProviders.isLoading

  const countryData = selectedCountry ? data?.results[selectedCountry.code] : null
  // const availableCountries = getCountries(data?.results ? Object.keys(data.results) : []).sort((a, b) =>
  //   a.name.localeCompare(b.name),
  // )

  const hasBeenReleased = releaseDate && new Date(releaseDate) <= new Date()

  return (
    <section className="screen-px pb-8">
      <div className="flex flex-col gap-3">
        <h2 className="page-width mx-[unset] text-lg font-semibold opacity-80">
          Where to watch in {selectedCountry ? selectedCountry.name : 'your country'}
          {countryData && countryData.link && (
            <a
              href={countryData.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs tracking-wide text-nowrap opacity-50 hover:opacity-80 focus-visible:opacity-80"
            >
              by JustWatch
            </a>
          )}
        </h2>

        {/* <div className="page-width mx-[unset] gap-2">
          <NativeSelect
            value={selectedCountry?.code ?? ''}
            onChange={e => setSelectedCountry(availableCountries.find(c => c.code === e.target.value) ?? null)}
          >
            {availableCountries.map(country => (
              <NativeSelectOption key={country.code} value={country.code}>
                {country.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div> */}

        {countryData && (
          <div className="flex w-full flex-wrap gap-3">
            {countryData.flatrate && <ProviderList providers={countryData.flatrate} type="flatrate" />}
            {countryData.free && <ProviderList providers={countryData.free} type="free" />}
            {countryData.ads && <ProviderList providers={countryData.ads} type="ads" />}
            {countryData.buy && <ProviderList providers={countryData.buy} type="buy" />}
            {countryData.rent && <ProviderList providers={countryData.rent} type="rent" />}
          </div>
        )}

        {!isLoading && selectedCountry && !countryData && (
          <p className="page-width pointer-events-none mx-[unset] -mt-2 tracking-wide text-neutral-500">
            {!hasBeenReleased
              ? releaseDate
                ? `This ${media === 'tv' ? 'show' : 'movie'} will release on ${new Date(releaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                : 'Not released yet'
              : `No streaming providers available in ${selectedCountry.name}`}
          </p>
        )}
      </div>
    </section>
  )
}
