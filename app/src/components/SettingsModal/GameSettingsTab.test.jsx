import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GameSettingsTab from './GameSettingsTab.jsx'

function buildSettings(overrides = {}) {
  return {
    timerDuration: 20,
    setTimerDuration: vi.fn(),
    volume: 70,
    setVolume: vi.fn(),
    revealMode: 'manual',
    setRevealMode: vi.fn(),
    answerTimerDuration: 5,
    setAnswerTimerDuration: vi.fn(),
    ...overrides,
  }
}

describe('GameSettingsTab', () => {
  it('shows the current values', () => {
    render(<GameSettingsTab settings={buildSettings({ timerDuration: 25, volume: 55, answerTimerDuration: 8 })} />)
    expect(screen.getByText('25 s')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(screen.getByText('8 s')).toBeInTheDocument()
  })

  it('calls setTimerDuration when the duration slider changes', () => {
    const settings = buildSettings()
    render(<GameSettingsTab settings={settings} />)

    fireEvent.change(screen.getByText('Durée du timer').parentElement.querySelector('input[type="range"]'), {
      target: { value: '35' },
    })
    expect(settings.setTimerDuration).toHaveBeenCalledWith(35)
  })

  it('calls setAnswerTimerDuration when the answer timer slider changes', () => {
    const settings = buildSettings()
    render(<GameSettingsTab settings={settings} />)

    fireEvent.change(
      screen.getByText('Durée du timer de réponse').parentElement.querySelector('input[type="range"]'),
      { target: { value: '10' } },
    )
    expect(settings.setAnswerTimerDuration).toHaveBeenCalledWith(10)
  })

  it('calls setVolume when the volume slider changes', () => {
    const settings = buildSettings()
    render(<GameSettingsTab settings={settings} />)

    fireEvent.change(screen.getByText('Volume').parentElement.querySelector('input[type="range"]'), {
      target: { value: '40' },
    })
    expect(settings.setVolume).toHaveBeenCalledWith(40)
  })

  it('lets you switch the reveal mode and shows the matching hint', () => {
    const settings = buildSettings()
    const { rerender } = render(<GameSettingsTab settings={settings} />)

    expect(screen.getByText(/Tu cliques sur "Révéler la réponse"/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Automatique'))
    expect(settings.setRevealMode).toHaveBeenCalledWith('auto')

    rerender(<GameSettingsTab settings={buildSettings({ revealMode: 'auto' })} />)
    expect(screen.getByText(/s'affiche automatiquement/)).toBeInTheDocument()
  })
})
