import { intervalFamily, parseInterval, type IntervalFamily } from './intervals'
import {
  type AccidentalPref,
  type PitchClass,
  type SpelledNote,
  displayNote,
  mod12,
  rootSpelling,
  transposeSpelled,
} from './notes'

/** One note of a chord or scale, seen from its root. */
export interface Tone {
  pc: PitchClass
  /** interval label relative to the root: "1", "b3", "5" … */
  interval: string
  family: IntervalFamily
  spelled: SpelledNote
}

/** Does this formula contain a minor third (and no major third)? Used for root spelling. */
export function isMinorish(formula: readonly string[]): boolean {
  return formula.includes('b3') && !formula.includes('3')
}

/**
 * Build the tones of any formula (chord or scale) on a root. `rootSpelled`
 * overrides the default root spelling when the context decides it (a mode is
 * spelled from its parent key).
 */
export function buildTones(
  rootPc: PitchClass,
  formula: readonly string[],
  pref: AccidentalPref = 'auto',
  rootSpelled?: SpelledNote,
): Tone[] {
  const root = rootSpelled ?? rootSpelling(rootPc, pref, isMinorish(formula))
  return formula.map((label) => {
    const iv = parseInterval(label)
    return {
      pc: mod12(rootPc + iv.semitones),
      interval: label,
      family: intervalFamily(label),
      spelled: transposeSpelled(root, iv.degree, iv.semitones),
    }
  })
}

export function toneNames(tones: Tone[], pref: AccidentalPref = 'auto'): string[] {
  return tones.map((t) => displayNote(t.spelled, pref))
}

/**
 * Lookup table from pitch class → tone, so fretboard cells can be resolved in O(1).
 * When a formula lists the same pitch class twice (e.g. "b5" and "#4"), the first wins.
 */
export function toneMap(tones: Tone[]): Map<PitchClass, Tone> {
  const m = new Map<PitchClass, Tone>()
  for (const t of tones) if (!m.has(t.pc)) m.set(t.pc, t)
  return m
}

/**
 * Tones for an arbitrary set of pitch classes measured from a root, when there
 * is no formula (e.g. notes picked by hand). Intervals use the common chromatic names.
 */
export function tonesFromPcs(rootPc: PitchClass, pcs: Iterable<PitchClass>, pref: AccidentalPref = 'auto'): Tone[] {
  const labels = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']
  const formula = [...new Set([...pcs].map((p) => mod12(p - rootPc)))].sort((a, b) => a - b).map((s) => labels[s])
  return buildTones(rootPc, formula, pref)
}
