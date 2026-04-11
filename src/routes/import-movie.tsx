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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

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

  const importMutation = async (moviesData: MovieData[]) => {
    setImporting(true)
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

    setImporting(false)
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
        toast.error('JSON file must contain an array of movies')
        return
      }

      if (parsedData.length > 0) {
        const firstItem = parsedData[0]
        if (!firstItem.uuid || !firstItem.id?.imdb || !firstItem.title || firstItem.is_watched === undefined) {
          toast.error('Invalid movie format. Please check the required fields.')
          return
        }
      }

      const importResult = await importMutation(parsedData as MovieData[])
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
        <p className="mt-4 text-neutral-400">Upload a JSON file to import your movie watchlist</p>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <FontAwesomeIcon icon={faFileImport} />
            Movie Import
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Upload a JSON file with movie data. Each movie should include: uuid, id (with imdb), title, is_watched, and
            created_at.
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
            {importing ? 'Importing...' : 'Import Movies'}
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
