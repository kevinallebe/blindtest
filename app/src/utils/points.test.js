import { describe, expect, it } from 'vitest'
import { formatPoints } from './points.js'

describe('formatPoints', () => {
  it('returns null for 0', () => {
    expect(formatPoints(0)).toBeNull()
  })

  it('formats halves with a comma and singular "pt"', () => {
    expect(formatPoints(0.5)).toBe('0,5 pt')
  })

  it('keeps "pt" singular for exactly 1', () => {
    expect(formatPoints(1)).toBe('1 pt')
  })

  it('uses plural "pts" above 1', () => {
    expect(formatPoints(1.5)).toBe('1,5 pts')
    expect(formatPoints(6)).toBe('6 pts')
  })
})
