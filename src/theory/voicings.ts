import { NUM_FRETS, type StringNum, openMidi, pcAt, STRINGS_LOW_TO_HIGH } from './fretboard'
import { type PitchClass, mod12 } from './notes'

export type CagedShape = 'C' | 'A' | 'G' | 'E' | 'D'
export const CAGED_ORDER: CagedShape[] = ['C', 'A', 'G', 'E', 'D']

/**
 * A movable chord shape. Offsets are frets relative to the root fret on
 * `rootString`, listed low E → high e. null = muted string.
 *
 * Every template is checked by tests: at every root it must produce only chord
 * tones and include every required tone.
 */
export interface VoicingTemplate {
  id: string
  qualityId: string
  name: string
  caged?: CagedShape
  rootString: StringNum
  offsets: (number | null)[]
  /**
   * Fingering for the barre (moved-up) form. For an open form, open strings get
   * no finger and every fretted finger shifts down by one (the nut is the barre).
   */
  fingers?: (number | null)[]
  /** Big stretch: playable, but most players use part of it. */
  stretch?: boolean
}

const x = null

export const VOICING_TEMPLATES: VoicingTemplate[] = [
  // Major
  { id: 'maj-E', qualityId: 'major', name: 'E shape', caged: 'E', rootString: 6, offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  { id: 'maj-A', qualityId: 'major', name: 'A shape', caged: 'A', rootString: 5, offsets: [x, 0, 2, 2, 2, 0], fingers: [x, 1, 2, 3, 4, 1] },
  { id: 'maj-C', qualityId: 'major', name: 'C shape', caged: 'C', rootString: 5, offsets: [x, 0, -1, -3, -2, -3], fingers: [x, 4, 3, 1, 2, 1], stretch: true },
  { id: 'maj-G', qualityId: 'major', name: 'G shape', caged: 'G', rootString: 6, offsets: [0, -1, -3, -3, -3, 0], fingers: [3, 2, 1, 1, 1, 4], stretch: true },
  { id: 'maj-D', qualityId: 'major', name: 'D shape', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 3, 2], fingers: [x, x, 1, 2, 4, 3] },
  // Minor
  { id: 'min-E', qualityId: 'minor', name: 'Em shape', caged: 'E', rootString: 6, offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  { id: 'min-A', qualityId: 'minor', name: 'Am shape', caged: 'A', rootString: 5, offsets: [x, 0, 2, 2, 1, 0], fingers: [x, 1, 3, 4, 2, 1] },
  { id: 'min-C', qualityId: 'minor', name: 'Cm shape', caged: 'C', rootString: 5, offsets: [x, 0, -2, -3, -2, x], stretch: true },
  { id: 'min-G', qualityId: 'minor', name: 'Gm shape', caged: 'G', rootString: 6, offsets: [0, -2, -3, -3, 0, 0], stretch: true },
  { id: 'min-D', qualityId: 'minor', name: 'Dm shape', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 3, 1], fingers: [x, x, 1, 3, 4, 2] },
  // Dominant 7
  { id: 'dom7-E', qualityId: 'dom7', name: 'E7 shape', caged: 'E', rootString: 6, offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  { id: 'dom7-A', qualityId: 'dom7', name: 'A7 shape', caged: 'A', rootString: 5, offsets: [x, 0, 2, 0, 2, 0], fingers: [x, 1, 3, 1, 4, 1] },
  { id: 'dom7-C', qualityId: 'dom7', name: 'C7 shape', caged: 'C', rootString: 5, offsets: [x, 0, -1, 0, -2, -3], stretch: true },
  { id: 'dom7-G', qualityId: 'dom7', name: 'G7 shape', caged: 'G', rootString: 6, offsets: [0, -1, -3, -3, -3, -2], fingers: [4, 3, 1, 1, 1, 2], stretch: true },
  { id: 'dom7-D', qualityId: 'dom7', name: 'D7 shape', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 1, 2], fingers: [x, x, 1, 3, 2, 4] },
  // Major 7
  { id: 'maj7-E', qualityId: 'maj7', name: 'Emaj7 shape', caged: 'E', rootString: 6, offsets: [0, 2, 1, 1, 0, 0] },
  { id: 'maj7-E-shell', qualityId: 'maj7', name: '6th-string shell', rootString: 6, offsets: [0, x, 1, 1, 0, x] },
  { id: 'maj7-A', qualityId: 'maj7', name: 'Amaj7 shape', caged: 'A', rootString: 5, offsets: [x, 0, 2, 1, 2, 0], fingers: [x, 1, 3, 2, 4, 1] },
  { id: 'maj7-C', qualityId: 'maj7', name: 'Cmaj7 shape', caged: 'C', rootString: 5, offsets: [x, 0, -1, -3, -3, -3], stretch: true },
  { id: 'maj7-G', qualityId: 'maj7', name: 'Gmaj7 shape', caged: 'G', rootString: 6, offsets: [0, -1, -3, -3, -3, -1], stretch: true },
  { id: 'maj7-D', qualityId: 'maj7', name: 'Dmaj7 shape', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 2, 2] },
  // Minor 7
  { id: 'm7-E', qualityId: 'm7', name: 'Em7 shape', caged: 'E', rootString: 6, offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  { id: 'm7-A', qualityId: 'm7', name: 'Am7 shape', caged: 'A', rootString: 5, offsets: [x, 0, 2, 0, 1, 0], fingers: [x, 1, 3, 1, 2, 1] },
  { id: 'm7-C', qualityId: 'm7', name: 'Cm7 shape', caged: 'C', rootString: 5, offsets: [x, 0, -2, 0, -2, x], fingers: [x, 3, 1, 4, 1, x] },
  { id: 'm7-D', qualityId: 'm7', name: 'Dm7 shape', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 1, 1], fingers: [x, x, 1, 3, 2, 2] },
  // Sus
  { id: 'sus2-A', qualityId: 'sus2', name: '5th-string root', caged: 'A', rootString: 5, offsets: [x, 0, 2, 2, 0, 0], fingers: [x, 1, 3, 4, 1, 1] },
  { id: 'sus2-C', qualityId: 'sus2', name: 'Csus2 shape', caged: 'C', rootString: 5, offsets: [x, 0, -3, -3, 0, 0], stretch: true },
  { id: 'sus2-D', qualityId: 'sus2', name: '4th-string root', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 3, 0] },
  { id: 'sus4-E', qualityId: 'sus4', name: '6th-string root', caged: 'E', rootString: 6, offsets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
  { id: 'sus4-A', qualityId: 'sus4', name: '5th-string root', caged: 'A', rootString: 5, offsets: [x, 0, 2, 2, 3, 0], fingers: [x, 1, 2, 3, 4, 1] },
  { id: 'sus4-D', qualityId: 'sus4', name: '4th-string root', caged: 'D', rootString: 4, offsets: [x, x, 0, 2, 3, 3] },
  // Diminished / augmented / half-diminished
  { id: 'dim-E', qualityId: 'dim', name: '6th-string root', rootString: 6, offsets: [0, 1, 2, 0, x, x], fingers: [1, 2, 3, 1, x, x] },
  { id: 'dim-A', qualityId: 'dim', name: '5th-string root', rootString: 5, offsets: [x, 0, 1, 2, 1, x], fingers: [x, 1, 2, 4, 3, x] },
  { id: 'dim-D', qualityId: 'dim', name: '4th-string root', rootString: 4, offsets: [x, x, 0, 1, 3, 1] },
  { id: 'aug-E', qualityId: 'aug', name: '6th-string root', caged: 'E', rootString: 6, offsets: [0, 3, 2, 1, 1, 0], stretch: true },
  { id: 'aug-A', qualityId: 'aug', name: '5th-string root', caged: 'C', rootString: 5, offsets: [x, 0, -1, -2, -2, x], fingers: [x, 3, 2, 1, 1, x] },
  { id: 'aug-D', qualityId: 'aug', name: '4th-string root', caged: 'D', rootString: 4, offsets: [x, x, 0, 3, 3, 2] },
  { id: 'm7b5-E', qualityId: 'm7b5', name: '6th-string root', rootString: 6, offsets: [0, x, 0, 0, -1, x], fingers: [2, x, 3, 4, 1, x] },
  { id: 'm7b5-A', qualityId: 'm7b5', name: '5th-string root', rootString: 5, offsets: [x, 0, 1, 0, 1, x], fingers: [x, 1, 3, 2, 4, x] },
  { id: 'm7b5-D', qualityId: 'm7b5', name: '4th-string root', rootString: 4, offsets: [x, x, 0, 1, 1, 1] },
  { id: 'dim7-E', qualityId: 'dim7', name: '6th-string root', rootString: 6, offsets: [0, x, -1, 0, -1, x], fingers: [2, x, 1, 3, 1, x] },
  { id: 'dim7-A', qualityId: 'dim7', name: '5th-string root', rootString: 5, offsets: [x, 0, 1, -1, 1, x], fingers: [x, 2, 3, 1, 4, x] },
  { id: 'dim7-D', qualityId: 'dim7', name: '4th-string root', rootString: 4, offsets: [x, x, 0, 1, 0, 1] },
  // Power chords
  { id: 'pow-E', qualityId: 'power', name: '6th-string root', rootString: 6, offsets: [0, 2, 2, x, x, x], fingers: [1, 3, 4, x, x, x] },
  { id: 'pow-A', qualityId: 'power', name: '5th-string root', rootString: 5, offsets: [x, 0, 2, 2, x, x], fingers: [x, 1, 3, 4, x, x] },
  { id: 'pow-D', qualityId: 'power', name: '4th-string root', rootString: 4, offsets: [x, x, 0, 2, 3, x], fingers: [x, x, 1, 3, 4, x] },
]

export type VoicingTag = 'open' | 'barre' | 'caged' | 'higher'

export interface Voicing {
  id: string
  template: VoicingTemplate
  /** Frets low E → high e; null = muted */
  frets: (number | null)[]
  fingers?: (number | null)[]
  rootFret: number
  minFret: number
  maxFret: number
  tags: VoicingTag[]
}

export function fretsToString(frets: (number | null)[]): string {
  const big = frets.some((f) => f !== null && f > 9)
  return frets.map((f) => (f === null ? 'x' : String(f))).join(big ? ' ' : '')
}

function fingeringFor(t: VoicingTemplate, frets: (number | null)[], minFret: number): (number | null)[] | undefined {
  if (!t.fingers) return undefined
  if (minFret > 0) return t.fingers
  // Open form: the nut replaces the index-finger barre.
  return t.fingers.map((f, i) => (f === null || frets[i] === 0 ? null : f - 1))
}

export function placeTemplate(t: VoicingTemplate, rootFret: number): Voicing | null {
  const frets = t.offsets.map((o) => (o === null ? null : rootFret + o))
  const played = frets.filter((f): f is number => f !== null)
  const minFret = Math.min(...played)
  const maxFret = Math.max(...played)
  if (minFret < 0 || maxFret > NUM_FRETS) return null
  const tags: VoicingTag[] = []
  if (minFret === 0) tags.push('open')
  if (t.fingers && minFret > 0 && (t.caged === 'E' || t.caged === 'A')) tags.push('barre')
  if (t.caged) tags.push('caged')
  if (minFret >= 7) tags.push('higher')
  return {
    id: `${t.id}@${rootFret}`,
    template: t,
    frets,
    fingers: fingeringFor(t, frets, minFret),
    rootFret,
    minFret,
    maxFret,
    tags,
  }
}

/** All placements of every template for this chord, sorted up the neck. */
export function generateVoicings(rootPc: PitchClass, qualityId: string): Voicing[] {
  const out: Voicing[] = []
  for (const t of VOICING_TEMPLATES) {
    if (t.qualityId !== qualityId) continue
    const r0 = mod12(rootPc - openMidi(t.rootString))
    for (const r of [r0, r0 + 12, r0 + 24]) {
      const v = placeTemplate(t, r)
      if (v) out.push(v)
    }
  }
  return out.sort((a, b) => a.minFret - b.minFret || a.maxFret - b.maxFret)
}

/** Pitch classes actually sounded by a voicing, low → high. */
export function voicingPcs(frets: (number | null)[]): PitchClass[] {
  const out: PitchClass[] = []
  frets.forEach((f, i) => {
    if (f !== null) out.push(pcAt(STRINGS_LOW_TO_HIGH[i], f))
  })
  return out
}
