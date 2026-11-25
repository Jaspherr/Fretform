import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FretRangeSelector } from '@/components/controls'
import { Tab } from '@/components/diagrams/Tab'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { INTERVAL_LEGEND, Legend, NoteBadge } from '@/components/fretboard/Legend'
import { type FretMark, describeTone, labelTone, toneMarks } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { ControlBar, LessonPanel, Page, PageHeader, Panel, SectionTitle, Tip, ToolLink, OnTheNeck } from '@/components/layout/page'
import { FILL_NAV } from '@/components/layout/sections'
import { Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useRootParam, useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { buildChord } from '@/theory/chords'
import { type DiatonicChord, degreeInKey, diatonicChords } from '@/theory/diatonic'
import { type FillExample, type FillKind, type FillRole, classifyFillNotes, exampleFills } from '@/theory/fills'
import { type FretRange, NECK_REGIONS, type NeckRegionId } from '@/theory/fretboard'
import { prettyInterval } from '@/theory/intervals'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { buildScale } from '@/theory/scales'
import { type Tone, toneMap } from '@/theory/tones'

/** The hand window is 5 frets wide; its start fret lives in the URL (?frets=3). */
const NECK_VIEW: FretRange = { start: 0, end: 17 }
const WINDOW_STARTS = Array.from({ length: NECK_VIEW.end - 3 }, (_, i) => String(i))
const windowRange = (w: string): FretRange => ({ start: Number(w), end: Number(w) + 4 })

const DEGREES = ['1', '2', '3', '4', '5', '6', '7'] as const

type Degree = (typeof DEGREES)[number]

function ChordPicker({ label, chords, value, onChange }: { label: string; chords: DiatonicChord[]; value: Degree; onChange: (v: Degree) => void }) {
  return (
    <Field label={label}>
      <Segmented<Degree>
        label={label}
        size="sm"
        value={value}
        onChange={onChange}
        options={chords.map((c) => ({ value: String(c.degree) as Degree, label: <span><span className="font-semibold">{pretty(c.symbol)}</span> <span className="text-[12px] text-muted">{c.roman}</span></span> }))}
      />
    </Field>
  )
}

/** Use the same segmented visual style as the chord controls, not a dropdown. */
const MAJOR_KEYS = Array.from({ length: 12 }, (_, pc) => String(pc))

function MajorKeyPicker({
  label,
  value,
  onChange,
  accidentals,
}: {
  label: string
  value: number
  onChange: (pc: number) => void
  accidentals: ReturnType<typeof usePrefs>['accidentals']
}) {
  const options = useMemo(
    () => MAJOR_KEYS.map((key) => ({
      value: key,
      label: pretty(displayNote(buildScale(Number(key), 'major', accidentals).tones[0].spelled, accidentals)),
    })),
    [accidentals],
  )

  return (
    <Field label={label}>
      <div className="min-w-0 max-w-full overflow-x-auto pb-1">
        <Segmented<string>
          label={label}
          size="sm"
          value={String(value)}
          onChange={(key) => onChange(Number(key))}
          options={options}
        />
      </div>
    </Field>
  )
}

const FILL_KIND_INFO: Record<FillKind, { title: string; text: string }> = {
  'chord-tone': { title: 'Chord-tone fill', text: 'Move between notes that belong to the chord you’re on. It always fits, because it’s the chord itself, one note at a time.' },
  scale: { title: 'Scale fill', text: 'Use the key’s notes in between chord tones. Start and end on a chord tone; the notes in the middle create motion.' },
  connecting: { title: 'Connecting fill', text: 'Walk toward a note of the next chord and arrive on it as the chord changes. This is what makes a fill sound like it leads somewhere.' },
}

function FillCard({ fill, curRoot, nextRoot, curTones, nextTones, keyNames }: { fill: FillExample; curRoot: string; nextRoot: string; curTones: Map<number, Tone>; nextTones: Set<number>; keyNames: (pc: number) => string }) {
  // Step through: one "finger" glides from note to note; played notes stay as a trail.
  const [step, setStep] = useState<number | null>(null)
  const last = fill.notes.length - 1
  const jobOf = (pc: number, i: number) =>
    curTones.has(pc)
      ? `a ${curRoot} chord tone (safe)`
      : nextTones.has(pc)
        ? i === last
          ? `a ${nextRoot} chord tone — the landing note`
          : `a ${nextRoot} chord tone`
        : 'a passing note in the key'
  const marks: FretMark[] = fill.notes.map((n, i) => {
    const base: FretMark = {
      string: n.string,
      fret: n.fret,
      label: String(i + 1),
      tone: curTones.get(n.pc)?.family ?? (nextTones.has(n.pc) ? 'target' : 'plain'),
      ring: nextTones.has(n.pc) && i === last ? 'target' : undefined,
      emphasis: 'strong',
      info: `Note ${i + 1}: ${keyNames(n.pc)} — ${jobOf(n.pc, i)}`,
    }
    if (step === null) return base
    if (i === step) return { ...base, id: 'finger' }
    return { ...base, emphasis: i < step ? 'soft' : 'ghost', ring: undefined }
  })
  const lo = Math.max(0, Math.min(...fill.notes.map((n) => n.fret)) - 1)
  const info = FILL_KIND_INFO[fill.kind]
  const cur = step === null ? null : fill.notes[step]
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-semibold text-xl">{info.title}</h3>
      <p className="text-[14px] text-ink-soft">{info.text}</p>
      <Fretboard marks={marks} legend={false} range={{ start: lo, end: Math.min(22, lo + 6) }} size="sm" ariaLabel={`${info.title} example`} hint="Follow the numbers. Tap a dot to see which note it is." />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={step === null ? 'outline' : 'primary'} onClick={() => setStep(step === null ? 0 : step >= last ? null : step + 1)} aria-label={step === null ? `Step through the ${info.title.toLowerCase()}` : step >= last ? 'Show the whole fill' : 'Next note'}>
          {step === null ? 'Step through' : step >= last ? 'Show all' : 'Next note'}
        </Button>
        <span className="text-[13.5px] text-ink-soft" aria-live="polite">
          {cur ? `Note ${step! + 1} of ${last + 1}: ${keyNames(cur.pc)} — ${jobOf(cur.pc, step!)}` : ''}
        </span>
      </div>
      <Tab notes={fill.notes} label={`${info.title} tab`} />
      <p className="text-[13px] text-muted">
        {fill.notes.map((n) => keyNames(n.pc)).join(' → ')} · {fill.how} ({curRoot} → {nextRoot})
      </p>
    </div>
  )
}

export function FillsPage() {
  const { labels, accidentals } = usePrefs()
  const [keyPc, setKey] = useRootParam('key', 7, false)
  const [curDeg, setCurDeg] = useUrlParam('from', '1', oneOf(DEGREES))
  const [nextDeg, setNextDeg] = useUrlParam('to', '4', oneOf(DEGREES))
  const [win, setWin] = useUrlParam<string>('frets', '3', oneOf(WINDOW_STARTS))
  const range = useMemo(() => windowRange(win), [win])
  const chords = useMemo(() => diatonicChords(keyPc, accidentals), [keyPc, accidentals])
  const cur = chords[Number(curDeg) - 1]
  const nxt = chords[Number(nextDeg) - 1]
  const curChord = useMemo(() => buildChord(cur.rootPc, cur.qualityId, accidentals), [cur, accidentals])
  const nextChord = useMemo(() => buildChord(nxt.rootPc, nxt.qualityId, accidentals), [nxt, accidentals])
  const scale = useMemo(() => buildScale(keyPc, 'major', accidentals), [keyPc, accidentals])
  const keyName = pretty(displayNote(scale.tones[0].spelled, accidentals))
  const ctx = useMemo(
    () => ({ keyPc, current: { rootPc: cur.rootPc, qualityId: cur.qualityId }, next: { rootPc: nxt.rootPc, qualityId: nxt.qualityId }, range }),
    [keyPc, cur, nxt, range],
  )
  const cells = useMemo(() => classifyFillNotes(ctx), [ctx])
  const fills = useMemo(() => exampleFills(ctx), [ctx])

  const curMap = useMemo(() => toneMap(curChord.tones), [curChord])
  const nextMap = useMemo(() => toneMap(nextChord.tones), [nextChord])
  const scaleMap = useMemo(() => toneMap(scale.tones), [scale])
  const marks: FretMark[] = useMemo(
    () =>
      cells.map((c) => {
        const ct = curMap.get(c.pc)
        const nt = nextMap.get(c.pc)
        const st = scaleMap.get(c.pc)!
        const name = pretty(displayNote(st.spelled, accidentals))
        if (c.role === 'safe' || c.role === 'common')
          return { ...c, ...labelTone(ct!, labels, accidentals), tone: ct!.family, emphasis: 'strong' as const, ring: c.role === 'common' ? ('target' as const) : undefined, info: `${describeTone(ct!, accidentals, pretty(cur.symbol))}${c.role === 'common' ? ` — also in ${pretty(nxt.symbol)}` : ''} (safe)` }
        if (c.role === 'target') {
          const lab = labels === 'notes' ? { label: name } : labels === 'intervals' ? { label: `→${prettyInterval(nt!.interval)}` } : { label: name, sub: `→${prettyInterval(nt!.interval)}` }
          return { ...c, ...lab, tone: 'target' as const, ring: 'target' as const, info: `${name} — the ${prettyInterval(nt!.interval)} of ${pretty(nxt.symbol)} (target)` }
        }
        const lab = labels === 'intervals' ? { label: prettyInterval(degreeInKey(cur.rootPc, c.pc)) } : labels === 'both' ? { label: name, sub: prettyInterval(degreeInKey(cur.rootPc, c.pc)) } : { label: name }
        return { ...c, ...lab, tone: 'plain' as const, emphasis: 'soft' as const, info: `${name} — in the key of ${keyName}, not in either chord (passing)` }
      }),
    [cells, curMap, nextMap, scaleMap, labels, accidentals, cur, nxt, keyName],
  )

  const roleNotes = (roles: FillRole[]) => [...new Set(cells.filter((c) => roles.includes(c.role)).map((c) => c.pc))]
  const nameOf = (pc: number) => pretty(displayNote(scaleMap.get(pc)!.spelled, accidentals))
  const nextPcs = new Set(nextChord.tones.map((t) => t.pc))

  return (
    <Page>
      <SubNav items={FILL_NAV} />
      <PageHeader eyebrow="Changes" actions={<OnTheNeck rootPc={cur.rootPc} quality={cur.qualityId} step="move" label="Watch the voices move on the neck" />} title={<>Fill the gap: {pretty(cur.symbol)} → {pretty(nxt.symbol)}</>}>
        What can you play between two chords without moving your hand? Every note under your hand gets a job: safe (this chord), target (the next chord) or passing (the key in between).
      </PageHeader>
      <Panel>
        <ControlBar>
          <ChordPicker label="Which chord are you on?" chords={chords} value={curDeg} onChange={setCurDeg} />
          <ChordPicker label="Where are you going?" chords={chords} value={nextDeg} onChange={setNextDeg} />
        </ControlBar>
        <ControlBar>
          <MajorKeyPicker label="Key (major)" value={keyPc} onChange={setKey} accidentals={accidentals} />
        </ControlBar>

        <p className="mb-2 text-[14.5px] text-ink-soft" aria-live="polite">
          Your hand is at <b className="text-ink">frets {range.start}–{range.end}</b>. Tap anywhere on the neck to move it.
        </p>
        <Fretboard
          legend={false}
          marks={marks}
          range={NECK_VIEW}
          region={range}
          regionLabel="Your hand"
          onSelect={(p) => setWin(String(Math.max(0, Math.min(NECK_VIEW.end - 4, p.fret - 2))))}
          hint="Tap a fret to move your hand there."
          ariaLabel={`Fill notes from ${cur.symbol} to ${nxt.symbol}`}
        />
        <Legend
          className="mt-2"
          items={[
            { tone: 'root', label: `Safe: ${pretty(cur.symbol)} chord tones` },
            { tone: 'third', label: 'Safe now and in the next chord', ring: 'target' },
            { tone: 'plain', label: 'Passing: other notes in the key' },
            { tone: 'target', label: `Target: ${pretty(nxt.symbol)} chord tones`, ring: 'target' },
          ]}
        />

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { t: 'Safe notes', d: `Chord tones of ${pretty(cur.symbol)}. Land here while ${pretty(cur.symbol)} is still ringing.`, pcs: roleNotes(['safe', 'common']), fam: 'root' as const },
            { t: 'Passing notes', d: `Other notes of ${keyName} major. Use them to move, not to stop.`, pcs: roleNotes(['passing']), fam: 'plain' as const },
            { t: 'Target notes', d: `Chord tones of ${pretty(nxt.symbol)}. Arrive on one right as the chord changes.`, pcs: [...new Set([...roleNotes(['target']), ...roleNotes(['common'])])], fam: 'target' as const },
          ].map((b) => (
            <div key={b.t} className="rounded-xl border border-line bg-surface-2/40 p-4">
              <div className="text-[12.5px] font-semibold text-ink">{b.t}</div>
              <p className="mt-1 text-[14px] text-ink-soft">{b.d}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {b.pcs.map((pc) => (
                  <NoteBadge key={pc} note={nameOf(pc)} family={b.fam === 'root' ? (curMap.get(pc)?.family ?? 'other') : b.fam} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <SectionTitle sub="Three ways to fill the gap, built from the notes above. They’re deliberately simple — the point is where the notes come from, not the lick.">Fill types</SectionTitle>
      <Tip id="fill-numbers">In the examples, dots are numbered in playing order. Coloured shapes are notes of the current chord, green is a note of the next chord, outlined is a passing note.</Tip>
      {fills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-ink-soft">This fret area is too tight for an example on the top strings. Try a different area.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {fills.map((f) => (
            <FillCard key={f.kind} fill={f} curRoot={pretty(cur.symbol)} nextRoot={pretty(nxt.symbol)} curTones={curMap} nextTones={nextPcs} keyNames={nameOf} />
          ))}
        </div>
      )}

      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`Every note in frets ${range.start}–${range.end}, sorted by job for the change ${pretty(cur.symbol)} → ${pretty(nxt.symbol)}.`}
        matters="A fill doesn’t need to be fast or flashy. Two or three notes that leave the chord and land on the next one make a rhythm part sound arranged."
        find="Look for a passing note that sits one fret or one scale step from a green target. That’s your approach note."
        tryThis={<>Strum {pretty(cur.symbol)} for three beats. On beat four, play two notes that end on a green target, then strum {pretty(nxt.symbol)}. See which notes belong to which chord on the <ToolLink to={`/fills/chord-tones?key=${rootSlug(keyPc)}`}>chord tones page</ToolLink>.</>}
      />
    </Page>
  )
}

export function ChordTonesPage() {
  const { labels, accidentals } = usePrefs()
  const [keyPc, setKey] = useRootParam('key', 7)
  const [deg, setDeg] = useUrlParam('chord', '4', oneOf(DEGREES))
  const [areaId, setArea] = useUrlParam<NeckRegionId>('area', 'all', oneOf(NECK_REGIONS.map((r) => r.id)))
  const area = NECK_REGIONS.find((r) => r.id === areaId)!.range
  const chords = useMemo(() => diatonicChords(keyPc, accidentals), [keyPc, accidentals])
  const c = chords[Number(deg) - 1]
  const chord = useMemo(() => buildChord(c.rootPc, c.qualityId, accidentals), [c, accidentals])
  const scale = useMemo(() => buildScale(keyPc, 'major', accidentals), [keyPc, accidentals])
  const keyName = pretty(displayNote(scale.tones[0].spelled, accidentals))

  const marks = useMemo(() => {
    const chordRoot = pretty(displayNote(chord.tones[0].spelled, accidentals))
    const scaleOnly = toneMarks(scale.tones.filter((t) => !chord.tones.some((x) => x.pc === t.pc)), {
      labels,
      pref: accidentals,
      rootName: keyName,
      range: area,
      tone: () => 'plain',
      emphasis: () => 'soft',
    })
    const tones = toneMarks(chord.tones, { labels, pref: accidentals, rootName: chordRoot, range: area, emphasis: () => 'strong' })
    return [...scaleOnly, ...tones]
  }, [chord, scale, labels, accidentals, keyName, area])

  return (
    <Page>
      <SubNav items={FILL_NAV} />
      <PageHeader eyebrow="Changes" title="See the chord inside the scale">
        The key stays the same; only the highlighted notes change from chord to chord. Those highlighted notes are where your lines should land.
      </PageHeader>
      <Panel>
        <ControlBar>
          <MajorKeyPicker label="Key (major)" value={keyPc} onChange={setKey} accidentals={accidentals} />
        </ControlBar>
        <ControlBar>
          <ChordPicker label="Chord" chords={chords} value={deg} onChange={setDeg} />
        </ControlBar>
        <ControlBar>
          <FretRangeSelector value={areaId} onChange={setArea} />
        </ControlBar>
        <div className="mb-4">
          <h2 className="text-2xl font-medium">
            {pretty(c.symbol)} <span className="font-mono text-lg text-muted">{c.roman}</span> <span className="text-lg font-normal text-muted">in {keyName} major</span>
          </h2>
          <p className="mt-1 text-[14.5px] text-ink-soft">
            {chord.tones.map((t) => pretty(displayNote(t.spelled, accidentals))).join(' – ')} — the {chord.tones.map((t) => degreeInKey(keyPc, t.pc)).map(prettyInterval).join(', ')} of the key. {c.function}
          </p>
        </div>
        <Fretboard legend={false} marks={marks} region={areaId === 'all' ? null : area} ariaLabel={`${c.symbol} chord tones inside ${keyName} major`} />
        <Legend items={[...INTERVAL_LEGEND.slice(0, 3), { tone: 'plain', label: `Other notes of ${keyName} major`, soft: true }]} className="mt-2" />
        <p className="mt-2 text-[13px] text-muted">Interval labels are measured from the chord’s root, so you can see each note’s job in this chord.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {chords.map((ch) => {
            const tones = buildChord(ch.rootPc, ch.qualityId, accidentals).tones
            return (
              <button
                key={ch.degree}
                onClick={() => setDeg(String(ch.degree) as (typeof DEGREES)[number])}
                aria-pressed={ch.degree === c.degree}
                className={cn('cursor-pointer rounded-xl border bg-surface p-3 text-left transition-colors', ch.degree === c.degree ? 'border-ink' : 'border-line hover:border-line-strong')}
              >
                <div className="font-mono text-[12px] text-muted">{ch.roman}</div>
                <div className="font-semibold text-lg text-ink">{pretty(ch.symbol)}</div>
                <div className="mt-1 font-mono text-[12px] text-ink-soft">{tones.map((t) => pretty(displayNote(t.spelled, accidentals))).join(' ')}</div>
              </button>
            )
          })}
        </div>
      </Panel>
      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing={`All of ${keyName} major, with the notes of ${pretty(c.symbol)} brought forward.`}
        matters="Over any chord, its own notes sound resolved and everything else sounds like it’s going somewhere. That’s why chord-tone targeting works."
        find="Step through I, IV and V. Watch the bright notes move while the faded ones stay put — the scale never changes, the job of each note does."
        tryThis={<>Pick an area of the neck and improvise over {pretty(chords[0].symbol)} → {pretty(chords[3].symbol)}, ending each phrase on a bright note. Then use the <ToolLink to={`/fills?key=${rootSlug(keyPc)}`}>Fill Navigator</ToolLink> to connect them.</>}
      />
    </Page>
  )
}
