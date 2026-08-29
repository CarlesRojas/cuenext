import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import type { CategorySlug } from '#/type/category'
import { getCategoriesForMedia, getCategory } from '#/type/category'
import { useNavigate } from '@tanstack/react-router'

interface CategorySelectorProps {
  className?: string
}

export function CategorySelector({ className }: CategorySelectorProps) {
  const { media, category } = useSearchParams()
  const navigate = useNavigate()

  const selected = getCategory(category, media)
  const categories = getCategoriesForMedia(media)

  const select = (slug: CategorySlug | undefined) =>
    navigate({ to: '.', replace: true, search: previous => ({ ...previous, category: slug }) })

  return (
    <div
      // Chips scroll sideways on a narrow screen and wrap into rows where there is room for
      // them, since a hidden scrollbar is hard to discover with a mouse.
      className={cn(
        'no-scrollbar -my-1 flex w-full touch-pan-x gap-2 overflow-x-auto py-1 **:touch-pan-x md:flex-wrap md:overflow-x-visible',
        className,
      )}
    >
      <Button variant="frost" size="pill" data-checked={!selected} onClick={() => select(undefined)}>
        All
      </Button>

      {categories.map(entry => (
        <Button
          key={entry.slug}
          variant="frost"
          size="pill"
          data-checked={selected?.slug === entry.slug}
          onClick={() => select(entry.slug)}
        >
          {entry.label}
        </Button>
      ))}
    </div>
  )
}
