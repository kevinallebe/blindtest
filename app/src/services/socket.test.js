import { beforeEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ id: 'fake-socket' })) }))

describe('getSocket', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('connects once to VITE_SOCKET_URL and reuses the same instance', async () => {
    const { getSocket } = await import('./socket.js')

    const first = getSocket()
    const second = getSocket()

    expect(first).toBe(second)
    expect(io).toHaveBeenCalledTimes(1)
    expect(io).toHaveBeenCalledWith(import.meta.env.VITE_SOCKET_URL)
  })
})
