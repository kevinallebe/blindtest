import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/socket.js'

export function useBuzzSocket() {
  const [connected, setConnected] = useState(false)
  const [buzzes, setBuzzes] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleBuzzedList = (list) => setBuzzes(Array.isArray(list) ? list : [])
    const handleReset = () => setBuzzes([])

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('buzzedList', handleBuzzedList)
    socket.on('reset', handleReset)

    setConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('buzzedList', handleBuzzedList)
      socket.off('reset', handleReset)
    }
  }, [])

  // US-9.4 — remet les buzz à zéro côté serveur pour tous les joueurs au début de chaque manche.
  const startRound = useCallback(() => {
    socketRef.current?.emit('startRound')
  }, [])

  return { connected, buzzes, startRound }
}
