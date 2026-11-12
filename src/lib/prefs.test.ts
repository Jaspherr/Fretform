import { describe, expect, it } from 'vitest'
import { sanitize } from './prefs'

describe('stored preferences', () => {
  it('fall back to defaults for malformed values instead of crashing', () => {
    const p = sanitize({ labels: '<img>', dismissedTips: 'nope', leftHanded: 'yes', theme: 42, lastRoot: { x: 1 } })
    expect(p).toMatchObject({ labels: 'notes', dismissedTips: [], leftHanded: false, theme: 'system', lastRoot: null })
  })
  it('keep valid values', () => {
    expect(sanitize({ labels: 'intervals', accidentals: 'flat', dismissedTips: ['a', 3], lastRoot: 'Bb' })).toMatchObject({
      labels: 'intervals',
      accidentals: 'flat',
      dismissedTips: ['a'],
      lastRoot: 'Bb',
    })
  })
  it('survive non-object JSON', () => {
    expect(sanitize(null).labels).toBe('notes')
    expect(sanitize('x').theme).toBe('system')
  })
})
