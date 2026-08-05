import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Timer from './Timer.jsx'

describe('Timer', () => {
  it('shows the remaining seconds and a fill matching the remaining fraction', () => {
    const { container } = render(<Timer secondsLeft={14} duration={20} />)

    expect(screen.getByText('14 s')).toBeInTheDocument()
    expect(container.querySelector('.cbt-timer__fill')).toHaveStyle({ width: '70%' })
  })

  it('renders an empty fill once the countdown reaches 0', () => {
    const { container } = render(<Timer secondsLeft={0} duration={20} />)
    expect(container.querySelector('.cbt-timer__fill')).toHaveStyle({ width: '0%' })
  })
})
