import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getBlindtestInitials, getBlindtestName } from '../services/adminConfig.js'
import { useBrandingSettings } from './useBrandingSettings.js'

beforeEach(() => {
  localStorage.clear()
})

describe('useBrandingSettings', () => {
  it('initializes from whatever is already persisted, defaulting to Blindtest/BT', () => {
    const { result } = renderHook(() => useBrandingSettings())
    expect(result.current.name).toBe('Blindtest')
    expect(result.current.initials).toBe('BT')
  })

  it('setName trims, persists, and falls back to the default when cleared', () => {
    const { result } = renderHook(() => useBrandingSettings())

    act(() => result.current.setName('  Soirée Kev & Oli  '))
    expect(result.current.name).toBe('Soirée Kev & Oli')
    expect(getBlindtestName()).toBe('Soirée Kev & Oli')

    act(() => result.current.setName('   '))
    expect(result.current.name).toBe('Blindtest')
  })

  it('setInitials normalizes to uppercase, truncates to 2 chars, and persists', () => {
    const { result } = renderHook(() => useBrandingSettings())

    act(() => result.current.setInitials('kev'))
    expect(result.current.initials).toBe('KE')
    expect(getBlindtestInitials()).toBe('KE')

    act(() => result.current.setInitials(''))
    expect(result.current.initials).toBe('BT')
  })
})
