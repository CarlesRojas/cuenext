import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

function setViewportHeight() {
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight
  const fullVh = window.innerHeight

  document.documentElement.style.setProperty('--app-height', `${vh}px`)
  document.documentElement.style.setProperty('--visual-height', `${vh}px`)
  document.documentElement.style.setProperty('--full-height', `${fullVh}px`)
}

function addFeatureDetection() {
  const html = document.documentElement

  if (CSS.supports('height', '100dvh')) {
    html.classList.add('supports-dvh')
  }

  if (window.visualViewport) {
    html.classList.add('supports-visual-viewport')
  }
}

addFeatureDetection()
setViewportHeight()
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setViewportHeight)
} else {
  window.addEventListener('resize', setViewportHeight)
}

window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100)
})

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
