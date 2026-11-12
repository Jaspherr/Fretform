import { CHORD_QUALITIES, type ChordQuality, chordRootName } from './chords'
import { NUM_FRETS, STRINGS_LOW_TO_HIGH, midiAt, pcAt } from './fretboard'
import { type AccidentalPref, type PitchClass, displayNote, mod12 } from './notes'
import { buildTones, type Tone } from './tones'

export type FretInput = (number | null)[]

export type ParseResult = { ok: true; frets: FretInput } | { ok: false; error: string }

/**
 * "x32010" (one character per string) or "8 10 10 9 8 8" (space/comma separated).
 * Always six strings, low E first.
 */
export function parseFretString(input: string): ParseResult {
  const s = input.trim()
  if (!s) return { ok: false, error: 'Type six frets, low E first — e.g. x32010.' }
  const tokens = /[\s,\-/]/.test(s) ? s.split(/[\s,\-/]+/).filter(Boolean) : s.split('')
  if (tokens.length !== 6) return { ok: false, error: `Found ${tokens.length} strings — a guitar has 6. Use spaces between frets above 9 (e.g. 8 10 10 9 8 8).` }
  const frets: FretInput = []
  for (const t of tokens) {
    if (/^[xX]$/.test(t)) frets.push(null)
    else if (/^\d{1,2}$/.test(t) && Number(t) <= NUM_FRETS) frets.push(Number(t))
    else return { ok: false, error: `"${t}" isn't a fret. Use 0–${NUM_FRETS} or x for a muted string.` }
  }
  if (frets.every((f) => f === null)) return { ok: false, error: 'All six strings are muted.' }
  return { ok: true, frets }
}

export type MatchKind = 'exact' | 'inversion' | 'missing-optional' | 'ambiguous'

export const MATCH_KIND_LABEL: Record<MatchKind, string> = {
  exact: 'Exact match',
  inversion: 'Inversion',
  'missing-optional': 'Missing an optional note',
  ambiguous: 'Possible — incomplete',
}

export interface ChordMatch {
  rootPc: PitchClass
  quality: ChordQuality
  kind: MatchKind
  /** ASCII symbol including slash bass: "C/E" */
  symbol: string
  rootName: string
  bassName: string
  bassInterval: string
  inversion: string | null
  tones: Tone[]
  missing: Tone[]
  score: number
}

const INVERSION_BY_FAMILY: Record<string, string> = {
  third: '1st inversion',
  fifth: '2nd inversion',
  seventh: '3rd inversion',
}

const TIER_BONUS = { common: 20, more: 12, identify: 4 } as const

/**
 * Name the chord(s) a set of notes could be. Several names are often valid
 * (C6 = Am7), so every reasonable reading is returned, best first.
 */
export function identifyChord(pcsInput: PitchClass[], bassPc: PitchClass, pref: AccidentalPref = 'auto'): ChordMatch[] {
  const set = new Set(pcsInput.map(mod12))
  if (set.size < 2) return []
  const matches: ChordMatch[] = []
  for (const rootPc of set) {
    for (const quality of CHORD_QUALITIES) {
      const tones = buildTones(rootPc, quality.formula, pref)
      const chordPcs = new Set(tones.map((t) => t.pc))
      if ([...set].some((pc) => !chordPcs.has(pc))) continue
      const missing = tones.filter((t) => !set.has(t.pc))
      // A perfect 5th is the note players drop most, so it is always optional.
      const optional = new Set([...(quality.optional ?? []), '5'])
      const missingRequired = missing.filter((t) => !optional.has(t.interval))
      if (quality.id === 'power' && set.size !== 2) continue
      let kind: MatchKind
      if (missingRequired.length === 0) kind = missing.length === 0 ? 'exact' : 'missing-optional'
      else if (missingRequired.length === 1 && set.size >= 3) kind = 'ambiguous'
      else continue
      const bassTone = tones.find((t) => t.pc === bassPc)!
      const isInversion = bassPc !== rootPc
      if (kind === 'exact' && isInversion) kind = 'inversion'
      const rootName = chordRootName(rootPc, quality, pref)
      const bassName = displayNote(bassTone.spelled, pref)
      let score = { exact: 400, inversion: 320, 'missing-optional': 240, ambiguous: 100 }[kind]
      if (!isInversion) score += 30
      score += TIER_BONUS[quality.tier]
      score -= quality.formula.length * 3
      score -= missing.length * 15
      matches.push({
        rootPc,
        quality,
        kind,
        symbol: rootName + quality.symbol + (isInversion ? `/${bassName}` : ''),
        rootName,
        bassName,
        bassInterval: bassTone.interval,
        inversion: isInversion ? (INVERSION_BY_FAMILY[bassTone.family] ?? `${bassName} in the bass (the ${bassTone.interval})`) : null,
        tones,
        missing,
        score,
      })
    }
  }
  matches.sort((a, b) => b.score - a.score)
  const strong = matches.filter((m) => m.kind !== 'ambiguous')
  const weak = matches.filter((m) => m.kind === 'ambiguous')
  // Only fall back to incomplete readings when nothing complete fits.
  return strong.length > 0 ? strong : weak.slice(0, 4)
}

export interface PlayedNote {
  string: (typeof STRINGS_LOW_TO_HIGH)[number]
  fret: number
  pc: PitchClass
  midi: number
}

export function playedNotes(frets: FretInput): PlayedNote[] {
  const out: PlayedNote[] = []
  frets.forEach((f, i) => {
    if (f === null) return
    const s = STRINGS_LOW_TO_HIGH[i]
    out.push({ string: s, fret: f, pc: pcAt(s, f), midi: midiAt(s, f) })
  })
  return out
}

/** Identify directly from six frets (low E first). */
export function identifyFrets(frets: FretInput, pref: AccidentalPref = 'auto'): { notes: PlayedNote[]; matches: ChordMatch[] } {
  const notes = playedNotes(frets)
  if (notes.length === 0) return { notes, matches: [] }
  const bass = notes.reduce((lo, n) => (n.midi < lo.midi ? n : lo))
  return { notes, matches: identifyChord(notes.map((n) => n.pc), bass.pc, pref) }
}

/** Interval of a pitch class relative to a chord match, using the chord's own labels. */
export function intervalInMatch(m: ChordMatch, pc: PitchClass): string {
  const t = m.tones.find((x) => x.pc === pc)
  if (t) return t.interval
  return ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][mod12(pc - m.rootPc)]
}
