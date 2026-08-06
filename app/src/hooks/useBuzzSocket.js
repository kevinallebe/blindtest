import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/socket.js'

export function useBuzzSocket() {
  const [connected, setConnected] = useState(false)
  const [buzzes, setBuzzes] = useState([])
  const [joinedList, setJoinedList] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleBuzzedList = (list) => setBuzzes(Array.isArray(list) ? list : [])
    const handleReset = () => setBuzzes([])
    const handleJoinedList = (list) => setJoinedList(Array.isArray(list) ? list : [])

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('buzzedList', handleBuzzedList)
    socket.on('reset', handleReset)
    socket.on('joinedList', handleJoinedList)

    setConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('buzzedList', handleBuzzedList)
      socket.off('reset', handleReset)
      socket.off('joinedList', handleJoinedList)
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

  return { connected, buzzes, joinedList, startRound, startJoin }
}
