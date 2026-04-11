import { api } from '#/../convex/_generated/api'
import { Button } from '#/component/ui/button'
import { Textarea } from '#/component/ui/textarea'
import { useClerk } from '@clerk/tanstack-react-start'
import { faFileImport, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation as useDbMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/import-movie')({
  component: ImportPage,
})

type MovieData = {
  uuid: string
  id: {
    tvdb?: number
    imdb: string
  }
  created_at: string
  title: string
  is_watched: boolean
}

type ImportResult = {
  processed: number
  success: number
  errors: Array<{ movie: string; error: string }>
}

function ImportPage() {
  const clerk = useClerk()
  const [jsonData, setJsonData] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  const followMovie = useDbMutation(api.library.follow)
  const markMovieWatched = useDbMutation(api.watch.markMovieWatched)
  const findMovieByExternalId = useAction(api.tmdb.findMovieByExternalId)

  const followMovieMutation = useMutation({
    mutationFn: async (args: Parameters<typeof followMovie>[0]) => {
      return await followMovie(args)
    },
  })

  const markWatchedMutation = useMutation({
    mutationFn: async (args: Parameters<typeof markMovieWatched>[0]) => {
      return await markMovieWatched(args)
    },
  })

  const importMutation = useMutation({
    mutationFn: async (moviesData: MovieData[]) => {
      const results: ImportResult = {
        processed: 0,
        success: 0,
        errors: [],
      }

      for (const movieData of moviesData) {
        results.processed++

        try {
          const createdAtTimestamp = new Date(movieData.created_at).getTime()

          const foundMovie = await findMovieByExternalId({ externalId: movieData.id.imdb })

          if (!foundMovie) {
            results.errors.push({
              movie: movieData.title,
              error: `No TMDB movie found for IMDB ID: ${movieData.id.imdb}`,
            })
            continue
          }

          const releaseDate = foundMovie.release_date ? new Date(foundMovie.release_date).getTime() : 0

          if (movieData.is_watched)
            await markWatchedMutation.mutateAsync({
              tmdbId: foundMovie.id,
              name: foundMovie.title,
              poster: foundMovie.poster_path ?? null,
              backdrop: foundMovie.backdrop_path ?? null,
              releaseDate,
              watchedAt: createdAtTimestamp,
            })
          else
            await followMovieMutation.mutateAsync({
              type: 'movie' as const,
              tmdbId: foundMovie.id,
              name: foundMovie.title,
              poster: foundMovie.poster_path ?? null,
              backdrop: foundMovie.backdrop_path ?? null,
              releaseDate,
              followedAt: createdAtTimestamp,
            })

          results.success++
        } catch (error) {
          results.errors.push({
            movie: movieData.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return results
    },
    onError: error => {
      toast.error('Import failed', {
        description: error.message,
      })
    },
  })

  const handleImport = async () => {
    if (!jsonData.trim()) {
      toast.error('Please paste your JSON data')
      return
    }

    try {
      const parsedData = JSON.parse(jsonData)

      if (!Array.isArray(parsedData)) {
        toast.error('JSON data must be an array of movies')
        return
      }

      await importMutation.mutateAsync(parsedData as MovieData[])
    } catch (error) {
      if (error instanceof SyntaxError) toast.error('Invalid JSON format')
      else toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (!clerk.isSignedIn) {
    return (
      <div className="screen-py screen-px flex w-full flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Import Movies</h1>
          <p className="mt-4 text-neutral-400">Please sign in to import your movie data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-py screen-px flex w-full flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Import Movies</h1>
        <p className="mt-4 text-neutral-400">Import your movie watchlist from JSON format</p>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <FontAwesomeIcon icon={faFileImport} />
            Movie Import
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">JSON Data:</label>
            <Textarea
              placeholder={`[\n  {\n    "uuid": "978899c4-5194-4568-b922-0bd2874c4c1a",\n    "id": {\n      "tvdb": 169,\n      "imdb": "tt0133093"\n    },\n    "created_at": "2024-09-13T10:49:58Z",\n    "title": "The Matrix",\n    "is_watched": false\n  },\n  ...\n]`}
              value={jsonData}
              onChange={e => setJsonData(e.target.value)}
              className="min-h-75 font-mono text-sm"
            />
          </div>

          <Button onClick={handleImport} disabled={importMutation.isPending || !jsonData.trim()} className="w-full">
            {importMutation.isPending ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faFileImport} />
                Import Movies
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mx-auto w-full max-w-4xl rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Import Results</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-green-500/10 p-4">
                <div className="text-2xl font-bold text-green-500">{result.success}</div>
                <div className="text-sm text-green-400">Successful</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-4">
                <div className="text-2xl font-bold text-red-500">{result.errors.length}</div>
                <div className="text-sm text-red-400">Errors</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-400">Errors:</h3>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-red-500/5 p-4">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-red-300">{error.movie}:</span>{' '}
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
