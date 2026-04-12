import { Button } from '#/component/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/component/ui/dialog'
import { TMDB_AUTH_ERROR, TMDB_AUTH_SUCCESS } from '#/constant'
import { faExternalLink, faLink, faSpinner, faUnlink, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useAction, useMutation as useDbMutation, useQuery as useDbQuery } from 'convex/react'
import { useState } from 'react'
import { isIOS } from 'react-device-detect'
import { api } from '../../convex/_generated/api'

const LinkWithTmdb = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tmdbLink = useDbQuery(api.tmdbAuth.getTmdbAccountLink)
  const createRequestToken = useAction(api.tmdbAuth.createRequestToken)
  const linkAccount = useAction(api.tmdbAuth.linkTmdbAccount)
  const unlinkAccount = useDbMutation(api.tmdbAuth.unlinkTmdbAccount)

  const handleStartLinking = async () => {
    try {
      setIsLinking(true)
      setError(null)

      const { requestToken, authUrl } = await createRequestToken()

      window.open(authUrl, '_blank')

      const handleCallback = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        window.removeEventListener('message', handleCallback)

        if (event.data.type === TMDB_AUTH_SUCCESS) {
          await linkAccount({ requestToken })
          setError(null)
          setIsModalOpen(false)
        } else if (event.data.type === TMDB_AUTH_ERROR) setError('Authentication failed. Please try again.')

        setIsLinking(false)
      }

      window.addEventListener('message', handleCallback)
    } catch (err) {
      setError('Failed to start authentication. Please try again.')
      setIsLinking(false)
    }
  }

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setError(null)
      setIsLinking(false)
    }
  }

  return (
    <div className="screen-px flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold opacity-80">TMDB Account</h2>

        <p className="pointer-events-none font-semibold tracking-wide text-neutral-500">
          {tmdbLink
            ? `Connected as ${tmdbLink.tmdbUsername}`
            : 'Link your TMDB account to sync your watchlist and to be able to rate and review movies and shows.'}
        </p>

        {!tmdbLink && (
          <p className="pointer-events-none font-semibold tracking-wide text-neutral-500">
            This will sync your watchlist and favorites both ways.
          </p>
        )}
      </div>

      {isIOS && (
        <Button variant={'secondary'} asChild>
          <a href="https://www.cuenext.app/profile" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faExternalLink} />
            <span>{'Open the web to link your TMDB account'}</span>
          </a>
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        {!isIOS && (
          <DialogTrigger asChild>
            <Button variant={'secondary'}>
              <FontAwesomeIcon icon={tmdbLink ? faUser : faLink} />
              <span>{tmdbLink ? 'Manage' : 'Link your TMDB account'}</span>
            </Button>
          </DialogTrigger>
        )}

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tmdbLink ? 'Manage your TMDB Account' : 'Link your TMDB Account'}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="py-4">
            {tmdbLink && (
              <div className="flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-800/20 p-4">
                <FontAwesomeIcon icon={faUser} className="text-sky-400" size="2x" />

                <div>
                  <p className="font-medium">{tmdbLink.tmdbUsername}</p>
                  <p className="text-sm text-neutral-400">
                    Linked on{' '}
                    {new Date(tmdbLink.linkedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    .
                  </p>
                </div>
              </div>
            )}

            {!tmdbLink && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-800/20 p-4">
                  <FontAwesomeIcon icon={faLink} className="text-sky-400" size="2x" />

                  <div>
                    <p className="font-medium">Connect with TMDB</p>
                    <p className="text-sm text-neutral-400">Sync your watchlists and ratings with TMDB</p>
                  </div>
                </div>

                <p className="text-sm text-neutral-300">You'll be redirected to TMDB to authenticate.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {tmdbLink && (
              <DialogClose asChild>
                <Button variant="negative" onClick={async () => await unlinkAccount()} disabled={isLinking}>
                  <FontAwesomeIcon icon={isLinking ? faSpinner : faUnlink} spin={isLinking} />
                  <span>Unlink Account</span>
                </Button>
              </DialogClose>
            )}

            {!tmdbLink && (
              <Button onClick={handleStartLinking} disabled={isLinking}>
                <FontAwesomeIcon icon={isLinking ? faSpinner : faExternalLink} spin={isLinking} />
                <span>{isLinking ? 'Connecting...' : 'Connect with TMDB'}</span>
              </Button>
            )}

            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LinkWithTmdb
