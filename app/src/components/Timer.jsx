import './Timer.css'

export default function Timer({ secondsLeft, duration }) {
  const remainingFraction = duration > 0 ? secondsLeft / duration : 0

  return (
    <div className="cbt-timer">
      <div className="cbt-timer__row">
        <span className="cbt-timer__label">Temps restant</span>
        <span className="cbt-timer__value">{secondsLeft} s</span>
      </div>
      <div className="cbt-timer__track">
        <div className="cbt-timer__fill" style={{ width: `${Math.round(remainingFraction * 100)}%` }} />
      </div>
    </div>
  )
}
