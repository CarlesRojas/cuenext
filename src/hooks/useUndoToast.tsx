import { Button } from '#/component/ui/button'
import { faCheckCircle, faEye, faEyeSlash, faMinus, faPlus, faUndo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'
import { createContext, useContext, useRef } from 'react'
import { toast } from 'sonner'

export type ToastActionType = 'follow' | 'unfollow' | 'watch' | 'unwatch'

interface ToastContextType {
  showUndoToast: (title: string, actionType: ToastActionType, idKey: string, onUndo: () => void) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toastIds = useRef<Record<string, string | number>>({})

  const showUndoToast = (title: string, actionType: ToastActionType, idKey: string, onUndo: () => void) => {
    if (toastIds.current[idKey]) toast.dismiss(toastIds.current[idKey])

    const newToastId = `${idKey}-${Date.now()}`
    toastIds.current[idKey] = newToastId

    let icon = faCheckCircle
    let iconClass = 'text-sky-500'
    let message = ''

    switch (actionType) {
      case 'follow':
        icon = faPlus
        iconClass = 'text-sky-500'
        message = `Followed ${title}`
        break
      case 'unfollow':
        icon = faMinus
        iconClass = 'text-neutral-400'
        message = `Unfollowed ${title}`
        break
      case 'watch':
        icon = faEye
        iconClass = 'text-sky-500'
        message = `Watched ${title}`
        break
      case 'unwatch':
        icon = faEyeSlash
        iconClass = 'text-neutral-400'
        message = `Unwatched ${title}`
        break
    }

    toast(
      <div className="flex w-full items-center gap-2">
        <FontAwesomeIcon icon={icon} className={`size-4 min-h-4 min-w-4 ${iconClass}`} />
        <span className="line-clamp-2 leading-5">{message}</span>
      </div>,
      {
        id: newToastId,
        action: (
          <Button
            className="place-self-end"
            onClick={() => {
              onUndo()
              toast.dismiss(newToastId)
            }}
          >
            <FontAwesomeIcon icon={faUndo} className="size-4" />
            Undo
          </Button>
        ),
      },
    )
  }

  return <ToastContext.Provider value={{ showUndoToast }}>{children}</ToastContext.Provider>
}

export function useUndoToast() {
  const context = useContext(ToastContext)

  if (context === undefined) throw new Error('useUndoToast must be used within a ToastProvider')

  return context
}
