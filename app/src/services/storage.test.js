import { beforeEach, describe, expect, it } from 'vitest'
import {
  addStoredPlayedTrackUri,
  clearQueueState,
  clearStoredPlayedTrackUris,
  getStoredAnswerTimerDuration,
  getStoredCurrentIndex,
  getStoredPlayedTrackUris,
  getStoredQueue,
  getStoredRevealMode,
  getStoredTimerDuration,
  getStoredVolume,
  persistQueueState,
  setStoredAnswerTimerDuration,
  setStoredRevealMode,
  setStoredTimerDuration,
  setStoredVolume,
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

describe('played track URIs persistence', () => {
  it('defaults to an empty list', () => {
    expect(getStoredPlayedTrackUris()).toEqual([])
  })

  it('adds a URI and returns the updated list', () => {
    const next = addStoredPlayedTrackUri('spotify:track:a')
    expect(next).toEqual(['spotify:track:a'])
    expect(getStoredPlayedTrackUris()).toEqual(['spotify:track:a'])
  })

  it('does not duplicate a URI already recorded', () => {
    addStoredPlayedTrackUri('spotify:track:a')
    const next = addStoredPlayedTrackUri('spotify:track:a')
    expect(next).toEqual(['spotify:track:a'])
  })

  it('clears the stored list', () => {
    addStoredPlayedTrackUri('spotify:track:a')
    clearStoredPlayedTrackUris()
    expect(getStoredPlayedTrackUris()).toEqual([])
  })

  it('ignores corrupted JSON gracefully', () => {
    localStorage.setItem('cbt_played_track_uris', '{not json')
    expect(getStoredPlayedTrackUris()).toEqual([])
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

describe('volume persistence', () => {
  it('defaults to 70 when nothing is stored', () => {
    expect(getStoredVolume()).toBe(70)
  })

  it('round-trips a stored volume', () => {
    setStoredVolume(40)
    expect(getStoredVolume()).toBe(40)
  })

  it('falls back to the default for an out-of-range stored value', () => {
    localStorage.setItem('cbt_volume', '150')
    expect(getStoredVolume()).toBe(70)
  })
})

describe('answer timer duration persistence', () => {
  it('defaults to 5s when nothing is stored', () => {
    expect(getStoredAnswerTimerDuration()).toBe(5)
  })

  it('round-trips a stored duration', () => {
    setStoredAnswerTimerDuration(12)
    expect(getStoredAnswerTimerDuration()).toBe(12)
  })
})

describe('reveal mode persistence', () => {
  it('defaults to manual when nothing is stored', () => {
    expect(getStoredRevealMode()).toBe('manual')
  })

  it('round-trips a stored reveal mode', () => {
    setStoredRevealMode('auto')
    expect(getStoredRevealMode()).toBe('auto')
  })

  it('falls back to manual for an invalid stored value', () => {
    localStorage.setItem('cbt_reveal_mode', 'bogus')
    expect(getStoredRevealMode()).toBe('manual')
  })
})
