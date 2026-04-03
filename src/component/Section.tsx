import { Button } from '#/component/ui/button'
import { cn } from '#/lib/cn'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  canCollapse?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export function Section({ title, children, canCollapse = true, defaultCollapsed = false, className }: SectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <section className={cn('flex flex-col gap-4 py-4', className)}>
      <Button variant="link" size="link" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 className="tracking text-xl font-semibold">{title}</h2>

        {canCollapse && (
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-neutral-500!"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </motion.div>
        )}
      </Button>

      <AnimatePresence initial={false}>
        {(!isCollapsed || !canCollapse) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="scrollbar-hide flex snap-x gap-4 overflow-x-auto pt-1 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
