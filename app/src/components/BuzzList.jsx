import { formatPoints } from '../utils/points.js'
import './BuzzList.css'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }
const EMPTY_TOGGLE = { artist: false, title: false }

export default function BuzzList({
  buzzes,
  answerTimer = null,
  roundScores = {},
  onToggleArtist = () => {},
  onToggleTitle = () => {},
  onToggleBoth = () => {},
}) {
  return (
    <div className="cbt-buzz-list">
      <div className="cbt-buzz-list__header">
        <span className="cbt-buzz-list__title">Classement des buzz</span>
        <span className="cbt-buzz-list__max">max 5</span>
      </div>

      <div className="cbt-buzz-list__entries">
        {buzzes.length === 0 && <p className="cbt-buzz-list__empty">En attente des buzz…</p>}
        {buzzes.map((buzz, index) => (
          <BuzzEntry
            key={buzz.name}
            buzz={buzz}
            rank={index + 1}
            answerTimer={index === 0 ? answerTimer : null}
            toggle={roundScores[buzz.name] ?? EMPTY_TOGGLE}
            onToggleArtist={() => onToggleArtist(buzz.name)}
            onToggleTitle={() => onToggleTitle(buzz.name)}
            onToggleBoth={() => onToggleBoth(buzz.name)}
          />
        ))}
      </div>

      <div className="cbt-buzz-list__footer">
        Artiste ou titre = 0,5 pt · les deux = 1 pt · re-cliquer retire le point
      </div>
    </div>
  )
}

function BuzzEntry({ buzz, rank, answerTimer, toggle, onToggleArtist, onToggleTitle, onToggleBoth }) {
  const medal = MEDALS[rank]
  const isTop = rank <= 3
  const points = formatPoints((toggle.artist ? 0.5 : 0) + (toggle.title ? 0.5 : 0))

  return (
    <div className={`cbt-buzz-entry ${isTop ? 'cbt-buzz-entry--top' : 'cbt-buzz-entry--other'} ${rank === 1 ? 'cbt-buzz-entry--gold' : ''}`}>
      <span className="cbt-buzz-entry__rank">{medal ?? `${rank}e`}</span>
      <span className="cbt-buzz-entry__name">
        {buzz.name}
        {points && <span className="cbt-buzz-entry__points"> · {points}</span>}
      </span>
      {answerTimer && <AnswerTimerBadge timer={answerTimer} />}
      <span className="cbt-buzz-entry__time">{(buzz.reactionTime / 1000).toFixed(2)} s</span>
      <ScoreToggles toggle={toggle} onToggleArtist={onToggleArtist} onToggleTitle={onToggleTitle} onToggleBoth={onToggleBoth} />
    </div>
  )
}

function ScoreToggles({ toggle, onToggleArtist, onToggleTitle, onToggleBoth }) {
  const bothActive = toggle.artist && toggle.title

  return (
    <div className="cbt-score-toggles">
      <button
        type="button"
        className={`cbt-score-toggle ${toggle.artist ? 'cbt-score-toggle--artist-active' : ''}`}
        onClick={onToggleArtist}
        aria-pressed={toggle.artist}
        title="Artiste trouvé"
      >
        <i className="bi bi-person-fill" />
      </button>
      <button
        type="button"
        className={`cbt-score-toggle ${toggle.title ? 'cbt-score-toggle--title-active' : ''}`}
        onClick={onToggleTitle}
        aria-pressed={toggle.title}
        title="Titre trouvé"
      >
        <i className="bi bi-music-note-beamed" />
      </button>
      <button
        type="button"
        className={`cbt-score-toggle cbt-score-toggle--both ${bothActive ? 'cbt-score-toggle--both-active' : ''}`}
        onClick={onToggleBoth}
        aria-pressed={bothActive}
        title="Les deux trouvés"
      >
        <i className="bi bi-person-fill" />
        <i className="bi bi-music-note-beamed" />
      </button>
    </div>
  )
}

// Compte à rebours affiché à côté du nom du 1er buzzeur, pour le limiter dans son temps de
// réponse — s'anime à l'approche de zéro puis reste figé en rouge une fois le temps écoulé.
function AnswerTimerBadge({ timer }) {
  const isUrgent = timer.secondsLeft > 0 && timer.secondsLeft <= 2
  const isElapsed = timer.secondsLeft === 0

  return (
    <span
      className={`cbt-buzz-entry__answer-timer ${isUrgent ? 'cbt-buzz-entry__answer-timer--urgent' : ''} ${isElapsed ? 'cbt-buzz-entry__answer-timer--elapsed' : ''}`}
    >
      {timer.secondsLeft}s
    </span>
  )
}
