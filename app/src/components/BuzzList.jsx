import './BuzzList.css'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function BuzzList({ buzzes }) {
  return (
    <div className="cbt-buzz-list">
      <div className="cbt-buzz-list__header">
        <span className="cbt-buzz-list__title">Classement des buzz</span>
        <span className="cbt-buzz-list__max">max 5</span>
      </div>

      <div className="cbt-buzz-list__entries">
        {buzzes.length === 0 && <p className="cbt-buzz-list__empty">En attente des buzz…</p>}
        {buzzes.map((buzz, index) => (
          <BuzzEntry key={buzz.name} buzz={buzz} rank={index + 1} />
        ))}
      </div>

      <div className="cbt-buzz-list__footer">Les buzz se remettent à zéro à chaque nouvelle manche.</div>
    </div>
  )
}

function BuzzEntry({ buzz, rank }) {
  const medal = MEDALS[rank]
  const isTop = rank <= 3

  return (
    <div className={`cbt-buzz-entry ${isTop ? 'cbt-buzz-entry--top' : 'cbt-buzz-entry--other'} ${rank === 1 ? 'cbt-buzz-entry--gold' : ''}`}>
      <span className="cbt-buzz-entry__rank">{medal ?? `${rank}e`}</span>
      <span className="cbt-buzz-entry__name">{buzz.name}</span>
      <span className="cbt-buzz-entry__time">{(buzz.reactionTime / 1000).toFixed(2)} s</span>
    </div>
  )
}
