import { afterEach, describe, expect, it, vi } from 'vitest'
import { fisherYatesShuffle } from './shuffle.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fisherYatesShuffle', () => {
  it('produces the expected permutation for a given random sequence', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.5).mockReturnValueOnce(0.1)

    expect(fisherYatesShuffle([1, 2, 3, 4])).toEqual([3, 1, 2, 4])
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5]
    fisherYatesShuffle(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('returns an array with the same elements, just reordered', () => {
    const input = Array.from({ length: 20 }, (_, i) => i)
    const shuffled = fisherYatesShuffle(input)
    expect(shuffled).toHaveLength(input.length)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input)
  })

  it('handles empty and single-element arrays', () => {
    expect(fisherYatesShuffle([])).toEqual([])
    expect(fisherYatesShuffle(['only'])).toEqual(['only'])
  })
})
