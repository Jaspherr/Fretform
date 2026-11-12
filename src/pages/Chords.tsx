import { useMemo, useState } from 'react'
import { ChordSelector, FretRangeSelector, RootSelector } from '@/components/controls'
import { VoicingCard } from '@/components/diagrams/VoicingCard'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { IntervalBadge, NoteBadge } from '@/components/fretboard/Legend'
import { cycleOwner, mergeMarks, mutedStringsOf, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, LessonPanel, NextSteps, Page, PageHeader, Panel, SectionTitle, TheoryCard, ToolLink } from '@/components/layout/page'
import { CHORD_NAV } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { type Chord, EXPLORER_QUALITIES, buildChord, chordLongName, chordSymbol } from '@/theory/chords'
import { type FretPos, NECK_REGIONS, type NeckRegionId, STRING_SETS, getStringSet, posKey } from '@/theory/fretboard'
import { type AccidentalPref, displayNote, pretty, rootSlug } from '@/theory/notes'
import { INVERSION_LABELS, type TriadVoicing, allTriads, triadsInsideVoicing } from '@/theory/triads'
import { type Voicing, generateVoicings } from '@/theory/voicings'

const QUALITY_IDS = EXPLORER_QUALITIES.map((q) => q.id)
const TRIAD_QUALITIES = new Set(['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'])

/** A chord shape the explorer can show: a full voicing or a three-string triad. */
interface ShapeItem {
  id: string
  kind: 'voicing' | 'triad'
  title: string
  subtitle: string
  badge?: string
  frets: (number | null)[]
  fingers?: (number | null)[]
  minFret: number
  maxFret: number
  tags: string[]
}

function voicingItem(v: Voicing): ShapeItem {
  const span = v.minFret === v.maxFret ? `Fret ${v.minFret}` : `Frets ${v.minFret}–${v.maxFret}`
  return {
    id: v.id,
    kind: 'voicing',
    title: v.template.name,
    subtitle: v.minFret === 0 ? 'Open position' : span,
    badge: v.template.stretch ? 'stretch' : v.tags.includes('barre') ? 'barre' : undefined,
    frets: v.frets,
    fingers: v.fingers,
    minFret: v.minFret,
    maxFret: v.maxFret,
    tags: v.tags,
  }
}

function triadItem(t: TriadVoicing): ShapeItem {
  const frets: (number | null)[] = [null, null, null, null, null, null]
  t.strings.forEach((s, i) => (frets[6 - s] = t.frets[i]))
  const set = STRING_SETS.find((s) => s.id === t.stringSetId)!
  return {
    id: t.id,
    kind: 'triad',
    title: INVERSION_LABELS[t.inversion],
    subtitle: `Strings ${set.label} · fret ${t.minFret}${t.maxFret !== t.minFret ? `–${t.maxFret}` : ''}`,
    frets,
    minFret: t.minFret,
    maxFret: t.maxFret,
    tags: ['triad', ...(t.minFret >= 7 ? ['higher'] : [])],
  }
}

function ChordHeader({ chord, pref }: { chord: Chord; pref: AccidentalPref }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
      <TheoryCard label="Formula">
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chord.tones.map((t) => (
            <IntervalBadge key={t.interval} interval={t.interval} family={t.family} />
          ))}
        </div>
      </TheoryCard>
      <TheoryCard label="Notes">
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chord.tones.map((t) => (
            <NoteBadge key={t.interval} note={pretty(displayNote(t.spelled, pref))} family={t.family} />
          ))}
        </div>
      </TheoryCard>
      <TheoryCard label="Sound">
        <p className="text-[14.5px] text-ink-soft">{chord.quality.sound}</p>
      </TheoryCard>
    </div>
  )
}

/** Chord tones across the neck, with the chosen shape in front and everything else faded. */
function useChordMarks(chord: Chord, shape: ShapeItem | null, rootName: string, focus?: { start: number; end: number } | null, ringed?: Set<string>) {
  const { labels, accidentals } = usePrefs()
  return useMemo(() => {
    const all = toneMarks(chord.tones, {
      labels,
      pref: accidentals,
      rootName,
      emphasis: (_t, p) => (shape ? 'soft' : focus && (p.fret < focus.start || p.fret > focus.end) ? 'soft' : 'normal'),
    })
    if (!shape) return all
    const strong = positionMarks(voicingPositions(shape.frets), chord.tones, {
      labels,
      pref: accidentals,
      rootName,
      emphasis: () => 'strong',
      ring: (_t, p) => (ringed?.has(posKey(p)) ? 'shared' : undefined),
    })
    return mergeMarks(all, strong)
  }, [chord, shape, labels, accidentals, rootName, focus, ringed])
}

/** The triad (preferably on the top strings) hiding inside a full voicing. */
function useTriadInside(shape: ShapeItem | null, rootPc: number, qualityId: string) {
  return useMemo(() => {
    if (!shape || shape.kind !== 'voicing') return null
    const inside = triadsInsideVoicing(shape.frets, rootPc, qualityId)
    const t = inside.find((x) => x.stringSetId === '123') ?? inside.find((x) => x.stringSetId === '234') ?? inside[0]
    if (!t) return null
    return { triad: t, keys: new Set(t.strings.map((s, i) => posKey({ string: s, fret: t.frets[i] }))) }
  }, [shape, rootPc, qualityId])
}

/** Tap a note on the neck: pick a shape that uses it, cycling if several do. */
function pickShapeAt(items: ShapeItem[], p: FretPos, currentId: string | null): string | null {
  const owning = items.filter((it) => it.frets[6 - p.string] === p.fret)
  return cycleOwner(owning, (it) => it.id, currentId)?.id ?? currentId
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'barre', label: 'Barre' },
  { value: 'caged', label: 'CAGED' },
  { value: 'triad', label: 'Triads' },
  { value: 'higher', label: 'Higher (7+)' },
] as const
type Category = (typeof CATEGORIES)[number]['value']

export function ChordsPage() {
  const { accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 0)
  const [qualityId, setQuality] = useUrlParam('quality', 'major', oneOf(QUALITY_IDS))
  const [category, setCategory] = useUrlParam<Category>('view', 'all', oneOf(CATEGORIES.map((c) => c.value)))
  const [showFingers, setShowFingers] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const chord = useMemo(() => buildChord(rootPc, qualityId, accidentals), [rootPc, qualityId, accidentals])
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  const longName = chordLongName(rootPc, chord.quality, accidentals)

  const items = useMemo(() => {
    const vs = generateVoicings(rootPc, qualityId).map(voicingItem)
    const ts = TRIAD_QUALITIES.has(qualityId) ? allTriads(rootPc, qualityId).filter((t) => t.maxFret <= 17).map(triadItem) : []
    return { vs, ts }
  }, [rootPc, qualityId])

  const shown = useMemo(() => {
    if (category === 'triad') return items.ts
    if (category === 'all') return items.vs
    return items.vs.filter((v) => v.tags.includes(category))
  }, [items, category])

  const selected = [...items.vs, ...items.ts].find((i) => i.id === selectedId) ?? null
  const inside = useTriadInside(selected, rootPc, qualityId)
  const marks = useChordMarks(chord, selected, pretty(displayNote(chord.tones[0].spelled, accidentals)), null, inside?.keys)

  return (
    <Page>
      <SubNav items={CHORD_NAV} />
      <PageHeader eyebrow="Explore" title={<>{longName} <span className="text-muted">({symbol})</span></>}>
        Every shape is the same few notes stacked a different way. Tap a note on the neck, or pick a shape below, to see where it sits among all the {symbol} notes.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Which chord?" value={rootPc} onChange={(pc) => { setRoot(pc); setSelectedId(null) }} />
          <ChordSelector value={qualityId} onChange={(q) => { setQuality(q); setSelectedId(null) }} />
        </ControlBar>
        <ChordHeader chord={chord} pref={accidentals} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <p className="text-[14.5px] text-ink-soft" aria-live="polite">
            {selected ? (
              <>
                <b className="text-ink">{selected.title}</b>, {selected.subtitle.toLowerCase()}.
                {inside && (
                  <> The ringed notes are a {symbol} triad ({INVERSION_LABELS[inside.triad.inversion].toLowerCase()}, strings {getStringSet(inside.triad.stringSetId)!.label}) already inside it.</>
                )}
              </>
            ) : (
              <>Every {symbol} note on the neck. Tap one to pick a shape that uses it.</>
            )}
          </p>
          <div className="flex items-center gap-3">
            {selected && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                Show all {symbol} notes
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Fretboard
            marks={marks}
            mutedStrings={selected?.kind === 'voicing' ? mutedStringsOf(selected.frets) : undefined}
            region={selected ? { start: selected.minFret, end: selected.maxFret } : null}
            onSelect={(p) => setSelectedId(pickShapeAt(shown, p, selectedId))}
            hint="Tap a note to pick a shape that uses it."
            ariaLabel={`${longName} on the fretboard`}
          />
        </div>
      </Panel>

      <SectionTitle sub="Choose a shape to put it on the neck above. Shapes are movable templates checked against the chord formula — nothing here is randomly generated.">
        Shapes for {symbol}
      </SectionTitle>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <Segmented label="Shape category" value={category} onChange={setCategory} options={CATEGORIES.filter((c) => c.value !== 'triad' || items.ts.length > 0).map((c) => ({ ...c }))} />
        <div className="w-56">
          <Switch checked={showFingers} onChange={setShowFingers} label="Show fingering" hint="Where a standard fingering exists" />
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-ink-soft">
          No {CATEGORIES.find((c) => c.value === category)!.label.toLowerCase()} shapes for {symbol}. Try “All” or another category.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((v) => (
            <VoicingCard
              key={v.id}
              title={v.title}
              subtitle={v.subtitle}
              badge={v.badge}
              frets={v.frets}
              fingers={v.fingers}
              tones={chord.tones}
              showFingers={showFingers}
              selected={v.id === selectedId}
              onSelect={() => setSelectedId(v.id === selectedId ? null : v.id)}
            />
          ))}
        </div>
      )}

      <NextSteps
        items={[
          { to: `/chords/elsewhere?root=${rootSlug(rootPc)}&quality=${qualityId}`, q: `Where else can I play ${symbol}?`, a: 'Pick a part of the neck and see what’s there.' },
          { to: `/triads?root=${rootSlug(rootPc)}&quality=${['major', 'minor', 'dim', 'aug'].includes(qualityId) ? qualityId : 'major'}`, q: `${symbol} as triads`, a: 'The small three-note versions of this chord.' },
          { to: `/caged?key=${rootSlug(rootPc)}`, q: 'How the big shapes join up', a: 'CAGED: five shapes, one map of the neck.' },
        ]}
      />
    </Page>
  )
}

/* ---------------------------------------------------------------------------------- */

const REGION_IDS = NECK_REGIONS.map((r) => r.id)

export function ElsewherePage() {
  const { accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 7)
  const [qualityId, setQuality] = useUrlParam('quality', 'major', oneOf(QUALITY_IDS))
  const [regionId, setRegionId] = useUrlParam<NeckRegionId>('area', '5-9', oneOf(REGION_IDS))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const region = NECK_REGIONS.find((r) => r.id === regionId)!.range

  const chord = useMemo(() => buildChord(rootPc, qualityId, accidentals), [rootPc, qualityId, accidentals])
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  const voicings = useMemo(() => generateVoicings(rootPc, qualityId).map(voicingItem), [rootPc, qualityId])
  const triads = useMemo(() => (TRIAD_QUALITIES.has(qualityId) ? allTriads(rootPc, qualityId).map(triadItem) : []), [rootPc, qualityId])
  const fits = (i: ShapeItem) => i.minFret >= region.start && i.maxFret <= region.end + 1 && (region.start === 0 || i.minFret > 0)
  const inRegionV = voicings.filter(fits)
  const inRegionT = triads.filter(fits)
  const familiar = voicings[0]
  const all = [...voicings, ...triads]
  const selected = all.find((i) => i.id === selectedId) ?? inRegionV[0] ?? inRegionT[0] ?? null
  const selectedShapeId = selected?.id ?? null
  const marks = useChordMarks(chord, selected, pretty(displayNote(chord.tones[0].spelled, accidentals)), regionId === 'all' ? null : region)
  const bands = useMemo(
    () =>
      voicings.map((v) => ({
        id: v.id,
        label: v.title.replace(' shape', ''),
        start: v.minFret,
        end: v.maxFret,
        active: v.id === selectedShapeId,
        description: `${v.title}, ${v.subtitle}`,
      })),
    [voicings, selectedShapeId],
  )

  return (
    <Page>
      <SubNav items={CHORD_NAV} />
      <PageHeader eyebrow="Explore" title={<>Where else can I play {symbol}?</>}>
        You probably know {symbol} as {familiar ? <b className="font-semibold text-ink">{familiar.title.toLowerCase()} {familiar.minFret === 0 ? 'in open position' : `at fret ${familiar.minFret}`}</b> : 'one shape'}. Pick a part of the neck and here’s every practical {symbol} that lives there.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector value={rootPc} onChange={(pc) => { setRoot(pc); setSelectedId(null) }} />
          <ChordSelector value={qualityId} onChange={(q) => { setQuality(q); setSelectedId(null) }} />
        </ControlBar>
        <ControlBar>
          <FretRangeSelector value={regionId} onChange={(r) => { setRegionId(r); setSelectedId(null) }} label="Neck area" />
        </ControlBar>
        <div className="mt-2">
          <Fretboard
            bands={bands}
            onBandSelect={setSelectedId}
            onSelect={(p) => setSelectedId(pickShapeAt(all, p, selectedShapeId))}
            marks={marks}
            region={regionId === 'all' ? null : region}
            regionLabel={regionId === 'all' ? undefined : `Frets ${region.start}–${region.end}`}
            mutedStrings={selected?.kind === 'voicing' ? mutedStringsOf(selected.frets) : undefined}
            ariaLabel={`${symbol} shapes in frets ${region.start} to ${region.end}`}
          />
        </div>
      </Panel>

      <SectionTitle sub={inRegionV.length + inRegionT.length === 0 ? undefined : `Full shapes and triads that fit between fret ${region.start} and ${region.end}.`}>
        {symbol} in {regionId === 'all' ? 'the whole neck' : `frets ${region.start}–${region.end}`}
      </SectionTitle>
      {inRegionV.length === 0 && inRegionT.length === 0 && (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-ink-soft">Nothing fits entirely in this area. Try a neighbouring area — shapes often straddle the boundary.</p>
      )}
      {inRegionV.length > 0 && (
        <>
          <h3 className="mb-3 font-sans text-[13px] font-semibold text-muted">Full chord shapes</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {inRegionV.map((v) => (
              <VoicingCard key={v.id} {...v} tones={chord.tones} selected={selected?.id === v.id} onSelect={() => setSelectedId(v.id)} />
            ))}
          </div>
        </>
      )}
      {inRegionT.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 font-sans text-[13px] font-semibold text-muted">Triads (three-string shapes)</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {inRegionT.map((v) => (
              <VoicingCard key={v.id} {...v} tones={chord.tones} selected={selected?.id === v.id} onSelect={() => setSelectedId(v.id)} />
            ))}
          </div>
        </>
      )}
      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`Every ${symbol} shape that fits in one area of the neck, plus the rest of the ${symbol} notes faded around it.`}
        matters="If a song moves to higher chords, you don’t have to slide back to open position. There’s almost always a version of the next chord within a fret or two."
        find={<>Follow the root squares. Each shape has at least one — and the shapes on either side share it. See how they chain on the <ToolLink to={`/caged?key=${rootSlug(rootPc)}`}>CAGED page</ToolLink>.</>}
        tryThis={`Play ${symbol} in open position, then the next shape up, and keep climbing. Say which shape you’re in each time.`}
      />
    </Page>
  )
}

