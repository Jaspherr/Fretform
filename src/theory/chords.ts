import { type AccidentalPref, type PitchClass, displayNote, pretty, rootSpelling } from './notes'
import { buildTones, isMinorish, type Tone } from './tones'

export type ChordTier = 'common' | 'more' | 'identify'

export interface ChordQuality {
  id: string
  name: string
  /** Suffix after the root: "" for major, "m", "7", "maj7", "°" … */
  symbol: string
  formula: string[]
  /** Tones that can be left out and the chord still reads the same (usually the 5th). */
  optional?: string[]
  tier: ChordTier
  /** One-liner in plain language. */
  sound: string
}

export const CHORD_QUALITIES: ChordQuality[] = [
  { id: 'major', name: 'Major', symbol: '', formula: ['1', '3', '5'], tier: 'common', sound: 'Bright, settled, home.' },
  { id: 'minor', name: 'Minor', symbol: 'm', formula: ['1', 'b3', '5'], tier: 'common', sound: 'Darker and more serious. Only the 3rd differs from major.' },
  { id: 'dom7', name: 'Dominant 7', symbol: '7', formula: ['1', '3', '5', 'b7'], optional: ['5'], tier: 'common', sound: 'Bluesy and restless — it wants to move somewhere.' },
  { id: 'maj7', name: 'Major 7', symbol: 'maj7', formula: ['1', '3', '5', '7'], optional: ['5'], tier: 'common', sound: 'Soft, dreamy major.' },
  { id: 'm7', name: 'Minor 7', symbol: 'm7', formula: ['1', 'b3', '5', 'b7'], optional: ['5'], tier: 'common', sound: 'Smooth minor, common in soul, funk and pop.' },
  { id: 'sus2', name: 'Sus2', symbol: 'sus2', formula: ['1', '2', '5'], tier: 'more', sound: 'Open and airy — the 3rd is replaced by the 2nd.' },
  { id: 'sus4', name: 'Sus4', symbol: 'sus4', formula: ['1', '4', '5'], tier: 'more', sound: 'Suspended tension that usually resolves back to major.' },
  { id: 'dim', name: 'Diminished', symbol: 'dim', formula: ['1', 'b3', 'b5'], tier: 'more', sound: 'Tense and unstable — two stacked minor 3rds.' },
  { id: 'aug', name: 'Augmented', symbol: 'aug', formula: ['1', '3', '#5'], tier: 'more', sound: 'Stretched, unresolved major.' },
  { id: 'm7b5', name: 'Minor 7♭5', symbol: 'm7b5', formula: ['1', 'b3', 'b5', 'b7'], tier: 'more', sound: 'Half-diminished; the vii chord of a major key.' },
  { id: 'dim7', name: 'Diminished 7', symbol: 'dim7', formula: ['1', 'b3', 'b5', 'bb7'], tier: 'more', sound: 'Symmetrical — every note is a minor 3rd apart.' },
  { id: 'power', name: 'Power chord', symbol: '5', formula: ['1', '5'], tier: 'more', sound: 'No 3rd, so neither major nor minor.' },
  // Used by the identifier so real-world shapes get sensible names.
  { id: '6', name: 'Major 6', symbol: '6', formula: ['1', '3', '5', '6'], optional: ['5'], tier: 'identify', sound: 'Sweet, vintage major.' },
  { id: 'm6', name: 'Minor 6', symbol: 'm6', formula: ['1', 'b3', '5', '6'], optional: ['5'], tier: 'identify', sound: 'Minor with a bittersweet 6th.' },
  { id: 'add9', name: 'Add 9', symbol: 'add9', formula: ['1', '3', '5', '9'], optional: ['5'], tier: 'identify', sound: 'Major with a shimmering 9th.' },
  { id: 'madd9', name: 'Minor add 9', symbol: 'madd9', formula: ['1', 'b3', '5', '9'], optional: ['5'], tier: 'identify', sound: 'Minor with a 9th.' },
  { id: '9', name: 'Dominant 9', symbol: '9', formula: ['1', '3', '5', 'b7', '9'], optional: ['5'], tier: 'identify', sound: 'Funky dominant.' },
  { id: 'maj9', name: 'Major 9', symbol: 'maj9', formula: ['1', '3', '5', '7', '9'], optional: ['5'], tier: 'identify', sound: 'Lush major 7 with a 9th.' },
  { id: 'm9', name: 'Minor 9', symbol: 'm9', formula: ['1', 'b3', '5', 'b7', '9'], optional: ['5'], tier: 'identify', sound: 'Lush minor 7 with a 9th.' },
  { id: '7sus4', name: '7sus4', symbol: '7sus4', formula: ['1', '4', '5', 'b7'], optional: ['5'], tier: 'identify', sound: 'Dominant with a suspended 4th.' },
  { id: 'mmaj7', name: 'Minor-major 7', symbol: 'm(maj7)', formula: ['1', 'b3', '5', '7'], optional: ['5'], tier: 'identify', sound: 'Dark and cinematic.' },
]

export const QUALITY_BY_ID: Record<string, ChordQuality> = Object.fromEntries(CHORD_QUALITIES.map((q) => [q.id, q]))

export const EXPLORER_QUALITIES = CHORD_QUALITIES.filter((q) => q.tier !== 'identify')

export function getQuality(id: string | null | undefined): ChordQuality | undefined {
  return id ? QUALITY_BY_ID[id] : undefined
}

export interface Chord {
  rootPc: PitchClass
  quality: ChordQuality
  tones: Tone[]
}

export function buildChord(rootPc: PitchClass, qualityId: string, pref: AccidentalPref = 'auto'): Chord {
  const quality = QUALITY_BY_ID[qualityId]
  if (!quality) throw new Error(`Unknown chord quality ${qualityId}`)
  return { rootPc, quality, tones: buildTones(rootPc, quality.formula, pref) }
}

export function chordRootName(rootPc: PitchClass, quality: ChordQuality, pref: AccidentalPref = 'auto'): string {
  return displayNote(rootSpelling(rootPc, pref, isMinorish(quality.formula)), pref)
}

/** "Bb", "F#m7", "Cmaj7" — ASCII. Use pretty() for display. */
export function chordSymbol(rootPc: PitchClass, quality: ChordQuality, pref: AccidentalPref = 'auto'): string {
  return chordRootName(rootPc, quality, pref) + quality.symbol
}

/** "B♭ Major", "F♯ Minor 7" */
export function chordLongName(rootPc: PitchClass, quality: ChordQuality, pref: AccidentalPref = 'auto'): string {
  return `${pretty(chordRootName(rootPc, quality, pref))} ${quality.name}`
}

/** Triad qualities offered by the triad tools. */
export const TRIAD_QUALITY_IDS = ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'] as const
