import { useMemo, useState } from 'react'
import { Field } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { type FretMark, cycleOwner, mergeMarks, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { usePrefs } from '@/lib/prefs'
import { type CagedPosition, cagedAcrossNeck, placementId, scaleRegion } from '@/theory/caged'
import { buildChord, chordSymbol } from '@/theory/chords'
import { type FretPos, STRING_SETS, posKey } from '@/theory/fretboard'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { buildScale } from '@/theory/scales'
import { INVERSION_LABELS, triadsInsideVoicing } from '@/theory/triads'

const RANGE = { start: 0, end: 15 }
const HERO_KEYS = [0, 2, 4, 5, 7, 9]

/**
 * "Find the chord you know everywhere." Every chord tone in the first 15 frets;
 * tap a note (or a shape block) and the chord shape it belongs to lights up,
 * with the triad hiding inside it ringed and, optionally, the scale around it.
 */
export function ChordEverywhere({ rootPc: initialRoot = 7, keyPicker }: { rootPc?: number; keyPicker?: boolean }) {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRootPc] = useState(initialRoot)
  const [selId, setSelId] = useState<string | null>(null)
  const [withScale, setWithScale] = useState(false)
  const chord = useMemo(() => buildChord(rootPc, 'major', accidentals), [rootPc, accidentals])
  const scale = useMemo(() => buildScale(rootPc, 'major', accidentals), [rootPc, accidentals])
  const placements = useMemo(
    () => cagedAcrossNeck(rootPc, 'major').filter((p) => p.voicing.maxFret <= RANGE.end).sort((a, b) => a.voicing.minFret - b.voicing.minFret),
    [rootPc],
  )
  const current = placements.find((p) => placementId(p) === selId) ?? null
  const triad = useMemo(() => {
    if (!current) return null
    const inside = triadsInsideVoicing(current.voicing.frets, rootPc, 'major')
    return inside.find((t) => t.stringSetId === '123') ?? inside[0] ?? null
  }, [current, rootPc])
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  const noteNames = chord.tones.map((t) => pretty(displayNote(t.spelled, accidentals)))

  const marks = useMemo(() => {
    const o = { labels, pref: accidentals, rootName, range: RANGE }
    if (!current) return toneMarks(chord.tones, o)
    const shapePos = voicingPositions(current.voicing.frets)
    const shapeKeys = new Set(shapePos.map(posKey))
    const triadKeys = new Set(triad ? triad.strings.map((s, i) => posKey({ string: s, fret: triad.frets[i] })) : [])
    const layers: FretMark[][] = [toneMarks(chord.tones, { ...o, emphasis: () => 'ghost' })]
    if (withScale) {
      const region = scaleRegion(new Set(scale.tones.map((t) => t.pc)), current.regionStart, current.regionEnd).filter((p) => !shapeKeys.has(posKey(p)))
      layers.push(positionMarks(region, scale.tones, { ...o, tone: (t) => (chord.tones.some((c) => c.pc === t.pc) ? t.family : 'plain'), emphasis: () => 'soft' }))
    }
    layers.push(
      positionMarks(shapePos, chord.tones, {
        ...o,
        emphasis: () => 'strong',
        ring: (_t, p) => (triadKeys.has(posKey(p)) ? 'shared' : undefined),
      }),
    )
    return mergeMarks(...layers)
  }, [current, triad, withScale, chord, scale, labels, accidentals, rootName])

  const pick = (p: CagedPosition | null) => setSelId(p && placementId(p) !== selId ? placementId(p) : null)
  const onNeck = (pos: FretPos) => {
    const owner = cycleOwner(
      placements.filter((p) => p.voicing.frets[6 - pos.string] === pos.fret),
      placementId,
      selId,
    )
    if (owner) setSelId(placementId(owner))
  }

  const bands = useMemo(
    () =>
      placements.map((p) => ({
        id: placementId(p),
        label: p.voicing.minFret === 0 ? `${p.shape} · open` : `${p.shape} shape`,
        start: p.voicing.minFret,
        end: p.voicing.maxFret,
        active: placementId(p) === selId,
        description: `${p.shape} shape, frets ${p.voicing.minFret} to ${p.voicing.maxFret}`,
      })),
    [placements, selId],
  )
  const legend = useMemo(
    () => [
      { tone: 'root' as const, label: 'Root' },
      { tone: 'third' as const, label: '3rd' },
      { tone: 'fifth' as const, label: '5th' },
      ...(current && triad ? [{ tone: 'plain' as const, ring: 'shared' as const, label: 'Triad inside the shape' }] : []),
      ...(current && withScale ? [{ tone: 'plain' as const, label: 'Scale note under your hand' }] : []),
    ],
    [current, triad, withScale],
  )

  const setLabel = triad ? STRING_SETS.find((s) => s.id === triad.stringSetId)!.label : ''
  const caption = current ? (
    <>
      <b className="font-semibold text-ink">{current.voicing.minFret === 0 ? `Open ${current.shape} shape` : `${current.shape} shape at fret ${current.voicing.minFret}`}.</b>{' '}
      Same three notes — {noteNames.join(', ')} — just stacked differently.
      {triad && (
        <>
          {' '}
          The ringed notes on strings {setLabel} are a {symbol} triad ({INVERSION_LABELS[triad.inversion].toLowerCase()}) hiding inside it.
        </>
      )}
    </>
  ) : (
    <>
      Every {noteNames.join(', ')} from the nut to fret 15 — that’s all a {symbol} chord is. <b className="font-semibold text-ink">Tap any note</b> to see which shape it belongs to.
    </>
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        {keyPicker && (
          <Field label="Chord">
            <Segmented
              label="Chord"
              size="sm"
              value={String(rootPc)}
              onChange={(v) => {
                setRootPc(Number(v))
                setSelId(null)
              }}
              options={HERO_KEYS.map((pc) => ({ value: String(pc), label: pretty(rootSlug(pc)) }))}
            />
          </Field>
        )}
        <div className="w-auto">
          <Switch checked={withScale} onChange={setWithScale} label="Show the scale around the shape" />
        </div>
      </div>
      <Fretboard
        marks={marks}
        range={RANGE}
        bands={bands}
        onBandSelect={(bid) => pick(placements.find((p) => placementId(p) === bid) ?? null)}
        onSelect={onNeck}
        region={current ? { start: current.regionStart, end: current.regionEnd } : null}
        ariaLabel={`${symbol} across the first fifteen frets`}
        hint={`Tap a ${rootName}, ${noteNames[1]} or ${noteNames[2]}.`}
        legend={legend}
      />
      <p className="prose-note mt-3 max-w-[70ch]" aria-live="polite">
        {caption}
      </p>
    </div>
  )
}
