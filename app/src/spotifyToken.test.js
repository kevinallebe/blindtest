import { describe, expect, it } from 'vitest'
import { generateCodeChallenge } from './spotifyToken.js'

describe('generateCodeChallenge', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})
