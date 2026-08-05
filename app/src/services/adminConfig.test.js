import { beforeEach, describe, expect, it } from 'vitest'
import { addPlaylist, getPlaylists, removePlaylist } from './adminConfig.js'

const VALID_URL_A = 'https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO?si=abc'
const VALID_URL_B = 'https://open.spotify.com/playlist/7pKfx3Bq9m1TzYh2LwNcXe'

beforeEach(() => {
  localStorage.clear()
})

describe('getPlaylists', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getPlaylists()).toEqual([])
  })
})

describe('addPlaylist', () => {
  it('adds a playlist parsed from a Spotify link', () => {
    const result = addPlaylist(VALID_URL_A)
    expect(result).toEqual([{ id: '5eSughP8saBliiTFVGnxEO', url: VALID_URL_A, name: null }])
    expect(getPlaylists()).toEqual(result)
  })

  it('accumulates multiple distinct playlists', () => {
    addPlaylist(VALID_URL_A)
    const result = addPlaylist(VALID_URL_B)
    expect(result.map((p) => p.id)).toEqual(['5eSughP8saBliiTFVGnxEO', '7pKfx3Bq9m1TzYh2LwNcXe'])
  })

  it('rejects a duplicate playlist id', () => {
    addPlaylist(VALID_URL_A)
    expect(() => addPlaylist(VALID_URL_A)).toThrow('Cette playlist est déjà dans la liste.')
    expect(getPlaylists()).toHaveLength(1)
  })

  it('propagates the parser error on an invalid link', () => {
    expect(() => addPlaylist('not a url')).toThrow('Lien de playlist Spotify invalide')
    expect(getPlaylists()).toEqual([])
  })
})

describe('removePlaylist', () => {
  it('removes a playlist by id', () => {
    addPlaylist(VALID_URL_A)
    addPlaylist(VALID_URL_B)
    const result = removePlaylist('5eSughP8saBliiTFVGnxEO')
    expect(result.map((p) => p.id)).toEqual(['7pKfx3Bq9m1TzYh2LwNcXe'])
  })

  it('is a no-op when the id is not present', () => {
    addPlaylist(VALID_URL_A)
    const result = removePlaylist('doesNotExist12345678')
    expect(result).toHaveLength(1)
  })
})
