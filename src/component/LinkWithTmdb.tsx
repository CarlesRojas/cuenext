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
import { useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'

const LinkWithTmdb = () => {
  const navigate = useNavigate()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tmdbLink = useQuery(api.tmdbAuth.getTmdbAccountLink)
  const createRequestToken = useAction(api.tmdbAuth.createRequestToken)
  const linkAccount = useAction(api.tmdbAuth.linkTmdbAccount)
  const unlinkAccount = useMutation(api.tmdbAuth.unlinkTmdbAccount)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const approved = urlParams.get('approved')
    const requestToken = urlParams.get('request_token')
    const tmdbError = urlParams.get('tmdb_error')

    if (tmdbError) {
      setError('Authentication failed. Please try again.')
      navigate({ to: '.', search: old => ({ ...old, tmdb_error: undefined }), replace: true })
    } else if (!!approved && requestToken) {
      handleLinkAccount(requestToken)
      navigate({
        to: '.',
        search: old => ({ ...old, approved: undefined, request_token: undefined, tmdb_error: undefined }),
        replace: true,
      })
    }
  }, [])

  const handleStartLinking = async () => {
    try {
      setIsLinking(true)
      setError(null)

      const { requestToken, authUrl } = await createRequestToken()

      // Store the request token for later use
      localStorage.setItem('tmdb_request_token', requestToken)

      // Open TMDB authentication in a new tab
      window.open(authUrl, '_blank')

      // Listen for the callback
      const handleCallback = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === TMDB_AUTH_SUCCESS) {
          window.removeEventListener('message', handleCallback)
          handleLinkAccount()
        } else if (event.data.type === TMDB_AUTH_ERROR) {
          window.removeEventListener('message', handleCallback)
          setError('Authentication failed. Please try again.')
          setIsLinking(false)
        }
      }

      window.addEventListener('message', handleCallback)

      // Fallback: check periodically if user comes back
      const checkInterval = setInterval(() => {
        if (document.hasFocus() && localStorage.getItem('tmdb_request_token')) {
          clearInterval(checkInterval)
          window.removeEventListener('message', handleCallback)
          handleLinkAccount()
        }
      }, 1000)

      // Clean up after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval)
        window.removeEventListener('message', handleCallback)
        if (isLinking) {
          setIsLinking(false)
          setError('Authentication timeout. Please try again.')
        }
      }, 300000)
    } catch (err) {
      console.error('Failed to start TMDB linking:', err)
      setError('Failed to start authentication. Please try again.')
      setIsLinking(false)
    }
  }

  const handleLinkAccount = async (tokenFromUrl?: string) => {
    try {
      const requestToken = tokenFromUrl || localStorage.getItem('tmdb_request_token')
      if (!requestToken) {
        throw new Error('No request token found')
      }

      await linkAccount({ requestToken })

      localStorage.removeItem('tmdb_request_token')
      setIsLinking(false)
      setIsModalOpen(false)
      setError(null)
    } catch (err) {
      console.error('Failed to link TMDB account:', err)
      setError('Failed to link account. Please try again.')
      setIsLinking(false)
      localStorage.removeItem('tmdb_request_token')
    }
  }

  const handleUnlink = async () => {
    try {
      setIsLinking(true)
      setError(null)

      await unlinkAccount()

      setIsLinking(false)
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to unlink TMDB account:', err)
      setError('Failed to unlink account. Please try again.')
      setIsLinking(false)
    }
  }

  const handleCloseModal = (open: boolean) => {
    if (open) {
      setIsModalOpen(true)
    } else if (!isLinking) {
      setIsModalOpen(false)
      setError(null)
      localStorage.removeItem('tmdb_request_token')
    }
  }

  return (
    <div className="screen-px flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold opacity-80">TMDB Account</h2>

        <p className="pointer-events-none font-semibold tracking-wide text-neutral-500">
          {tmdbLink ? `Connected as ${tmdbLink.tmdbUsername}` : 'Link your TMDB account to sync watchlists and ratings'}
        </p>
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogTrigger asChild>
          <Button variant={'secondary'}>
            <FontAwesomeIcon icon={tmdbLink ? faUser : faLink} />
            <span>{tmdbLink ? 'Manage' : 'Link your TMDB account'}</span>
          </Button>
        </DialogTrigger>

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
                <Button variant="negative" onClick={handleUnlink} disabled={isLinking}>
                  <FontAwesomeIcon icon={isLinking ? faSpinner : faUnlink} spin={isLinking} />
                  <span>Unlink Account</span>
                </Button>
              </DialogClose>
            )}

            {!tmdbLink && (
              <DialogClose asChild>
                <Button onClick={handleStartLinking} disabled={isLinking}>
                  <FontAwesomeIcon icon={isLinking ? faSpinner : faExternalLink} spin={isLinking} />
                  <span>{isLinking ? 'Connecting...' : 'Connect with TMDB'}</span>
                </Button>
              </DialogClose>
            )}

            <DialogClose asChild>
              <Button variant="secondary" disabled={isLinking}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LinkWithTmdb
