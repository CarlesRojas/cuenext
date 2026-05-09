import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import { Input } from '#/component/ui/input'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useForm } from '@tanstack/react-form'
import { useLocation, useNavigate } from '@tanstack/react-router'
import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useDebounceCallback, useOnClickOutside } from 'usehooks-ts'
import z from 'zod'

interface Props {
  isMobile?: boolean
  mobileTabsWidth?: number
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

export function Search({ isMobile = false, mobileTabsWidth, isExpanded = false, setIsExpanded }: Props) {
  const { media, query: urlQuery } = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const formSchema = z.object({ query: z.string() })
  const inputRef = useRef<HTMLInputElement>(null)
  const [contractAfterSearch, setContractAfterSearch] = useState(false)

  const performSearch = (query: string) => {
    const sanitizedQuery = encodeURIComponent(query.trim())

    navigate({
      to: '/search',
      replace: location.pathname === '/search',
      search: { query: sanitizedQuery, media },
    })
  }

  const form = useForm({
    defaultValues: { query: urlQuery ?? '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value: { query } }) => performSearch(query),
  })

  const debouncedSearch = useDebounceCallback(performSearch, 500)

  useEffect(() => form.setFieldValue('query', urlQuery ?? ''), [location.pathname, form])

  const handleClear = (field: any) => {
    field.handleChange('')
    navigate({ to: location.pathname, replace: true, search: { media } })
  }

  const handleInputChange = (field: any, value: string) => {
    field.handleChange(value)
    debouncedSearch(value)
  }

  const searchRef = useRef<HTMLFormElement>(null)
  const handleClickOutside = () => {
    if (!contractAfterSearch) return
    setIsExpanded(false)
    setContractAfterSearch(false)
  }
  useOnClickOutside(searchRef as RefObject<HTMLFormElement>, handleClickOutside)

  if (!isMobile) {
    return (
      <LiquidGlass className="relative w-full rounded-full bg-neutral-800/40">
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="relative flex w-full items-center justify-between px-1"
          ref={searchRef}
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
                  onClear={isExpanded && field.state.value ? () => handleClear(field) : undefined}
                  ref={inputRef}
                  containerClassName={cn(
                    'duration-slow w-full max-w-full px-0 opacity-100 transition-[max-width,opacity]',
                    !isExpanded && 'pointer-events-none max-w-0 opacity-0',
                  )}
                  disabled={!isExpanded}
                />
              )
            }}
          />

          <form.Subscribe
            selector={state => [state.canSubmit, state.values.query] as const}
            children={([canSubmit, query]) => (
              <Button
                type={isExpanded ? 'submit' : 'button'}
                size="iconSmall"
                variant={isExpanded ? 'default' : 'ghost'}
                onClick={
                  isExpanded
                    ? undefined
                    : e => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsExpanded(true)
                        setContractAfterSearch(true)

                        setTimeout(() => inputRef.current?.focus(), 100)
                      }
                }
                disabled={isExpanded && (!canSubmit || !query.trim())}
              >
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
          'duration-slow flex w-fit min-w-fit items-center overflow-hidden transition-all ease-in-out',
          isExpanded && 'gap-1 pl-1.5',
        )}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className={cn(
            'duration-slow relative flex items-center transition-[width,opacity] ease-in-out',
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

                setIsExpanded(true)
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
