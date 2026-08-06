import { useCallback, useRef, useState } from 'react'

const AUTO_DISMISS_MS = 5000

// Notification transitoire pour les erreurs génériques (ex: réseau — Epic 12), qui ne concernent
// pas un endroit précis de l'écran et n'ont pas besoin de rester affichées indéfiniment.
export function useToast() {
  const [message, setMessage] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((text) => {
    setMessage(text)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setMessage(null), AUTO_DISMISS_MS)
  }, [])

  const dismissToast = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setMessage(null)
  }, [])

  return { message, showToast, dismissToast }
}
