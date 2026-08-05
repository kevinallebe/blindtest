export function extractPlaylistId(url) {
  const withoutQuery = url.trim().split('?')[0]
  const id = withoutQuery.split('/').filter(Boolean).pop()
  if (!id || !/^[a-zA-Z0-9]{22}$/.test(id)) {
    throw new Error('Lien de playlist Spotify invalide')
  }
  return id
}
