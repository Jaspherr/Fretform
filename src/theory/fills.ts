import { buildChord } from './chords'
import { type FretPos, type FretRange, type StringNum, STRINGS_LOW_TO_HIGH, midiAt, openMidi, pcAt } from './fretboard'
import { type PitchClass, mod12 } from './notes'
import { buildScale } from './scales'

export type FillRole = 'common' | 'safe' | 'target' | 'passing'

export interface FillCell extends FretPos {
  pc: PitchClass
  role: FillRole
}

export interface FillContext {
  keyPc: PitchClass
  current: { rootPc: PitchClass; qualityId: string }
  next: { rootPc: PitchClass; qualityId: string }
  range: FretRange
}

/**
 * Classify every note in a fret window:
 * - safe: belongs to the chord you're on
 * - target: belongs to the chord you're going to
 * - common: belongs to both (a note that can sustain across the change)
 * - passing: in the key, but in neither chord
 */
export function classifyFillNotes(ctx: FillContext): FillCell[] {
  const scale = new Set(buildScale(ctx.keyPc, 'major').tones.map((t) => t.pc))
  const cur = new Set(buildChord(ctx.current.rootPc, ctx.current.qualityId).tones.map((t) => t.pc))
  const nxt = new Set(buildChord(ctx.next.rootPc, ctx.next.qualityId).tones.map((t) => t.pc))
  const out: FillCell[] = []
  for (const s of STRINGS_LOW_TO_HIGH)
    for (let f = ctx.range.start; f <= ctx.range.end; f++) {
      const pc = pcAt(s, f)
      const c = cur.has(pc)
      const n = nxt.has(pc)
      const role: FillRole | null = c && n ? 'common' : c ? 'safe' : n ? 'target' : scale.has(pc) ? 'passing' : null
      if (role) out.push({ string: s, fret: f, pc, role })
    }
  return out
}

export type FillKind = 'chord-tone' | 'scale' | 'connecting'

export interface FillNote extends FretPos {
  pc: PitchClass
  midi: number
}

export interface FillExample {
  kind: FillKind
  notes: FillNote[]
  /** Short plain-language description of what the example does */
  how: string
}

/** Fills sit best on the treble strings, where they don't muddy the rhythm part. */
const FILL_STRINGS: StringNum[] = [4, 3, 2, 1]

/** Map pitches to frets inside the window, keeping the hand still and string changes small. */
function placePhrase(midis: number[], range: FretRange): FillNote[] | null {
  const out: FillNote[] = []
  let prev: FillNote | null = null
  for (const m of midis) {
    const cands: FillNote[] = []
    for (const s of FILL_STRINGS) {
      const f = m - openMidi(s)
      if (f >= range.start && f <= range.end) cands.push({ string: s, fret: f, pc: mod12(m), midi: m })
    }
    if (cands.length === 0) return null
    const p = prev
    const best: FillNote = p
      ? cands.reduce((a, b) => (cost(p, b) < cost(p, a) ? b : a))
      : cands.reduce((a, b) => (Math.abs(b.string - 2.5) < Math.abs(a.string - 2.5) ? b : a))
    out.push(best)
    prev = best
  }
  return out
}

const cost = (a: FretPos, b: FretPos) => Math.abs(a.string - b.string) * 2 + Math.abs(a.fret - b.fret)

/** Every pitch in the key reachable on the fill strings inside the window, low → high. */
function scaleMidis(scalePcs: Set<PitchClass>, range: FretRange): number[] {
  const set = new Set<number>()
  for (const s of FILL_STRINGS)
    for (let f = range.start; f <= range.end; f++) {
      const m = midiAt(s, f)
      if (scalePcs.has(mod12(m))) set.add(m)
    }
  return [...set].sort((a, b) => a - b)
}

/**
 * Three small, rule-based example fills. They're deliberately plain — the point
 * is to show where the notes come from, not to be licks.
 */
export function exampleFills(ctx: FillContext): FillExample[] {
  const scaleTones = buildScale(ctx.keyPc, 'major').tones
  const scalePcs = new Set(scaleTones.map((t) => t.pc))
  const cur = buildChord(ctx.current.rootPc, ctx.current.qualityId).tones
  const nxt = buildChord(ctx.next.rootPc, ctx.next.qualityId).tones
  const curPcs = new Set(cur.map((t) => t.pc))
  const nxtPcs = new Set(nxt.map((t) => t.pc))
  const nextThird = nxt.find((t) => t.family === 'third')?.pc ?? nxt[0].pc
  const pitches = scaleMidis(scalePcs, ctx.range)
  const out: FillExample[] = []

  // 1. Chord-tone fill: arpeggiate the current chord upward, then land on the closest next-chord tone.
  {
    const chordPitches = pitches.filter((m) => curPcs.has(mod12(m)))
    const startIdx = chordPitches.findIndex((m) => mod12(m) === ctx.current.rootPc)
    if (startIdx >= 0 && startIdx + 2 < chordPitches.length) {
      const arp = chordPitches.slice(startIdx, startIdx + 3)
      const last = arp[2]
      const landing = pitches
        .filter((m) => nxtPcs.has(mod12(m)) && m !== last)
        .sort((a, b) => Math.abs(a - last) - Math.abs(b - last))[0]
      const notes = placePhrase(landing !== undefined ? [...arp, landing] : arp, ctx.range)
      if (notes) out.push({ kind: 'chord-tone', notes, how: 'Climb the current chord’s tones, then step onto the nearest note of the next chord.' })
    }
  }

  // 2. Scale fill: start on a chord tone high in the window and walk down the key to the next lower chord tone.
  {
    const startCands = pitches.filter((m) => curPcs.has(mod12(m)))
    for (let i = startCands.length - 1; i >= 0; i--) {
      const start = startCands[i]
      const si = pitches.indexOf(start)
      const path: number[] = [start]
      for (let j = si - 1; j >= 0 && path.length < 5; j--) {
        path.push(pitches[j])
        if (curPcs.has(mod12(pitches[j])) && path.length >= 3) break
      }
      if (path.length >= 3 && curPcs.has(mod12(path[path.length - 1]))) {
        const notes = placePhrase(path, ctx.range)
        if (notes) {
          out.push({ kind: 'scale', notes, how: 'Start on a chord tone and walk down the key until you reach another chord tone.' })
          break
        }
      }
    }
  }

  // 3. Connecting fill: walk stepwise from a current chord tone to a next-chord tone (ideally its 3rd).
  {
    let best: { path: number[]; score: number } | null = null
    for (let i = 0; i < pitches.length; i++) {
      if (!curPcs.has(mod12(pitches[i]))) continue
      for (const dir of [1, -1]) {
        for (let steps = 2; steps <= 4; steps++) {
          const j = i + dir * steps
          if (j < 0 || j >= pitches.length) continue
          const end = pitches[j]
          if (!nxtPcs.has(mod12(end)) || curPcs.has(mod12(end))) continue
          const path = dir === 1 ? pitches.slice(i, j + 1) : pitches.slice(j, i + 1).reverse()
          let score = 10 - steps
          if (mod12(end) === nextThird) score += 6
          if (dir === -1) score += 1
          if (!best || score > best.score) best = { path, score }
        }
      }
    }
    if (best) {
      const notes = placePhrase(best.path, ctx.range)
      if (notes) out.push({ kind: 'connecting', notes, how: 'Leave from a chord tone and walk through the key so you arrive on the next chord’s tone right as it hits.' })
    }
  }
  return out
}
