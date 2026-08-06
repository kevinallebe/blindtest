import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_DURATION = 3
const MAX_DURATION = 60
const MIN_ANSWER_DURATION = 3
const MAX_ANSWER_DURATION = 30

export function clampTimerDuration(duration) {
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, duration))
}

export function clampAnswerTimerDuration(duration) {
  return Math.min(MAX_ANSWER_DURATION, Math.max(MIN_ANSWER_DURATION, duration))
}

// Compte à rebours pur (3-60s, clampé). Le délai d'1s avant démarrage réel après confirmation de
// lecture (US-7.2) est de la responsabilité de l'appelant, qui sait quand la lecture est confirmée.
export function useTimer(duration) {
  const clamped = clampTimerDuration(duration)
  const [secondsLeft, setSecondsLeft] = useState(clamped)
  const [isRunning, setIsRunning] = useState(false)
  const onCompleteRef = useRef(null)

  const start = useCallback(
    (onComplete) => {
      onCompleteRef.current = onComplete ?? null
      setSecondsLeft(clamped)
      setIsRunning(true)
    },
    [clamped],
  )

  const stop = useCallback(() => setIsRunning(false), [])

  // Reprend le décompte là où il s'était arrêté (contrairement à start(), qui réinitialise).
  const resume = useCallback(() => setIsRunning(true), [])

  useEffect(() => {
    if (!isRunning) return undefined

    const id = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          clearInterval(id)
          setIsRunning(false)
          onCompleteRef.current?.()
          return 0
        }
        return seconds - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning])

  return {
    secondsLeft,
    isRunning,
    duration: clamped,
    progress: clamped > 0 ? (clamped - secondsLeft) / clamped : 0,
    start,
    stop,
    resume,
  }
}
