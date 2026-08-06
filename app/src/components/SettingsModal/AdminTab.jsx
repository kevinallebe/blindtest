import { useEffect, useRef, useState } from 'react'
import {
  addPlaylist,
  getPlaylists,
  getSpotifyClientId,
  removePlaylist,
  setSpotifyClientId,
  updatePlaylistName,
} from '../../services/adminConfig.js'
import { fetchPlaylistMeta } from '../../services/spotify.js'
import './AdminTab.css'

export default function AdminTab({ queue = {} }) {
  const {
    stats = null,
    status: queueStatus = 'idle',
    error: queueError = null,
    warning: queueWarning = null,
    loadQueue = () => {},
  } = queue
  const [clientId, setClientId] = useState(() => getSpotifyClientId())
  const [savedClientId, setSavedClientId] = useState(false)

  const [playlists, setPlaylists] = useState(() => getPlaylists())
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistError, setPlaylistError] = useState(null)
  const fetchedNameIds = useRef(new Set())

  // Résout le titre des playlists dont le nom n'a pas encore été chargé depuis Spotify.
  useEffect(() => {
    const missing = playlists.filter(
      (playlist) => playlist.name == null && !fetchedNameIds.current.has(playlist.id),
    )
    for (const playlist of missing) {
      fetchedNameIds.current.add(playlist.id)
      fetchPlaylistMeta(playlist.id)
        .then((meta) => setPlaylists(updatePlaylistName(playlist.id, meta.name)))
        .catch(() => {})
    }
  }, [playlists])

  function handleSaveClientId(event) {
    event.preventDefault()
    setSpotifyClientId(clientId)
    setSavedClientId(true)
    setTimeout(() => setSavedClientId(false), 2000)
  }

  function handleAddPlaylist(event) {
    event.preventDefault()
    try {
      setPlaylists(addPlaylist(playlistUrl))
      setPlaylistUrl('')
      setPlaylistError(null)
    } catch (err) {
      setPlaylistError(err.message)
    }
  }

  function handleRemovePlaylist(id) {
    setPlaylists(removePlaylist(id))
  }

  return (
    <div className="cbt-admin-tab">
      <section>
        <h3 className="cbt-admin-tab__label">Client ID Spotify</h3>
        <form className="cbt-admin-tab__row" onSubmit={handleSaveClientId}>
          <input
            className="cbt-admin-tab__input cbt-admin-tab__input--mono"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="Client ID Spotify"
            spellCheck={false}
          />
          <button type="submit" className="cbt-btn cbt-admin-tab__btn-save">
            {savedClientId ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </form>
        <p className="cbt-admin-tab__hint">Utilisé au prochain lancement de la connexion Spotify.</p>
      </section>

      <section>
        <h3 className="cbt-admin-tab__label">Playlists</h3>
        <form className="cbt-admin-tab__row" onSubmit={handleAddPlaylist}>
          <input
            className="cbt-admin-tab__input"
            value={playlistUrl}
            onChange={(event) => setPlaylistUrl(event.target.value)}
            placeholder="Coller un lien de playlist Spotify…"
          />
          <button type="submit" className="cbt-btn cbt-admin-tab__btn-add">
            Ajouter
          </button>
        </form>
        {playlistError && <p className="cbt-admin-tab__error">{playlistError}</p>}

        <ul className="cbt-admin-tab__playlists">
          {playlists.length === 0 && (
            <li className="cbt-admin-tab__playlists-empty">Aucune playlist pour l'instant.</li>
          )}
          {playlists.map((playlist) => (
            <li key={playlist.id} className="cbt-admin-tab__playlist">
              <div className="cbt-admin-tab__playlist-info">
                <div className="cbt-admin-tab__playlist-primary">{playlist.name ?? playlist.id}</div>
                <div className="cbt-admin-tab__playlist-url">{playlist.url}</div>
              </div>
              <button
                type="button"
                className="cbt-admin-tab__btn-remove"
                onClick={() => handleRemovePlaylist(playlist.id)}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="cbt-admin-tab__footer">
        <Stat value={playlists.length} label="Playlists" />
        {stats && <Stat value={stats.tracksLoaded} label="Morceaux chargés" />}
        {stats && <Stat value={stats.duplicatesRemoved} label="Doublons retirés" />}
        <button
          type="button"
          className="cbt-admin-tab__btn-reload"
          onClick={loadQueue}
          disabled={queueStatus === 'loading'}
        >
          {queueStatus === 'loading' ? 'Chargement…' : 'Recharger les playlists'}
        </button>
      </div>
      {queueStatus === 'error' && queueError && <p className="cbt-admin-tab__error">{queueError}</p>}
      {queueWarning && <p className="cbt-admin-tab__warning">{queueWarning}</p>}
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="cbt-admin-tab__stat">
      <div className="cbt-admin-tab__stat-value">{value}</div>
      <div className="cbt-admin-tab__stat-label">{label}</div>
    </div>
  )
}
