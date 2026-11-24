import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CagedShapeSelector, Field, ProgressionSelector, RootSelector, StringSetSelector } from '@/components/controls'
import { ChordDiagram } from '@/components/diagrams/ChordDiagram'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { INTERVAL_LEGEND, Legend, NoteBadge } from '@/components/fretboard/Legend'
import { cycleOwner, mergeMarks, mutedStringsOf, positionMarks, rangeAround, voicingPositions } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, LessonPanel, NextSteps, Page, PageHeader, Panel, SectionTitle, OnTheNeck } from '@/components/layout/page'
import { TRIAD_NAV } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { buildChord, chordSymbol, getQuality } from '@/theory/chords'
import { diatonicChords, getProgression } from '@/theory/diatonic'
import { type FretPos, STRING_SETS, type StringSetId, getStringSet } from '@/theory/fretboard'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { type Tone } from '@/theory/tones'
import { INVERSION_LABELS, type Inversion, type TriadVoicing, connectProgression, triadInversion, triadsInsideVoicing, triadsOnStringSet } from '@/theory/triads'
import { type CagedShape, VOICING_TEMPLATES, generateVoicings } from '@/theory/voicings'

const TRIAD_Q = ['major', 'minor', 'dim', 'aug'] as const
type TriadQ = (typeof TRIAD_Q)[number]
const SET_IDS = STRING_SETS.map((s) => s.id)

function triadPositions(t: TriadVoicing): FretPos[] {
  return t.strings.map((s, i) => ({ string: s, fret: t.frets[i] }))
}

function triadFrets(t: TriadVoicing): (number | null)[] {
  const f: (number | null)[] = [null, null, null, null, null, null]
  t.strings.forEach((s, i) => (f[6 - s] = t.frets[i]))
  return f
}

function InversionCards({ tones, active, onPick }: { tones: Tone[]; active: Inversion | 'all'; onPick: (i: Inversion | 'all') => void }) {
  const { accidentals } = usePrefs()
  const invs: Inversion[] = ['root', 'first', 'second']
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filter by inversion">
      {invs.map((inv) => (
        <button
          key={inv}
          onClick={() => onPick(active === inv ? 'all' : inv)}
          aria-pressed={active === inv}
          className={cn(
            'cursor-pointer rounded-md border bg-bg/40 px-2.5 py-2 text-left transition-colors hover:border-ink sm:px-3',
            active === inv ? 'border-ink bg-surface shadow-[0_0_0_1px_var(--ink)]' : 'border-line',
          )}
        >
          <div className="text-[13px] font-semibold text-ink">{INVERSION_LABELS[inv]}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {triadInversion(tones, inv).map((t, i) => (
              <span key={t.interval} className="flex items-center gap-1.5">
                <NoteBadge note={pretty(displayNote(t.spelled, accidentals))} family={t.family} />
                {i < 2 && <span aria-hidden="true" className="text-muted">›</span>}
              </span>
            ))}
          </div>
          <div className="mt-1 hidden text-[12.5px] text-muted sm:block">
            {inv === 'root' ? 'Root' : inv === 'first' ? '3rd' : '5th'} on the lowest string of the set
          </div>
        </button>
      ))}
    </div>
  )
}

function FullChordToTriad({ rootPc, quality }: { rootPc: number; quality: 'major' | 'minor' }) {
  const { labels, accidentals } = usePrefs()
  const [shape, setShape] = useState<CagedShape>('E')
  const [picked, setPicked] = useState<StringSetId | null>(null)
  const chord = useMemo(() => buildChord(rootPc, quality, accidentals), [rootPc, quality, accidentals])
  const template = VOICING_TEMPLATES.find((t) => t.qualityId === quality && t.caged === shape)!
  const voicing = useMemo(() => {
    const vs = generateVoicings(rootPc, quality).filter((v) => v.template === template)
    return vs.find((v) => v.minFret > 0) ?? vs[0]
  }, [rootPc, quality, template])
  const inside = useMemo(() => (voicing ? triadsInsideVoicing(voicing.frets, rootPc, quality) : []), [voicing, rootPc, quality])
  const active = inside.find((t) => t.stringSetId === picked) ?? null
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))
  const marks = useMemo(() => {
    if (!voicing) return []
    const full = positionMarks(voicingPositions(voicing.frets), chord.tones, { labels, pref: accidentals, rootName, emphasis: () => (active ? 'ghost' : 'normal') })
    if (!active) return full
    return mergeMarks(full, positionMarks(triadPositions(active), chord.tones, { labels, pref: accidentals, rootName, emphasis: () => 'strong' }))
  }, [voicing, active, chord, labels, accidentals, rootName])
  if (!voicing) return null
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  return (
    <Panel>
      <ControlBar>
        <CagedShapeSelector value={shape} onChange={(v) => { setShape(v as CagedShape); setPicked(null) }} />
      </ControlBar>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <Fretboard glide
            marks={marks}
            range={rangeAround(voicingPositions(voicing.frets), 2, 6)}
            mutedStrings={mutedStringsOf(voicing.frets)}
            highlightStrings={active?.strings}
            ariaLabel={`${symbol} ${template.name} with triads inside`}
          />
        </div>
        <div>
          <p className="mb-3 text-[14.5px] text-ink-soft">
            The {template.name} {symbol} has <b className="text-ink">{inside.length} complete triads</b> hiding inside it. Pick one:
          </p>
          <div className="flex flex-col gap-2">
            {inside.map((t) => (
              <button
                key={t.id}
                onClick={() => setPicked(picked === t.stringSetId ? null : t.stringSetId)}
                aria-pressed={picked === t.stringSetId}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-[14px] transition-colors',
                  picked === t.stringSetId ? 'border-ink bg-surface-2 text-ink' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
                )}
              >
                <span>Strings {getStringSet(t.stringSetId)!.label}</span>
                <span className="text-[12.5px] text-muted">{INVERSION_LABELS[t.inversion]}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13.5px] text-muted">
            {active
              ? 'Faded notes are the duplicates you drop. What’s left is the same chord in three notes.'
              : 'Your triad is already inside the barre chord you know. We’re just removing duplicate notes.'}
          </p>
        </div>
      </div>
    </Panel>
  )
}

const INV_SHORT: Record<Inversion, string> = { root: 'Root pos.', first: '1st inv.', second: '2nd inv.' }

export function TriadsPage() {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('root', 0)
  const [quality, setQuality] = useUrlParam<TriadQ>('quality', 'major', oneOf(TRIAD_Q))
  const [setId, setSetId] = useUrlParam<StringSetId>('strings', '123', oneOf(SET_IDS))
  const [inv, setInv] = useState<Inversion | 'all'>('all')
  const [focusId, setFocusId] = useState<string | null>(null)

  const chord = useMemo(() => buildChord(rootPc, quality, accidentals), [rootPc, quality, accidentals])
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  const rootName = pretty(displayNote(chord.tones[0].spelled, accidentals))
  const set = getStringSet(setId)!
  const triads = useMemo(() => triadsOnStringSet(rootPc, quality, setId), [rootPc, quality, setId])
  const filtered = useMemo(() => (inv === 'all' ? triads : triads.filter((t) => t.inversion === inv)), [triads, inv])
  const focused = filtered.find((t) => t.id === focusId) ?? null

  const marks = useMemo(
    () =>
      mergeMarks(
        ...filtered.map((t) =>
          positionMarks(triadPositions(t), chord.tones, {
            labels,
            pref: accidentals,
            rootName,
            emphasis: () => (focused ? (focused === t ? 'strong' : 'soft') : 'normal'),
          }),
        ),
      ),
    [filtered, focused, chord, labels, accidentals, rootName],
  )

  const reset = () => setFocusId(null)
  const step = (d: number) => {
    if (filtered.length === 0) return
    const i = focused ? filtered.indexOf(focused) : d > 0 ? -1 : 0
    setFocusId(filtered[(i + d + filtered.length) % filtered.length].id)
  }
  /** Tap a note: focus the shape it belongs to (or the next one, if two shapes share it). */
  const onNeck = (p: FretPos) => {
    const owner = cycleOwner(
      filtered.filter((t) => t.strings.some((s, i) => s === p.string && t.frets[i] === p.fret)),
      (t) => t.id,
      focusId,
    )
    if (owner) setFocusId(owner.id)
  }

  const bands = useMemo(
    () =>
      filtered.map((t) => ({
        id: t.id,
        label: INV_SHORT[t.inversion],
        start: t.minFret,
        end: t.maxFret,
        active: t.id === focusId,
        description: `${INVERSION_LABELS[t.inversion]}, frets ${t.minFret} to ${t.maxFret}`,
      })),
    [filtered, focusId],
  )

  return (
    <Page>
      <SubNav items={TRIAD_NAV} />
      <PageHeader eyebrow="Chords · Triads" actions={<OnTheNeck rootPc={rootPc} quality={quality} step="triad" label="See the triad inside a shape" />} title={<>{symbol} triads on strings {set.label}</>}>
        A triad is just the chord’s three notes, once each. On any three neighbouring strings there are three shapes — one per inversion — that leapfrog up the neck and repeat every 12 frets.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Which chord?" value={rootPc} onChange={(pc) => { setRoot(pc); reset() }} />
          <Field label="Major or minor?">
            <Segmented
              label="Triad quality"
              size="sm"
              value={quality}
              onChange={(q) => { setQuality(q); reset() }}
              options={TRIAD_Q.map((q) => ({ value: q, label: getQuality(q)!.name }))}
            />
          </Field>
          <StringSetSelector value={setId} onChange={(s) => { setSetId(s); reset() }} />
        </ControlBar>
        <InversionCards tones={chord.tones} active={inv} onPick={(i) => { setInv(i); reset() }} />
        <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14.5px] text-ink-soft" aria-live="polite">
            {focused ? (
              <>
                <b className="text-ink">{INVERSION_LABELS[focused.inversion]}</b> at fret {focused.minFret} —{' '}
                {focused.intervals.map((iv) => pretty(displayNote(chord.tones.find((t) => t.interval === iv)!.spelled, accidentals))).join(' · ')} low to high
              </>
            ) : (
              <>
                {filtered.length} shapes. Tap one on the neck, or step through them in order.
              </>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            {focused && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Show all
              </Button>
            )}
            <Button size="icon" variant="outline" aria-label="Previous shape" onClick={() => step(-1)}>
              <ChevronLeft />
            </Button>
            <Button size="icon" variant="outline" aria-label="Next shape" onClick={() => step(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
        <Fretboard glide
          marks={marks}
          highlightStrings={set.strings}
          bands={bands}
          onBandSelect={(id) => setFocusId(id === focusId ? null : id)}
          onSelect={onNeck}
          region={focused ? { start: focused.minFret, end: focused.maxFret } : null}
          ariaLabel={`${symbol} triads on strings ${set.label}`}
          hint="Tap a note to pick the triad it belongs to."
        />
      </Panel>

      {(quality === 'major' || quality === 'minor') && (
        <>
          <SectionTitle sub="Pick a big chord shape you already know. The triads inside it are just that chord with the doubled notes taken out.">
            The triad is already inside your barre chord
          </SectionTitle>
          <FullChordToTriad rootPc={rootPc} quality={quality} />
        </>
      )}

      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`Every ${symbol} triad on strings ${set.label}: root position, 1st and 2nd inversion, leapfrogging up the neck.`}
        matters="Triads are small enough to move fast and clear enough to cut through a band. They’re also the skeleton of every bigger chord shape."
        find="The inversions go in order up the neck — root, 1st, 2nd, then root again an octave higher. The top note of one shape is the bottom note of the next."
        tryThis={<>Play the three inversions up the neck, then back down. Then try strings 2–3–4.</>}
      />
      <NextSteps
        items={[
          { to: `/triads/progressions?key=${rootSlug(rootPc)}&strings=${setId}`, q: 'Move through a progression with triads', a: 'Pick the nearest triad for each chord so your hand barely moves.' },
          { to: `/chords?root=${rootSlug(rootPc)}&quality=${quality}`, q: `Every full ${symbol} shape`, a: 'Open, barre and CAGED shapes — and where the triads sit in them.' },
          { to: `/caged?key=${rootSlug(rootPc)}${quality === 'minor' ? '&quality=minor' : ''}`, q: 'See the CAGED map', a: 'Five chord shapes, one neck.' },
        ]}
      />
    </Page>
  )
}

const START_AREAS = [
  { value: '3', label: 'Low (around fret 3)' },
  { value: '7', label: 'Middle (around 7)' },
  { value: '12', label: 'High (around 12)' },
] as const

export function ProgressionsPage() {
  const { labels, accidentals } = usePrefs()
  const [keyPc, setKey] = useRootParam('key', 7)
  const [progId, setProgId] = useUrlParam('prog', 'I-IV-V', (v): v is string => !!getProgression(v))
  const [setId, setSetId] = useUrlParam<StringSetId>('strings', '123', oneOf(SET_IDS))
  const [area, setArea] = useUrlParam<'3' | '7' | '12'>('area', '7', oneOf(['3', '7', '12'] as const))
  const [stepIdx, setStepIdx] = useState(0)

  const prog = getProgression(progId)!
  const diatonic = useMemo(() => diatonicChords(keyPc, accidentals), [keyPc, accidentals])
  const chords = useMemo(() => prog.degrees.map((d) => diatonic[d - 1]), [prog, diatonic])
  const steps = useMemo(
    () => connectProgression(chords.map((c) => ({ rootPc: c.rootPc, qualityId: c.qualityId })), setId, Number(area)),
    [chords, setId, area],
  )
  const current = Math.min(stepIdx, steps.length - 1)
  const cur = steps[current]
  const next = steps[(current + 1) % steps.length]
  const curChord = useMemo(() => buildChord(cur.rootPc, cur.qualityId, accidentals), [cur, accidentals])
  const nextChord = useMemo(() => buildChord(next.rootPc, next.qualityId, accidentals), [next, accidentals])

  const marks = useMemo(() => {
    const curPos = triadPositions(cur.triad)
    const nextPos = triadPositions(next.triad)
    const same = (a: FretPos, b: FretPos) => a.string === b.string && a.fret === b.fret
    const nextLayer = positionMarks(
      nextPos.filter((p) => !curPos.some((q) => same(p, q))),
      nextChord.tones,
      { labels, pref: accidentals, rootName: chords[(current + 1) % chords.length].rootName, emphasis: () => 'ghost', ring: () => 'target' },
    )
    const curLayer = positionMarks(curPos, curChord.tones, {
      labels,
      pref: accidentals,
      rootName: chords[current].rootName,
      emphasis: () => 'strong',
      ring: (_t, p) => (nextPos.some((q) => same(p, q)) ? 'shared' : undefined),
    })
    return mergeMarks(nextLayer, curLayer)
  }, [cur, next, curChord, nextChord, chords, labels, accidentals, current])

  const set = getStringSet(setId)!
  const allPos = steps.flatMap((s) => triadPositions(s.triad))
  const range = rangeAround(allPos, 2, 7)
  const moveSize = (a: TriadVoicing, b: TriadVoicing) => a.frets.reduce((sum, f, i) => sum + Math.abs(f - b.frets[i]), 0)

  return (
    <Page>
      <SubNav items={TRIAD_NAV} />
      <PageHeader eyebrow="Changes · Triads" title="Move through a progression with triads">
        Instead of jumping between big shapes, pick the nearest triad for each chord. Your hand barely moves, notes that two chords share stay put, and the rest move by a fret or two.
      </PageHeader>
      <Panel>
        <ControlBar>
          <RootSelector label="Key" value={keyPc} onChange={(pc) => { setKey(pc); setStepIdx(0) }} />
        </ControlBar>
        <ControlBar>
          <ProgressionSelector value={progId} onChange={(v) => { setProgId(v); setStepIdx(0) }} />
          <StringSetSelector value={setId} onChange={setSetId} />
          <Field label="Start area">
            <Segmented label="Start area" size="sm" value={area} onChange={setArea} options={START_AREAS.map((a) => ({ ...a }))} />
          </Field>
        </ControlBar>
        <p className="mb-4 text-[14px] text-muted">{prog.note}</p>

        <ol className="mb-5 flex flex-wrap items-stretch gap-2" aria-label="Progression steps">
          {steps.map((s, i) => {
            const c = chords[i]
            return (
              <li key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setStepIdx(i)}
                  aria-pressed={i === current}
                  aria-label={`${c.roman}: ${c.symbol}, ${INVERSION_LABELS[s.triad.inversion]}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3 py-2 text-left transition-colors',
                    i === current ? 'border-ink shadow-[0_0_0_1px_var(--ink)]' : 'border-line hover:border-line-strong',
                  )}
                >
                  <ChordDiagram frets={triadFrets(s.triad)} tones={buildChord(s.rootPc, s.qualityId, accidentals).tones} label={`${c.symbol} triad`} className="w-16" />
                  <div>
                    <div className="font-mono text-[12px] text-muted">{c.roman}</div>
                    <div className="font-semibold text-xl leading-tight text-ink">{pretty(c.symbol)}</div>
                    <div className="text-[11.5px] text-muted">{INVERSION_LABELS[s.triad.inversion]}</div>
                  </div>
                </button>
                {i < steps.length - 1 && (
                  <span className="flex flex-col items-center text-[11px] text-muted" aria-hidden="true">
                    <ArrowRight className="size-4" />
                    {moveSize(s.triad, steps[i + 1].triad)} fr
                  </span>
                )}
              </li>
            )
          })}
        </ol>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14.5px] text-ink-soft">
            Now: <b className="text-ink">{pretty(chords[current].symbol)}</b>. Dashed rings show where your fingers go for{' '}
            <b className="text-ink">{pretty(chords[(current + 1) % chords.length].symbol)}</b>; solid rings mark notes that stay put.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setStepIdx((current - 1 + steps.length) % steps.length)}>
              <ChevronLeft /> Prev
            </Button>
            <Button size="sm" variant="primary" onClick={() => setStepIdx((current + 1) % steps.length)}>
              Next chord <ChevronRight />
            </Button>
          </div>
        </div>
        <Fretboard glide legend={false} marks={marks} range={range} highlightStrings={set.strings} ariaLabel={`${chords[current].symbol} triad, moving to ${chords[(current + 1) % chords.length].symbol}`} />
        <Legend
          className="mt-2"
          items={[...INTERVAL_LEGEND.slice(0, 3), { tone: 'other', label: 'Next chord', ring: 'target', soft: true }, { tone: 'root', label: 'Stays put', ring: 'shared' }]}
        />
      </Panel>
      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing="One triad per chord, each chosen to be as close as possible to the one before it on the same three strings."
        matters="This is voice leading, without the textbook: small moves sound smooth and keep you in one area of the neck."
        find="Count the frets moved under each arrow. Most changes are 2–4 frets of total finger movement."
        tryThis="Loop the progression slowly. Then start from a different area and notice the shapes change but the moves stay small."
      />
    </Page>
  )
}
