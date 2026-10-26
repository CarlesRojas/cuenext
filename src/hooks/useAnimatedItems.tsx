import { cn } from '#/lib/cn'
import type { Transition } from 'motion/react'
import { motion, PresenceContext } from 'motion/react'
import type { Key, ReactElement, ReactNode } from 'react'
import React, { useState } from 'react'

const HIDDEN = { opacity: 0, scale: 0.9 }
const SHOWN = { opacity: 1, scale: 1 }
const TRANSITION: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  opacity: { duration: 0.2 },
  scale: { duration: 0.2 },
}

interface LeavingItem {
  element: ReactElement
  index: number
}

// Leaving items keep their slot until they are gone, so nothing moves under them.
function withLeavingItems(items: Array<ReactElement>, leavingItems: Array<LeavingItem>) {
  const rendered = items.map(element => ({ element, isLeaving: false }))
  for (const { element, index } of [...leavingItems].sort((a, b) => a.index - b.index))
    rendered.splice(Math.min(index, rendered.length), 0, { element, isLeaving: true })

  return rendered
}

// Wraps each keyed child so a list animates its changes: an item that leaves fades out in
// place, then the rest glide to their new spots, and an item that arrives fades in.
// Items are matched by layoutId rather than by parent, so callers can regroup the result
// (two-row columns, carousel slides) and an item that hops to another parent still glides.
// Render the result inside a LayoutGroup with its own id, so two lists showing the same
// title never share a layoutId. `className` styles each item's wrapper.
export function useAnimatedItems(children: ReactNode, className?: string) {
  const items = React.Children.toArray(children).filter(React.isValidElement)

  const [previousItems, setPreviousItems] = useState(items)
  const [leavingItems, setLeavingItems] = useState<Array<LeavingItem>>([])
  const [enteringKeys, setEnteringKeys] = useState<Set<Key | null>>(new Set())

  // Children.toArray keeps each element's props object, so this only flags a real change
  // and the extra render it triggers settles at once.
  const hasChanged =
    items.length !== previousItems.length ||
    items.some((item, index) => item.key !== previousItems[index].key || item.props !== previousItems[index].props)

  if (hasChanged) {
    const keys = new Set(items.map(item => item.key))
    const previousKeys = new Set(previousItems.map(item => item.key))

    setPreviousItems(items)
    setEnteringKeys(new Set([...keys].filter(key => !previousKeys.has(key))))

    // Slots are taken from what was on screen, items still fading out included, so several
    // quick removals keep their order. An item back from an undo stops leaving.
    setLeavingItems(
      withLeavingItems(previousItems, leavingItems).flatMap(({ element }, index) =>
        keys.has(element.key) ? [] : [{ element, index }],
      ),
    )
  }

  // An enclosing AnimatePresence with initial={false} (collapsible sections) would also
  // skip the fade in of every item mounted later, so the items opt out of its context.
  return withLeavingItems(items, leavingItems).map(({ element, isLeaving }) => (
    <PresenceContext.Provider key={element.key} value={null}>
      <motion.div
        layout="position"
        layoutId={String(element.key)}
        initial={isLeaving ? SHOWN : enteringKeys.has(element.key) ? HIDDEN : false}
        animate={isLeaving ? HIDDEN : SHOWN}
        transition={TRANSITION}
        onAnimationComplete={() => {
          if (isLeaving) setLeavingItems(current => current.filter(item => item.element.key !== element.key))
        }}
        className={cn(className, isLeaving && 'pointer-events-none')}
      >
        {element}
      </motion.div>
    </PresenceContext.Provider>
  ))
}
