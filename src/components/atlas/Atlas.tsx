import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RootSelector } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { type FretMark, mergeMarks, positionMarks, toneMarks, voicingPositions } from '@/components/fretboard/marks'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { scaleRegion } from '@/theory/caged'
import { buildChord, chordSymbol, getQuality } from '@/theory/chords'
import { type FretPos, STANDARD_TUNING, type StringNum, posKey } from '@/theory/fretboard'
import { displayNote, mod12, pretty, rootSlug } from '@/theory/notes'
import { buildScale, getScale } from '@/theory/scales'
import { INVERSION_LABELS, nearestTriad, triadQualityOf, triadsInsideVoicing, triadsOnStringSet, type TriadVoicing, voiceMoves } from '@/theory/triads'
import { generateVoicings, type Voicing } from '@/theory/voicings'

/**
 * The Neck — Neckline's starting point. One chord, one fretboard, five questions
 * answered one layer at a time. Everything shown comes from the theory engine;
 * notes with a musical identity glide when the shape or chord changes.
 */

const RANGE = { start: 0, end: 15 }
const QUALITIES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'dom7', label: '7' },
  { value: 'maj7', label: 'maj7' },
  { value: 'm7', label: 'm7' },
] as const
type Q = (typeof QUALITIES)[number]['value']
const Q_IDS = QUALITIES.map((q) => q.value)

export const ATLAS_STEPS = [
  { id: 'notes', q: 'What notes make it?' },
  { id: 'shape', q: 'Where can I grab it?' },
  { id: 'triad', q: 'What’s the core of the shape?' },
  { id: 'scale', q: 'What’s around it?' },
  { id: 'move', q: 'Where can it go next?' },
] as const
type Step = (typeof ATLAS_STEPS)[number]['id']
const STEP_IDS = ATLAS_STEPS.map((s) => s.id)

/** The scale a soloist would reach for over each chord type. */
const SCALE_FOR: Record<Q, string> = { major: 'major', maj7: 'major', dom7: 'mixolydian', minor: 'natural-minor', m7: 'dorian' }

/** Common next chords, written relative to the current one so they work in every key. */
function nextChords(rootPc: number, triadMinor: boolean) {
  return triadMinor
    ? [
        { roman: 'iv', rootPc: mod12(rootPc + 5), q: 'minor' as Q, deg: 4 },
        { roman: 'v', rootPc: mod12(rootPc + 7), q: 'minor' as Q, deg: 5 },
        { roman: '♭VI', rootPc: mod12(rootPc + 8), q: 'major' as Q, deg: 6 },
        { roman: '♭VII', rootPc: mod12(rootPc + 10), q: 'major' as Q, deg: 7 },
      ]
    : [
        { roman: 'IV', rootPc: mod12(rootPc + 5), q: 'major' as Q, deg: 4 },
        { roman: 'V', rootPc: mod12(rootPc + 7), q: 'major' as Q, deg: 5 },
        { roman: 'vi', rootPc: mod12(rootPc + 9), q: 'minor' as Q, deg: 6 },
        { roman: 'ii', rootPc: mod12(rootPc + 2), q: 'minor' as Q, deg: 2 },
      ]
}

const placementId = (v: Voicing) => `${v.template.caged ?? v.template.id}@${v.minFret}`
const STRING_NAME: Record<number, string> = { 1: 'high e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'low E' }

export function Atlas() {
  const { labels, accidentals } = usePrefs()
  const [rootPc, setRoot] = useRootParam('chord', 7)
  const [q, setQ] = useUrlParam<Q>('q', 'major', oneOf(Q_IDS))
  const [step, setStep] = useUrlParam<Step>('step', 'notes', oneOf(STEP_IDS))
  const [atParam, setAt] = useUrlParam<string>('at', '', (v): v is string => /^[A-Za-z0-9-]{1,16}@\d{1,2}$/.test(v))
  const [toParam, setTo] = useUrlParam('to', '0', oneOf(['0', '1', '2', '3'] as const))
  const [arrived, setArrived] = useState(false)

  const chord = useMemo(() => buildChord(rootPc, q, accidentals), [rootPc, q, accidentals])
  const symbol = pretty(chordSymbol(rootPc, chord.quality, accidentals))
  const names = chord.tones.map((t) => pretty(displayNote(t.spelled, accidentals)))
  const rootName = names[0]
  const triadQ = triadQualityOf(q)!
  const placements = useMemo(
    () => generateVoicings(rootPc, q).filter((v) => v.template.caged && v.maxFret <= RANGE.end).sort((a, b) => a.minFret - b.minFret || a.maxFret - b.maxFret),
    [rootPc, q],
  )
  const shape = placements.find((v) => placementId(v) === atParam) ?? placements.find((v) => v.template.caged === 'E' && v.minFret > 0) ?? placements[0]
  const shapeIdx = placements.indexOf(shape)
  const shapePos = useMemo(() => voicingPositions(shape.frets), [shape])
  const shapeKeys = useMemo(() => new Set(shapePos.map(posKey)), [shapePos])
  const region = { start: Math.max(0, shape.minFret - 1), end: Math.min(RANGE.end, shape.maxFret + 1) }

  // The triad inside the shape — preferring the top three strings, where triads are most used.
  const triad: TriadVoicing = useMemo(() => {
    const inside = triadsInsideVoicing(shape.frets, rootPc, triadQ)
    const pick = inside.find((t) => t.stringSetId === '123') ?? inside[0]
    if (pick) return pick
    const centre = (shape.minFret + shape.maxFret) / 2
    return triadsOnStringSet(rootPc, triadQ, '123').reduce((a, b) => (Math.abs(b.center - centre) < Math.abs(a.center - centre) ? b : a))
  }, [shape, rootPc, triadQ])
  const triadInShape = triad.strings.every((s, i) => shape.frets[6 - s] === triad.frets[i])

  const scaleId = SCALE_FOR[q]
  const scale = useMemo(() => buildScale(rootPc, scaleId, accidentals), [rootPc, scaleId, accidentals])
  const options = nextChords(rootPc, triadQ === 'minor')
  const next = options[Number(toParam)]
  const nextChord = useMemo(() => buildChord(next.rootPc, next.q, accidentals), [next.rootPc, next.q, accidentals])
  const nextSymbol = pretty(chordSymbol(next.rootPc, nextChord.quality, accidentals))
  const nextTriad = useMemo(() => nearestTriad(triad, next.rootPc, next.q), [triad, next.rootPc, next.q])
  const moves = nextTriad ? voiceMoves(triad, nextTriad) : []

  const o = { labels, pref: accidentals, rootName }
  const triadMarks = (t: TriadVoicing, tones = chord.tones, ring?: (i: number) => FretMark['ring']) =>
    positionMarks(t.strings.map((s, i) => ({ string: s, fret: t.frets[i] })), tones, o).map((m) => {
      const i = t.strings.indexOf(m.string)
      return { ...m, id: `voice-${i}`, emphasis: 'strong' as const, ring: ring?.(i) }
    })

  // Cheap to build (a few dozen marks), so computed every render rather than memoised.
  const marks: FretMark[] = (() => {
    switch (step) {
      case 'notes':
        return toneMarks(chord.tones, { ...o, range: RANGE })
      case 'shape':
        return mergeMarks(
          toneMarks(chord.tones, { ...o, range: RANGE, emphasis: () => 'ghost' }),
          // Voices numbered low → high so the shape's notes travel when you change position.
          positionMarks(shapePos, chord.tones, o).map((m) => ({ ...m, id: `s${m.string}`, emphasis: 'strong' as const })),
        )
      case 'triad':
        return mergeMarks(
          positionMarks(shapePos, chord.tones, { ...o, emphasis: () => 'soft' }),
          triadMarks(triad, chord.tones, () => (triadInShape ? 'shared' : undefined)),
        )
      case 'scale':
        return mergeMarks(
          positionMarks(
            scaleRegion(new Set(scale.tones.map((t) => t.pc)), region.start, region.end).filter((p) => !shapeKeys.has(posKey(p))),
            scale.tones,
            { ...o, tone: (t) => (chord.tones.some((c) => c.pc === t.pc) ? t.family : 'plain'), emphasis: () => 'soft' },
          ),
          positionMarks(shapePos, chord.tones, { ...o, emphasis: () => 'strong' }),
        )
      case 'move': {
        const near = { start: Math.max(0, triad.minFret - 2), end: Math.min(RANGE.end, triad.maxFret + 3) }
        const ghosts = toneMarks(nextChord.tones, { labels, pref: accidentals, range: near, strings: triad.strings, tone: () => 'target', emphasis: () => 'ghost' })
        if (!arrived || !nextTriad) return mergeMarks(ghosts, triadMarks(triad, chord.tones, (i) => (moves[i]?.semitones === 0 ? 'shared' : undefined)))
        return mergeMarks(ghosts, triadMarks(nextTriad, nextChord.tones, (i) => (moves[i]?.semitones === 0 ? 'shared' : 'target')))
      }
    }
  })()

  const go = (s: Step) => {
    setArrived(false)
    setStep(s)
  }
  const moveShape = (dir: 1 | -1) => {
    const v = placements[(shapeIdx + dir + placements.length) % placements.length]
    setAt(placementId(v))
  }
  const onTap = (p: FretPos) => {
    const owners = placements.filter((v) => v.frets[6 - p.string] === p.fret)
    if (!owners.length) return
    const i = owners.findIndex((v) => v === shape)
    setAt(placementId(owners[(i + 1) % owners.length]))
    if (step === 'notes') setStep('shape')
  }
  const stepIndex = STEP_IDS.indexOf(step)
  const showBands = step === 'shape' || step === 'triad' || step === 'scale'
  const bands = showBands
    ? placements.map((v) => ({ id: placementId(v), label: v.template.caged ?? v.template.name, start: v.minFret, end: v.maxFret, active: v === shape, description: `${v.template.name}, frets ${v.minFret} to ${v.maxFret}` }))
    : undefined

  const lowestRoot = shapePos.filter((p) => mod12(STANDARD_TUNING[6 - p.string].openMidi + p.fret) === rootPc).sort((a, b) => b.string - a.string)[0]
  const triadNames = triad.strings.map((s, i) => {
    const pc = mod12(STANDARD_TUNING[6 - s].openMidi + triad.frets[i])
    return pretty(displayNote(chord.tones.find((t) => t.pc === pc)!.spelled, accidentals))
  })
  const scaleName = getScale(scaleId)!.name
  const nameIn = (pc: number, tones = chord.tones) => {
    const t = tones.find((x) => x.pc === pc) ?? scale.tones.find((x) => x.pc === pc)
    return t ? pretty(displayNote(t.spelled, accidentals)) : '?'
  }

  const insight = (() => {
    switch (step) {
      case 'notes':
        return (
          <>
            <b>{symbol}</b> is {names.join(' – ')}: {chord.tones.map((t) => (t.interval === '1' ? 'root' : t.interval.replace('b', '♭'))).join(', ')}. Every dot on the neck is one of these {names.length} notes — wherever you find them together, you can play {symbol}. <span className="text-muted">Tap a note to see a shape that uses it.</span>
          </>
        )
      case 'shape':
        return (
          <>
            The <b>{shape.template.name}</b> at fret {shape.minFret}
            {lowestRoot ? `, with its lowest root on the ${STRING_NAME[lowestRoot.string]} string` : ''}. It’s one of {placements.length} places to grab {symbol} below fret {RANGE.end + 1}. Step along the neck and watch each string’s note slide to the next shape.
          </>
        )
      case 'triad':
        return triadInShape ? (
          <>
            Inside this shape, strings {triad.stringSetId.split('').join('–')} hold just {triadNames.join(', ')} — a {getQuality(triadQ)!.name.toLowerCase()} triad in {INVERSION_LABELS[triad.inversion].toLowerCase()}. That’s the chord’s core in three notes; {q === triadQ ? 'everything else in the shape doubles them' : `the shape adds the ${chord.tones.find((t) => t.family === 'seventh')?.interval.replace('b', '♭')} on top`}.
          </>
        ) : (
          <>
            This shape doesn’t hold a full triad on three neighbouring strings, so here’s the nearest one on strings 1–2–3: {triadNames.join(', ')} ({INVERSION_LABELS[triad.inversion].toLowerCase()}).
          </>
        )
      case 'scale':
        return (
          <>
            Around the shape lives the <b>{pretty(rootName)} {scaleName}</b> scale. The outlined notes are the ones between chord tones — each sits a fret or two from a coloured one, which is why a scale box is really a chord shape plus neighbours.
          </>
        )
      case 'move':
        return nextTriad ? (
          <>
            {symbol} → <b>{nextSymbol}</b> ({next.roman}) on the same strings:{' '}
            {moves
              .map((m) => {
                const fromPc = mod12(STANDARD_TUNING[6 - m.string].openMidi + m.fromFret)
                const toPc = mod12(STANDARD_TUNING[6 - m.string].openMidi + m.toFret)
                const from = nameIn(fromPc)
                const to = nameIn(toPc, nextChord.tones)
                return m.semitones === 0
                  ? `${from} stays — it’s in both chords`
                  : `${from} moves ${m.semitones > 0 ? 'up' : 'down'} ${Math.abs(m.semitones)} fret${Math.abs(m.semitones) > 1 ? 's' : ''} to ${to}`
              })
              .join('; ')}
            . {arrived ? 'Dashed rings are notes that moved to the new chord; solid rings stayed.' : 'Green rings show where the next chord’s notes are.'}
          </>
        ) : null
    }
  })()

  const deeper: Record<Step, { to: string; label: string }> = {
    notes: { to: `/fretboard`, label: 'Every note on the neck' },
    shape: { to: `/chords/elsewhere?root=${rootSlug(rootPc)}&quality=${q}`, label: `All ${symbol} shapes, area by area` },
    triad: { to: `/triads?root=${rootSlug(rootPc)}&quality=${triadQ}&strings=${triad.stringSetId}`, label: `Every ${pretty(rootName)} triad on these strings` },
    scale: { to: `/caged?key=${rootSlug(rootPc)}${triadQ === 'minor' ? '&quality=minor' : ''}`, label: 'Shapes and scales across the neck (CAGED)' },
    move: triadQ === 'major' && (next.deg === 4 || next.deg === 5 || next.deg === 6 || next.deg === 2)
      ? { to: `/fills?key=${rootSlug(rootPc)}&from=1&to=${next.deg}`, label: `Fill the gap ${symbol} → ${nextSymbol}` }
      : { to: `/triads/progressions?key=${rootSlug(rootPc)}`, label: 'Triads through a whole progression' },
  }

  return (
    <section aria-labelledby="atlas-title" className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="Questions about this chord" className="lg:pt-1">
        <h2 id="atlas-title" className="sr-only">
          Explore {symbol}
        </h2>
        <ol className="scroll-x -mx-4 flex gap-1.5 px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
          {ATLAS_STEPS.map((s, i) => {
            const current = s.id === step
            const done = i < stepIndex
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    current ? 'border-accent bg-accent text-on-accent' : 'border-transparent text-ink-soft hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold', current ? 'bg-on-accent text-accent' : done ? 'bg-accent-soft text-accent' : 'border border-line-strong')}>{i + 1}</span>
                  <span className="text-[14px] font-semibold leading-tight">{s.q}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end gap-x-5 gap-y-3">
          <RootSelector label="Which chord?" value={rootPc} onChange={(pc) => (setRoot(pc), setAt(''), setArrived(false))} />
          <Segmented label="Chord type" value={q} onChange={(v) => (setQ(v), setAt(''), setArrived(false))} options={QUALITIES.map((x) => ({ value: x.value, label: x.label }))} />
        </div>

        <Fretboard
          marks={marks}
          range={RANGE}
          bands={bands}
          onBandSelect={(id) => setAt(id)}
          region={step === 'scale' ? region : step === 'move' ? { start: Math.max(0, Math.min(triad.minFret, nextTriad?.minFret ?? 99) - 1), end: Math.min(RANGE.end, Math.max(triad.maxFret, nextTriad?.maxFret ?? 0) + 1) } : null}
          regionLabel={step === 'move' ? 'Your hand' : undefined}
          highlightStrings={step === 'triad' || step === 'move' ? (triad.strings as StringNum[]) : undefined}
          onSelect={onTap}
          hint={step === 'notes' ? `Tap any ${symbol} note to find a shape that uses it.` : step === 'shape' ? 'Tap a shape above the neck, or a note to cycle through the shapes that use it.' : undefined}
          ariaLabel={`${symbol}: ${ATLAS_STEPS[stepIndex].q}`}
        />

        <div className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <p className="prose-note max-w-[68ch] text-[17px]" aria-live="polite">
            {insight}
          </p>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {(step === 'shape' || step === 'triad' || step === 'scale') && placements.length > 1 && (
              <>
                <Button size="sm" onClick={() => moveShape(-1)} aria-label="Previous shape down the neck">
                  <ArrowLeft /> Lower
                </Button>
                <Button size="sm" onClick={() => moveShape(1)} aria-label="Next shape up the neck">
                  Higher <ArrowRight />
                </Button>
              </>
            )}
            {step === 'move' && (
              <>
                <Segmented
                  label="Next chord"
                  size="sm"
                  value={toParam}
                  onChange={(v) => (setTo(v), setArrived(false))}
                  options={options.map((x, i) => ({ value: String(i) as '0', label: `${pretty(chordSymbol(x.rootPc, getQuality(x.q)!, accidentals))} · ${x.roman}` }))}
                />
                <Button size="sm" variant="primary" onClick={() => setArrived((a) => !a)} disabled={!nextTriad}>
                  {arrived ? `Back to ${symbol}` : `Move to ${nextSymbol}`}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link to={deeper[step].to} className="text-[14px] font-medium text-ink underline decoration-line-control decoration-2 underline-offset-4 hover:decoration-ink">
            Go deeper: {deeper[step].label}
          </Link>
          {stepIndex < ATLAS_STEPS.length - 1 && (
            <Button variant="primary" onClick={() => go(ATLAS_STEPS[stepIndex + 1].id)}>
              Next: {ATLAS_STEPS[stepIndex + 1].q} <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

