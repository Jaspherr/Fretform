import { useMemo } from 'react'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { Legend } from '@/components/fretboard/Legend'
import { type Emphasis, type FretMark, mergeMarks, mutedStringsOf, positionMarks, voicingPositions } from '@/components/fretboard/marks'
import { usePrefs } from '@/lib/prefs'
import { cagedPositions, scaleRegion } from '@/theory/caged'
import { buildChord, chordSymbol } from '@/theory/chords'
import { type FretPos, type StringNum, pcAt } from '@/theory/fretboard'
import { displayNote, pretty } from '@/theory/notes'
import { buildScale } from '@/theory/scales'
import { INVERSION_LABELS, triadsInsideVoicing } from '@/theory/triads'
import { type CagedShape } from '@/theory/voicings'
import type { LeadLayer } from './lead-layers'

/**
 * The layered “your chord is your lead position” view. Used on its own page and
 * inside the lesson.
 */
export function LayeredPosition({
  keyPc,
  quality,
  shape,
  active,
}: {
  keyPc: number
  quality: 'major' | 'minor'
  shape: CagedShape
  active: LeadLayer[]
}) {
  const { labels, accidentals } = usePrefs()
  const chord = useMemo(() => buildChord(keyPc, quality, accidentals), [keyPc, quality, accidentals])
  const pent = useMemo(() => buildScale(keyPc, quality === 'major' ? 'major-pentatonic' : 'minor-pentatonic', accidentals), [keyPc, quality, accidentals])
  const scale = useMemo(() => buildScale(keyPc, quality === 'major' ? 'major' : 'natural-minor', accidentals), [keyPc, quality, accidentals])
  const pos = useMemo(() => {
    return cagedPositions(keyPc, quality).find((x) => x.shape === shape)!
  }, [keyPc, quality, shape])
  const triad = useMemo(() => {
    const inside = triadsInsideVoicing(pos.voicing.frets, keyPc, quality)
    return inside.find((t) => t.stringSetId === '123') ?? inside.find((t) => t.stringSetId === '234') ?? inside[0] ?? null
  }, [pos, keyPc, quality])
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))
  const on = (l: LeadLayer) => active.includes(l)
  // With many layers on, push the background layers back so the chord stays readable.
  const crowded = active.filter((l) => l !== 'fill').length > 3

  const fillRange = useMemo(() => (triad ? { start: Math.max(0, triad.minFret - 2), end: triad.maxFret + 2 } : null), [triad])

  const marks = useMemo(() => {
    const on = (l: LeadLayer) => active.includes(l)
    const o = { labels, pref: accidentals, rootName }
    const region = { start: pos.regionStart, end: pos.regionEnd }
    const chordPos = voicingPositions(pos.voicing.frets)
    const layers: FretMark[][] = []
    const bg: Emphasis = crowded ? 'soft' : 'normal'
    if (on('scale')) layers.push(positionMarks(scaleRegion(new Set(scale.tones.map((t) => t.pc)), region.start, region.end), scale.tones, { ...o, emphasis: () => (on('pent') ? 'soft' : bg), tone: () => 'plain' }))
    if (on('pent')) layers.push(positionMarks(scaleRegion(new Set(pent.tones.map((t) => t.pc)), region.start, region.end), pent.tones, { ...o, emphasis: () => bg }))
    if (on('chord')) layers.push(positionMarks(chordPos, chord.tones, { ...o, emphasis: () => (on('triad') ? 'normal' : 'strong') }))
    if (on('triad') && triad) layers.push(positionMarks(triad.strings.map((s, i) => ({ string: s, fret: triad.frets[i] })), chord.tones, { ...o, emphasis: () => 'strong', ring: () => 'shared' }))
    if (on('roots')) {
      const roots: FretPos[] = []
      for (const s of [1, 2, 3, 4, 5, 6] as StringNum[])
        for (let f = region.start; f <= region.end; f++) if (pcAt(s, f) === keyPc) roots.push({ string: s, fret: f })
      layers.push(positionMarks(roots, chord.tones, { ...o, emphasis: () => 'strong' }))
    }
    const merged = mergeMarks(...layers)
    if (on('fill') && fillRange) {
      // Outside the fill zone, step back.
      return merged.map((m) => (m.string <= 3 && m.fret >= fillRange.start && m.fret <= fillRange.end ? m : { ...m, emphasis: 'soft' as const }))
    }
    return merged
  }, [active, pos, chord, pent, scale, triad, fillRange, labels, accidentals, rootName, crowded, keyPc])

  const symbol = pretty(chordSymbol(keyPc, chord.quality, accidentals))
  return (
    <div>
      <Fretboard glide legend={false}
        marks={marks}
        range={{ start: Math.max(0, pos.regionStart - 1), end: Math.min(22, pos.regionEnd + 2) }}
        region={on('fill') && fillRange ? fillRange : { start: pos.regionStart, end: pos.regionEnd }}
        regionLabel={on('fill') ? 'Fill zone' : `${shape}-shape position`}
        highlightStrings={on('fill') ? [1, 2, 3] : triad && on('triad') && !on('pent') && !on('scale') ? triad.strings : undefined}
        mutedStrings={on('chord') ? mutedStringsOf(pos.voicing.frets) : undefined}
        ariaLabel={`${symbol} ${shape} shape with layers: ${active.join(', ')}`}
      />
      <Legend
        className="mt-2"
        items={[
          { tone: 'root', label: 'Root' },
          { tone: 'third', label: '3rd' },
          { tone: 'fifth', label: '5th' },
          ...(on('triad') ? [{ tone: 'other' as const, label: triad ? `Triad (${INVERSION_LABELS[triad.inversion].toLowerCase()})` : 'Triad', ring: 'shared' as const }] : []),
          ...(on('pent') ? [{ tone: 'other' as const, label: 'Pentatonic notes' }] : []),
          ...(on('scale') ? [{ tone: 'plain' as const, label: 'Other scale notes', soft: true }] : []),
        ]}
      />
    </div>
  )
}
