import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker.register('/service-worker.js')
  }

  if (document.readyState === 'complete') registerServiceWorker()
  else window.addEventListener('load', registerServiceWorker)
}

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
