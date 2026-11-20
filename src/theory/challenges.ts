/**
 * Small "find it on the neck" challenges. Each one is generated from the theory
 * engine (never a stored answer key), checks a tapped position, and explains
 * what was tapped in musical terms — the reward is understanding, not points.
 */
import { buildChord } from './chords'
import { type FretPos, type FretRange, type StringNum, pcAt, positionsOf } from './fretboard'
import { CHROMATIC_LABELS, intervalName } from './intervals'
import { type PitchClass, mod12, pcName } from './notes'
import { buildScale } from './scales'

export type ChallengeKind = 'find-note' | 'find-interval' | 'octave' | 'shared' | 'target' | 'scale-tone'

export interface Challenge {
  kind: ChallengeKind
  /** The question, phrased as a player would ask it */
  prompt: string
  /** Frets the answer must be inside */
  range: FretRange
  /** Positions shown as context (e.g. the root you're measuring from) */
  given: FretPos[]
  /** Every correct position in range */
  answers: FretPos[]
  /** Pitch classes that count as correct (for explaining near misses) */
  correctPcs: PitchClass[]
  /** Optional string restriction */
  onString?: StringNum
  context: { rootPc?: PitchClass; nextRootPc?: PitchClass; quality?: string; nextQuality?: string }
}

export interface ChallengeResult {
  correct: boolean
  /** What the tapped note is, in musical terms */
  explanation: string
}

type Rng = () => number
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]
const nm = (pc: PitchClass) => pcName(pc, [1, 3, 6, 8, 10].includes(pc) && pc !== 6 ? 'flat' : 'sharp')
const ORD: Record<string, string> = { '3': '3rd', b3: '♭3rd', '5': '5th', '1': 'root', b7: '♭7th', '7': '7th' }

function filterRange(ps: FretPos[], r: FretRange, s?: StringNum) {
  return ps.filter((p) => p.fret >= r.start && p.fret <= r.end && (!s || p.string === s))
}

export function makeChallenge(kind: ChallengeKind, rng: Rng): Challenge {
  const window = (w: number) => {
    const start = pick(rng, [0, 2, 3, 5, 7])
    return { start, end: start + w }
  }
  switch (kind) {
    case 'find-note': {
      const pc = pick(rng, [0, 2, 4, 5, 7, 9, 11])
      const s = pick(rng, [6, 5, 4, 3] as StringNum[])
      const range = { start: 0, end: 12 }
      return { kind, prompt: `Find ${nm(pc)} on the ${['', 'high e', 'B', 'G', 'D', 'A', 'low E'][s]} string.`, range, given: [], onString: s, answers: filterRange(positionsOf([pc], range), range, s), correctPcs: [pc], context: {} }
    }
    case 'find-interval': {
      const root = pick(rng, [0, 2, 4, 5, 7, 9])
      const quality = pick(rng, ['major', 'minor'])
      const label = pick(rng, quality === 'major' ? ['3', '5'] : ['b3', '5'])
      const tones = buildChord(root, quality).tones
      const target = tones.find((t) => t.interval === label)!.pc
      const range = window(4)
      const given = filterRange(positionsOf([root], range), range)
      return {
        kind,
        prompt: `The squares are ${nm(root)}. Find the ${ORD[label]} of ${nm(root)} ${quality} near them.`,
        range,
        given,
        answers: filterRange(positionsOf([target], range), range),
        correctPcs: [target],
        context: { rootPc: root, quality },
      }
    }
    case 'octave': {
      const s = pick(rng, [6, 5, 4] as StringNum[])
      const f = pick(rng, [2, 3, 5, 7])
      const pc = pcAt(s, f)
      const range = { start: Math.max(0, f - 1), end: f + 4 }
      const answers = filterRange(positionsOf([pc], range), range).filter((p) => p.string === s - 2)
      return { kind, prompt: `Find the same note one octave higher, two strings up.`, range, given: [{ string: s, fret: f }], answers, correctPcs: [pc], context: { rootPc: pc } }
    }
    case 'shared': {
      const key = pick(rng, [0, 2, 7, 9, 5])
      const scale = buildScale(key, 'major').tones
      // Pairs that always share at least one note (IV and V share none, so they're not here).
      const [a, b] = pick(rng, [[0, 3], [0, 4], [1, 4], [0, 5], [5, 3]] as const)
      const qa = [0, 3, 4].includes(a) ? 'major' : 'minor'
      const qb = [0, 3, 4].includes(b) ? 'major' : 'minor'
      const ca = new Set(buildChord(scale[a].pc, qa).tones.map((t) => t.pc))
      const shared = buildChord(scale[b].pc, qb).tones.map((t) => t.pc).filter((pc) => ca.has(pc))
      const range = window(4)
      return {
        kind,
        prompt: `Going from ${nm(scale[a].pc)}${qa === 'minor' ? 'm' : ''} to ${nm(scale[b].pc)}${qb === 'minor' ? 'm' : ''}: find a note that's in both chords — it can stay put.`,
        range,
        given: [],
        answers: filterRange(positionsOf(shared, range), range),
        correctPcs: shared,
        context: { rootPc: scale[a].pc, quality: qa, nextRootPc: scale[b].pc, nextQuality: qb },
      }
    }
    case 'target': {
      const root = pick(rng, [7, 0, 2, 9])
      const next = mod12(root + 5)
      const ca = new Set(buildChord(root, 'major').tones.map((t) => t.pc))
      const targets = buildChord(next, 'major').tones.map((t) => t.pc).filter((pc) => !ca.has(pc))
      const range = window(4)
      return {
        kind,
        prompt: `You're on ${nm(root)}, going to ${nm(next)}. Find a note of ${nm(next)} that isn't in ${nm(root)} — that's where a fill should land.`,
        range,
        given: [],
        answers: filterRange(positionsOf(targets, range), range),
        correctPcs: targets,
        context: { rootPc: root, quality: 'major', nextRootPc: next, nextQuality: 'major' },
      }
    }
    case 'scale-tone': {
      const root = pick(rng, [7, 0, 9, 2])
      const chord = new Set(buildChord(root, 'major').tones.map((t) => t.pc))
      const extra = buildScale(root, 'major').tones.map((t) => t.pc).filter((pc) => !chord.has(pc))
      const range = window(4)
      return {
        kind,
        prompt: `Find a note of the ${nm(root)} major scale that is not in the ${nm(root)} chord — one of the "in-between" notes.`,
        range,
        given: filterRange(positionsOf([...chord], range), range),
        answers: filterRange(positionsOf(extra, range), range),
        correctPcs: extra,
        context: { rootPc: root, quality: 'major' },
      }
    }
  }
}

/** Is the tap right, and what is the tapped note? */
export function checkTap(c: Challenge, p: FretPos): ChallengeResult {
  const pc = pcAt(p.string, p.fret)
  const inRange = p.fret >= c.range.start && p.fret <= c.range.end
  const correct = inRange && c.answers.some((a) => a.string === p.string && a.fret === p.fret)
  const name = nm(pc)
  const rel = (root: PitchClass) => intervalName(CHROMATIC_LABELS[mod12(pc - root)]).toLowerCase()
  let what = name
  if (c.context.rootPc !== undefined && c.kind !== 'octave') what = `${name} — the ${rel(c.context.rootPc)} of ${nm(c.context.rootPc)}`
  if (c.kind === 'octave') what = pc === c.correctPcs[0] ? `${name}, the same note` : `${name}, not the same note`
  if (!inRange) return { correct: false, explanation: `That's outside frets ${c.range.start}–${c.range.end}. Stay in the highlighted area.` }
  if (c.onString && p.string !== c.onString) return { correct: false, explanation: `That's ${name}, but on a different string.` }
  if (correct) return { correct: true, explanation: `Yes — ${what}.` }
  if (c.kind === 'octave' && pc === c.correctPcs[0]) return { correct: false, explanation: `${name} is right, but it's not two strings up from the starting note.` }
  return { correct: false, explanation: `That's ${what}. Try again.` }
}

export const CHALLENGE_KINDS: readonly ChallengeKind[] = ['find-note', 'find-interval', 'octave', 'shared', 'target', 'scale-tone']

/** Small seeded generator so "another one" is varied but tests are repeatable. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
