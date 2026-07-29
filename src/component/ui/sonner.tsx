import {
  faCheckCircle,
  faCircleExclamation,
  faCircleInfo,
  faCircleXmark,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={'dark'}
      className="toaster group"
      position="top-right"
      offset={16}
      icons={{
        success: <FontAwesomeIcon icon={faCheckCircle} className="size-4" />,
        info: <FontAwesomeIcon icon={faCircleInfo} className="size-4" />,
        warning: <FontAwesomeIcon icon={faCircleExclamation} className="size-4" />,
        error: <FontAwesomeIcon icon={faCircleXmark} className="size-4" />,
        loading: <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'rgba(0, 0, 0, 0.5)',
          '--normal-text': 'white',
          '--normal-border': 'rgba(115, 115, 115, 0.4)',
          '--border-radius': '32px',
        } as React.CSSProperties
      }
      toastOptions={{
        className: 'backdrop-blur-md! flex! justify-between! gap-3! p-2! pl-5! h-fit!',
        classNames: {
          title: 'text-base font-semibold',
          // The toast root uses justify-between so action buttons sit on the right; let the
          // content block absorb the free space so titles stay right after the icon.
          content: 'flex-1 text-left',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
