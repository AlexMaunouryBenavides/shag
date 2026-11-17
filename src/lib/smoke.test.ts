import { describe, expect, it } from 'vitest'

describe('environnement de test', () => {
  it('fonctionne', () => {
    expect('привет'.normalize('NFC')).toBe('привет')
  })
})
