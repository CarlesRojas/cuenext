import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

interface Props extends ComponentProps<'button'> {
  className?: string
}

const BackButton = ({ className, ...rest }: Props) => {
  const router = useRouter()
  const navigate = useNavigate()
  const searchParams = useSearchParams()

  return (
    <Button
      variant="secondary"
      size="icon"
      className={className}
      onClick={() => {
        navigate({ to: '.', replace: true, search: { media: searchParams.media } })
        router.history.back()
      }}
      {...rest}
    >
      <FontAwesomeIcon icon={faArrowLeft} size="lg" />
    </Button>
  )
}

export default BackButton
