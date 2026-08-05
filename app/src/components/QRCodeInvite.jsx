import { QRCodeSVG } from 'qrcode.react'
import './QRCodeInvite.css'

const STEPS = [
  { n: 1, label: "Ouvre l'appareil photo" },
  { n: 2, label: 'Scanne le code' },
  { n: 3, label: 'Tu es prêt à buzzer' },
]

export default function QRCodeInvite({ onClose }) {
  const buzzerUrl = import.meta.env.VITE_SOCKET_URL

  return (
    <div className="cbt-qr-overlay">
      <button type="button" className="cbt-qr-overlay__close" onClick={onClose}>
        Fermer
      </button>

      <div className="cbt-qr-overlay__heading">
        <div className="cbt-qr-overlay__title">Rejoins la partie !</div>
        <div className="cbt-qr-overlay__subtitle">Scanne ce QR code avec ton téléphone pour buzzer</div>
      </div>

      <div className="cbt-qr-overlay__code">
        <QRCodeSVG value={buzzerUrl} size={416} bgColor="transparent" fgColor="oklch(0.16 0.03 240)" />
      </div>

      <div className="cbt-qr-overlay__steps">
        {STEPS.map((step) => (
          <div key={step.n} className="cbt-qr-overlay__step">
            <div className="cbt-qr-overlay__step-number">{step.n}</div>
            <div className="cbt-qr-overlay__step-label">{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
