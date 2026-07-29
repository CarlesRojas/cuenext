import type { UserDataExport } from '#/type/userData'
import { USER_DATA_EXPORT_VERSION, UserDataExportSchema } from '#/type/userData'
import { getAllPages } from '#/utils/getAllPages'
import { useUser } from '@clerk/tanstack-react-start'
import { useAction, useConvex } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { useRef } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'

const TOAST_ID = 'user-data-transfer'

// Rows per importChunk call, small enough to stay well within Convex's per-mutation limits
// while keeping the number of round trips low.
const IMPORT_CHUNK_SIZE = 400

// Concurrent updateNextEpisode calls after an import; each may fan out into per-season
// TMDB fetches, so this matches the batching the shows importer already uses.
const NEXT_EPISODE_BATCH_SIZE = 5

function buildExportFilename(username: string | undefined) {
  const sanitized = (username ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `cuenext_${sanitized || 'user'}_data.json`
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // The iOS wrapper resolves the blob through a WKDownload after the click, so revoking
  // immediately would break the download there.
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000)
}

export function useUserDataTransfer() {
  const convex = useConvex()
  const { user } = useUser()

  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const recomputeStats = useAction(api.stats.recomputeStats)

  const isTransferringRef = useRef(false)
  // Keeps the picker input referenced while the native file dialog is open.
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const exportUserData = async () => {
    if (isTransferringRef.current) return
    isTransferringRef.current = true

    toast.loading('Exporting your data...', { id: TOAST_ID })

    try {
      const [snapshot, watchedMovies, watchedEpisodes] = await Promise.all([
        convex.query(api.userData.getExportSnapshot),
        getAllPages(args => convex.query(api.watch.getWatchedMovies, args), {}),
        getAllPages(args => convex.query(api.watch.getWatchedEpisodes, args), {}),
      ])

      const exportData: UserDataExport = {
        app: 'cuenext',
        version: USER_DATA_EXPORT_VERSION,
        exportedAt: Date.now(),
        follows: snapshot.follows,
        favorites: snapshot.favorites,
        stopped: snapshot.stopped,
        watchedMovies: watchedMovies.map(({ tmdbId, watchedAt }) => ({ tmdbId, watchedAt })),
        watchedEpisodes: watchedEpisodes.map(({ showTmdbId, seasonNumber, episodeNumber, watchedAt }) => ({
          showTmdbId,
          seasonNumber,
          episodeNumber,
          watchedAt,
        })),
      }

      const username = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress.split('@')[0]
      downloadJsonFile(buildExportFilename(username ?? undefined), exportData)

      toast.success(
        `Exported ${exportData.follows.length} titles, ${exportData.watchedEpisodes.length} episodes and ${exportData.watchedMovies.length} movies`,
        { id: TOAST_ID },
      )
    } catch {
      toast.error('Export failed. Please try again.', { id: TOAST_ID })
    } finally {
      isTransferringRef.current = false
    }
  }

  const runImport = async (data: UserDataExport) => {
    type ImportChunk = FunctionArgs<typeof api.userData.importChunk>

    const chunks: ImportChunk[] = []
    const pushChunks = <T>(rows: T[], toChunk: (slice: T[]) => ImportChunk) => {
      for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE)
        chunks.push(toChunk(rows.slice(i, i + IMPORT_CHUNK_SIZE)))
    }

    pushChunks(data.follows, follows => ({ follows }))
    pushChunks(data.favorites, favorites => ({ favorites }))
    pushChunks(data.stopped, stopped => ({ stopped }))
    pushChunks(data.watchedMovies, watchedMovies => ({ watchedMovies }))
    pushChunks(data.watchedEpisodes, watchedEpisodes => ({ watchedEpisodes }))

    if (chunks.length === 0) {
      toast.error('This file contains no data to import.', { id: TOAST_ID })
      return
    }

    let imported = 0
    let skipped = 0

    for (let i = 0; i < chunks.length; i++) {
      toast.loading(`Importing your data... ${i + 1}/${chunks.length}`, { id: TOAST_ID })
      const result = await convex.mutation(api.userData.importChunk, chunks[i])
      imported += result.imported
      skipped += result.skipped
    }

    // The watchlist only shows followed shows that have a nextEpisode row, so build one per
    // imported show (season layouts come from the shared TMDB cache when available).
    const showIds = [
      ...new Set([
        ...data.follows.filter(follow => follow.type === 'tv').map(follow => follow.tmdbId),
        ...data.watchedEpisodes.map(episode => episode.showTmdbId),
      ]),
    ]

    for (let i = 0; i < showIds.length; i += NEXT_EPISODE_BATCH_SIZE) {
      const batch = showIds.slice(i, i + NEXT_EPISODE_BATCH_SIZE)
      toast.loading(`Preparing your shows... ${Math.min(i + batch.length, showIds.length)}/${showIds.length}`, {
        id: TOAST_ID,
      })
      await Promise.all(batch.map(tmdbId => updateNextEpisode({ tmdbId }).catch(() => null)))
    }

    toast.loading('Recalculating your stats...', { id: TOAST_ID })
    await recomputeStats().catch(() => null)

    toast.success(
      skipped > 0 ? `Imported ${imported} items (${skipped} already existed)` : `Imported ${imported} items`,
      { id: TOAST_ID },
    )
  }

  const importUserData = () => {
    if (isTransferringRef.current) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    fileInputRef.current = input

    input.onchange = async () => {
      const file = input.files?.[0]
      fileInputRef.current = null
      if (!file) return

      if (isTransferringRef.current) return
      isTransferringRef.current = true

      try {
        const parsed = UserDataExportSchema.safeParse(JSON.parse(await file.text()))

        if (!parsed.success) {
          toast.error('This file is not a valid CueNext data export.', { id: TOAST_ID })
          return
        }

        await runImport(parsed.data)
      } catch (error) {
        if (error instanceof SyntaxError) toast.error('This file is not a valid JSON file.', { id: TOAST_ID })
        else toast.error('Import failed. Please try again.', { id: TOAST_ID })
      } finally {
        isTransferringRef.current = false
      }
    }

    input.click()
  }

  return { exportUserData, importUserData }
}
