# Caribbean BlindTest — Spec de développement

> Fusion de `README_V1.md` (spec initiale) et des évolutions demandées (interface d'admin, invitation par QR Code), corrigée après lecture du code réel du serveur Buzzer (`/Users/kevinallebe/Documents/Buzzer`). Ce document remplace `README_V1.md` comme référence unique du projet.

---

## 1. Présentation

Caribbean BlindTest est une application React permettant à un animateur de piloter un blindtest musical à partir de Spotify Premium.

Les joueurs utilisent une application Buzzer déjà existante qui communique avec un serveur Express + Socket.IO.

---

## 2. Objectifs

- Lecture de morceaux via Spotify Web Playback SDK
- Tirage aléatoire sans répétition
- Timer configurable
- Révélation manuelle de la réponse
- Réception des buzz en temps réel
- Sauvegarde de la progression après rechargement de la page
- Invitation des joueurs par QR Code (rejoindre l'app Buzzer sans taper d'URL)
- Configuration du Client ID Spotify et des playlists depuis une interface d'admin, sans toucher au code

---

## 3. Architecture

```text
┌───────────────────────────────┐
│         PC animateur           │
│                                │
│  Spotify OAuth PKCE            │
│         │                      │
│  Spotify Web Playback SDK      │
│         │                      │
│  React + Vite (app animateur)  │──── projeté sur TV (plein écran)
│         │            │         │
│  Socket.IO Client     QR Code ─┼───► scanné par les joueurs
└─────────┬──────────────────────┘
          │  wss://buzzer.servebeer.com
          ▼
┌───────────────────────────────┐
│  Serveur Express + Socket.IO   │  (existant, inchangé)
│  https://buzzer.servebeer.com  │
└─────────┬──────────────────────┘
          │
          ▼
    Apps Buzzer des joueurs (téléphones)
```

- L'app React tourne **uniquement sur le PC de l'animateur** (`vite dev` ou build servi en local) — pas besoin de la déployer sur `buzzer.servebeer.com`.
- Les joueurs n'ont accès qu'à l'app Buzzer existante, atteinte soit via son URL directe, soit en scannant le QR code affiché par l'animateur — aucun contrôle sur le blindtest.
- La fenêtre de l'app animateur est étendue/dupliquée sur la TV ; c'est le PC qui fait tourner l'animation, pas un dispositif séparé.

---

## 4. Stack technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework UI | **React 18 + Vite** | HMR rapide, parfait pour une app locale lancée depuis le PC. |
| Style | **Bootstrap 5 + Bootstrap Icons** | Rapide à mettre en place pour une interface de contrôle, pas besoin d'un design system custom pour un usage perso. |
| État applicatif | **React Context + hooks custom** (`useQueue`, `useTimer`, `useBuzzSocket`, `useSpotifyPlayer`) | L'app est mono-utilisateur (l'animateur), pas besoin de Redux/Zustand — complexité inutile. |
| Temps réel | **socket.io-client v4** (aligné avec `socket.io ^4.7.2` côté serveur) | Le serveur Buzzer tourne déjà en Socket.IO v4. |
| Spotify | **Web Playback SDK** + **Web API** (fetch) + **PKCE fait main** via `crypto.subtle` | Pas de client secret nécessaire (PKCE), pas de dépendance externe superflue. |
| QR Code | **qrcode.react** (`<QRCodeSVG>`) | Génération 100% côté client, aucun appel à un service tiers — fiabilité garantie pendant la soirée. |
| Persistance | **localStorage**, via un service unique `storage.js` avec schéma versionné | App locale, un seul poste, pas besoin de backend de persistance. |
| Routing | Aucun (une seule page + modales) | Pas de multi-page, `react-router` serait superflu. |
| Tests | **Vitest** + **React Testing Library** | Pour sécuriser la logique sensible : shuffle, dédup, parsing d'ID playlist. |
| Lint/format | ESLint + Prettier | Standard. |
| Serveur Buzzer | **Express + Socket.IO** (existant, inchangé) | Déjà en prod sur `buzzer.servebeer.com`, sert aussi l'app Buzzer statique. |

---

## 5. Arborescence

```text
src/
 ├── App.jsx
 ├── spotifyToken.js
 ├── services/
 │    ├── spotify.js
 │    ├── socket.js
 │    ├── storage.js
 │    └── adminConfig.js            # get/set Client ID + playlists en localStorage
 ├── hooks/
 │    ├── useSpotifyPlayer.js
 │    ├── useBuzzSocket.js
 │    ├── useTimer.js
 │    └── useQueue.js
 ├── utils/
 │    └── spotifyPlaylistParser.js  # extraction d'ID depuis un lien Spotify
 ├── components/
 │    ├── Header.jsx
 │    ├── PlayerControls.jsx
 │    ├── Timer.jsx
 │    ├── BuzzList.jsx
 │    ├── TrackInfo.jsx
 │    ├── QRCodeInvite.jsx          # overlay QR code d'invitation
 │    └── SettingsModal/
 │         ├── SettingsModal.jsx
 │         ├── GameSettingsTab.jsx  # durée, volume, mode révélation
 │         └── AdminTab.jsx         # Client ID + gestion playlists
```

---

## 6. User Stories

### Epic 1 — Authentification Spotify

#### US-1.1 Connexion

**En tant qu'animateur**, je veux me connecter avec Spotify Premium afin de lancer les morceaux.

Critères :
- OAuth PKCE
- récupération du token
- initialisation du SDK
- affichage "Connecté"

#### US-1.2 Gestion des erreurs

Afficher un message explicite si :
- compte non Premium
- token invalide
- autorisation refusée

---

### Epic 2 — Invitation des joueurs (QR Code)

#### US-2.1 Afficher un QR code d'invitation

**En tant qu'animateur**, je veux afficher un QR code sur l'écran (projeté sur la TV) qui redirige directement vers l'app Buzzer, afin que les joueurs puissent rejoindre la partie en scannant depuis leur téléphone, sans taper l'URL manuellement.

Critères :
- Bouton "Inviter les joueurs" dans le Header, accessible à tout moment y compris avant la connexion Spotify
- Le QR code encode l'URL de l'app Buzzer, servie par le même serveur que Socket.IO (`https://buzzer.servebeer.com`, racine statique de `server.js`)
- Affichage en grand format, pensé pour être scanné à distance depuis la TV (overlay plein écran)
- Bouton pour fermer l'overlay et revenir à l'écran de contrôle
- Génération entièrement côté client (`qrcode.react`), aucune dépendance à un service externe

---

### Epic 3 — Administration / Configuration

#### US-3.1 Modifier le Client ID Spotify

**En tant qu'animateur**, je veux pouvoir mettre à jour le Client ID Spotify utilisé par l'app depuis une interface, sans toucher au code, au cas où je ne joue pas pendant plusieurs semaines et que la config change.

Critères :
- Champ "Client ID Spotify" pré-rempli avec la valeur active
- Sauvegarde immédiate en localStorage (`cbt_spotify_client_id`)
- Utilisé au prochain clic sur "Se connecter à Spotify" (le flow OAuth PKCE relit la valeur stockée)
- Validation basique du format (chaîne alphanumérique, ~32 caractères) avec message d'erreur si vide/invalide
- Une valeur par défaut (`import.meta.env.VITE_SPOTIFY_CLIENT_ID`) sert de fallback si l'admin n'a jamais rien saisi

#### US-3.2 Gérer les playlists via lien Spotify

**En tant qu'animateur**, je veux coller un lien de playlist Spotify (ex: `https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO?si=c9195ff857f24943`) et que l'app en extraie automatiquement l'ID pour l'ajouter à la liste utilisée par le blindtest.

Critères :
- Champ "Coller un lien de playlist" + bouton "Ajouter"
- Parsing : on prend la partie avant le `?`, puis le dernier segment après `/` → id extrait (`5eSughP8saBliiTFVGnxEO` dans l'exemple)
- Validation : l'ID doit correspondre au format attendu (22 caractères alphanumériques) ; rejet avec message clair si le lien est invalide ou si l'ID est déjà dans la liste
- Liste des playlists actives affichée (ID + lien d'origine), avec bouton pour retirer une entrée
- Persisté en localStorage (`settings.playlists`, tableau de `{ id, url }`)
- Un bouton "Recharger les playlists" redéclenche l'Epic 4 (fusion + dédoublonnage + stats) sans recharger la page

#### US-3.3 Accès restreint à l'animateur

L'admin est une section de l'app animateur, non exposée aux joueurs (qui n'ont que l'app Buzzer, séparée). Pas d'authentification complexe — un seul poste, sous contrôle physique de l'animateur. Ces deux blocs (Client ID + playlists) rejoignent `SettingsModal.jsx` sous un onglet dédié "Admin", plutôt qu'une modale séparée redondante.

---

### Epic 4 — Chargement des playlists

#### US-4.1 Charger plusieurs playlists

Les IDs proviennent de la configuration Admin (Epic 3).

Le système fusionne toutes les pistes.

#### US-4.2 Déduplication

Deux URI identiques ne doivent apparaître qu'une fois.

#### US-4.3 Statistiques

Afficher :
- nombre de playlists
- morceaux chargés
- doublons supprimés

---

### Epic 5 — Gestion des morceaux

#### US-5.1 Création d'une file

Au chargement :

1. fusion
2. suppression des doublons
3. Fisher-Yates Shuffle
4. création d'une queue

#### US-5.2 Persistance

Sauvegarder dans LocalStorage :

- queue
- currentIndex

#### US-5.3 Nouvelle manche

Le bouton "Nouvelle musique" lit le morceau courant puis incrémente currentIndex.

#### US-5.4 Fin

Afficher "Tous les morceaux ont été joués."

---

### Epic 6 — Lecture

#### US-6.1 Lecture

Lecture via Spotify SDK.

Le timer ne démarre que si le PUT retourne 204.

#### US-6.2 Pause

Pause automatique à la fin du timer.

#### US-6.3 Reprise

Bouton Play/Pause.

#### US-6.4 Préchargement du morceau suivant — abandonné

Tenté en Phase 6 puis retiré : la technique (lecture silencieuse volume 0 → pause → restauration du volume) s'est montrée trop fragile face aux comportements réels du SDK Spotify (fuite audio, confirmations de pause qui se font confondre entre deux morceaux, course avec le clic suivant sur "Nouvelle musique") — plusieurs correctifs successifs n'ont pas suffi à la fiabiliser, et le gain (un léger délai en moins au clic) ne justifiait pas la complexité ni le risque de spoiler une réponse par fuite audio. `Nouvelle musique` déclenche un `PUT /me/player/play` classique à chaque fois, y compris juste après une révélation.

---

### Epic 7 — Timer

#### US-7.1

Durée configurable (3-60 secondes).

#### US-7.2

Démarrage 1 seconde après le lancement réel.

#### US-7.3

Afficher :
- secondes
- barre de progression

---

### Epic 8 — Révélation

#### US-8.1

Bouton Réponse affichant :
- titre
- artiste(s)
- pochette

Le bouton Pause/Continuer reste disponible après la révélation (lecture en pause par défaut) : les participants ont parfois envie de continuer à écouter le morceau une fois la réponse annoncée.

(Le préchargement du morceau suivant à ce clic a été tenté puis abandonné — voir US-6.4.)

---

### Epic 9 — Buzz

#### US-9.1

Connexion Socket.IO à `buzzer.servebeer.com`.

#### US-9.2

Réception de `buzzedList` (classement en temps réel, max 5 joueurs — limite actuelle du serveur).

#### US-9.3

Affichage classé :
- 🥇
- 🥈
- 🥉
- puis 4e, 5e...

#### US-9.4

Émission de `startRound` au début d'une nouvelle manche (déclenche le `reset` diffusé à tous les joueurs).

---

### Epic 10 — Paramètres

Configurer :
- durée
- volume
- mode révélation

(La gestion des playlists et du Client ID est traitée dans l'Epic 3 — Administration.)

Persistés dans LocalStorage.

---

### Epic 11 — Persistance

Clés :

- playedQueue
- currentIndex
- timerDuration
- settings
- adminConfig (Client ID, playlists)

---

### Epic 12 — Gestion des erreurs

Cas :
- 401
- 403
- absence de device
- playlists vides
- perte Socket.IO
- erreur réseau

---

## 7. Évènements Socket.IO

Alignés sur le code réel de `server.js` (le serveur gère déjà un classement multi-joueurs, pas seulement le premier buzzeur).

| Sens | Événement | Payload | Usage côté app animateur |
|---|---|---|---|
| Entrant | `buzzedList` | `[{ name, reactionTime }]`, triés par ordre d'arrivée, **max 5** (limite hardcodée serveur) | Alimente `BuzzList.jsx` |
| Entrant | `reset` | — | Remet l'UI de buzz à zéro après un `startRound` |
| Entrant | `tooLate` | `name` | Informe qu'un joueur a re-buzzé après son tour |
| Sortant | `startRound` | — | Émis au lancement de chaque nouvelle manche (US-9.4 / US-5.3) |

CORS est déjà configuré côté serveur (`cors: { origin: "*" }`) : aucune modification du serveur Buzzer n'est nécessaire pour cette app.

---

## 8. Spotify

Endpoints :
- `GET /playlists/{id}/tracks`
- `PUT /me/player/play`
- SDK `Player.pause()`
- SDK `Player.togglePlay()`

---

## 9. Détails techniques clés

**Parsing d'un lien de playlist Spotify :**
```js
function extractPlaylistId(url) {
  const withoutQuery = url.split("?")[0];
  const id = withoutQuery.split("/").filter(Boolean).pop();
  if (!/^[a-zA-Z0-9]{22}$/.test(id)) {
    throw new Error("Lien de playlist Spotify invalide");
  }
  return id;
}
```
Avec `https://open.spotify.com/playlist/5eSughP8saBliiTFVGnxEO?si=c9195ff857f24943` → `5eSughP8saBliiTFVGnxEO`.

**Stockage du Client ID :** clé localStorage `cbt_spotify_client_id`, relue à chaque déclenchement du flow PKCE (pas besoin de redémarrer l'app après un changement).

**QR code d'invitation :**
```jsx
import { QRCodeSVG } from "qrcode.react";

<QRCodeSVG value={import.meta.env.VITE_SOCKET_URL} size={480} />
```
Le serveur Buzzer sert son `index.html` à la racine du même domaine que Socket.IO (`app.use(express.static("public"))`), donc l'URL à encoder est directement `VITE_SOCKET_URL` — pas besoin d'une variable d'environnement séparée.

**Préchargement du morceau suivant — abandonné (US-6.4) :** tenté (volume 0 → play → pause → restauration du volume) puis retiré après plusieurs bugs réels en conditions de jeu (fuite audio pendant la révélation, confirmations de pause confondues entre deux morceaux, course avec le clic suivant sur "Nouvelle musique"). `Nouvelle musique` fait un `PUT /me/player/play` classique à chaque fois.

---

## 10. Règles métier

- Un morceau ne peut être joué qu'une seule fois par session.
- La session reprend après refresh.
- Le timer ne démarre jamais si la lecture échoue.
- Les buzz sont réinitialisés à chaque manche.
- Dès qu'un joueur buzze, la lecture se met en pause automatiquement (une seule fois par manche, au premier buzz) pour que tout le monde entende la réponse annoncée.
- Les joueurs ne voient jamais les réponses.
- Le Client ID Spotify et la liste des playlists persistent indépendamment de la session de jeu (ils ne sont pas réinitialisés à chaque nouvelle partie).

---

## 11. Plan de développement par phases

Chaque phase est livrable et testable indépendamment.

### Phase 0 — Setup projet
- [ ] `npm create vite@latest` (template react)
- [ ] Installer `bootstrap`, `bootstrap-icons`, `socket.io-client`, `qrcode.react`
- [ ] `.env` : `VITE_SOCKET_URL=https://buzzer.servebeer.com`, `VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback`, `VITE_SPOTIFY_CLIENT_ID` (valeur par défaut)
- [ ] Créer/vérifier l'app dans le Spotify Developer Dashboard, ajouter `http://localhost:5173/callback` comme Redirect URI
- [ ] Scaffolder l'arborescence ci-dessus

### Phase 1 — Authentification Spotify (Epic 1)
- [ ] PKCE : génération `code_verifier` / `code_challenge` (Web Crypto API)
- [ ] Redirection `authorize` avec les scopes : `streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state`
- [ ] Callback : échange du code contre `access_token` / `refresh_token`, stockage dans `spotifyToken.js`
- [ ] `useSpotifyPlayer` : chargement du script SDK, init du player, écoute `ready` / `not_ready` / `initialization_error` / `authentication_error`
- [ ] Gestion des erreurs (US-1.2) : compte non Premium (`GET /me` → champ `product`), token invalide, autorisation refusée

### Phase 2 — Invitation joueurs (Epic 2)
- [ ] Installer `qrcode.react`
- [ ] `QRCodeInvite.jsx` : overlay plein écran, encode l'URL de l'app Buzzer (`VITE_SOCKET_URL`)
- [ ] Bouton "Inviter les joueurs" dans `Header.jsx` + bouton de fermeture de l'overlay
- [ ] Vérifier la lisibilité/scannabilité du QR code projeté depuis la distance canapé-TV

### Phase 3 — Admin (Epic 3)
- [ ] `adminConfig.js` : get/set Client ID, get/set playlists
- [ ] `spotifyPlaylistParser.js` + tests unitaires (cas valide, lien sans `?`, lien invalide, doublon)
- [ ] `AdminTab.jsx` : formulaire Client ID + gestionnaire de playlists (ajout/suppression/rechargement)

### Phase 4 — Playlists & Queue (Epic 4 + 5)
- [ ] `spotify.js` : fetch paginé `GET /playlists/{id}/tracks` pour chaque ID configuré
- [ ] Fusion des pistes + dédoublonnage par URI
- [ ] Stats (playlists, morceaux chargés, doublons supprimés) affichées dans l'admin
- [ ] `useQueue` : Fisher-Yates shuffle, `currentIndex`, persistance
- [ ] Bouton "Nouvelle musique" (US-5.3), état "Tous les morceaux ont été joués" (US-5.4)

### Phase 5 — Lecture & Timer (Epic 6 + 7)
- [ ] `PlayerControls.jsx` : `PUT /me/player/play` avec `device_id` + `uri`, timer démarré uniquement si réponse `204`
- [ ] `useTimer` : durée configurable 3–60s, démarrage 1s après confirmation de lecture (écoute `player_state_changed`)
- [ ] Pause auto en fin de timer, bouton Play/Pause
- [ ] `Timer.jsx` : secondes + barre de progression
- [ ] ~~`preloadNextTrack()` (US-6.4)~~ — tenté puis abandonné, voir US-6.4

### Phase 6 — Révélation (Epic 8)
- [ ] `TrackInfo.jsx` : titre, artiste(s), pochette au clic sur "Réponse", masqué par défaut
- [ ] "Nouvelle musique" relance un `PUT /play` classique après une révélation (pas de préchargement)

### Phase 7 — Buzz temps réel (Epic 9)
- [ ] `socket.js` : connexion à `VITE_SOCKET_URL`, écoute `buzzedList` / `reset` / `tooLate`
- [ ] `useBuzzSocket` : état du classement (déjà trié par le serveur, max 5)
- [ ] Émission de `startRound` au lancement de chaque manche
- [ ] `BuzzList.jsx` : 🥇🥈🥉 puis 4e, 5e
- [ ] Indicateur de statut de connexion socket (Epic 12)

### Phase 8 — Paramètres & persistance globale (Epic 10 + 11)
- [ ] `GameSettingsTab.jsx` : durée, volume, mode révélation
- [ ] `storage.js` : schéma unique versionné, clés `playedQueue`, `currentIndex`, `timerDuration`, `settings`, `adminConfig`

### Phase 9 — Gestion des erreurs (Epic 12)
- [ ] Intercepteur API Spotify : `401` → refresh silencieux du token, sinon message "Reconnecte-toi à Spotify" ; `403` → message compte/permissions ; absence de device → message + retry
- [ ] Playlists vides → message explicite dans les stats admin
- [ ] Perte Socket.IO → indicateur + reconnexion auto (gérée nativement par `socket.io-client`)
- [ ] Erreur réseau générique → toast

### Phase 10 — Responsive & polish
- [ ] Priorité lisibilité TV (grande police, contrastes forts) — le contexte principal est la projection salon
- [ ] Vérifier aussi un usage replié sur le PC seul (fallback)

### Phase 11 — Tests & recette
- [ ] Tests unitaires : shuffle, dédup, parsing playlist, migrations de schéma localStorage
- [ ] Recette manuelle bout-en-bout : QR code → connexion Spotify → ajout playlists via admin → lancement manche → buzz réel depuis l'app Buzzer (plusieurs joueurs) → révélation → manche suivante → fin de queue → refresh en cours de partie

### Phase 12 — Mise en place pour la soirée
- [ ] Lancer l'app (`npm run dev` ou `npm run build && npm run preview`)
- [ ] Étendre la fenêtre sur la TV, plein écran (F11)
- [ ] Checklist pré-soirée : connexion Spotify active, playlists à jour, `buzzer.servebeer.com` joignable, TV branchée et détectée

---

## 12. Definition of Done

- Authentification Spotify fonctionnelle, avec reconnexion possible sans redéploiement
- Client ID Spotify modifiable depuis l'admin
- Playlists gérables par simple copier-coller de lien
- QR code d'invitation affichable/masquable, lisible depuis la distance canapé-TV
- Lecture Spotify stable
- Queue persistante après refresh
- Timer fiable
- Buzz temps réel classé (top 5), aligné sur le serveur réel
- Révélation manuelle
- Gestion des erreurs (auth, device, réseau, socket, playlists vides)
- Responsive, lisible depuis le canapé sur la TV
