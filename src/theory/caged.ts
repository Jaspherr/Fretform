import { type FretPos, NUM_FRETS, STRINGS_LOW_TO_HIGH, openMidi, pcAt } from './fretboard'
import { type PitchClass, mod12 } from './notes'
import { CAGED_ORDER, type CagedShape, type Voicing, VOICING_TEMPLATES, generateVoicings, placeTemplate } from './voicings'

export interface CagedPosition {
  shape: CagedShape
  voicing: Voicing
  /** The fret window the shape's scale region covers */
  regionStart: number
  regionEnd: number
}

/** Stable id for one placement of a shape on the neck, e.g. "E@7". */
export function placementId(p: CagedPosition): string {
  return `${p.shape}@${p.voicing.minFret}`
}

/**
 * The five CAGED chord shapes for a major or minor key, sorted up the neck.
 * Going up the neck they always follow C → A → G → E → D → C…, starting
 * wherever the key puts the first one.
 */
export function cagedPositions(rootPc: PitchClass, quality: 'major' | 'minor' = 'major'): CagedPosition[] {
  const out: CagedPosition[] = []
  for (const shape of CAGED_ORDER) {
    const t = VOICING_TEMPLATES.find((v) => v.qualityId === quality && v.caged === shape)!
    const r0 = mod12(rootPc - openMidi(t.rootString))
    // Lowest placement that fits on the neck (a shape with negative offsets may need +12).
    const v = placeTemplate(t, r0) ?? placeTemplate(t, r0 + 12)
    if (!v) continue
    out.push({ shape, voicing: v, regionStart: Math.max(0, v.minFret - 1), regionEnd: Math.min(NUM_FRETS, v.maxFret + 1) })
  }
  return out.sort((a, b) => a.voicing.minFret - b.voicing.minFret)
}

/** Same position one octave up, if it fits. */
export function octaveUp(p: CagedPosition): CagedPosition | null {
  const v = placeTemplate(p.voicing.template, p.voicing.rootFret + 12)
  if (!v) return null
  return { ...p, voicing: v, regionStart: v.minFret - 1, regionEnd: Math.min(NUM_FRETS, v.maxFret + 1) }
}

/** Every placement of every CAGED shape across the whole neck (including octave repeats). */
export function cagedAcrossNeck(rootPc: PitchClass, quality: 'major' | 'minor' = 'major'): CagedPosition[] {
  return generateVoicings(rootPc, quality)
    .filter((v) => v.template.caged)
    .map((v) => ({ shape: v.template.caged!, voicing: v, regionStart: Math.max(0, v.minFret - 1), regionEnd: Math.min(NUM_FRETS, v.maxFret + 1) }))
}

export function neighbors(shape: CagedShape): { prev: CagedShape; next: CagedShape } {
  const i = CAGED_ORDER.indexOf(shape)
  return { prev: CAGED_ORDER[(i + 4) % 5], next: CAGED_ORDER[(i + 1) % 5] }
}

/** Scale notes in the fret window around a CAGED shape. */
export function scaleRegion(pcs: Set<PitchClass>, start: number, end: number): FretPos[] {
  const out: FretPos[] = []
  for (const s of STRINGS_LOW_TO_HIGH)
    for (let f = Math.max(0, start); f <= Math.min(NUM_FRETS, end); f++) if (pcs.has(pcAt(s, f))) out.push({ string: s, fret: f })
  return out
}
