import { type PitchClass, mod12 } from './notes'

/**
 * Strings are numbered like guitarists number them: 1 = high E, 6 = low E.
 * Notes are never stored per fret — every note is open pitch + fret.
 */
export type StringNum = 1 | 2 | 3 | 4 | 5 | 6

export interface GuitarString {
  num: StringNum
  name: string
  openMidi: number
}

export const STANDARD_TUNING: GuitarString[] = [
  { num: 6, name: 'E', openMidi: 40 },
  { num: 5, name: 'A', openMidi: 45 },
  { num: 4, name: 'D', openMidi: 50 },
  { num: 3, name: 'G', openMidi: 55 },
  { num: 2, name: 'B', openMidi: 59 },
  { num: 1, name: 'e', openMidi: 64 },
]

/** Low → high: [6, 5, 4, 3, 2, 1] */
export const STRINGS_LOW_TO_HIGH: StringNum[] = [6, 5, 4, 3, 2, 1]

export const NUM_FRETS = 22

export const SINGLE_MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_MARKERS = [12]

export function openMidi(s: StringNum): number {
  return STANDARD_TUNING[6 - s].openMidi
}

export function midiAt(s: StringNum, fret: number): number {
  return openMidi(s) + fret
}

export function pcAt(s: StringNum, fret: number): PitchClass {
  return mod12(midiAt(s, fret))
}

export interface FretPos {
  string: StringNum
  fret: number
}

export const posKey = (p: FretPos) => `${p.string}:${p.fret}`

/** Every fret (0..maxFret) on a string where the pitch class appears. */
export function fretsForPc(s: StringNum, pc: PitchClass, maxFret = NUM_FRETS): number[] {
  const first = mod12(pc - openMidi(s))
  const out: number[] = []
  for (let f = first; f <= maxFret; f += 12) out.push(f)
  return out
}

export function positionsOf(pcs: Iterable<PitchClass>, range: FretRange = FULL_RANGE): FretPos[] {
  const set = new Set(pcs)
  const out: FretPos[] = []
  for (const s of STRINGS_LOW_TO_HIGH) {
    for (let f = range.start; f <= range.end; f++) if (set.has(pcAt(s, f))) out.push({ string: s, fret: f })
  }
  return out
}

export interface FretRange {
  start: number
  end: number
}

export const FULL_RANGE: FretRange = { start: 0, end: NUM_FRETS }

export const inRange = (fret: number, r: FretRange) => fret >= r.start && fret <= r.end

export const NECK_REGIONS = [
  { id: 'all', label: 'Whole neck', range: FULL_RANGE },
  { id: 'open', label: 'Open–5', range: { start: 0, end: 5 } },
  { id: '5-9', label: '5–9', range: { start: 5, end: 9 } },
  { id: '9-12', label: '9–12', range: { start: 9, end: 12 } },
  { id: '12+', label: '12+', range: { start: 12, end: NUM_FRETS } },
] as const

export type NeckRegionId = (typeof NECK_REGIONS)[number]['id']

/** Octave positions for a fretted note: the classic "two strings over, two frets up" shapes. */
export function octavesOf(p: FretPos, range: FretRange = FULL_RANGE): FretPos[] {
  const pc = pcAt(p.string, p.fret)
  return positionsOf([pc], range).filter((q) => !(q.string === p.string && q.fret === p.fret))
}

/** Lower-number string = higher pitch. Adjacent string sets for triads. */
export const STRING_SETS = [
  { id: '123', label: '1–2–3', strings: [3, 2, 1] as StringNum[] },
  { id: '234', label: '2–3–4', strings: [4, 3, 2] as StringNum[] },
  { id: '345', label: '3–4–5', strings: [5, 4, 3] as StringNum[] },
  { id: '456', label: '4–5–6', strings: [6, 5, 4] as StringNum[] },
] as const

export type StringSetId = (typeof STRING_SETS)[number]['id']

export function getStringSet(id: string | null | undefined) {
  return STRING_SETS.find((s) => s.id === id)
}
