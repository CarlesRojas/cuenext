import { api } from '#/../convex/_generated/api'
import { Button } from '#/component/ui/button'
import { useClerk } from '@clerk/tanstack-react-start'
import { faFileImport, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation as useDbMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/import-shows')({
  component: ImportPage,
})

type EpisodeData = {
  id: {
    tvdb: number
    imdb: string
  }
  number: number
  special: boolean
  is_watched: boolean
  watched_at?: string
}

type SeasonData = {
  number: number
  episodes: EpisodeData[]
}

type ShowData = {
  uuid: string
  id: {
    tvdb: number
    imdb: string
  }
  created_at: string
  title: string
  status: string
  seasons: SeasonData[]
}

type ImportResult = {
  processed: number
  success: number
  errors: Array<{ show: string; error: string }>
  episodesProcessed: number
  episodesWatched: number
  episodesNotFound: Array<{ show: string; episode: string; externalIds: { tvdb?: number; imdb?: string } }>
}

function ImportPage() {
  const clerk = useClerk()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const followShow = useDbMutation(api.library.follow)
  const setStopped = useDbMutation(api.stopped.setStopped)
  const markMultipleEpisodesAsWatched = useDbMutation(api.watch.markMultipleEpisodesAsWatched)
  const findByExternalId = useAction(api.tmdb.findShowByExternalId)
  const findEpisodeByExternalId = useAction(api.tmdb.findEpisodeByExternalId)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const followShowMutation = useMutation({
    mutationFn: async (args: Parameters<typeof followShow>[0]) => {
      return await followShow(args)
    },
  })

  const setStoppedMutation = useMutation({
    mutationFn: async (args: Parameters<typeof setStopped>[0]) => {
      return await setStopped(args)
    },
  })

  const markMultipleEpisodesWatchedMutation = useMutation({
    mutationFn: async (args: Parameters<typeof markMultipleEpisodesAsWatched>[0]) => {
      return await markMultipleEpisodesAsWatched(args)
    },
  })

  const importMutation = async (showsData: ShowData[]) => {
    setImporting(true)
    setProgress({ current: 0, total: showsData.length })
    const results: ImportResult = {
      processed: 0,
      success: 0,
      errors: [],
      episodesProcessed: 0,
      episodesWatched: 0,
      episodesNotFound: [],
    }

    const BATCH_SIZE = 5

    for (let i = 0; i < showsData.length; i += BATCH_SIZE) {
      const batch = showsData.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async showData => {
        try {
          const createdAtTimestamp = new Date(showData.created_at).getTime()

          let foundShow = null
          if (showData.id.tvdb) foundShow = await findByExternalId({ externalId: showData.id.tvdb })

          if (!foundShow)
            return {
              success: false,
              error: {
                show: showData.title,
                error: `No TMDB show found for TVDB ID: ${showData.id.tvdb}`,
              },
            }

          //   const nextEpisodeInfo = await updateNextEpisode({ tmdbId: foundShow.id })

          const releaseDate = foundShow.first_air_date ? new Date(foundShow.first_air_date).getTime() : 0

          await followShowMutation.mutateAsync({
            type: 'tv' as const,
            tmdbId: foundShow.id,
            name: foundShow.name,
            poster: foundShow.poster_path ?? null,
            backdrop: foundShow.backdrop_path ?? null,
            releaseDate,
            followedAt: createdAtTimestamp,
          })

          let episodesProcessed = 0
          let episodesWatched = 0
          const episodesToWatch = []
          const episodesNotFound = []

          for (const season of showData.seasons) {
            for (const episode of season.episodes) {
              episodesProcessed++

              if (!episode.watched_at) continue
              if (episode.special) continue

              let tmdbEpisode = null
              if (episode.id.tvdb) tmdbEpisode = await findEpisodeByExternalId({ externalId: episode.id.tvdb })

              if (!tmdbEpisode) {
                episodesNotFound.push({
                  show: showData.title,
                  episode: `S${season.number}E${episode.number}`,
                  externalIds: episode.id,
                })
                continue
              }

              console.log(`${foundShow.name}:  ${tmdbEpisode.season_number} ${tmdbEpisode.episode_number}`)
              episodesToWatch.push({
                seasonNumber: tmdbEpisode.season_number - 1,
                episodeNumber: tmdbEpisode.episode_number - 1,
                watchedAt: new Date(episode.watched_at).getTime(),
              })

              episodesWatched++
            }
          }

          if (episodesToWatch.length > 0) {
            await markMultipleEpisodesWatchedMutation.mutateAsync({
              showTmdbId: foundShow.id,
              episodes: episodesToWatch,
              showName: foundShow.name,
              showPoster: foundShow.poster_path ?? null,
              showBackdrop: foundShow.backdrop_path ?? null,
              releaseDate: 0,
            })
          }

          await updateNextEpisode({ tmdbId: foundShow.id })

          if (['watch_later', 'stopped'].includes(showData.status))
            await setStoppedMutation.mutateAsync({ tmdbId: foundShow.id })

          return {
            success: true,
            episodesProcessed,
            episodesWatched,
            episodesNotFound,
          }
        } catch (error) {
          return {
            success: false,
            error: {
              show: showData.title,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)

      for (const batchResult of batchResults) {
        results.processed++
        setProgress(prev => ({ ...prev, current: prev.current + 1 }))

        if (batchResult.status === 'fulfilled') {
          if (batchResult.value.success) {
            results.success++

            if (batchResult.value.episodesProcessed) results.episodesProcessed += batchResult.value.episodesProcessed
            if (batchResult.value.episodesWatched) results.episodesWatched += batchResult.value.episodesWatched
            if (batchResult.value.episodesNotFound) results.episodesNotFound.push(...batchResult.value.episodesNotFound)
          } else if (batchResult.value.error) results.errors.push(batchResult.value.error)
        } else {
          results.errors.push({
            show: 'Unknown',
            error:
              'Promise rejected: ' +
              (batchResult.reason instanceof Error ? batchResult.reason.message : 'Unknown error'),
          })
        }
      }
    }

    setImporting(false)
    setProgress({ current: 0, total: 0 })
    return results
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a JSON file')
      return
    }

    try {
      const fileContent = await selectedFile.text()
      const parsedData = JSON.parse(fileContent)

      if (!Array.isArray(parsedData)) {
        toast.error('JSON file must contain an array of shows')
        return
      }

      if (parsedData.length > 0) {
        const firstItem = parsedData[0]
        if (!firstItem.uuid || !firstItem.id || !firstItem.title || !firstItem.seasons) {
          toast.error('Invalid show format. Please check the required fields.')
          return
        }
      }

      const importResult = await importMutation(parsedData as ShowData[])
      setResult(importResult)
    } catch (error) {
      if (error instanceof SyntaxError) toast.error('Invalid JSON format')
      else toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (!clerk.isSignedIn) {
    return (
      <div className="screen-py screen-px flex w-full flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Import Shows</h1>
          <p className="mt-4 text-neutral-400">Please sign in to import your show data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-py screen-px flex w-full flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Import Shows</h1>
        <p className="mt-4 text-neutral-400">Upload a JSON file to import your show watchlist</p>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <FontAwesomeIcon icon={faFileImport} />
            Show Import
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Upload a JSON file with show data. Each show should include: uuid, id with tvdb, title, status, seasons with
            episodes.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">JSON File:</label>

            <input
              type="file"
              accept=".json"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none"
            />

            {selectedFile && (
              <div className="text-sm text-neutral-400">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <Button onClick={handleImport} disabled={!selectedFile || importing}>
            <FontAwesomeIcon icon={importing ? faSpinner : faFileImport} spin={importing} />
            {importing ? 'Importing...' : 'Import Shows'}
          </Button>

          {importing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-neutral-400">
                <span>Progress</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-neutral-500">
                {Math.round((progress.current / progress.total) * 100)}% complete
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Import Results</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-2xl bg-green-500/10 p-4">
                <div className="text-2xl font-bold text-green-500">{result.success}</div>
                <div className="text-sm text-green-400">Shows Followed</div>
              </div>
              <div className="rounded-2xl bg-red-500/10 p-4">
                <div className="text-2xl font-bold text-red-500">{result.errors.length}</div>
                <div className="text-sm text-red-400">Errors</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-2xl bg-blue-500/10 p-4">
                <div className="text-2xl font-bold text-blue-500">{result.episodesWatched}</div>
                <div className="text-sm text-blue-400">Episodes Watched</div>
              </div>
              <div className="rounded-2xl bg-purple-500/10 p-4">
                <div className="text-2xl font-bold text-purple-500">{result.episodesProcessed}</div>
                <div className="text-sm text-purple-400">Total Episodes</div>
              </div>
            </div>

            {result.episodesNotFound.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-yellow-400">Episodes Not Found in TMDB:</h3>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-yellow-500/5 p-4">
                  {result.episodesNotFound.map((episode, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-yellow-300">
                        {episode.show} - {episode.episode}:
                      </span>{' '}
                      <span className="text-yellow-400">
                        TVDB: {episode.externalIds.tvdb || 'N/A'}, IMDB: {episode.externalIds.imdb || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-400">Errors:</h3>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-red-500/5 p-4">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-red-300">{error.show}:</span>{' '}
                      <span className="text-red-400">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
