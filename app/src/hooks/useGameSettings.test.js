import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredRevealMode, getStoredTimerDuration, getStoredVolume } from '../services/storage.js'
import { useGameSettings } from './useGameSettings.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useGameSettings', () => {
  it('initializes from whatever is already persisted', () => {
    const { result } = renderHook(() => useGameSettings())
    expect(result.current.timerDuration).toBe(20)
    expect(result.current.volume).toBe(70)
    expect(result.current.revealMode).toBe('manual')
  })

  it('setTimerDuration clamps to 3-60s and persists', () => {
    const { result } = renderHook(() => useGameSettings())

    act(() => result.current.setTimerDuration(120))
    expect(result.current.timerDuration).toBe(60)
    expect(getStoredTimerDuration()).toBe(60)

    act(() => result.current.setTimerDuration(0))
    expect(result.current.timerDuration).toBe(3)
  })

  it('setVolume clamps to 0-100 and persists', () => {
    const { result } = renderHook(() => useGameSettings())

    act(() => result.current.setVolume(150))
    expect(result.current.volume).toBe(100)
    expect(getStoredVolume()).toBe(100)

    act(() => result.current.setVolume(-10))
    expect(result.current.volume).toBe(0)
  })

  it('setRevealMode normalizes and persists', () => {
    const { result } = renderHook(() => useGameSettings())

    act(() => result.current.setRevealMode('auto'))
    expect(result.current.revealMode).toBe('auto')
    expect(getStoredRevealMode()).toBe('auto')

    act(() => result.current.setRevealMode('anything-else'))
    expect(result.current.revealMode).toBe('manual')
  })
})
