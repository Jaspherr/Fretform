import { type FretPos, NUM_FRETS, STRINGS_LOW_TO_HIGH, openMidi, posKey } from './fretboard'
import { type PitchClass, mod12 } from './notes'

export interface ScalePattern {
  /** 1-based pattern number */
  index: number
  positions: FretPos[]
  minFret: number
  maxFret: number
  /** Which scale degree index (0-based in the formula) the pattern starts on, on the low E string */
  startDegree: number
}

/**
 * Build an N-notes-per-string pattern by walking the scale upward from a
 * starting note on the low E string, putting N notes on each string.
 * - 2 per string on a pentatonic gives the five familiar boxes
 * - 3 per string on a 7-note scale gives the seven 3NPS shapes
 * The B-string shift falls out automatically because frets are computed from pitch.
 */
export function nPerStringPattern(rootPc: PitchClass, semis: number[], startDegree: number, perString: number): ScalePattern {
  const sorted = [...semis].sort((a, b) => a - b)
  const n = sorted.length
  const lowE = openMidi(6)
  const startPc = mod12(rootPc + sorted[startDegree])
  let midi = lowE + mod12(startPc - lowE)
  // Walk up the scale: degree index and absolute pitch.
  const notes: number[] = []
  let deg = startDegree
  for (let i = 0; i < perString * 6; i++) {
    notes.push(midi)
    const nextDeg = (deg + 1) % n
    const step = nextDeg === 0 ? 12 - sorted[deg] + sorted[0] : sorted[nextDeg] - sorted[deg]
    midi += step
    deg = nextDeg
  }
  let positions: FretPos[] = notes.map((m, i) => {
    const s = STRINGS_LOW_TO_HIGH[Math.floor(i / perString)]
    return { string: s, fret: m - openMidi(s) }
  })
  const min = () => Math.min(...positions.map((p) => p.fret))
  if (min() < 0) positions = positions.map((p) => ({ ...p, fret: p.fret + 12 }))
  const frets = positions.map((p) => p.fret)
  return { index: startDegree + 1, positions, minFret: Math.min(...frets), maxFret: Math.max(...frets), startDegree }
}

/** Pattern moved up an octave, if it still fits on the neck. */
export function shiftPattern(p: ScalePattern, by: number): ScalePattern | null {
  const positions = p.positions.map((q) => ({ ...q, fret: q.fret + by }))
  if (positions.some((q) => q.fret < 0 || q.fret > NUM_FRETS)) return null
  return { ...p, positions, minFret: p.minFret + by, maxFret: p.maxFret + by }
}

/** The five pentatonic boxes, box 1 starting on the root on the low E string. */
export function pentatonicBoxes(rootPc: PitchClass, semis: number[]): ScalePattern[] {
  return semis.map((_, i) => nPerStringPattern(rootPc, semis, i, 2))
}

/** Seven 3-notes-per-string shapes for a 7-note scale. */
export function threeNpsPatterns(rootPc: PitchClass, semis: number[]): ScalePattern[] {
  return semis.map((_, i) => nPerStringPattern(rootPc, semis, i, 3))
}

/** Place pattern `b` next to `a` on the neck: whichever octave of `b` is closest. */
export function nearestPlacement(a: ScalePattern, b: ScalePattern): ScalePattern {
  const center = (p: ScalePattern) => (p.minFret + p.maxFret) / 2
  const candidates = [b, shiftPattern(b, 12), shiftPattern(b, -12)].filter((p): p is ScalePattern => p !== null)
  return candidates.reduce((best, c) => (Math.abs(center(c) - center(a)) < Math.abs(center(best) - center(a)) ? c : best))
}

export interface BoxConnection {
  shared: FretPos[]
  onlyA: FretPos[]
  onlyB: FretPos[]
}

/** Which exact fret positions two patterns share — the "doorways" between them. */
export function connectPatterns(a: ScalePattern, b: ScalePattern): BoxConnection {
  const bKeys = new Set(b.positions.map(posKey))
  const aKeys = new Set(a.positions.map(posKey))
  return {
    shared: a.positions.filter((p) => bKeys.has(posKey(p))),
    onlyA: a.positions.filter((p) => !bKeys.has(posKey(p))),
    onlyB: b.positions.filter((p) => !aKeys.has(posKey(p))),
  }
}
