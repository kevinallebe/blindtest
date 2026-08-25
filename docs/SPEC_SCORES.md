# Blindtest — Spec Scores, Équipes & Inscriptions

> Extension de `SPEC.md` (app existante, déjà en prod). Ce document couvre uniquement la nouvelle fonctionnalité de score — à lire en complément, pas en remplacement, du spec principal. Rédigé pour brief de design (mockups des nouveaux écrans/états), pas comme plan de développement.

---

## 1. Contexte

L'app animateur (React + Vite) diffuse déjà la musique, gère les playlists et affiche un classement de buzz en temps réel (voir `SPEC.md`, Epic 9). Ce classement n'attribue aujourd'hui aucun point : c'est juste un ordre d'arrivée qui se vide à chaque manche.

Cette extension ajoute un vrai système de score, jugé manuellement par l'animateur (personne n'entre la bonne réponse quelque part — c'est lui + la salle qui décident de qui a trouvé quoi), plus un mécanisme pour que les joueurs rejoignent le tableau des scores sans attendre d'avoir gagné une manche.

---

## 2. Objectifs

- Attribuer des points par manche : artiste trouvé, titre trouvé, ou les deux
- Deux scoreboards distincts : un par partie (avec équipes, remis à zéro à chaque rechargement de playlists) et un général (individuel, persiste toute la soirée)
- Former des équipes par glisser-déposer sur le scoreboard de partie
- Permettre à tous les participants de rejoindre le tableau des scores en début de soirée, sans dépendre d'un vrai buzz de jeu

---

## 3. Composants concernés

Deux dépôts distincts, deux déploiements distincts :

```text
CaribbeanBlindTest/app/          (écran animateur — ce dépôt)
├── src/components/
│   ├── Header.jsx                → nouveau bouton "Scores" entre "Inviter les joueurs" et "Réglages"
│   ├── BuzzList.jsx               → 3 icônes toggle par ligne de joueur ayant buzzé
│   └── ScoreBoard/                → NOUVEAU — modale à 2 onglets (Partie / Général)
│       ├── ScoreBoardModal.jsx
│       ├── PartyScoresTab.jsx     → liste + drag&drop équipes
│       └── OverallScoresTab.jsx   → classement individuel + médailles
├── src/hooks/
│   └── useScores.js               → NOUVEAU — état + persistance des 2 scoreboards
└── src/services/
    └── scores.js                  → NOUVEAU — lecture/écriture localStorage

Buzzer/                          (serveur + app joueurs — dépôt séparé, hébergé à part)
├── server.js                      → nouveaux évènements Socket.IO (mode inscription)
└── public/script.js               → bouton Buzz à double comportement selon le mode
```

**Implication de déploiement** : contrairement au reste de cette extension (qui ne touche que l'app animateur, locale au PC de l'animateur), le mécanisme "Rejoindre la partie" (Epic 16) nécessite de modifier et **redéployer** le serveur Buzzer (`buzzer.servebeer.com`), pas seulement l'app locale.

---

## 4. Identité visuelle existante (à respecter, pas à réinventer)

Design system déjà en place, défini dans `app/src/index.css` — les nouveaux écrans en font partie, même palette/typo, pas de nouvelle direction visuelle.

- **Polices** : `Baloo 2` (titres, 700-800) / `Manrope` (texte courant, 500-800)
- **Fond** : dégradé sombre `oklch(0.15 0.03 250)` → `oklch(0.19 0.045 235)` → `oklch(0.16 0.03 240)`, avec halos radiaux chauds (orange, coin haut-droit) et froids (teal, coin bas-gauche)
- **Panels** : `oklch(0.25 0.035 240)`, bordure `oklch(0.38 0.03 240)`, coins très arrondis (22-28px), ombre portée douce
- **Texte** : `oklch(0.96 0.01 240)` (principal), `oklch(0.72 0.02 240)` (atténué), `oklch(0.65 0.02 240)` (discret)
- **Accents** : teal `oklch(0.78 0.15 190)` (Spotify/tech, "actif"), orange `oklch(0.72 0.18 30)` → gold `oklch(0.8 0.16 85)` (dégradé CTA/logo/highlight), vert `oklch(0.75 0.19 145)` (statut connecté)
- **Thème unique sombre** — pas de mode clair à prévoir (choix déjà assumé sur toute l'app)
- Référence directe pour le ton général : la modale Réglages existante (`SettingsModal.jsx`, sidebar à onglets + carte de contenu) est le patron visuel à réutiliser pour la modale Scores — même structure, nouveaux onglets.
- Pour un rendu déjà fidèle à cette identité (mockup HTML complet, thème sombre, mêmes tokens) : voir `guide-utilisateur-blindtest.html` à la racine de ce dépôt.

**Nouvelles icônes nécessaires** (cohérentes avec le style Bootstrap Icons déjà utilisé dans l'app) :
- Bonhomme (silhouette) — "a trouvé l'artiste"
- Note de musique — "a trouvé le titre"
- Combinaison des deux (côte à côte ou superposées) — raccourci "a trouvé les deux"
- Poignée de glisser-déposer (six points ou icône grip) — pour le drag & drop équipes
- Croix discrète — "quitter l'équipe" (sur un membre groupé)
- Icône "dissoudre" (ex. flèches qui se séparent) — bouton global équipes

---

## 5. User Stories

### Epic 13 — Scoring par manche

#### US-13.1 Attribution des points

**En tant qu'animateur**, je veux attribuer des points à un joueur ayant buzzé directement depuis sa ligne dans le classement de buzz, afin de ne pas devoir naviguer ailleurs pendant le jeu.

Critères :
- 3 boutons icône par ligne de joueur ayant buzzé sur la manche en cours : Artiste / Titre / Les deux
- Artiste seul = 0,5 pt · Titre seul = 0,5 pt · Les deux = 1 pt
- Le bouton "Les deux" est un raccourci qui active Artiste + Titre simultanément — pas un 3ᵉ état indépendant. L'inverse (cliquer Artiste puis Titre séparément) doit donner visuellement le même résultat que cliquer directement sur "Les deux".
- Chaque bouton a un état visuel actif/inactif clair (couleur pleine vs contour, par ex.)

#### US-13.2 Réversibilité

Chaque bouton est un toggle : un re-clic retire le point correspondant. Correction possible à tout moment tant que la manche est visible (avant le prochain "Nouvelle musique").

#### US-13.3 Plusieurs joueurs scorés par manche

Aucune restriction du nombre de joueurs crédités sur une même manche — l'animateur peut donner l'artiste à un joueur et le titre à un autre si c'est ce que décide la salle.

---

### Epic 14 — Scoreboards

#### US-14.1 Accès

**En tant qu'animateur**, je veux ouvrir le tableau des scores à tout moment pendant la soirée, sans interrompre le jeu.

Critères :
- Nouveau bouton "Scores" dans le Header, entre "Inviter les joueurs" et "Réglages"
- Ouvre une modale à 2 onglets : **Partie** et **Général**
- Même patron visuel que la modale Réglages existante (sidebar à onglets + carte de contenu, overlay cliquable pour fermer)

#### US-14.2 Scoreboard "Partie"

Vue individuelle + regroupements en équipes (voir Epic 15). Remis à zéro automatiquement à chaque clic sur "Recharger les playlists" (Réglages → Admin) — une nouvelle partie, un nouveau tableau.

#### US-14.3 Scoreboard "Général"

Classement individuel uniquement, jamais de notion d'équipe ici. **Ne se réinitialise jamais** au rechargement des playlists — seulement via un bouton dédié "Réinitialiser le score général" présent sur cet onglet. Pensé pour courir sur toute la soirée, indépendamment du nombre de "parties" jouées.

Critères :
- Médailles 🥇🥈🥉 sur les 3 premiers, même traitement visuel que le classement de buzz existant (`BuzzList.jsx`)
- Le reste du classement affiché par ordre décroissant de points (4e, 5e, …)

---

### Epic 15 — Équipes (onglet Partie uniquement)

#### US-15.1 Regrouper par glisser-déposer

**En tant qu'animateur**, je veux glisser un joueur sur un autre pour former une équipe, afin de scorer par groupe plutôt qu'individuellement quand la soirée s'y prête.

Critères :
- Glisser le joueur A sur le joueur B (ou sur une équipe existante) les regroupe
- Chaque membre garde son score individuel affiché à l'intérieur du groupe
- Un total d'équipe (somme des membres) est affiché en évidence au niveau du groupe

#### US-15.2 Quitter une équipe

Une croix discrète sur chaque membre d'un groupe le fait ressortir en entrée individuelle, sans toucher aux scores.

#### US-15.3 Dissoudre toutes les équipes

Un bouton global sur l'onglet Partie ("Dissoudre les équipes") repasse tous les joueurs en individuel d'un coup — pour recomposer les équipes autrement ou repasser en mode sans équipe, sans perdre aucun point.

---

### Epic 16 — Rejoindre la partie (inscription)

#### US-16.1 Ouvrir les inscriptions

**En tant qu'animateur**, je veux que tous les participants puissent s'ajouter au tableau des scores en début de soirée sans avoir à gagner une vraie manche, afin que tout le monde soit visible (et regroupable en équipes) avant même la première chanson.

Critères :
- Bouton "Ouvrir les inscriptions" (emplacement suggéré : onglet Partie du scoreboard, puisque c'est le tableau qu'on prépare avant de jouer)
- Une fois activé, diffuse un mode "inscription" à tous les clients Buzzer connectés

#### US-16.2 Le bouton Buzz sert aussi à s'inscrire

Pas de nouvelle interface côté joueur — le bouton "Buzz" déjà présent sur l'app Buzzer change de libellé/comportement selon le mode diffusé par le serveur :
- **Mode inscription** : appuyer envoie "je rejoins" (nom ajouté aux 2 scoreboards à 0 pt), sans plafond de participants (contrairement au classement de manche, plafonné à 5 côté serveur)
- **Mode partie** (par défaut) : comportement actuel inchangé

#### US-16.3 Fermeture automatique

Le mode inscription se referme tout seul dès que l'animateur lance la première manche réelle ("Nouvelle musique") — pas de bouton "fermer les inscriptions" nécessaire. Réouvrable à tout moment (retardataire en cours de soirée) sans perturber les scores déjà acquis.

#### US-16.4 Filet de sécurité

Un joueur qui buzze réellement pendant une manche sans être passé par l'inscription apparaît quand même automatiquement sur les 2 scoreboards à ce moment-là (comportement actuel conservé, l'inscription n'est qu'un confort).

---

## 6. Évènements Socket.IO (nouveaux — s'ajoutent à la table existante de `SPEC.md` §7)

| Sens | Évènement | Payload | Usage |
|---|---|---|---|
| Sortant (animateur → serveur) | `startJoin` | — | Bascule tous les clients Buzzer connectés en mode inscription |
| Entrant (serveur → Buzzer) | `mode` | `'join' \| 'round'` | Le client adapte le libellé/comportement du bouton Buzz |
| Sortant (Buzzer → serveur) | `join` | `name` | Émis par le bouton Buzz quand le client est en mode inscription |
| Entrant (serveur → animateur) | `joinedList` | `[{ name }]`, **non plafonné** | Alimente les 2 scoreboards à 0 pt (uniquement les noms pas déjà présents) |

`startRound` (évènement existant, US-9.4) repasse implicitely le mode serveur sur `'round'` — pas de nouvel évènement dédié à la fermeture des inscriptions.

---

## 7. Règles métier

- 0,5 pt par élément trouvé (artiste, titre), 1 pt si les deux — jamais de barème différent
- Le score est réversible à tout moment via les mêmes boutons toggle
- N'importe quel joueur ayant buzzé sur la manche peut être crédité, pas seulement le 1er
- Les noms de joueurs sont pris tels quels : pas de normalisation ni de dédoublonnage automatique (deux frappes différentes du même prénom = deux entrées distinctes, assumé)
- Le scoreboard **Partie** (et les équipes qu'il contient) est réinitialisé au rechargement des playlists ; le scoreboard **Général** ne l'est jamais automatiquement
- Les équipes n'existent que dans le scoreboard Partie — le Général reste toujours individuel
- Le classement de buzz existant (max 5, Epic 9) n'est pas modifié — seule l'inscription (Epic 16) introduit une liste non plafonnée, séparée

---

## 8. Écrans / états à concevoir

Liste des livrables attendus côté design (mockups), dans le même esprit que les 3 écrans déjà produits pour `SPEC.md` (Session / Classement / Chargement playlists) :

1. **Classement de buzz** (mise à jour) — ligne de joueur avec les 3 icônes toggle, dans leurs 3 états (inactif / un seul actif / "les deux" actif) ; prévoir un peu plus de largeur que le container actuel (340px) pour loger les icônes sans surcharger les rangs 4-5
2. **Modale Scores → onglet Partie** — vue individuelle + groupes d'équipe (poignée de drag, total d'équipe mis en avant, croix pour quitter), bouton "Dissoudre les équipes", bouton "Ouvrir les inscriptions"
3. **État de glisser-déposer en cours** — feedback visuel (ligne source semi-transparente, cible en surbrillance)
4. **Modale Scores → onglet Général** — classement individuel avec médailles top 3, bouton "Réinitialiser le score général"
5. **Bouton Header "Scores"** — état par défaut, cohérent avec les boutons "Inviter les joueurs" / "Réglages" déjà en place
6. **App Buzzer — bouton en mode inscription** vs bouton en mode partie normal (2 états visuellement distincts pour ce même bouton)

---

## 9. Schéma de données (indicatif, pour cadrer le design — pas gravé)

```ts
// Scoreboard Général — persiste toute la soirée, reset manuel uniquement
type OverallScores = {
  name: string
  points: number // multiples de 0.5
}[]

// Scoreboard Partie — reset au rechargement des playlists
type PartyScores = {
  players: { name: string; points: number }[]
  teams: { id: string; memberNames: string[] }[] // un joueur non listé ici = individuel
}
```

Persisté en `localStorage`, clés à ajouter à la liste de l'Epic 11 de `SPEC.md` (ex. `cbt_scores_overall`, `cbt_scores_party`).

---

## 10. Hors périmètre de ce brief

- Pas de notion de "bonne réponse" validée automatiquement — reste un jugement humain (animateur + salle)
- Pas de comptes joueurs persistants d'une soirée à l'autre (le Général se réinitialise au bon vouloir de l'animateur, rien de plus)
- Pas de redesign des écrans existants au-delà de ce qui est listé en §8
