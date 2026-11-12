/**
 * Intervals are written the way guitarists read them: "1", "b3", "#4", "b7", "9".
 * A label carries both a scale degree (for spelling) and a semitone distance.
 */

/** Semitones above the root for each natural degree of the major scale. */
const MAJOR_DEGREE_SEMIS: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }

export interface ParsedInterval {
  label: string
  /** 1–13 as written */
  degree: number
  /** degree folded into one octave, 1–7 */
  simpleDegree: number
  /** semitones above the root, 0–11 */
  semitones: number
}

export function parseInterval(label: string): ParsedInterval {
  const m = /^(bb|b|##|#)?(\d{1,2})$/.exec(label)
  if (!m) throw new Error(`Bad interval label: ${label}`)
  const acc = m[1] === 'bb' ? -2 : m[1] === 'b' ? -1 : m[1] === '##' ? 2 : m[1] === '#' ? 1 : 0
  const degree = Number(m[2])
  const simpleDegree = ((degree - 1) % 7) + 1
  const semitones = (((MAJOR_DEGREE_SEMIS[simpleDegree] + acc) % 12) + 12) % 12
  return { label, degree, simpleDegree, semitones }
}

/** Interval label for a raw semitone distance when no formula context exists. */
export const CHROMATIC_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'] as const

/**
 * Musical role used to pick colors. Sus chords and scales place 2/4/6 where a
 * 3rd might go, but those still read as "other" — only real 3rds get the 3rd color.
 */
export type IntervalFamily = 'root' | 'third' | 'fifth' | 'seventh' | 'other'

export function intervalFamily(label: string): IntervalFamily {
  const { simpleDegree, degree } = parseInterval(label)
  if (degree > 7) return 'other'
  switch (simpleDegree) {
    case 1:
      return 'root'
    case 3:
      return 'third'
    case 5:
      return 'fifth'
    case 7:
      return 'seventh'
    default:
      return 'other'
  }
}

export const INTERVAL_NAMES: Record<string, string> = {
  '1': 'Root',
  b2: 'Minor 2nd',
  '2': 'Major 2nd',
  '#2': 'Augmented 2nd',
  b3: 'Minor 3rd',
  '3': 'Major 3rd',
  '4': 'Perfect 4th',
  '#4': 'Augmented 4th (tritone)',
  b5: 'Diminished 5th (tritone)',
  '5': 'Perfect 5th',
  '#5': 'Augmented 5th',
  b6: 'Minor 6th',
  '6': 'Major 6th',
  bb7: 'Diminished 7th',
  b7: 'Minor 7th',
  '7': 'Major 7th',
  b9: 'Flat 9th',
  '9': '9th (2nd up an octave)',
  '11': '11th (4th up an octave)',
  '13': '13th (6th up an octave)',
}

export function intervalName(label: string): string {
  return INTERVAL_NAMES[label] ?? label
}

/** "b3" → "♭3" for display. */
export function prettyInterval(label: string): string {
  return label.replace(/b/g, '♭').replace(/#/g, '♯')
}
