/**
 * Notes and enharmonic spelling.
 *
 * Internally every note is a pitch class (0–11, C = 0). Spelling is layered on
 * top: a SpelledNote keeps the letter + accidental so that, e.g., the 3rd of
 * Bb major is spelled "D" and the b3 of F# minor is "A", never "Bbb"/"G##".
 */

export type PitchClass = number

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

const LETTER_PC: Record<Letter, PitchClass> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export type AccidentalPref = 'auto' | 'sharp' | 'flat'

export interface SpelledNote {
  letter: Letter
  /** -2 = double flat … +2 = double sharp */
  acc: number
}

export const mod12 = (n: number): PitchClass => ((n % 12) + 12) % 12

/** Smallest signed distance in semitones, in the range -6..5 */
const signedDiff = (n: number) => {
  const m = mod12(n)
  return m > 5 ? m - 12 : m
}

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

/** Conventional root spellings for major-type keys (fewest accidentals). */
const AUTO_MAJOR_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
/** Conventional root spellings for minor-type keys (C#m, not Dbm; G#m, not Abm). */
const AUTO_MINOR_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const

export function pcOf(n: SpelledNote): PitchClass {
  return mod12(LETTER_PC[n.letter] + n.acc)
}

export function accidentalString(acc: number): string {
  if (acc === 0) return ''
  return (acc > 0 ? '#' : 'b').repeat(Math.abs(acc))
}

/** ASCII name, e.g. "Bb", "F#". */
export function noteToString(n: SpelledNote): string {
  return n.letter + accidentalString(n.acc)
}

/** Replace ASCII accidentals with musical glyphs for display: "Bb" → "B♭". */
export function pretty(name: string): string {
  return name.replace(/([A-G])(#{1,2}|b{1,2})/g, (_m, l: string, a: string) => l + (a[0] === '#' ? '♯' : '♭').repeat(a.length))
}

export function parseNote(input: string): SpelledNote | null {
  const m = /^\s*([A-Ga-g])\s*(##|#|♯|bb|b|♭|x)?\s*$/.exec(input)
  if (!m) return null
  const letter = m[1].toUpperCase() as Letter
  const a = m[2] ?? ''
  const acc = a === '##' || a === 'x' ? 2 : a === '#' || a === '♯' ? 1 : a === 'bb' ? -2 : a === 'b' || a === '♭' ? -1 : 0
  return { letter, acc }
}

export function pcName(pc: PitchClass, pref: 'sharp' | 'flat'): string {
  return (pref === 'sharp' ? SHARP_NAMES : FLAT_NAMES)[mod12(pc)]
}

export function spellPc(pc: PitchClass, pref: 'sharp' | 'flat'): SpelledNote {
  return parseNote(pcName(pc, pref))!
}

/** Default spelling for a key/chord root when no explicit preference is given. */
export function autoRoot(pc: PitchClass, minorish = false): SpelledNote {
  return parseNote((minorish ? AUTO_MINOR_ROOTS : AUTO_MAJOR_ROOTS)[mod12(pc)])!
}

/** Root spelling honoring the user's accidental preference. */
export function rootSpelling(pc: PitchClass, pref: AccidentalPref, minorish = false): SpelledNote {
  return pref === 'auto' ? autoRoot(pc, minorish) : spellPc(pc, pref)
}

/**
 * Display name for a note that was spelled relative to some root.
 * - auto: keep the theoretical spelling unless it needs a double accidental
 * - sharp/flat: the user asked for one accidental type everywhere
 */
export function displayNote(n: SpelledNote, pref: AccidentalPref): string {
  const pc = pcOf(n)
  if (pref === 'auto') {
    if (Math.abs(n.acc) <= 1) return noteToString(n)
    return pcName(pc, n.acc > 0 ? 'sharp' : 'flat')
  }
  return pcName(pc, pref)
}

/** Move a spelled root by an interval (degree + semitones) and keep correct letter spelling. */
export function transposeSpelled(root: SpelledNote, degree: number, semitones: number): SpelledNote {
  const rootLetterIdx = LETTERS.indexOf(root.letter)
  const letter = LETTERS[(rootLetterIdx + degree - 1) % 7]
  const target = pcOf(root) + semitones
  const acc = signedDiff(target - LETTER_PC[letter])
  return { letter, acc }
}

export interface RootOption {
  pc: PitchClass
  /** Label shown in pickers, e.g. "C♯/D♭" */
  label: string
  /** URL-safe slug, e.g. "Db" */
  slug: string
}

// Pickers show the most common name; C#/Db and F#/Gb are genuinely
// split in practice, so they show both.
const PICKER_LABELS = ['C', 'C#/Db', 'D', 'Eb', 'E', 'F', 'F#/Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export const ROOT_OPTIONS: RootOption[] = PICKER_LABELS.map((l, pc) => ({
  pc,
  label: pretty(l),
  slug: AUTO_MAJOR_ROOTS[pc],
}))

/** Parse a root from a URL slug or user text ("Db", "c#", "F♯"). */
export function parseRootPc(input: string | null | undefined): PitchClass | null {
  if (!input) return null
  const n = parseNote(input)
  return n ? pcOf(n) : null
}

export function rootSlug(pc: PitchClass): string {
  return AUTO_MAJOR_ROOTS[mod12(pc)]
}
