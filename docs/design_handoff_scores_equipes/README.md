# Handoff: Scores, Équipes & Inscriptions (Blindtest)

## Overview
New scoring system for the existing Blindtest host app + Buzzer player app: manual point attribution per round (artist/title/both), two scoreboards (per-party with teams, and a persistent overall ranking), drag-and-drop team formation, and an "open registration" mode so players can join the scoreboard before the first real round. Full functional spec: `SPEC_SCORES.md` in this folder — read it fully, it is the source of truth for behavior, data model, and Socket.IO events. This README covers the visual/design side.

## About the Design Files
The file `Maquettes Scores Blindtest.dc.html` is a **design reference built in HTML** — static mockups of the 6 new screens/states, not production code to copy directly. It's a single self-contained HTML file (open it directly in a browser). The task is to **recreate these designs inside the two existing repos** named in the spec:
- `CaribbeanBlindTest/app/` (React + Vite, host app) — new components under `src/components/ScoreBoard/`, per the file tree in SPEC_SCORES.md §3.
- `Buzzer/` (separate repo, `public/script.js` + server) — button mode change only, no new screen.

Reuse the existing `SettingsModal.jsx` structure (sidebar tabs + content card) for the new Scores modal, and the existing `BuzzList.jsx` row structure for the updated buzz ranking — do not introduce new layout patterns.

## Fidelity
**High-fidelity.** Colors, type, radii and spacing below are exact and taken directly from the existing app's `src/index.css` tokens (per SPEC_SCORES.md §4) plus 3 screenshots of the live app supplied during design (header/session screen, Réglages modal, Buzzer). Reproduce pixel-accurately using those existing tokens — do not introduce new ones.

## Design Tokens (from the existing app — reuse, do not invent)
- **Fonts**: `Baloo 2` (700–800 weight) for titles/logo/buttons/labels; `Manrope` (500–800) for body text.
- **Background**: dark gradient `oklch(0.15 0.03 250)` → `oklch(0.19 0.045 235)` → `oklch(0.16 0.03 240)`, 135deg, plus a warm radial glow top-right (orange, `oklch(0.72 0.18 30)` at ~20% opacity) and a cool radial glow bottom-left (teal, `oklch(0.78 0.15 190)` at ~18% opacity).
- **Panels**: background `oklch(0.25 0.035 240)`, border `oklch(0.38 0.03 240)` 1px, radius 22–28px, soft drop shadow.
- **Text**: primary `oklch(0.96 0.01 240)`, muted `oklch(0.72 0.02 240)`, subtle `oklch(0.65 0.02 240)`.
- **Accents**: teal `oklch(0.78 0.15 190)` (active/tech state), orange→gold gradient `oklch(0.72 0.18 30)` → `oklch(0.8 0.16 85)` (CTAs/logo/highlights), green `oklch(0.75 0.19 145)` (connected status).
- **Logo mark**: circular conic-gradient ring (teal→orange→gold→teal) around a dark circle containing "OK".
- Dark theme only — no light mode.

## Screens / Views
All 6 screens live in the single HTML file, stacked vertically, each wrapped in a `[data-screen-label]` div for reference. Open the file and scroll — labels "01" through "06" match below.

### 01 — Classement de buzz (updated `BuzzList.jsx`)
- Widened panel (was 340px in prod — mock uses 480px) to fit new controls without crowding ranks 4–5.
- Each player row: rank badge, name, elapsed-time chip (red-tinted pill), then **3 icon-toggle buttons**: Artiste (person silhouette), Titre (music note), Les deux (combined icon — shortcut that sets both other toggles at once).
- Toggle states shown: inactive (outline, muted `oklch(0.5 0.02 240)` border, no fill) vs active (solid fill — teal for a single toggle, orange→gold gradient fill when "les deux" is active). Any toggle is a re-clickable on/off — re-click removes the point.
- Points display appended next to name: "0,5 pt" (one found) / "1 pt" (both found).

### 02 — Modale Scores → onglet Partie
- Same modal shell as existing `SettingsModal.jsx`: left sidebar (230px, tabs "Partie" / "Général", active tab = orange-tinted pill), right content card.
- Top action row: "Ouvrir les inscriptions" (teal outline pill) + "Dissoudre les équipes" (neutral outline pill with a small split-arrows icon).
- Team group card: bordered container, grip-handle icon (six-dot icon) + team name + prominent orange→gold gradient pill showing the team's summed total, with member rows nested inside (indented), each showing name + individual points + a small "×" to leave the team.
- Individual (non-teamed) players render as plain rows below, same row style as BuzzList but without the score-toggle icons.

### 03 — État de glisser-déposer en cours
- Same panel type as 02. Source row being dragged: dashed border, ~45% opacity ("ghost" state). Target row: teal border + teal glow (box-shadow) + inline label "Déposer pour fusionner".

### 04 — Modale Scores → onglet Général
- Same modal shell, "Général" tab active instead.
- Top-right: destructive-styled "Réinitialiser le score général" (orange outline pill) — the only way this board ever resets.
- Ranking rows: top 3 get a colored circular rank badge (gold/silver/bronze background) + a tinted row background matching that medal color; rest of the list (4th onward) is plain rows, no medal, descending by points.

### 05 — Bouton Header "Scores"
- New pill button inserted between "Inviter les joueurs" and "Réglages" in the header, per spec placement.
- Visual treatment: gold-tinted outline pill (border + text `oklch(0.8 0.16 85)`, subtle tinted fill) with a small star/trophy glyph, to read as distinct from the neutral "Réglages" pill and the orange "Inviter les joueurs" pill while staying in the same family.

### 06 — App Buzzer, 2 button modes
- Player app card (same rounded dark-panel style the Buzzer already uses per the supplied screenshot — not a device bezel, just the app's own card).
- **Mode inscription**: circle button in teal gradient, person+ icon, label "REJOINDRE", subtitle "Appuie pour rejoindre le classement", header sub-label changes to "BUZZER · INSCRIPTIONS OUVERTES" in teal.
- **Mode partie (default, unchanged behavior)**: circle button in orange gradient, 🚨 icon, label "BUZZ", subtitle "En attente des buzz…", header sub-label "BUZZER" in orange.
- Both share the same card chrome: "Connecté" status pill, ring logo, name field.

## Interactions & Behavior (see SPEC_SCORES.md for full detail)
- Score toggle buttons (Epic 13): 3 independent toggles per buzzed player; "Les deux" is a shortcut that visually/functionally equals both other toggles being on — clicking either combination must converge to the same visual state. Fully reversible at any time before the next "Nouvelle musique".
- Drag-and-drop (Epic 15): drag player A onto player B or onto an existing team card to merge; "×" on a member pulls them back out to individual without touching points; "Dissoudre les équipes" flattens everyone back to individual in one action.
- Registration mode (Epic 16): "Ouvrir les inscriptions" broadcasts a `mode: 'join'` state to all connected Buzzer clients; their Buzz button becomes the join button shown in screen 06; starting a real round (`startRound`) implicitly closes registration, no dedicated close action needed.
- Party scoreboard resets automatically on "Recharger les playlists"; Overall scoreboard never auto-resets, only via its dedicated button.

## State Management / Data Model
See SPEC_SCORES.md §9 for the indicative TypeScript shapes (`OverallScores`, `PartyScores` with `players` + `teams`), §6 for the new Socket.IO events (`startJoin`, `mode`, `join`, `joinedList`), and §7 for business rules (point values, no name normalization/dedup, teams only exist in Partie scope).

## Assets
No external image assets — all icons in the mockup are inline SVG line icons (person, music note, grip/six-dot handle, cross, split-arrows) drawn to match the existing Bootstrap Icons style already used in the app; medal ranks use plain colored circles rather than emoji, for consistency with `BuzzList.jsx`'s existing top-3 treatment (confirm against the live component if it currently uses emoji instead). Recreate these as whatever icon system the codebase already uses (e.g. swap for actual Bootstrap Icons glyphs) rather than shipping the inline SVGs as-is.

## Files in this package
- `Maquettes Scores Blindtest.dc.html` — all 6 mockup screens, open in any browser.
- `SPEC_SCORES.md` — full functional spec (epics, user stories, events, data model, business rules) this design implements.
