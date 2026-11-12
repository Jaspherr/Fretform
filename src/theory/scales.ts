import { parseInterval } from './intervals'
import { MODE_BY_SCALE, type ModeDef } from './modes'
import { type AccidentalPref, type PitchClass, type SpelledNote, mod12, pcOf, rootSpelling, spellPc, transposeSpelled } from './notes'
import { buildTones, isMinorish, type Tone } from './tones'

export type ScaleGroup = 'Major' | 'Minor' | 'Modes' | 'Other'

export interface ScaleDef {
  id: string
  name: string
  group: ScaleGroup
  formula: string[]
  description: string
  contexts: string[]
  /** Relative scale: same notes, different root. degree = interval from this root to the relative root. */
  relative?: { scaleId: string; interval: string; label: string }
  /** Whether the five-box pentatonic view makes sense. */
  pentatonic?: boolean
  /** Whether the 3-notes-per-string view makes sense (7-note scales). */
  threeNps?: boolean
  /** Whether CAGED-region view makes sense (has a clear major or minor 3rd). */
  caged?: boolean
}

const MAJOR = ['1', '2', '3', '4', '5', '6', '7']
const NAT_MINOR = ['1', '2', 'b3', '4', '5', 'b6', 'b7']

export const SCALES: ScaleDef[] = [
  {
    id: 'major',
    name: 'Major',
    group: 'Major',
    formula: MAJOR,
    description: 'The reference scale everything else is compared to. Every interval in a chord name (3rd, 5th, 7th) is counted from it.',
    contexts: ['Pop and rock melodies', 'Country', 'Building the chords of a key'],
    relative: { scaleId: 'natural-minor', interval: '6', label: 'Relative minor' },
    threeNps: true,
    caged: true,
  },
  {
    id: 'major-pentatonic',
    name: 'Major Pentatonic',
    group: 'Major',
    formula: ['1', '2', '3', '5', '6'],
    description: 'The major scale minus the 4th and 7th — the two notes most likely to clash. Same five shapes as minor pentatonic, different root.',
    contexts: ['Country and southern rock leads', 'Happy-sounding fills', 'Soloing over major chords'],
    relative: { scaleId: 'minor-pentatonic', interval: '6', label: 'Relative minor pentatonic' },
    pentatonic: true,
    caged: true,
  },
  {
    id: 'natural-minor',
    name: 'Natural Minor',
    group: 'Minor',
    formula: NAT_MINOR,
    description: 'The major scale started from its 6th note. Same notes as its relative major, but centered on a darker root.',
    contexts: ['Rock and metal', 'Ballads', 'Minor-key pop'],
    relative: { scaleId: 'major', interval: 'b3', label: 'Relative major' },
    threeNps: true,
    caged: true,
  },
  {
    id: 'minor-pentatonic',
    name: 'Minor Pentatonic',
    group: 'Minor',
    formula: ['1', 'b3', '4', '5', 'b7'],
    description: 'The first scale most guitarists learn. Five notes, no half-steps, very hard to make sound wrong over minor or bluesy music.',
    contexts: ['Blues and rock solos', 'Riffs', 'Bends and licks'],
    relative: { scaleId: 'major-pentatonic', interval: 'b3', label: 'Relative major pentatonic' },
    pentatonic: true,
    caged: true,
  },
  {
    id: 'blues',
    name: 'Blues',
    group: 'Minor',
    formula: ['1', 'b3', '4', 'b5', '5', 'b7'],
    description: 'Minor pentatonic plus the ♭5 "blue note". Use the ♭5 as a passing note rather than a place to stop.',
    contexts: ['Blues', 'Classic rock', 'Funk riffs'],
    caged: true,
  },
  {
    id: 'harmonic-minor',
    name: 'Harmonic Minor',
    group: 'Minor',
    formula: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    description: 'Natural minor with a raised 7th. That major 7th makes the V chord major, giving minor keys a strong pull home.',
    contexts: ['Neoclassical metal', 'Flamenco and Middle-Eastern flavors', 'Over the V7 chord in a minor key'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'melodic-minor',
    name: 'Melodic Minor',
    group: 'Minor',
    formula: ['1', '2', 'b3', '4', '5', '6', '7'],
    description: 'A major scale with a flat 3rd. Sounds minor at the bottom and major at the top. (This is the jazz/ascending form.)',
    contexts: ['Jazz', 'Film music', 'Smooth minor lines'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'ionian',
    name: 'Ionian',
    group: 'Modes',
    formula: MAJOR,
    description: 'Mode 1 — exactly the major scale.',
    contexts: ['Anything in a major key'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'dorian',
    name: 'Dorian',
    group: 'Modes',
    formula: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    description: 'Minor with a major 6th. Brighter and jazzier than natural minor.',
    contexts: ['Funk and soul', 'Santana-style rock', 'Minor jams on one chord'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    group: 'Modes',
    formula: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    description: 'Minor with a ♭2. That half-step above the root gives it a dark, Spanish or metal flavor.',
    contexts: ['Metal riffs', 'Flamenco-flavored lines'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'lydian',
    name: 'Lydian',
    group: 'Modes',
    formula: ['1', '2', '3', '#4', '5', '6', '7'],
    description: 'Major with a raised 4th. Floating, dreamy, a bit cinematic.',
    contexts: ['Film scores', 'Instrumental rock', 'Over maj7 chords'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    group: 'Modes',
    formula: ['1', '2', '3', '4', '5', '6', 'b7'],
    description: 'Major with a ♭7. The sound of dominant 7 chords — classic rock, blues-rock and jam-band soloing.',
    contexts: ['Classic rock', 'Blues-rock', 'Over dominant 7 chords'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'aeolian',
    name: 'Aeolian',
    group: 'Modes',
    formula: NAT_MINOR,
    description: 'Mode 6 — exactly the natural minor scale.',
    contexts: ['Anything in a minor key'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'locrian',
    name: 'Locrian',
    group: 'Modes',
    formula: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    description: 'The only mode with a ♭5, so its home chord is diminished. Unstable; rarely used as a home base.',
    contexts: ['Over m7♭5 chords', 'Some metal'],
    threeNps: true,
    caged: true,
  },
  {
    id: 'whole-tone',
    name: 'Whole Tone',
    group: 'Other',
    formula: ['1', '2', '3', '#4', '#5', 'b7'],
    description: 'Six notes, every one a whole step apart. No sense of home — it sounds like a dream sequence.',
    contexts: ['Over augmented and 7♯5 chords', 'Special effects'],
  },
  {
    id: 'diminished-hw',
    name: 'Diminished (Half-Whole)',
    group: 'Other',
    formula: ['1', 'b2', '#2', '3', '#4', '5', '6', 'b7'],
    description: 'Alternates half and whole steps. Fits dominant 7 chords with a tense, altered sound.',
    contexts: ['Jazz and fusion over 7♭9 chords'],
  },
  {
    id: 'diminished-wh',
    name: 'Diminished (Whole-Half)',
    group: 'Other',
    formula: ['1', '2', 'b3', '4', 'b5', 'b6', '6', '7'],
    description: 'Alternates whole and half steps. Fits diminished 7 chords.',
    contexts: ['Over dim7 chords'],
  },
  {
    id: 'chromatic',
    name: 'Chromatic',
    group: 'Other',
    formula: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
    description: 'All twelve notes. Not something you solo with, but it shows that every fret is a half-step.',
    contexts: ['Passing tones', 'Learning the neck'],
  },
]

export const SCALE_BY_ID: Record<string, ScaleDef> = Object.fromEntries(SCALES.map((s) => [s.id, s]))

export function getScale(id: string | null | undefined): ScaleDef | undefined {
  return id ? SCALE_BY_ID[id] : undefined
}

export interface Scale {
  rootPc: PitchClass
  def: ScaleDef
  tones: Tone[]
}

/** Total accidentals in the major key on this spelled root (a double flat counts twice). */
function majorKeyAccidentals(root: SpelledNote): number {
  return buildTones(pcOf(root), MAJOR, 'auto', root).reduce((n, t) => n + Math.abs(t.spelled.acc), 0)
}

/**
 * Spell a mode's parent major root from the mode root: D Dorian → C, D♯ Locrian → E.
 * Going up the inverted interval lands on the same letter as going down.
 */
export function parentMajorSpelling(modeRoot: SpelledNote, mode: ModeDef): SpelledNote {
  const iv = parseInterval(mode.fromParent)
  return transposeSpelled(modeRoot, 9 - iv.simpleDegree, mod12(12 - iv.semitones))
}

/**
 * Root spelling for a scale. With automatic spelling a mode is named from the
 * parent key that needs the fewest accidentals — D♯ Locrian (parent E major),
 * not E♭ Locrian (parent F♭ major, which needs B𝄫); G♭ Lydian (parent D♭), not
 * F♯ Lydian (parent C♯, seven sharps). On a tie the usual key spelling stays.
 */
export function scaleRootSpelling(rootPc: PitchClass, scaleId: string, pref: AccidentalPref = 'auto'): SpelledNote {
  const def = SCALE_BY_ID[scaleId]
  const fallback = rootSpelling(rootPc, pref, def ? isMinorish(def.formula) : false)
  const mode = MODE_BY_SCALE[scaleId]
  if (pref !== 'auto' || !mode) return fallback
  const cost = (r: SpelledNote) => majorKeyAccidentals(parentMajorSpelling(r, mode))
  let best = fallback
  for (const cand of [spellPc(rootPc, 'sharp'), spellPc(rootPc, 'flat')])
    if (cost(cand) < cost(best)) best = cand
  return best
}

/**
 * `rootSpelled` lets a page keep two related scales on the same spelling
 * (a mode and the scale it is compared with).
 */
export function buildScale(rootPc: PitchClass, scaleId: string, pref: AccidentalPref = 'auto', rootSpelled?: SpelledNote): Scale {
  const def = SCALE_BY_ID[scaleId]
  if (!def) throw new Error(`Unknown scale ${scaleId}`)
  return { rootPc, def, tones: buildTones(rootPc, def.formula, pref, rootSpelled ?? scaleRootSpelling(rootPc, scaleId, pref)) }
}

/** "1 – b3 – 4 – 5 – b7" */
export function formulaString(formula: readonly string[]): string {
  return formula.join(' – ')
}
