import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate, useRouter } from '@tanstack/react-router'

const BackButton = () => {
  const router = useRouter()
  const navigate = useNavigate()
  const searchParams = useSearchParams()

  return (
    <Button
      variant="frost"
      size="icon"
      onClick={() => {
        navigate({ to: '.', replace: true, search: { media: searchParams.media } })
        router.history.back()
      }}
    >
      <FontAwesomeIcon icon={faArrowLeft} size="lg" />
    </Button>
  )
}

export default BackButton
