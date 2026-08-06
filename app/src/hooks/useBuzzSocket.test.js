import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSocket } from '../services/socket.js'
import { useBuzzSocket } from './useBuzzSocket.js'

vi.mock('../services/socket.js')

function createFakeSocket() {
  const listeners = new Map()
  return {
    connected: false,
    on(event, handler) {
      listeners.set(event, handler)
    },
    off(event) {
      listeners.delete(event)
    },
    emit: vi.fn(),
    trigger(event, payload) {
      listeners.get(event)?.(payload)
    },
  }
}

describe('useBuzzSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts disconnected and reflects connect/disconnect events', () => {
    const fakeSocket = createFakeSocket()
    getSocket.mockReturnValue(fakeSocket)

    const { result } = renderHook(() => useBuzzSocket())
    expect(result.current.connected).toBe(false)

    act(() => fakeSocket.trigger('connect'))
    expect(result.current.connected).toBe(true)

    act(() => fakeSocket.trigger('disconnect'))
    expect(result.current.connected).toBe(false)
  })

  it('updates the ranked buzz list from buzzedList and clears it on reset', () => {
    const fakeSocket = createFakeSocket()
    getSocket.mockReturnValue(fakeSocket)

    const { result } = renderHook(() => useBuzzSocket())

    const list = [
      { name: 'Marie-Lou', reactionTime: 620 },
      { name: 'Jonas', reactionTime: 910 },
    ]
    act(() => fakeSocket.trigger('buzzedList', list))
    expect(result.current.buzzes).toEqual(list)

    act(() => fakeSocket.trigger('reset'))
    expect(result.current.buzzes).toEqual([])
  })

  it('startRound() emits the startRound event', () => {
    const fakeSocket = createFakeSocket()
    getSocket.mockReturnValue(fakeSocket)

    const { result } = renderHook(() => useBuzzSocket())
    result.current.startRound()

    expect(fakeSocket.emit).toHaveBeenCalledWith('startRound')
  })

  it('startJoin() emits the startJoin event', () => {
    const fakeSocket = createFakeSocket()
    getSocket.mockReturnValue(fakeSocket)

    const { result } = renderHook(() => useBuzzSocket())
    result.current.startJoin()

    expect(fakeSocket.emit).toHaveBeenCalledWith('startJoin')
  })

  it('updates joinedList from the joinedList event', () => {
    const fakeSocket = createFakeSocket()
    getSocket.mockReturnValue(fakeSocket)

    const { result } = renderHook(() => useBuzzSocket())
    expect(result.current.joinedList).toEqual([])

    const list = [{ name: 'Marie' }, { name: 'Tom' }]
    act(() => fakeSocket.trigger('joinedList', list))
    expect(result.current.joinedList).toEqual(list)
  })
})
