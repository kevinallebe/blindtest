import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/socket.js'

export function useBuzzSocket() {
  const [connected, setConnected] = useState(false)
  const [buzzes, setBuzzes] = useState([])
  const [joinedList, setJoinedList] = useState([])
  // Le serveur diffuse ce même évènement à tous les clients, animateur compris (io.emit côté
  // Buzzer) — sert à refléter dans l'UI si les inscriptions sont ouvertes ou non (US-16.1).
  const [mode, setMode] = useState('round')
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleBuzzedList = (list) => setBuzzes(Array.isArray(list) ? list : [])
    const handleReset = () => setBuzzes([])
    const handleJoinedList = (list) => setJoinedList(Array.isArray(list) ? list : [])
    const handleMode = (nextMode) => setMode(nextMode === 'join' ? 'join' : 'round')

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('buzzedList', handleBuzzedList)
    socket.on('reset', handleReset)
    socket.on('joinedList', handleJoinedList)
    socket.on('mode', handleMode)

    setConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('buzzedList', handleBuzzedList)
      socket.off('reset', handleReset)
      socket.off('joinedList', handleJoinedList)
      socket.off('mode', handleMode)
    }
  }, [])

  // US-9.4 — remet les buzz à zéro côté serveur pour tous les joueurs au début de chaque manche.
  const startRound = useCallback(() => {
    socketRef.current?.emit('startRound')
  }, [])

  // US-16.1 — bascule tous les clients Buzzer connectés en mode inscription.
  const startJoin = useCallback(() => {
    socketRef.current?.emit('startJoin')
  }, [])

  return { connected, buzzes, joinedList, mode, startRound, startJoin }
}
