import { useMemo, useState } from 'react'
import { Field } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { Legend } from '@/components/fretboard/Legend'
import { type FretMark, mergeMarks, mutedStringsOf, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { ChipToggles, Segmented } from '@/components/ui/segmented'
import { usePcName } from '@/lib/names'
import { usePrefs } from '@/lib/prefs'
import { cagedPositions, scaleRegion } from '@/theory/caged'
import { buildChord } from '@/theory/chords'
import { diatonicChords } from '@/theory/diatonic'
import { classifyFillNotes } from '@/theory/fills'
import { STRING_SETS, type StringSetId, getStringSet, posKey } from '@/theory/fretboard'
import { displayNote, pretty } from '@/theory/notes'
import { buildScale } from '@/theory/scales'
import { tonesFromPcs, toneMap } from '@/theory/tones'
import { INVERSION_LABELS, type Inversion, triadsOnStringSet } from '@/theory/triads'
import { type CagedShape, CAGED_ORDER } from '@/theory/voicings'
import { LayeredPosition } from '@/components/LayeredPosition'
import { LEAD_LAYERS, LEAD_ORDER, type LeadLayer } from '@/components/lead-layers'
import type { LessonTool } from '@/content/lessons'
import { ChordEverywhere } from '@/components/ChordEverywhere'

function NotesDemo() {
  const name = usePcName()
  const { labels, accidentals } = usePrefs()
  const [sel, setSel] = useState<string[]>(['0'])
  const marks = useMemo(() => {
    const pcs = sel.map(Number)
    return toneMarks(tonesFromPcs(pcs[0] ?? 0, pcs, accidentals), { labels, pref: accidentals })
  }, [sel, labels, accidentals])
  return (
    <div>
      <Field label="Notes" className="mb-4">
        <ChipToggles label="Notes" values={sel} onChange={(v) => setSel(v.length ? v : sel)} options={[...Array(12).keys()].map((pc) => ({ value: String(pc), label: name(pc) }))} />
      </Field>
      <Fretboard marks={marks} ariaLabel="Selected notes on the neck" />
    </div>
  )
}

function IntervalsDemo() {
  const { labels, accidentals } = usePrefs()
  const [q, setQ] = useState<'major' | 'minor' | 'dom7'>('major')
  const chord = buildChord(7, q, accidentals)
  const v = cagedPositions(7, q === 'minor' ? 'minor' : 'major').find((p) => p.shape === 'E')!.voicing
  const frets = q === 'dom7' ? [3, 5, 3, 4, 3, 3] : v.frets
  const marks = positionMarks(voicingPositions(frets), chord.tones, { labels, pref: accidentals, rootName: 'G' })
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Chord">
          <Segmented label="Chord" size="sm" value={q} onChange={setQ} options={[{ value: 'major', label: 'G (1 3 5)' }, { value: 'minor', label: 'Gm (1 ♭3 5)' }, { value: 'dom7', label: 'G7 (1 3 5 ♭7)' }]} />
        </Field>
      </div>
      <Fretboard marks={marks} range={{ start: 0, end: 8 }} mutedStrings={mutedStringsOf(frets)} ariaLabel="E-shape G chord with intervals" />
      <p className="mt-2 text-[13.5px] text-muted">Switch between G and Gm: only the blue 3rd (circle) moves, by one fret. Switch to G7: one root becomes a ♭7.</p>
    </div>
  )
}

function TriadsDemo() {
  const { labels, accidentals } = usePrefs()
  const [set, setSet] = useState<StringSetId>('123')
  const [inv, setInv] = useState<Inversion | 'all'>('all')
  const chord = buildChord(0, 'major', accidentals)
  const triads = triadsOnStringSet(0, 'major', set).filter((t) => inv === 'all' || t.inversion === inv)
  const marks = mergeMarks(...triads.map((t) => positionMarks(t.strings.map((s, i) => ({ string: s, fret: t.frets[i] })), chord.tones, { labels, pref: accidentals, rootName: 'C' })))
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Strings">
          <Segmented label="Strings" size="sm" value={set} onChange={setSet} options={STRING_SETS.map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <Field label="Inversion">
          <Segmented
            label="Inversion"
            size="sm"
            value={inv}
            onChange={setInv}
            options={[{ value: 'all', label: 'All' }, ...(['root', 'first', 'second'] as Inversion[]).map((i) => ({ value: i, label: INVERSION_LABELS[i] }))]}
          />
        </Field>
      </div>
      <Fretboard marks={marks} highlightStrings={getStringSet(set)!.strings} ariaLabel="C major triads" />
    </div>
  )
}

function CagedDemo({ withScale }: { withScale?: boolean }) {
  const { labels, accidentals } = usePrefs()
  const keyPc = withScale ? 7 : 0
  const [shape, setShape] = useState<CagedShape>(withScale ? 'E' : 'C')
  const [layer, setLayer] = useState<'chord' | 'both'>('chord')
  const chord = buildChord(keyPc, 'major', accidentals)
  const scale = buildScale(keyPc, 'major', accidentals)
  const positions = cagedPositions(keyPc, 'major')
  const p = positions.find((x) => x.shape === shape)!
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))
  const o = { labels, pref: accidentals, rootName }
  const shapeKeys = new Set(voicingPositions(p.voicing.frets).map(posKey))
  const marks = mergeMarks(
    toneMarks(chord.tones, { ...o, emphasis: () => 'ghost' }),
    withScale && layer === 'both' ? positionMarks(scaleRegion(new Set(scale.tones.map((t) => t.pc)), p.regionStart, p.regionEnd).filter((q) => !shapeKeys.has(posKey(q))), scale.tones, { ...o, emphasis: () => 'soft' }) : [],
    positionMarks(voicingPositions(p.voicing.frets), chord.tones, { ...o, emphasis: () => 'strong' }),
  )
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label="Shape">
          <Segmented label="CAGED shape" size="sm" value={shape} onChange={setShape} options={CAGED_ORDER.map((s) => ({ value: s, label: `${s} · fr ${positions.find((x) => x.shape === s)!.voicing.minFret}` }))} />
        </Field>
        {withScale && (
          <Field label="Show">
            <Segmented label="Layers" size="sm" value={layer} onChange={setLayer} options={[{ value: 'chord', label: 'Chord only' }, { value: 'both', label: 'Chord + Scale' }]} />
          </Field>
        )}
      </div>
      <Fretboard marks={marks} region={{ start: p.regionStart, end: p.regionEnd }} regionLabel={`${shape} shape`} mutedStrings={mutedStringsOf(p.voicing.frets)} ariaLabel={`${rootName} major, ${shape} shape`} />
    </div>
  )
}

function ChordTonesDemo() {
  const { labels, accidentals } = usePrefs()
  const chords = diatonicChords(7, accidentals)
  const [deg, setDeg] = useState('1')
  const c = chords[Number(deg) - 1]
  const chord = buildChord(c.rootPc, c.qualityId, accidentals)
  const scale = buildScale(7, 'major', accidentals)
  const marks = mergeMarks(
    toneMarks(scale.tones, { labels, pref: accidentals, tone: () => 'plain', emphasis: () => 'soft', range: { start: 0, end: 12 } }),
    toneMarks(chord.tones, { labels, pref: accidentals, emphasis: () => 'strong', range: { start: 0, end: 12 } }),
  )
  return (
    <div>
      <Field label="Chord in G major" className="mb-4">
        <Segmented label="Chord" size="sm" value={deg} onChange={setDeg} options={chords.map((ch) => ({ value: String(ch.degree), label: `${pretty(ch.symbol)} · ${ch.roman}` }))} />
      </Field>
      <Fretboard marks={marks} range={{ start: 0, end: 12 }} ariaLabel={`${c.symbol} inside G major`} />
    </div>
  )
}

function FillsDemo() {
  const { accidentals } = usePrefs()
  const ctx = { keyPc: 7, current: { rootPc: 7, qualityId: 'major' }, next: { rootPc: 0, qualityId: 'major' }, range: { start: 3, end: 7 } }
  const scale = toneMap(buildScale(7, 'major', accidentals).tones)
  const marks: FretMark[] = classifyFillNotes(ctx).map((c) => {
    const name = pretty(displayNote(scale.get(c.pc)!.spelled, accidentals))
    return {
      ...c,
      label: name,
      tone: c.role === 'target' ? 'target' : c.role === 'passing' ? 'plain' : c.pc === 7 ? 'root' : c.pc === 11 ? 'third' : 'fifth',
      emphasis: c.role === 'passing' ? 'soft' : 'strong',
      ring: c.role === 'target' || c.role === 'common' ? 'target' : undefined,
      info: `${name} — ${c.role}`,
    }
  })
  return (
    <div>
      <Fretboard legend={false} marks={marks} range={{ start: 2, end: 8 }} region={{ start: 3, end: 7 }} ariaLabel="Fill notes from G to C" />
      <Legend
        className="mt-2"
        items={[
          { tone: 'root', label: 'G chord tones (safe)' },
          { tone: 'root', label: 'In both G and C (safe now, and a target)', ring: 'target' },
          { tone: 'plain', label: 'Passing notes', soft: true },
          { tone: 'target', label: 'C chord tones (targets)', ring: 'target' },
        ]}
      />
    </div>
  )
}

function RhythmLeadDemo() {
  const [active, setActive] = useState<LeadLayer[]>(['chord'])
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Layers">
        {LEAD_LAYERS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => setActive(LEAD_ORDER.slice(0, i + 1))}
            aria-pressed={active.includes(l.id)}
            className={
              'cursor-pointer rounded-full border px-3 py-1 text-[13px] font-medium ' +
              (active.includes(l.id) ? 'border-ink bg-ink text-bg' : 'border-line-strong bg-surface text-ink-soft hover:text-ink')
            }
          >
            {l.label}
          </button>
        ))}
      </div>
      <LayeredPosition keyPc={7} quality="major" shape="E" active={active} />
    </div>
  )
}

export function LessonDemo({ tool }: { tool: LessonTool }) {
  switch (tool) {
    case 'notes':
      return <NotesDemo />
    case 'intervals':
      return <IntervalsDemo />
    case 'chords-everywhere':
      return <ChordEverywhere />
    case 'triads':
      return <TriadsDemo />
    case 'caged':
      return <CagedDemo />
    case 'scale-overlay':
      return <CagedDemo withScale />
    case 'chord-tones':
      return <ChordTonesDemo />
    case 'fills':
      return <FillsDemo />
    case 'rhythm-to-lead':
      return <RhythmLeadDemo />
  }
}
