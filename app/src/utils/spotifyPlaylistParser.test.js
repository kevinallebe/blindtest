import { describe, expect, it } from 'vitest'
import { extractPlaylistId } from './spotifyPlaylistParser.js'

describe('extractPlaylistId', () => {
  it('extracts the id from a link with a query string', () => {
    const url = 'https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO?si=c9195ff857f24943'
    expect(extractPlaylistId(url)).toBe('5eSughP8saBliiTFVGnxEO')
  })

  it('extracts the id from a link without a query string', () => {
    const url = 'https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO'
    expect(extractPlaylistId(url)).toBe('5eSughP8saBliiTFVGnxEO')
  })

  it('trims surrounding whitespace before parsing', () => {
    const url = '  https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO  '
    expect(extractPlaylistId(url)).toBe('5eSughP8saBliiTFVGnxEO')
  })

  it('throws on a link with an invalid id', () => {
    expect(() => extractPlaylistId('https://open.spotify.com/playlist/too-short')).toThrow(
      'Lien de playlist Spotify invalide',
    )
  })

  it('throws on a completely invalid string', () => {
    expect(() => extractPlaylistId('not a url')).toThrow('Lien de playlist Spotify invalide')
  })

  it('throws on an empty string', () => {
    expect(() => extractPlaylistId('')).toThrow('Lien de playlist Spotify invalide')
  })
})
