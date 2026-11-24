import { useCallback } from 'react'
import { usePrefs, type LabelMode } from '@/lib/prefs'
import { type FretPos, type FretRange, FULL_RANGE, type StringNum, pcAt, positionsOf } from '@/theory/fretboard'
import { type IntervalFamily, intervalName, prettyInterval } from '@/theory/intervals'
import { type AccidentalPref, displayNote, pretty } from '@/theory/notes'
import { type Tone, toneMap } from '@/theory/tones'

/** Color family of a dot. Interval families first; a few tool-specific roles. */
export type MarkTone = IntervalFamily | 'target' | 'plain' | 'selected'

export type Emphasis = 'strong' | 'normal' | 'soft' | 'ghost'

export interface FretMark extends FretPos {
  /**
   * Musical identity (e.g. "voice-2", "third"). Marks with an id keep their dot
   * between renders and glide to a new fret, so a moving note can be followed.
   */
  id?: string
  /** Main text inside the dot */
  label: string
  /** Second line (used when showing notes + intervals) */
  sub?: string
  tone: MarkTone
  emphasis?: Emphasis
  ring?: 'target' | 'shared' | 'char' | 'selected'
  /** Read out by the inspector / screen readers */
  info?: string
}

export interface ToneLabel {
  label: string
  sub?: string
}

export function labelTone(tone: Tone, mode: LabelMode, pref: AccidentalPref): ToneLabel {
  const note = pretty(displayNote(tone.spelled, pref))
  const iv = prettyInterval(tone.interval)
  if (mode === 'notes') return { label: note }
  if (mode === 'intervals') return { label: iv }
  return { label: note, sub: iv }
}

export function describeTone(tone: Tone, pref: AccidentalPref, rootName?: string): string {
  const note = pretty(displayNote(tone.spelled, pref))
  const name = intervalName(tone.interval)
  return rootName ? `${note} — ${name.toLowerCase()} of ${rootName}` : `${note} — ${name}`
}

export function useToneLabeler() {
  const { labels, accidentals } = usePrefs()
  return useCallback(
    (tone: Tone, override?: LabelMode) => labelTone(tone, override ?? labels, accidentals),
    [labels, accidentals],
  )
}

export interface ToneMarksOptions {
  range?: FretRange
  labels: LabelMode
  pref: AccidentalPref
  /** Root display name for the inspector text */
  rootName?: string
  emphasis?: (tone: Tone, pos: FretPos) => Emphasis | undefined
  tone?: (tone: Tone) => MarkTone
  ring?: (tone: Tone, pos: FretPos) => FretMark['ring']
  strings?: StringNum[]
  only?: (pos: FretPos) => boolean
}

/** Every position of a chord/scale on the neck, colored by interval. */
export function toneMarks(tones: Tone[], o: ToneMarksOptions): FretMark[] {
  const map = toneMap(tones)
  const positions = positionsOf(map.keys(), o.range ?? FULL_RANGE)
  const out: FretMark[] = []
  for (const p of positions) {
    if (o.strings && !o.strings.includes(p.string)) continue
    if (o.only && !o.only(p)) continue
    const t = map.get(pcAt(p.string, p.fret))!
    out.push({
      ...p,
      ...labelTone(t, o.labels, o.pref),
      tone: o.tone ? o.tone(t) : t.family,
      emphasis: o.emphasis?.(t, p),
      ring: o.ring?.(t, p),
      info: describeTone(t, o.pref, o.rootName),
    })
  }
  return out
}

/** Marks for specific positions (a chord voicing, a box) resolved against a tone set. */
export function positionMarks(positions: FretPos[], tones: Tone[], o: Omit<ToneMarksOptions, 'range' | 'strings' | 'only'>): FretMark[] {
  const map = toneMap(tones)
  const out: FretMark[] = []
  for (const p of positions) {
    const t = map.get(pcAt(p.string, p.fret))
    if (!t) continue
    out.push({
      ...p,
      ...labelTone(t, o.labels, o.pref),
      tone: o.tone ? o.tone(t) : t.family,
      emphasis: o.emphasis?.(t, p),
      ring: o.ring?.(t, p),
      info: describeTone(t, o.pref, o.rootName),
    })
  }
  return out
}

/** Merge layers; later layers win on the same position. */
export function mergeMarks(...layers: FretMark[][]): FretMark[] {
  const m = new Map<string, FretMark>()
  for (const layer of layers) for (const mk of layer) m.set(`${mk.string}:${mk.fret}`, mk)
  return [...m.values()]
}

/** Positions of a voicing given as frets low E → high e. */
export function voicingPositions(frets: (number | null)[]): FretPos[] {
  const out: FretPos[] = []
  frets.forEach((f, i) => {
    if (f !== null) out.push({ string: (6 - i) as StringNum, fret: f })
  })
  return out
}

export function mutedStringsOf(frets: (number | null)[]): StringNum[] {
  return frets.flatMap((f, i) => (f === null ? [(6 - i) as StringNum] : []))
}

/**
 * Tap a note → the shape that owns it. A note can belong to several shapes;
 * tapping it again moves on to the next owner. `null` when nothing owns it.
 */
export function cycleOwner<T>(owners: T[], idOf: (owner: T) => string, currentId: string | null): T | null {
  if (owners.length === 0) return null
  const i = owners.findIndex((o) => idOf(o) === currentId)
  return owners[(i + 1) % owners.length]
}

/** A comfortable window around some positions, for the "focused" view. */
export function rangeAround(positions: FretPos[], pad = 1, minWidth = 4): FretRange {
  if (positions.length === 0) return FULL_RANGE
  const frets = positions.map((p) => p.fret)
  let start = Math.max(0, Math.min(...frets) - pad)
  let end = Math.max(...frets) + pad
  if (end - start < minWidth) end = start + minWidth
  if (start <= 1) start = 0
  return { start, end: Math.min(FULL_RANGE.end, end) }
}
