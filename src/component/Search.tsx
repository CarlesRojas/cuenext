import { LiquidGlass } from '#/component/LiquidGlass'
import { useMediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'

interface Props {
  isMobile?: boolean
}

export function Search({ isMobile = false }: Props) {
  const [mediaType] = useMediaType()

  return (
    <LiquidGlass className={cn('relative w-fit rounded-full bg-neutral-800/40', !isMobile && 'w-full')}></LiquidGlass>
  )
}
