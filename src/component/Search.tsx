import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import { Input } from '#/component/ui/input'
import { useMediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import z from 'zod'

interface Props {
  isMobile?: boolean
}

export function Search({ isMobile = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mediaType] = useMediaType()

  const formSchema = z.object({
    query: z.string(),
  })

  const form = useForm({
    defaultValues: { query: '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value: { query } }) => {
      console.log(query)
    },
  })

  if (!isMobile) {
    return (
      <LiquidGlass className="relative w-full rounded-full bg-neutral-800/40">
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex items-center gap-1 p-1"
        >
          <form.Field
            name="query"
            children={field => {
              return (
                <Input
                  placeholder={mediaType === 'movie' ? 'Search movies...' : 'Search TV shows...'}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  onClear={field.state.value ? () => field.handleChange('') : undefined}
                />
              )
            }}
          />

          <form.Subscribe
            selector={state => [state.canSubmit, state.values.query] as const}
            children={([canSubmit, query]) => (
              <Button type="submit" size="icon" className="shrink-0" disabled={!canSubmit || !query.trim()}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </Button>
            )}
          />
        </form>
      </LiquidGlass>
    )
  }

  // Mobile layout
  return (
    <LiquidGlass className="relative rounded-full bg-neutral-800/40">
      <div className="flex items-center overflow-hidden transition-all duration-300 ease-in-out">
        <form
          onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className={cn(
            'flex items-center transition-all duration-300 ease-in-out',
            isExpanded ? 'w-64 opacity-100' : 'w-0 opacity-0',
          )}
        >
          {isExpanded && (
            <form.Field
              name="query"
              validators={{
                onChange: ({ value }) => (value.length > 100 ? 'Search query too long' : undefined),
              }}
              children={field => (
                <Input
                  className="border-0 bg-transparent focus-within:bg-transparent hover:bg-transparent"
                  placeholder="Search..."
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  onClear={field.state.value ? () => field.handleChange('') : undefined}
                  autoFocus
                />
              )}
            />
          )}
        </form>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (!isExpanded) setIsExpanded(true)
            else form.handleSubmit()
          }}
          className="shrink-0 p-2"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </Button>
      </div>
    </LiquidGlass>
  )
}
