import { NUM_FRETS, type StringNum, STRING_SETS, type StringSetId, getStringSet, pcAt } from './fretboard'
import { type PitchClass } from './notes'
import { buildChord } from './chords'
import { type Tone } from './tones'

export type Inversion = 'root' | 'first' | 'second'

export const INVERSION_LABELS: Record<Inversion, string> = {
  root: 'Root position',
  first: '1st inversion',
  second: '2nd inversion',
}

/** The three tones of a triad in a given inversion, low → high (close position). */
export function triadInversion(tones: Tone[], inv: Inversion): Tone[] {
  const [r, t, f] = tones
  if (inv === 'root') return [r, t, f]
  if (inv === 'first') return [t, f, r]
  return [f, r, t]
}

export interface TriadVoicing {
  id: string
  stringSetId: StringSetId
  /** low → high */
  strings: StringNum[]
  /** low → high, matching strings */
  frets: number[]
  /** Interval label of each note, low → high */
  intervals: string[]
  inversion: Inversion
  minFret: number
  maxFret: number
  /** Average fret — used to find the nearest shape */
  center: number
}

/** Max fret span inside one triad shape. 4 = five-fret reach, rarely needed. */
const MAX_SPAN = 4

function inversionFromBass(bassInterval: string, tones: Tone[]): Inversion {
  if (bassInterval === tones[0].interval) return 'root'
  if (bassInterval === tones[1].interval) return 'first'
  return 'second'
}

/**
 * Every playable shape of a 3-note chord on a 3-string set: each string gets one
 * chord tone, all three tones appear once, and the shape fits under one hand.
 */
export function triadsOnStringSet(rootPc: PitchClass, qualityId: string, stringSetId: StringSetId): TriadVoicing[] {
  const set = getStringSet(stringSetId)!
  const tones = buildChord(rootPc, qualityId).tones
  if (tones.length !== 3) throw new Error('triadsOnStringSet needs a 3-note chord')
  const byPc = new Map(tones.map((t) => [t.pc, t]))
  const [s0, s1, s2] = set.strings
  const out: TriadVoicing[] = []
  const options = (s: StringNum) => {
    const r: { fret: number; tone: Tone }[] = []
    for (let f = 0; f <= NUM_FRETS; f++) {
      const t = byPc.get(pcAt(s, f))
      if (t) r.push({ fret: f, tone: t })
    }
    return r
  }
  const o0 = options(s0)
  const o1 = options(s1)
  const o2 = options(s2)
  for (const a of o0)
    for (const b of o1) {
      if (b.tone === a.tone || Math.abs(b.fret - a.fret) > MAX_SPAN) continue
      for (const c of o2) {
        if (c.tone === a.tone || c.tone === b.tone) continue
        const frets = [a.fret, b.fret, c.fret]
        const minFret = Math.min(...frets)
        const maxFret = Math.max(...frets)
        if (maxFret - minFret > MAX_SPAN) continue
        const intervals = [a.tone.interval, b.tone.interval, c.tone.interval]
        out.push({
          id: `${stringSetId}:${frets.join('-')}`,
          stringSetId,
          strings: [s0, s1, s2],
          frets,
          intervals,
          inversion: inversionFromBass(intervals[0], tones),
          minFret,
          maxFret,
          center: (frets[0] + frets[1] + frets[2]) / 3,
        })
      }
    }
  return out.sort((x, y) => x.center - y.center)
}

export function allTriads(rootPc: PitchClass, qualityId: string): TriadVoicing[] {
  return STRING_SETS.flatMap((s) => triadsOnStringSet(rootPc, qualityId, s.id))
}

/**
 * Triads that are literally contained in a full chord voicing: same frets on
 * three adjacent strings. "This small triad is part of the big chord you know."
 */
export function triadsInsideVoicing(
  voicingFrets: (number | null)[],
  rootPc: PitchClass,
  qualityId: string,
): TriadVoicing[] {
  const triadQuality = qualityId === 'major' || qualityId === 'minor' || qualityId === 'dim' || qualityId === 'aug' ? qualityId : null
  if (!triadQuality) return []
  return allTriads(rootPc, triadQuality).filter((t) =>
    t.strings.every((s, i) => voicingFrets[6 - s] === t.frets[i]),
  )
}

export interface ProgressionStep {
  rootPc: PitchClass
  qualityId: string
  triad: TriadVoicing
}

/**
 * Choose one triad per chord on a string set so the hand moves as little as
 * possible. The first chord starts nearest `startFret`; each next chord picks
 * the shape whose frets are closest to the previous one (sum of string moves).
 */
export function connectProgression(
  chords: { rootPc: PitchClass; qualityId: string }[],
  stringSetId: StringSetId,
  startFret: number,
): ProgressionStep[] {
  const steps: ProgressionStep[] = []
  let prev: TriadVoicing | null = null
  for (const c of chords) {
    const options = triadsOnStringSet(c.rootPc, c.qualityId, stringSetId)
    let best = options[0]
    let bestCost = Infinity
    for (const o of options) {
      const cost: number = prev
        ? o.frets.reduce((sum, f, i) => sum + Math.abs(f - prev!.frets[i]), 0)
        : Math.abs(o.center - startFret)
      if (cost < bestCost) {
        best = o
        bestCost = cost
      }
    }
    steps.push({ ...c, triad: best })
    prev = best
  }
  return steps
}
