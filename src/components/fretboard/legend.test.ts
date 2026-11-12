import { describe, expect, it } from 'vitest'
import { SHAPE } from './glyph'
import { legendFromMarks } from './Legend'
import type { FretMark } from './marks'

const mark = (m: Partial<FretMark>): FretMark => ({ string: 1, fret: 0, label: 'x', tone: 'root', ...m })

describe('note glyphs', () => {
  it('give each core chord role its own shape, so colour is never the only signal', () => {
    const core = [SHAPE.root, SHAPE.third, SHAPE.fifth, SHAPE.seventh]
    expect(new Set(core).size).toBe(4)
  })
})

describe('legendFromMarks', () => {
  it('lists only what is drawn, in a stable order', () => {
    const items = legendFromMarks([mark({ tone: 'fifth' }), mark({ tone: 'root', fret: 1 }), mark({ tone: 'seventh', fret: 2, emphasis: 'ghost' })])
    expect(items.map((i) => i.label)).toEqual(['Root', '5th'])
  })

  it('explains outlines and rings when present', () => {
    const items = legendFromMarks([mark({ tone: 'third', emphasis: 'soft' }), mark({ tone: 'target', ring: 'target', fret: 3 })])
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Outlined = outside the highlighted shape')
    expect(labels).toContain('Where to land next')
    expect(labels).toContain('Next-chord target')
  })
})
