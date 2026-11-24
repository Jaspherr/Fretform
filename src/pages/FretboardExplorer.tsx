import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Field, FretRangeSelector } from '@/components/controls'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { type FretMark, toneMarks } from '@/components/fretboard/marks'
import { ControlBar, LessonPanel, Page, PageHeader, Panel, SectionTitle, Tip } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { ChipToggles, Segmented } from '@/components/ui/segmented'
import { usePrefs } from '@/lib/prefs'
import { oneOf, useUrlParam } from '@/lib/url-state'
import { storage } from '@/lib/utils'
import { BRAND } from '@/brand'
import {
  type FretPos,
  type FretRange,
  FULL_RANGE,
  NECK_REGIONS,
  type NeckRegionId,
  type StringNum,
  STANDARD_TUNING,
  octavesOf,
  pcAt,
} from '@/theory/fretboard'
import { type PitchClass, pcName, pretty } from '@/theory/notes'
import { usePcName } from '@/lib/names'
import { tonesFromPcs } from '@/theory/tones'

const REGION_IDS = NECK_REGIONS.map((r) => r.id)

function NoteExplorer() {
  const { labels, accidentals } = usePrefs()
  const name = usePcName()
  const [notesParam, setNotesParam] = useUrlParam('notes', '0', (v): v is string => /^(\d{1,2})(,\d{1,2})*$/.test(v))
  const selected = useMemo(() => [...new Set(notesParam.split(',').map(Number).filter((n) => n >= 0 && n < 12))], [notesParam])
  const setSelected = (pcs: PitchClass[]) => setNotesParam(pcs.length ? pcs.join(',') : '0')
  const [rootChoice, setRootChoice] = useState<PitchClass | null>(null)
  const root = rootChoice !== null && selected.includes(rootChoice) ? rootChoice : (selected[0] ?? 0)
  const [regionId, setRegionId] = useUrlParam<NeckRegionId>('area', 'all', oneOf(REGION_IDS))
  const [strings, setStrings] = useState<string[]>(['1', '2', '3', '4', '5', '6'])
  const [showAll, setShowAll] = useState(false)
  const region = NECK_REGIONS.find((r) => r.id === regionId)!.range

  const marks = useMemo(() => {
    const tones = tonesFromPcs(root, selected, accidentals)
    const stringNums = strings.map(Number) as StringNum[]
    const main = toneMarks(tones, { labels, pref: accidentals, rootName: name(root), strings: stringNums, range: region })
    if (!showAll) return main
    const taken = new Set(main.map((m) => `${m.string}:${m.fret}`))
    const ghosts: FretMark[] = []
    for (const s of [1, 2, 3, 4, 5, 6] as StringNum[])
      for (let f = 0; f <= FULL_RANGE.end; f++) {
        if (taken.has(`${s}:${f}`)) continue
        const pc = pcAt(s, f)
        ghosts.push({ string: s, fret: f, label: name(pc), tone: 'plain', emphasis: 'ghost', info: name(pc) })
      }
    return [...ghosts, ...main]
  }, [root, selected, accidentals, labels, strings, region, showAll, name])

  const presets: { label: string; pcs: PitchClass[] }[] = [
    { label: 'Just C', pcs: [0] },
    { label: 'C major chord (C E G)', pcs: [0, 4, 7] },
    { label: 'Natural notes', pcs: [0, 2, 4, 5, 7, 9, 11] },
    { label: 'All 12', pcs: [...Array(12).keys()] },
  ]

  return (
    <Panel>
      <Tip id="fb-explorer">
        Pick a note and every place it lives lights up. Add more notes to build a chord — pick C, then E, then G and watch a C major chord appear across the whole neck.
      </Tip>
      <ControlBar>
        <Field label="Notes">
          <ChipToggles
            label="Notes to show"
            values={selected.map(String)}
            onChange={(v) => setSelected(v.map(Number))}
            options={[...Array(12).keys()].map((pc) => ({ value: String(pc), label: name(pc) }))}
          />
        </Field>
      </ControlBar>
      <ControlBar>
        <Field label="Treat as root">
          <Segmented
            label="Root for interval labels"
            size="sm"
            value={String(root)}
            onChange={(v) => setRootChoice(Number(v))}
            options={selected.map((pc) => ({ value: String(pc), label: name(pc) }))}
          />
        </Field>
        <FretRangeSelector value={regionId} onChange={setRegionId} label="Fret range" />
        <Field label="Strings">
          <ChipToggles
            label="Strings to show"
            values={strings}
            onChange={(v) => setStrings(v.length ? v : strings)}
            options={STANDARD_TUNING.slice()
              .reverse()
              .map((s) => ({ value: String(s.num), label: `${s.num} · ${s.name}` }))}
          />
        </Field>
      </ControlBar>
      <ControlBar>
        <Field label="Unselected frets">
          <Segmented
            label="Show names on every fret"
            size="sm"
            value={showAll ? 'all' : 'hide'}
            onChange={(v) => setShowAll(v === 'all')}
            options={[
              { value: 'hide', label: 'Hide' },
              { value: 'all', label: 'Show all names' },
            ]}
          />
        </Field>
        <Field label="Presets">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Button key={p.label} size="sm" variant="ghost" className="border border-line" onClick={() => setSelected(p.pcs)}>
                {p.label}
              </Button>
            ))}
          </div>
        </Field>
      </ControlBar>
      <Fretboard
        marks={marks}
        region={regionId === 'all' ? null : region}
        highlightStrings={strings.length < 6 ? (strings.map(Number) as StringNum[]) : undefined}
        ariaLabel={`Fretboard showing ${selected.map(name).join(', ')}`}
      />
      <p className="mt-3 text-[13px] text-muted">
        Intervals are measured from {name(root)}. {selected.length > 1 && 'Change “Treat as root” to see the same notes from a different root.'}
      </p>
    </Panel>
  )
}

function OctaveShapes() {
  const name = usePcName()
  const [pick, setPick] = useState<FretPos>({ string: 6, fret: 3 })
  const pc = pcAt(pick.string, pick.fret)
  const marks: FretMark[] = useMemo(
    () => [
      { ...pick, label: name(pc), tone: 'root', emphasis: 'strong', ring: 'selected', info: `${name(pc)} — the note you picked` },
      ...octavesOf(pick).map((p) => ({ ...p, label: name(pc), tone: 'root' as const, emphasis: 'normal' as const, info: `${name(pc)} — same note, ${p.fret > pick.fret ? 'higher' : 'lower'} on the neck` })),
    ],
    [pick, pc, name],
  )
  return (
    <div>
      <Fretboard marks={marks} onSelect={setPick} ariaLabel={`Every ${name(pc)} on the neck`} hint="Click any fret to move the starting note." />
      <ul className="mt-3 grid gap-2 text-[14px] text-ink-soft sm:grid-cols-3">
        <li className="rounded-lg bg-surface-2/60 p-3">
          <b className="text-ink">Two strings, two frets.</b> From the 6th, 5th or 4th string, the octave is two strings higher and two frets up.
        </li>
        <li className="rounded-lg bg-surface-2/60 p-3">
          <b className="text-ink">The B-string bump.</b> When the jump crosses the B string, it’s two strings higher and three frets up.
        </li>
        <li className="rounded-lg bg-surface-2/60 p-3">
          <b className="text-ink">Outer strings match.</b> The low E and high e have the same notes on the same frets, two octaves apart.
        </li>
      </ul>
    </div>
  )
}

const LANDMARKS = [
  { id: 'five', label: 'Fret 5 = next string open' },
  { id: 'seven', label: 'Fret 7 = string below at 12' },
  { id: 'twelve', label: 'Fret 12 = open again' },
] as const

function Landmarks() {
  const name = usePcName()
  const [which, setWhich] = useState<(typeof LANDMARKS)[number]['id']>('five')
  const { marks, range } = useMemo(() => {
    const out: FretMark[] = []
    let range: FretRange = { start: 0, end: 12 }
    const mk = (s: StringNum, f: number, tone: FretMark['tone'], info: string): FretMark => ({ string: s, fret: f, label: name(pcAt(s, f)), tone, info })
    if (which === 'five') {
      range = { start: 0, end: 7 }
      for (const s of [6, 5, 4, 2] as StringNum[]) {
        out.push(mk(s, 5, 'third', `Same note as the open ${STANDARD_TUNING[6 - (s - 1)].name} string`))
        out.push(mk((s - 1) as StringNum, 0, 'third', 'Open string'))
      }
      out.push(mk(3, 4, 'fifth', 'The G string is the exception: fret 4 matches the open B'))
      out.push(mk(2, 0, 'fifth', 'Open B'))
    } else if (which === 'seven') {
      range = { start: 5, end: 14 }
      for (const s of [5, 4, 3, 1] as StringNum[]) {
        out.push(mk(s, 7, 'fifth', `Same note as fret 12 on the ${STANDARD_TUNING[6 - (s + 1)].name} string below`))
        out.push(mk((s + 1) as StringNum, 12, 'fifth', 'Fret 12'))
      }
      out.push(mk(2, 8, 'seventh', 'The B string is the exception: fret 8 matches fret 12 on the G string'))
      out.push(mk(3, 12, 'seventh', 'Fret 12'))
    } else {
      range = { start: 0, end: 15 }
      for (const s of [1, 2, 3, 4, 5, 6] as StringNum[]) {
        out.push(mk(s, 0, 'root', 'Open string'))
        out.push(mk(s, 12, 'root', 'Fret 12 — the open note, one octave up'))
      }
    }
    return { marks: out, range }
  }, [which, name])
  const copy = {
    five: 'The 5th fret of each string is the same note as the next string open. That’s how you tune by ear — and it means you can always jump to a known note. The G string is the odd one: use its 4th fret.',
    seven: 'The 7th fret of a string is the same note as the 12th fret of the next lower string (the B string uses fret 8). Combine with fret 5 and you have two fixed reference points in the middle of the neck.',
    twelve: 'At fret 12 everything starts over one octave higher. Any shape you know below fret 10 also works twelve frets up, with the same note names.',
  }
  return (
    <div>
      <Segmented label="Landmark" value={which} onChange={setWhich} options={LANDMARKS.map((l) => ({ value: l.id, label: l.label }))} className="mb-4" />
      <Fretboard marks={marks} range={range} ariaLabel={LANDMARKS.find((l) => l.id === which)!.label} />
      <p className="mt-2 max-w-3xl text-[14.5px] text-ink-soft">{copy[which]}</p>
    </div>
  )
}

const QUIZ_KEY = `${BRAND.storagePrefix}:note-quiz`

function NoteQuiz() {
  const name = usePcName()
  const { accidentals } = usePrefs()
  const [regionId, setRegionId] = useState<NeckRegionId>('open')
  const region = NECK_REGIONS.find((r) => r.id === regionId)!.range
  const randomPos = (): FretPos => ({
    string: (1 + Math.floor(Math.random() * 6)) as StringNum,
    fret: region.start + Math.floor(Math.random() * (region.end - region.start + 1)),
  })
  const [pos, setPos] = useState<FretPos>(() => ({ string: 6, fret: 3 }))
  const [answer, setAnswer] = useState<PitchClass | null>(null)
  const [stats, setStats] = useState(() => storage.get(QUIZ_KEY, { right: 0, total: 0, best: 0, streak: 0 }))
  const pc = pcAt(pos.string, pos.fret)
  const correct = answer === pc

  const choose = (guess: PitchClass) => {
    if (answer !== null) return
    setAnswer(guess)
    const ok = guess === pc
    const next = { right: stats.right + (ok ? 1 : 0), total: stats.total + 1, streak: ok ? stats.streak + 1 : 0, best: Math.max(stats.best, ok ? stats.streak + 1 : 0) }
    setStats(next)
    storage.set(QUIZ_KEY, next)
  }
  const nextQ = () => {
    let p = randomPos()
    while (p.string === pos.string && p.fret === pos.fret) p = randomPos()
    setPos(p)
    setAnswer(null)
  }
  const marks: FretMark[] = [
    answer === null
      ? { ...pos, label: '?', tone: 'selected', emphasis: 'strong', ring: 'selected', info: 'Which note is this?' }
      : { ...pos, label: name(pc), tone: correct ? 'target' : 'root', emphasis: 'strong', info: name(pc) },
  ]
  const choices = [...Array(12).keys()]
  return (
    <div>
      <ControlBar>
        <FretRangeSelector value={regionId} onChange={(v) => { setRegionId(v); setAnswer(null) }} label="Practice area" />
        <div className="text-[13px] text-muted">
          Streak <b className="text-ink">{stats.streak}</b> · Best <b className="text-ink">{stats.best}</b> · {stats.right}/{stats.total} correct
          <button onClick={() => { const z = { right: 0, total: 0, best: 0, streak: 0 }; setStats(z); storage.set(QUIZ_KEY, z) }} className="ml-2 inline-flex cursor-pointer items-center gap-1 text-muted hover:text-ink" aria-label="Reset score">
            <RotateCcw className="size-3" />
          </button>
        </div>
      </ControlBar>
      <Fretboard marks={marks} range={regionId === 'all' ? FULL_RANGE : { start: Math.max(0, region.start - 1), end: Math.min(22, region.end + 1) }} ariaLabel="Note quiz" hideInspector />
      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Your answer">
        {choices.map((c) => (
          <button
            key={c}
            onClick={() => choose(c)}
            disabled={answer !== null}
            className={
              'h-9 min-w-11 cursor-pointer rounded-lg border px-2 text-[14px] font-semibold transition-colors disabled:cursor-default ' +
              (answer !== null && c === pc ? 'border-transparent bg-target text-[var(--on-target)]' : answer === c ? 'border-transparent bg-root text-[var(--on-root)]' : 'border-line-strong bg-surface hover:bg-surface-2')
            }
          >
            {accidentals === 'auto' ? pretty(pcName(c, 'sharp')) + (pcName(c, 'sharp') !== pcName(c, 'flat') ? `/${pretty(pcName(c, 'flat'))}` : '') : name(c)}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-3 flex min-h-9 items-center gap-3 text-[14.5px]">
        {answer !== null && (
          <>
            <span className={correct ? 'text-ink' : 'text-ink-soft'}>
              {correct ? 'Yes — ' : 'Not quite — '} string {pos.string}, {pos.fret === 0 ? 'open' : `fret ${pos.fret}`} is <b>{name(pc)}</b>.
              {!correct && pos.fret >= 5 && ` Landmark: fret ${pos.fret >= 12 ? 12 : pos.fret >= 7 ? 7 : 5} on this string is ${name(pcAt(pos.string, pos.fret >= 12 ? 12 : pos.fret >= 7 ? 7 : 5))}.`}
            </span>
            <Button size="sm" variant="primary" onClick={nextQ} autoFocus>
              Next note
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function FretboardPage() {
  return (
    <Page>
      <PageHeader eyebrow="Fretboard" title="Fretboard Explorer">
        Every chord and scale is built from the same twelve notes. Find them, see where they repeat, and learn a few landmarks so the upper frets stop feeling like a different instrument.
      </PageHeader>
      <NoteExplorer />

      <SectionTitle sub="Click any fret. Every other place that note lives appears — these octave shapes are how players find roots instantly.">Octave shapes</SectionTitle>
      <Panel>
        <OctaveShapes />
      </Panel>

      <SectionTitle sub="A few fixed reference points beat counting frets from the nut.">Landmark frets</SectionTitle>
      <Panel>
        <Landmarks />
      </Panel>

      <SectionTitle sub="A quick drill. Pick an area of the neck you want to know better.">What note is this?</SectionTitle>
      <Panel>
        <NoteQuiz />
      </Panel>

      <SectionTitle>How to use this</SectionTitle>
      <LessonPanel
        seeing="Notes as positions. Each string is a row of half-steps; the same twelve notes repeat every 12 frets."
        matters="Roots anchor every shape you know. Find the root on the 6th or 5th string and you can drop an E-shape or A-shape barre chord there."
        find="Use fret 12 as a mirror of the open strings, and frets 5 and 7 as landmarks for the middle of the neck."
        tryThis="Turn on “Show all names” and say the notes of the A string from fret 0 to 12 out loud. Then switch to the D string."
      />
    </Page>
  )
}

