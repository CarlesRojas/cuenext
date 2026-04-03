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
          '--border-radius': '9999px',
        } as React.CSSProperties
      }
      toastOptions={{
        className: 'backdrop-blur-md',
      }}
      {...props}
    />
  )
}

export { Toaster }
