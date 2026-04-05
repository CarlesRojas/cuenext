import { cn } from '#/lib/cn'
import { getDisplacementFilter } from '#/utils/liquidGlass'
import React, { useEffect, useRef, useState } from 'react'
import { isMobileSafari, isSafari } from 'react-device-detect'

interface Props {
  className?: string
  children?: React.ReactNode
  depth?: number
  strength?: number
  chromaticAberration?: number
  blur?: number
  color?: 'black' | 'white' | 'transparent'
  background?: string
  freeze?: boolean
  noMorph?: boolean
  button?: boolean
  inline?: boolean
  style?: React.CSSProperties
  wrapperClassName?: string
}

const supportsBackdropFilterUrl = (() => {
  if (isSafari || isMobileSafari) return false

  if (typeof window === 'undefined') return true
  const testEl = document.createElement('div')
  testEl.style.cssText = 'backdrop-filter: url(#test)'
  return testEl.style.backdropFilter === 'url(#test)' || testEl.style.backdropFilter === 'url("#test")'
})()

export function LiquidGlass({
  className,
  children,
  depth = 10,
  strength = 100,
  chromaticAberration = 0,
  blur = 5,
  color = 'transparent',
  background,
  freeze,
  noMorph,
  button,
  inline,
  style,
  wrapperClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement | HTMLSpanElement>(null)
  const glassRef = useRef<HTMLDivElement | HTMLSpanElement>(null)
  const contentRef = useRef<HTMLDivElement | HTMLSpanElement>(null)
  const bgImgRef = useRef<HTMLImageElement>(null)
  const [glassStyle, setGlassStyle] = useState<React.CSSProperties>({})
  const [bgImgStyle, setBgImgStyle] = useState<React.CSSProperties>({})

  const saturate = button == null ? 1.5 : 1.2
  const brightness = button == null ? 1.1 : 1.6

  useEffect(() => {
    if (!containerRef.current || !glassRef.current || !contentRef.current) return

    const redrawGlass = () => {
      const container = containerRef.current!
      const content = contentRef.current!
      const rect = content.getBoundingClientRect()
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)

      const computedStyle = window.getComputedStyle(container)
      const radius = parseFloat(computedStyle.borderRadius || '0')

      if (bgImgRef.current) {
        setBgImgStyle({
          width: `${width}px`,
          height: `${width}px`,
          willChange: 'filter',
        })
      }

      if (supportsBackdropFilterUrl) {
        setGlassStyle({
          width: `${width}px`,
          height: `${height}px`,
          backdropFilter: `blur(${blur / 2}px) url('${getDisplacementFilter({
            height,
            width,
            radius,
            depth,
            strength,
            chromaticAberration,
          })}') blur(${blur}px) brightness(${brightness}) saturate(${saturate})`,
        })
      } else {
        // Fallback for browsers not supporting SVG url filters in backdrop-filter
        const fallbackStyle: React.CSSProperties = {
          width: `${width}px`,
          height: `${height}px`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate})`,
          backdropFilter: `blur(${blur}px) saturate(${saturate})`,
        }
        setGlassStyle(fallbackStyle)
      }
    }

    redrawGlass()

    const observer = new ResizeObserver(() => {
      redrawGlass()
    })
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [blur, chromaticAberration, depth, strength, saturate, brightness])

  const wrapperClasses = cn(
    'liquid-glass relative overflow-hidden',
    inline ? 'inline-flex align-middle' : 'w-max',
    button &&
      'origin-[top_center] cursor-pointer shadow-[0px_0px_1px_white] transition-all duration-300 ease-out hover:scale-105 hover:-rotate-1',
    className,
  )

  const overlayBg = noMorph ? 'rgba(255, 255, 255, 0.1)' : button ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'

  const Component = inline ? 'span' : 'div'

  let glassBoxClass = 'm-0! '
  if (color === 'black') glassBoxClass += 'bg-[#09090b80] shadow-[inset_0_0_4px_0px_#fafafa40] brightness-50'
  else if (color === 'white') glassBoxClass += 'bg-[#fafafa80] shadow-[inset_0_0_4px_0px_#fafafa40]'
  else glassBoxClass += 'bg-[#09090b00] shadow-[inset_0_0_4px_0px_#fafafa40]'

  return (
    <Component ref={containerRef as any} className={wrapperClasses} style={style}>
      <Component className="absolute inset-0 z-1" style={{ background: overlayBg }} />

      {background && !inline && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className={cn(
              'absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2',
              !freeze && 'animate-spin',
            )}
          >
            <img ref={bgImgRef} src={background} style={bgImgStyle} alt="" />
          </div>
        </div>
      )}

      <Component
        ref={contentRef as any}
        className={cn(
          'relative z-3 flex w-full items-center justify-center text-center',
          inline ? '' : 'h-full',
          wrapperClassName,
        )}
      >
        {children}
      </Component>

      <Component className="pointer-events-none absolute inset-0 z-2">
        <Component ref={glassRef as any} className={cn(glassBoxClass, className)} style={glassStyle} />
      </Component>
    </Component>
  )
}
