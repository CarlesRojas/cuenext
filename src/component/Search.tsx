import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import { Input } from '#/component/ui/input'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useForm } from '@tanstack/react-form'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

interface Props {
  isMobile?: boolean
  mobileTabsWidth?: number
  isExpanded?: boolean
  setIsExpanded?: (expanded: boolean) => void
}

export function Search({ isMobile = false, mobileTabsWidth, isExpanded = false, setIsExpanded }: Props) {
  const { media, query: urlQuery } = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const formSchema = z.object({ query: z.string() })

  const form = useForm({
    defaultValues: { query: urlQuery ?? '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value: { query } }) => {
      const sanitizedQuery = encodeURIComponent(query.trim())
      if (sanitizedQuery)
        navigate({
          to: '/search',
          replace: location.pathname === '/search',
          search: { query: sanitizedQuery, media },
        })
    },
  })

  useEffect(() => form.setFieldValue('query', urlQuery ?? ''), [location.pathname, form])

  const handleClear = (field: any) => {
    field.handleChange('')
    navigate({ to: location.pathname, replace: true, search: { media } })
  }

  const handleInputChange = (field: any, value: string) => {
    field.handleChange(value)
  }

  if (!isMobile) {
    return (
      <LiquidGlass className="relative w-full rounded-full bg-neutral-800/40">
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex items-center gap-1 p-1.5"
        >
          <form.Field
            name="query"
            children={field => {
              return (
                <Input
                  placeholder={media === 'movie' ? 'Search movies...' : 'Search TV shows...'}
                  value={field.state.value}
                  onChange={e => handleInputChange(field, e.target.value)}
                  onBlur={field.handleBlur}
                  onClear={field.state.value ? () => handleClear(field) : undefined}
                />
              )
            }}
          />

          <form.Subscribe
            selector={state => [state.canSubmit, state.values.query] as const}
            children={([canSubmit, query]) => (
              <Button type="submit" size="icon" disabled={!canSubmit || !query.trim()}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </Button>
            )}
          />
        </form>
      </LiquidGlass>
    )
  }

  return (
    <LiquidGlass
      className={cn(
        'relative h-fit place-self-end rounded-full bg-neutral-800/40',
        mobileTabsWidth === undefined && 'size-15 max-h-15 min-h-15 max-w-15 min-w-15',
      )}
    >
      <div
        className={cn(
          'flex w-fit min-w-fit items-center overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded && 'gap-1 pl-1.5',
        )}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className={cn(
            'relative flex items-center transition-[width,opacity] duration-300 ease-in-out',
            isExpanded ? 'opacity-100' : 'w-0 opacity-0',
          )}
          style={isExpanded ? { width: (mobileTabsWidth ?? 0) - 68 - 70 } : undefined}
        >
          {isExpanded && (
            <form.Field
              name="query"
              children={field => (
                <Input
                  placeholder={media === 'movie' ? 'Search movies...' : 'Search TV shows...'}
                  value={field.state.value}
                  onChange={e => handleInputChange(field, e.target.value)}
                  onBlur={field.handleBlur}
                  onClear={field.state.value ? () => handleClear(field) : undefined}
                  autoFocus
                  containerClassName="w-full"
                />
              )}
            />
          )}
        </form>

        <form.Subscribe
          selector={state => [state.canSubmit, state.values.query] as const}
          children={([canSubmit, query]) => (
            <Button
              type={isExpanded ? 'submit' : 'button'}
              variant={isExpanded ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                if (isExpanded) {
                  form.handleSubmit()
                  return
                }

                if (!location.pathname.startsWith('/search'))
                  navigate({ to: '/search', replace: false, search: { media } })
                setIsExpanded?.(true)
              }}
              disabled={isExpanded && (!canSubmit || !query.trim())}
              className="m-1.5 size-12 max-h-12 min-h-12 max-w-12 min-w-12"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} size="lg" />
            </Button>
          )}
        />
      </div>
    </LiquidGlass>
  )
}
