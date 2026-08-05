import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearQueueState,
  getStoredCurrentIndex,
  getStoredQueue,
  getStoredTimerDuration,
  persistQueueState,
  setStoredTimerDuration,
} from './storage.js'

beforeEach(() => {
  localStorage.clear()
})

describe('queue persistence', () => {
  it('returns null/0 when nothing is stored', () => {
    expect(getStoredQueue()).toBeNull()
    expect(getStoredCurrentIndex()).toBe(0)
  })

  it('round-trips a persisted queue and index', () => {
    const queue = [{ uri: 'spotify:track:a' }, { uri: 'spotify:track:b' }]
    persistQueueState(queue, 1)
    expect(getStoredQueue()).toEqual(queue)
    expect(getStoredCurrentIndex()).toBe(1)
  })

  it('clears stored state', () => {
    persistQueueState([{ uri: 'spotify:track:a' }], 1)
    clearQueueState()
    expect(getStoredQueue()).toBeNull()
    expect(getStoredCurrentIndex()).toBe(0)
  })

  it('ignores corrupted JSON gracefully', () => {
    localStorage.setItem('cbt_played_queue', '{not json')
    expect(getStoredQueue()).toBeNull()
  })
})

describe('timer duration persistence', () => {
  it('defaults to 20s when nothing is stored', () => {
    expect(getStoredTimerDuration()).toBe(20)
  })

  it('round-trips a stored duration', () => {
    setStoredTimerDuration(35)
    expect(getStoredTimerDuration()).toBe(35)
  })
})
