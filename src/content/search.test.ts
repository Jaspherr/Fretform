import { describe, expect, it } from 'vitest'
import { search } from './search'

const top = (q: string) => search(q)[0]

describe('search', () => {
  it('finds chords, scales, modes and topics', () => {
    expect(top('C major').title).toMatch(/^C (Major|Major$)/)
    expect(top('A minor pentatonic').to).toBe('/scales?root=A&scale=minor-pentatonic')
    expect(top('Dorian').kind).toMatch(/Mode|Lesson|Reference|Tool/)
    expect(search('Dorian').some((r) => r.to.includes('mode=dorian'))).toBe(true)
    expect(search('triads').some((r) => r.to === '/triads')).toBe(true)
    expect(search('CAGED').some((r) => r.to === '/caged')).toBe(true)
    expect(top('G chord').to).toBe('/chords?root=G&quality=major')
    expect(search('chord tones').some((r) => r.to === '/fills/chord-tones')).toBe(true)
  })
  it('does not match single letters inside words', () => {
    expect(search('a').every((r) => !r.title.startsWith('Major'))).toBe(true)
  })
})
