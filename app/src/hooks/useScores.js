import { useCallback, useState } from 'react'
import {
  addMissingPlayers,
  bumpPlayerPoints,
  getStoredOverallScores,
  getStoredPartyScores,
  leaveTeam as leaveTeamInList,
  mergeIntoTeam as mergeIntoTeamInList,
  setStoredOverallScores,
  setStoredPartyScores,
} from '../services/scores.js'

const EMPTY_TOGGLE = { artist: false, title: false }

function pointsFor(toggle) {
  return (toggle.artist ? 0.5 : 0) + (toggle.title ? 0.5 : 0)
}

// Epic 13-16 — état des deux scoreboards (Partie/Général, persistés) + des toggles de la manche
// affichée (roundScores, éphémère : remis à zéro par l'appelant à chaque "Nouvelle musique").
export function useScores() {
  const [overall, setOverallState] = useState(() => getStoredOverallScores())
  const [party, setPartyState] = useState(() => getStoredPartyScores())
  const [roundScores, setRoundScores] = useState({})

  const setOverall = useCallback((updater) => {
    setOverallState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setStoredOverallScores(next)
      return next
    })
  }, [])

  const setParty = useCallback((updater) => {
    setPartyState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setStoredPartyScores(next)
      return next
    })
  }, [])

  const registerPlayers = useCallback(
    (names) => {
      if (!names || names.length === 0) return
      setOverall((prev) => addMissingPlayers(prev, names))
      setParty((prev) => ({ ...prev, players: addMissingPlayers(prev.players, names) }))
    },
    [setOverall, setParty],
  )

  const applyDelta = useCallback(
    (name, delta) => {
      if (delta === 0) return
      setOverall((prev) => bumpPlayerPoints(prev, name, delta))
      setParty((prev) => ({ ...prev, players: bumpPlayerPoints(prev.players, name, delta) }))
    },
    [setOverall, setParty],
  )

  // `before` est fourni par l'appelant (déjà lu depuis roundScores) plutôt que re-dérivé depuis
  // l'intérieur du updater de setRoundScores : en StrictMode (dev), React invoque ce genre de
  // updater deux fois pour détecter les effets de bord impurs — un appelDelta y logé aurait donc
  // doublé les points à chaque clic (bug constaté : 1 pt "les deux" appliqué comme 2 pts).
  const applyToggle = useCallback(
    (name, before, nextToggle) => {
      applyDelta(name, pointsFor(nextToggle) - pointsFor(before))
      setRoundScores((prev) => ({ ...prev, [name]: nextToggle }))
    },
    [applyDelta],
  )

  const toggleArtist = useCallback(
    (name) => {
      const current = roundScores[name] ?? EMPTY_TOGGLE
      applyToggle(name, current, { ...current, artist: !current.artist })
    },
    [roundScores, applyToggle],
  )

  const toggleTitle = useCallback(
    (name) => {
      const current = roundScores[name] ?? EMPTY_TOGGLE
      applyToggle(name, current, { ...current, title: !current.title })
    },
    [roundScores, applyToggle],
  )

  // "Les deux" est un raccourci qui converge vers le même état qu'artiste+titre cochés
  // séparément (US-13.1) — pas un 3e état indépendant.
  const toggleBoth = useCallback(
    (name) => {
      const current = roundScores[name] ?? EMPTY_TOGGLE
      const bothActive = current.artist && current.title
      applyToggle(name, current, { artist: !bothActive, title: !bothActive })
    },
    [roundScores, applyToggle],
  )

  const resetRoundScores = useCallback(() => setRoundScores({}), [])

  const mergeIntoTeam = useCallback(
    (sourceName, target) => {
      setParty((prev) => ({ ...prev, teams: mergeIntoTeamInList(prev.teams, sourceName, target) }))
    },
    [setParty],
  )

  const leaveTeam = useCallback(
    (memberName) => {
      setParty((prev) => ({ ...prev, teams: leaveTeamInList(prev.teams, memberName) }))
    },
    [setParty],
  )

  const dissolveTeams = useCallback(() => {
    setParty((prev) => ({ ...prev, teams: [] }))
  }, [setParty])

  // US-14.2 — nouvelle partie, nouveau tableau : appelé à chaque (re)chargement des playlists.
  const resetParty = useCallback(() => {
    setParty({ players: [], teams: [] })
  }, [setParty])

  // US-14.3 — seul moyen de remettre le Général à zéro, jamais automatique.
  const resetOverall = useCallback(() => {
    setOverall([])
  }, [setOverall])

  return {
    overall,
    party,
    roundScores,
    toggleArtist,
    toggleTitle,
    toggleBoth,
    resetRoundScores,
    registerPlayers,
    mergeIntoTeam,
    leaveTeam,
    dissolveTeams,
    resetParty,
    resetOverall,
  }
}
