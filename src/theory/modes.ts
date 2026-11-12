import { parseInterval } from './intervals'
import { type PitchClass, mod12 } from './notes'

export interface ModeDef {
  /** scale id in SCALES */
  scaleId: string
  name: string
  /** Which note of the parent major scale this mode starts on (1–7). */
  degree: number
  /** Interval from the parent major root up to the mode root. */
  fromParent: string
  /** The familiar scale it is easiest to compare against. */
  compareTo: 'major' | 'natural-minor'
  /** The note(s) that make the mode sound like itself. */
  characteristic: string[]
  /** The 7th chord built on the mode's root. */
  chordQualityId: string
  feel: string
  /** Plain-language "how to think about it" line. */
  tip: string
}

export const MODES: ModeDef[] = [
  { scaleId: 'ionian', name: 'Ionian', degree: 1, fromParent: '1', compareTo: 'major', characteristic: ['7'], chordQualityId: 'maj7', feel: 'Bright, resolved', tip: 'It is the major scale. Everything else is measured against it.' },
  { scaleId: 'dorian', name: 'Dorian', degree: 2, fromParent: '2', compareTo: 'natural-minor', characteristic: ['6'], chordQualityId: 'm7', feel: 'Minor, but hopeful', tip: 'Play natural minor, then raise the ♭6 to a 6. That one note is the whole Dorian sound.' },
  { scaleId: 'phrygian', name: 'Phrygian', degree: 3, fromParent: '3', compareTo: 'natural-minor', characteristic: ['b2'], chordQualityId: 'm7', feel: 'Dark, Spanish, heavy', tip: 'Natural minor with the 2 lowered to ♭2 — a half step above the root.' },
  { scaleId: 'lydian', name: 'Lydian', degree: 4, fromParent: '4', compareTo: 'major', characteristic: ['#4'], chordQualityId: 'maj7', feel: 'Floating, dreamy', tip: 'Major scale with the 4 raised to ♯4. Lean on the ♯4 against a major chord.' },
  { scaleId: 'mixolydian', name: 'Mixolydian', degree: 5, fromParent: '5', compareTo: 'major', characteristic: ['b7'], chordQualityId: 'dom7', feel: 'Bluesy major, rock', tip: 'Major scale with the 7 lowered to ♭7. Matches a dominant 7 chord exactly.' },
  { scaleId: 'aeolian', name: 'Aeolian', degree: 6, fromParent: '6', compareTo: 'natural-minor', characteristic: ['b6'], chordQualityId: 'm7', feel: 'Sad, serious', tip: 'It is the natural minor scale. Its ♭6 is what separates it from Dorian.' },
  { scaleId: 'locrian', name: 'Locrian', degree: 7, fromParent: '7', compareTo: 'natural-minor', characteristic: ['b2', 'b5'], chordQualityId: 'm7b5', feel: 'Unstable, tense', tip: 'Natural minor with ♭2 and ♭5. Its home chord is half-diminished, so it rarely feels like home.' },
]

export const MODE_BY_SCALE: Record<string, ModeDef> = Object.fromEntries(MODES.map((m) => [m.scaleId, m]))

/** Parent major-scale root for a mode root. D Dorian → C. */
export function parentMajorRoot(modeRootPc: PitchClass, mode: ModeDef): PitchClass {
  return mod12(modeRootPc - parseInterval(mode.fromParent).semitones)
}
