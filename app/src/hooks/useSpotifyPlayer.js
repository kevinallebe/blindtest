import { useCallback, useEffect, useRef, useState } from 'react'
import { clearToken, exchangeCodeForToken, getValidAccessToken, redirectToSpotifyAuthorize } from '../spotifyToken.js'
import { fetchMe } from '../services/spotify.js'
import { getStoredVolume } from '../services/storage.js'

const ERROR_MESSAGES = {
  missing_client_id:
    "Aucun Client ID Spotify n'est configuré. Renseigne-le dans les Réglages (Admin) ou dans le fichier .env.",
  access_denied: "Autorisation refusée : accepte l'accès à ton compte Spotify pour lancer le blindtest.",
  not_premium: "Ce compte Spotify n'est pas Premium — le lecteur nécessite un compte Premium pour fonctionner.",
  invalid_token: 'Le token Spotify est invalide ou a expiré. Reconnecte-toi.',
  sdk_load_failed: 'Impossible de charger le lecteur Spotify. Vérifie ta connexion internet.',
  initialization_error: "Le lecteur Spotify n'a pas pu s'initialiser dans ce navigateur.",
  unknown: 'Une erreur inattendue est survenue avec Spotify.',
}

function loadSpotifySdk() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve(window.Spotify)
      return
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify)
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('sdk_load_failed'))
    document.body.appendChild(script)
  })
}

export function useSpotifyPlayer() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [deviceId, setDeviceId] = useState(null)
  const playerRef = useRef(null)

  const fail = useCallback((code) => {
    setStatus('error')
    setError({ code, message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown })
  }, [])

  const initPlayer = useCallback(async () => {
    try {
      const Spotify = await loadSpotifySdk()
      const player = new Spotify.Player({
        name: 'Blindtest',
        volume: getStoredVolume() / 100,
        getOAuthToken: async (cb) => {
          const token = await getValidAccessToken()
          if (!token) {
            fail('invalid_token')
            return
          }
          cb(token)
        },
      })

      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setError(null)
        setStatus('ready')
      })
      player.addListener('not_ready', () => setStatus('not_ready'))
      player.addListener('initialization_error', () => fail('initialization_error'))
      player.addListener('authentication_error', () => fail('invalid_token'))
      player.addListener('account_error', () => fail('not_premium'))

      playerRef.current = player
      await player.connect()
    } catch {
      fail('sdk_load_failed')
    }
  }, [fail])

  const connect = useCallback(() => {
    setStatus('connecting')
    setError(null)
    redirectToSpotifyAuthorize().catch((err) => fail(err.code ?? 'unknown'))
  }, [fail])

  // À appeler quand un appel Spotify échoue avec un token irrécupérable (401 persistant) en
  // dehors du flow d'auth normal — ramène l'animateur à l'écran "Se connecter" avec un message clair.
  const reportAuthFailure = useCallback(() => fail('invalid_token'), [fail])

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), [])
  const pause = useCallback(() => playerRef.current?.pause(), [])
  const setVolume = useCallback((volume) => playerRef.current?.setVolume(volume), [])

  // À appeler de façon synchrone dans un gestionnaire de clic, avant tout `await`. Sans ça, après
  // un chargement/refresh de page, le navigateur bloque l'audio du SDK (Spotify Connect indique
  // "en lecture" côté serveur, mais rien ne sort tant que l'élément n'a pas été activé par un
  // vrai geste utilisateur synchrone).
  const activateElement = useCallback(() => playerRef.current?.activateElement?.(), [])

  // Retourne une fonction de désinscription, à appeler une fois la confirmation reçue (US-7.2).
  const onPlaybackStateChanged = useCallback((callback) => {
    const player = playerRef.current
    if (!player) return () => {}
    player.addListener('player_state_changed', callback)
    return () => player.removeListener('player_state_changed', callback)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Détection indépendante du chemin : la redirect URI enregistrée côté Spotify peut pointer
    // vers n'importe quel chemin (ex: racine ou /callback), seuls les query params comptent ici.
    const isCallback = params.has('code') || params.has('error')

    if (isCallback && params.get('error')) {
      window.history.replaceState({}, '', '/')
      fail(params.get('error') === 'access_denied' ? 'access_denied' : 'unknown')
      return
    }

    if (isCallback && params.get('code')) {
      setStatus('connecting')
      exchangeCodeForToken(params.get('code'))
        .then(async () => {
          window.history.replaceState({}, '', '/')
          const me = await fetchMe()
          if (me.product !== 'premium') {
            clearToken()
            fail('not_premium')
            return
          }
          await initPlayer()
        })
        .catch((err) => {
          window.history.replaceState({}, '', '/')
          fail(err.code ?? 'invalid_token')
        })
      return
    }

    // Pas de callback en cours : si un token existe déjà (rechargement de page), on retente une reconnexion silencieuse
    getValidAccessToken()
      .then((token) => {
        if (token) return initPlayer()
      })
      .catch(() => {
        // token/refresh invalide -> reste 'idle', l'animateur reclique "Se connecter"
      })

    return () => {
      playerRef.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    error,
    deviceId,
    connect,
    reportAuthFailure,
    togglePlay,
    pause,
    setVolume,
    activateElement,
    onPlaybackStateChanged,
  }
}
