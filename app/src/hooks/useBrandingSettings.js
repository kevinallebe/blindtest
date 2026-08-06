import { useCallback, useState } from 'react'
import {
  getBlindtestInitials,
  getBlindtestName,
  setBlindtestInitials,
  setBlindtestName,
} from '../services/adminConfig.js'

// Source unique du nom/des initiales du blindtest (en-tête + Réglages > Admin) — les deux
// doivent voir la même valeur sans avoir besoin de recharger la page.
export function useBrandingSettings() {
  const [name, setNameState] = useState(() => getBlindtestName())
  const [initials, setInitialsState] = useState(() => getBlindtestInitials())

  const setName = useCallback((value) => {
    setBlindtestName(value)
    const normalized = getBlindtestName()
    setNameState(normalized)
    return normalized
  }, [])

  const setInitials = useCallback((value) => {
    setBlindtestInitials(value)
    const normalized = getBlindtestInitials()
    setInitialsState(normalized)
    return normalized
  }, [])

  return { name, setName, initials, setInitials }
}
