import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Field, RootSelector } from '@/components/controls'
import { ChordDiagram } from '@/components/diagrams/ChordDiagram'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { type FretMark, mergeMarks, mutedStringsOf, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { ControlBar, LessonPanel, MoreOptions, NextSteps, Page, PageHeader, Panel, SectionTitle } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { type CagedPosition, cagedAcrossNeck, placementId, scaleRegion } from '@/theory/caged'
import { buildChord, chordSymbol } from '@/theory/chords'
import { type FretPos, posKey } from '@/theory/fretboard'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { buildScale } from '@/theory/scales'
import { CAGED_ORDER, type CagedShape, fretsToString } from '@/theory/voicings'

type Layer = 'chord' | 'scale' | 'both'
type ScaleKind = 'full' | 'pent'

const SCALE_IDS = {
  major: { full: 'major', pent: 'major-pentatonic' },
  minor: { full: 'natural-minor', pent: 'minor-pentatonic' },
} as const
const FRET_IDS = Array.from({ length: 23 }, (_, i) => String(i))

function sharedNotes(a: CagedPosition, b: CagedPosition): FretPos[] {
  const ak = new Set(voicingPositions(a.voicing.frets).map(posKey))
  return voicingPositions(b.voicing.frets).filter((p) => ak.has(posKey(p)))
}

export function CagedPage() {
  const { labels, accidentals } = usePrefs()
  const [keyPc, setKey] = useRootParam('key', 0)
  const [quality, setQuality] = useUrlParam<'major' | 'minor'>('quality', 'major', oneOf(['major', 'minor'] as const))
  const [shapeParam, setShape] = useUrlParam<CagedShape | 'all'>('shape', 'all', oneOf(['all', ...CAGED_ORDER] as const))
  const [fretParam, setFret] = useUrlParam<string>('at', '', oneOf(FRET_IDS))
  const [layer, setLayer] = useUrlParam<Layer>('layer', 'both', oneOf(['chord', 'scale', 'both'] as const))
  const [scaleKind, setScaleKind] = useUrlParam<ScaleKind>('scale', 'full', oneOf(['full', 'pent'] as const))

  const chord = useMemo(() => buildChord(keyPc, quality, accidentals), [keyPc, quality, accidentals])
  const scaleId = SCALE_IDS[quality][scaleKind]
  const scale = useMemo(() => buildScale(keyPc, scaleId, accidentals), [keyPc, scaleId, accidentals])
  // Every placement of every shape across the neck, low → high: C A G E D C A …
  const placements = useMemo(() => cagedAcrossNeck(keyPc, quality).sort((a, b) => a.voicing.minFret - b.voicing.minFret), [keyPc, quality])
  const symbol = pretty(chordSymbol(keyPc, chord.quality, accidentals))
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))

  const current =
    shapeParam === 'all'
      ? null
      : (placements.find((p) => p.shape === shapeParam && String(p.voicing.minFret) === fretParam) ?? placements.find((p) => p.shape === shapeParam) ?? null)
  const idx = current ? placements.indexOf(current) : -1
  const prev = idx > 0 ? placements[idx - 1] : null
  const next = idx >= 0 && idx < placements.length - 1 ? placements[idx + 1] : null

  const select = (p: CagedPosition | null) => {
    if (!p) {
      setShape('all')
      setFret('')
      return
    }
    setShape(p.shape)
    setFret(String(p.voicing.minFret))
  }

  /** Click a note on the neck: jump to the shape that note belongs to (nearest one if several). */
  const onNeckSelect = (pos: FretPos) => {
    const owning = placements.filter((p) => p.voicing.frets[6 - pos.string] === pos.fret)
    const around = owning.length ? owning : placements.filter((p) => pos.fret >= p.regionStart && pos.fret <= p.regionEnd)
    if (!around.length) return
    const center = (p: CagedPosition) => (p.voicing.minFret + p.voicing.maxFret) / 2
    const best = around.reduce((a, b) => (Math.abs(center(b) - pos.fret) < Math.abs(center(a) - pos.fret) ? b : a))
    select(current && placementId(best) === placementId(current) ? null : best)
  }

  const marks = useMemo(() => {
    const o = { labels, pref: accidentals, rootName }
    if (!current) {
      const chordLayer = toneMarks(chord.tones, o)
      if (layer === 'chord') return chordLayer
      if (layer === 'scale') return toneMarks(scale.tones, o)
      return mergeMarks(toneMarks(scale.tones, { ...o, tone: () => 'plain' }), chordLayer)
    }
    const shapePos = voicingPositions(current.voicing.frets)
    const shapeKeys = new Set(shapePos.map(posKey))
    const region = scaleRegion(new Set(scale.tones.map((t) => t.pc)), current.regionStart, current.regionEnd)
    const out: FretMark[][] = []
    // Neighbouring shapes as small outlines, so the overlap is visible.
    for (const n of [prev, next])
      if (n) out.push(positionMarks(voicingPositions(n.voicing.frets).filter((q) => !shapeKeys.has(posKey(q))), chord.tones, { ...o, emphasis: () => 'ghost' }))
    if (layer !== 'chord')
      out.push(
        positionMarks(region.filter((p) => !shapeKeys.has(posKey(p))), scale.tones, {
          ...o,
          // Chord tones your grip doesn't use are outlined in their colour; other scale notes are plain outlines.
          tone: (t) => (layer === 'both' && !chord.tones.some((c) => c.pc === t.pc) ? 'plain' : t.family),
          emphasis: () => (layer === 'both' ? 'soft' : undefined),
        }),
      )
    if (layer !== 'scale') out.push(positionMarks(shapePos, chord.tones, { ...o, emphasis: () => 'strong' }))
    else out.push(positionMarks(region.filter((p) => shapeKeys.has(posKey(p))), scale.tones, o))
    return mergeMarks(...out)
  }, [current, prev, next, chord, scale, layer, labels, accidentals, rootName])

  const bands = useMemo(
    () =>
      placements.map((p) => ({
        id: placementId(p),
        label: p.shape,
        start: p.voicing.minFret,
        end: p.voicing.maxFret,
        active: p === current,
        description: `${p.shape} shape, frets ${p.voicing.minFret} to ${p.voicing.maxFret}`,
      })),
    [placements, current],
  )

  const scaleName = scale.def.name
  const legend = useMemo(
    () =>
      layer === 'both'
        ? [
            { tone: 'root' as const, label: 'Root' },
            { tone: 'third' as const, label: quality === 'major' ? '3rd' : '♭3rd' },
            { tone: 'fifth' as const, label: '5th' },
            { tone: 'plain' as const, label: `${scaleName} note` },
            ...(current ? [{ tone: 'root' as const, soft: true, label: 'Chord tone outside your grip' }] : []),
            ...(current && (prev || next) ? [{ tone: 'third' as const, soft: true, label: 'Next shape over (small outline)' }] : []),
          ]
        : undefined,
    [layer, quality, scaleName, current, prev, next],
  )

  return (
    <Page>
      <PageHeader eyebrow="Connect" title={<>CAGED in {symbol}</>}>
        Five chord shapes you already know — C, A, G, E, D — tile the whole neck in that order. Each one overlaps the next, so the neck is one map, not five boxes.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Which key?" value={keyPc} onChange={setKey} />
          <Field label="Major or minor?">
            <Segmented
              label="Major or minor"
              size="sm"
              value={quality}
              onChange={setQuality}
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
              ]}
            />
          </Field>
          <Field label="What do you want to see?">
            <Segmented
              label="Layers"
              size="sm"
              value={layer}
              onChange={setLayer}
              options={[
                { value: 'chord', label: 'Chord' },
                { value: 'both', label: 'Chord in its scale' },
                { value: 'scale', label: 'Scale' },
              ]}
            />
          </Field>
        </ControlBar>
        <MoreOptions>
          <Field label="Which scale around the chord?">
            <Segmented
              label="Scale"
              size="sm"
              value={scaleKind}
              onChange={setScaleKind}
              options={[
                { value: 'full', label: quality === 'major' ? 'Major scale' : 'Natural minor' },
                { value: 'pent', label: 'Pentatonic' },
              ]}
            />
          </Field>
        </MoreOptions>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14.5px] text-ink-soft" aria-live="polite">
            {current ? (
              <>
                <b className="text-ink">{current.shape} shape</b>, frets {current.voicing.minFret}–{current.voicing.maxFret}
                <span className="text-muted"> · {fretsToString(current.voicing.frets)}</span>
              </>
            ) : (
              <>Pick a shape above the neck, or tap any {rootName} on it.</>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            {current && (
              <Button size="sm" variant="ghost" onClick={() => select(null)}>
                Whole neck
              </Button>
            )}
            <Button size="icon" variant="outline" aria-label={prev ? `Previous shape: ${prev.shape}` : 'Previous shape'} disabled={!!current && !prev} onClick={() => select(current ? prev : placements[0])}>
              <ChevronLeft />
            </Button>
            <Button size="icon" variant="outline" aria-label={next ? `Next shape: ${next.shape}` : 'Next shape'} disabled={!!current && !next} onClick={() => select(current ? next : placements[0])}>
              <ChevronRight />
            </Button>
          </div>
        </div>
        <Fretboard
          marks={marks}
          bands={bands}
          onBandSelect={(id) => select(current && placementId(current) === id ? null : (placements.find((p) => placementId(p) === id) ?? null))}
          onSelect={onNeckSelect}
          region={current ? { start: current.regionStart, end: current.regionEnd } : null}
          mutedStrings={current && layer !== 'scale' && current.voicing.minFret === 0 ? mutedStringsOf(current.voicing.frets) : undefined}
          ariaLabel={current ? `${symbol}, ${current.shape} shape with ${scale.def.name} around it` : `All CAGED shapes for ${symbol}`}
          hint="Tap a note to jump to the shape it belongs to."
          legend={legend}
        />

        {current && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Before it', p: prev },
              { label: 'You are here', p: current },
              { label: 'After it', p: next },
            ].map(({ label, p }) => {
              if (!p) return <div key={label} className="hidden md:block" />
              const shared = p === current ? 0 : sharedNotes(current, p).length
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => select(p)}
                  disabled={p === current}
                  className={
                    'flex items-center gap-4 rounded-md border p-3 text-left transition-colors ' +
                    (p === current ? 'border-ink bg-surface' : 'cursor-pointer border-line bg-bg/50 hover:border-ink')
                  }
                >
                  <ChordDiagram frets={p.voicing.frets} tones={chord.tones} label={`${p.shape} shape ${fretsToString(p.voicing.frets)}`} className="w-20" />
                  <span className="flex-1">
                    <span className="block text-[13px] text-muted">{label}</span>
                    <span className="block text-lg font-semibold text-ink">{p.shape} shape</span>
                    <span className="block text-[13px] text-muted">Frets {p.voicing.minFret}–{p.voicing.maxFret}</span>
                    {p !== current && (
                      <span className="mt-1 block text-[13px] text-ink-soft">
                        Shares {shared || 'no'} note{shared === 1 ? '' : 's'} with {current.shape}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      <SectionTitle sub="The scale isn’t floating randomly around the neck. The chord lives inside it.">Chord inside the scale</SectionTitle>
      <LessonPanel
        seeing={
          current
            ? `The ${current.shape}-shape ${symbol} chord (filled), the ${scale.def.name.toLowerCase()} notes your hand can reach from it (outlined), and the next shapes over as small rings.`
            : `Every ${symbol} chord tone on the neck. The blocks above the neck show which of the five shapes each group of notes belongs to.`
        }
        matters="Every scale position is a chord shape plus the notes in between. Know which shape you’re in and you know where the roots, 3rds and 5ths are without thinking."
        find={`Going up the neck: C → A → G → E → D, then C again. For ${symbol} the first full shape is the ${placements[0]?.shape} shape at fret ${placements[0]?.voicing.minFret}.`}
        tryThis={
          <>
            Pick the E shape and play the chord. Switch to “Chord in its scale” and play the outlined notes on each string without moving your hand. Then do the same in the{' '}
            {next?.shape ?? 'next'} shape.
          </>
        }
      />
      <NextSteps
        items={[
          { to: `/fills/rhythm-to-lead?key=${rootSlug(keyPc)}`, q: 'Turn this chord into a lead position', a: 'Triad, roots, pentatonic and scale, one layer at a time.' },
          { to: `/triads?root=${rootSlug(keyPc)}&quality=${quality}`, q: `Find the triads inside ${symbol}`, a: 'The three-note shapes hiding inside each CAGED form.' },
          { to: `/scales?root=${rootSlug(keyPc)}&scale=${scaleId}`, q: `See the whole ${scale.def.name.toLowerCase()} scale`, a: 'Full neck, boxes and how they join.' },
        ]}
      />
    </Page>
  )
}

