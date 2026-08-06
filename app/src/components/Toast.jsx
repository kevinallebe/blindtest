import './Toast.css'

export default function Toast({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="cbt-toast" role="alert">
      <span className="cbt-toast__message">{message}</span>
      <button type="button" className="cbt-toast__close" onClick={onDismiss} aria-label="Fermer la notification">
        ✕
      </button>
    </div>
  )
}
