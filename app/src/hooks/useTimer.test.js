import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clampAnswerTimerDuration, clampTimerDuration, useTimer } from './useTimer.js'

describe('clampTimerDuration', () => {
  it('clamps values below 3 up to 3', () => {
    expect(clampTimerDuration(0)).toBe(3)
    expect(clampTimerDuration(-5)).toBe(3)
  })

  it('clamps values above 60 down to 60', () => {
    expect(clampTimerDuration(120)).toBe(60)
  })

  it('keeps in-range values untouched', () => {
    expect(clampTimerDuration(20)).toBe(20)
  })
})

describe('clampAnswerTimerDuration', () => {
  it('clamps values below 3 up to 3', () => {
    expect(clampAnswerTimerDuration(0)).toBe(3)
  })

  it('clamps values above 30 down to 30', () => {
    expect(clampAnswerTimerDuration(120)).toBe(30)
  })

  it('keeps in-range values untouched', () => {
    expect(clampAnswerTimerDuration(5)).toBe(5)
  })
})

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with the clamped duration and is not running', () => {
    const { result } = renderHook(() => useTimer(200))
    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.duration).toBe(60)
    expect(result.current.isRunning).toBe(false)
  })

  it('counts down one second at a time once started', () => {
    const { result } = renderHook(() => useTimer(5))

    act(() => result.current.start())
    expect(result.current.isRunning).toBe(true)
    expect(result.current.secondsLeft).toBe(5)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(4)

    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.secondsLeft).toBe(2)
  })

  it('calls onComplete and stops exactly when it reaches 0', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useTimer(3))

    act(() => result.current.start(onComplete))
    act(() => vi.advanceTimersByTime(3000))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.isRunning).toBe(false)

    act(() => vi.advanceTimersByTime(5000))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('stop() halts the countdown early without calling onComplete', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useTimer(10))

    act(() => result.current.start(onComplete))
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.stop())

    expect(result.current.isRunning).toBe(false)
    const secondsAfterStop = result.current.secondsLeft

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.secondsLeft).toBe(secondsAfterStop)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('resume() continues from where stop() left off, without resetting', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useTimer(5))

    act(() => result.current.start(onComplete))
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.stop())
    expect(result.current.secondsLeft).toBe(3)

    act(() => result.current.resume())
    expect(result.current.isRunning).toBe(true)
    expect(result.current.secondsLeft).toBe(3)

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.secondsLeft).toBe(0)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('reports progress from 0 to 1 as the countdown proceeds', () => {
    const { result } = renderHook(() => useTimer(4))

    act(() => result.current.start())
    expect(result.current.progress).toBe(0)

    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.progress).toBe(0.5)

    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.progress).toBe(1)
  })
})
