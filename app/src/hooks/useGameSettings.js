import { useCallback, useState } from 'react'
import {
  getStoredAnswerTimerDuration,
  getStoredRevealMode,
  getStoredTimerDuration,
  getStoredVolume,
  setStoredAnswerTimerDuration,
  setStoredRevealMode,
  setStoredTimerDuration,
  setStoredVolume,
} from '../services/storage.js'
import { clampAnswerTimerDuration, clampTimerDuration } from './useTimer.js'

function clampVolume(volume) {
  return Math.min(100, Math.max(0, Math.round(volume)))
}

// Source unique des réglages du jeu (durée, volume, mode de révélation), partagée entre l'écran
// de jeu et l'onglet Réglages > Jeu — les deux doivent toujours voir la même valeur, sans avoir
// besoin de recharger la page quand l'un des deux modifie un réglage.
export function useGameSettings() {
  const [timerDuration, setTimerDurationState] = useState(() => getStoredTimerDuration())
  const [volume, setVolumeState] = useState(() => getStoredVolume())
  const [revealMode, setRevealModeState] = useState(() => getStoredRevealMode())
  const [answerTimerDuration, setAnswerTimerDurationState] = useState(() => getStoredAnswerTimerDuration())

  const setTimerDuration = useCallback((value) => {
    const clamped = clampTimerDuration(value)
    setStoredTimerDuration(clamped)
    setTimerDurationState(clamped)
  }, [])

  const setAnswerTimerDuration = useCallback((value) => {
    const clamped = clampAnswerTimerDuration(value)
    setStoredAnswerTimerDuration(clamped)
    setAnswerTimerDurationState(clamped)
  }, [])

  const setVolume = useCallback((value) => {
    const clamped = clampVolume(value)
    setStoredVolume(clamped)
    setVolumeState(clamped)
  }, [])

  const setRevealMode = useCallback((mode) => {
    const normalized = mode === 'auto' ? 'auto' : 'manual'
    setStoredRevealMode(normalized)
    setRevealModeState(normalized)
  }, [])

  return {
    timerDuration,
    setTimerDuration,
    volume,
    setVolume,
    revealMode,
    setRevealMode,
    answerTimerDuration,
    setAnswerTimerDuration,
  }
}
