import { Eraser } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Field } from '@/components/controls'
import { ChordDiagram } from '@/components/diagrams/ChordDiagram'
import { Fretboard } from '@/components/fretboard/Fretboard'
import { IntervalBadge, NoteBadge } from '@/components/fretboard/Legend'
import { type FretMark, describeTone, labelTone, rangeAround } from '@/components/fretboard/marks'
import { SubNav } from '@/components/layout/AppShell'
import { LessonPanel, Page, PageHeader, Panel, SectionTitle, Tip } from '@/components/layout/page'
import { CHORD_NAV } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { usePcName } from '@/lib/names'
import { usePrefs } from '@/lib/prefs'
import { useUrlParam } from '@/lib/url-state'
import { cn } from '@/lib/utils'
import { chordLongName } from '@/theory/chords'
import { type FretPos, FULL_RANGE, STANDARD_TUNING, pcAt } from '@/theory/fretboard'
import { prettyInterval } from '@/theory/intervals'
import { type ChordMatch, type FretInput, MATCH_KIND_LABEL, identifyFrets, parseFretString } from '@/theory/identify'
import { displayNote, pretty, rootSlug } from '@/theory/notes'
import { fretsToString } from '@/theory/voicings'

const EXAMPLES = ['x32010', '8 10 10 9 8 8', '032010', 'x02210', 'xx0232', '320001', 'x2323x', 'x02020', '3x0003']

const encode = (frets: FretInput) => frets.map((f) => (f === null ? 'x' : f)).join('-')
const isFretParam = (v: string): v is string => /^([x]|\d{1,2})(-([x]|\d{1,2})){5}$/.test(v)

function ResultCard({ m, selected, onSelect, rank }: { m: ChordMatch; selected: boolean; onSelect: () => void; rank: number }) {
  const { accidentals } = usePrefs()
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-surface p-4 text-left transition-colors hover:border-line-strong',
        selected ? 'border-ink shadow-[0_0_0_1px_var(--ink)]' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-2xl leading-none text-ink">{pretty(m.symbol)}</div>
          <div className="mt-1 text-[13.5px] text-ink-soft">
            {chordLongName(m.rootPc, m.quality, accidentals)}
            {m.inversion && <> — {m.inversion}</>}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-semibold',
            rank === 0 ? 'bg-ink text-bg' : m.kind === 'ambiguous' ? 'bg-surface-2 text-muted' : 'bg-accent-soft text-accent',
          )}
        >
          {rank === 0 ? 'Most likely' : MATCH_KIND_LABEL[m.kind]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <div>
          <div className="mb-1 text-[12.5px] font-semibold text-muted">Formula</div>
          <div className="flex gap-1">
            {m.tones.map((t) => (
              <IntervalBadge key={t.interval} interval={t.interval} family={t.family} className={m.missing.includes(t) ? 'opacity-35' : ''} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[12.5px] font-semibold text-muted">Notes</div>
          <div className="flex gap-1">
            {m.tones.map((t) => (
              <NoteBadge key={t.interval} note={pretty(displayNote(t.spelled, accidentals))} family={t.family} className={m.missing.includes(t) ? 'opacity-35' : ''} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[12.5px] font-semibold text-muted">Bass</div>
          <div className="text-ink">
            {pretty(m.bassName)} <span className="text-muted">({prettyInterval(m.bassInterval)})</span>
          </div>
        </div>
      </div>
      {m.missing.length > 0 && (
        <p className="text-[12.5px] text-muted">
          Missing {m.missing.map((t) => `the ${prettyInterval(t.interval)} (${pretty(displayNote(t.spelled, accidentals))})`).join(' and ')}
          {m.kind === 'missing-optional' ? ' — players often leave it out.' : ' — so this reading is a stretch.'}
        </p>
      )}
    </button>
  )
}

export function IdentifyPage() {
  const { labels, accidentals } = usePrefs()
  const pcName = usePcName()
  const [mode, setMode] = useState<'type' | 'click'>('click')
  const [fretParam, setFretParam] = useUrlParam('frets', 'x-3-2-0-1-0', isFretParam)
  const frets: FretInput = useMemo(() => fretParam.split('-').map((t) => (t === 'x' ? null : Number(t))), [fretParam])
  const [text, setText] = useState(() => fretsToString(frets))
  const [error, setError] = useState<string | null>(null)
  const [pick, setPick] = useState(0)

  const setFrets = (f: FretInput) => {
    setFretParam(encode(f))
    setPick(0)
  }

  const { notes, matches } = useMemo(() => identifyFrets(frets, accidentals), [frets, accidentals])
  const chosen = matches[Math.min(pick, matches.length - 1)] ?? null

  const marks: FretMark[] = useMemo(
    () =>
      notes.map((n) => {
        const t = chosen?.tones.find((x) => x.pc === n.pc)
        if (!t) return { string: n.string, fret: n.fret, label: pcName(n.pc), tone: 'selected' as const, emphasis: 'strong' as const, info: pcName(n.pc) }
        return { string: n.string, fret: n.fret, ...labelTone(t, labels, accidentals), tone: t.family, emphasis: 'strong' as const, info: describeTone(t, accidentals, pretty(chosen!.rootName)) }
      }),
    [notes, chosen, labels, accidentals, pcName],
  )

  const onBoard = (p: FretPos) => {
    const next = [...frets]
    const idx = 6 - p.string
    next[idx] = next[idx] === p.fret ? null : p.fret
    setFrets(next)
    setText(fretsToString(next))
  }

  const submitText = (value: string) => {
    setText(value)
    const r = parseFretString(value)
    if (r.ok) {
      setError(null)
      setFrets(r.frets)
    } else setError(r.error)
  }

  const boardRange = mode === 'click' ? FULL_RANGE : rangeAround(notes.map((n) => ({ string: n.string, fret: n.fret })), 1, 4)
  const fretted = notes.map((n) => n.fret).filter((f) => f > 0)
  const playedRange = fretted.length ? { start: Math.min(...fretted), end: Math.max(...fretted) } : null

  return (
    <Page>
      <SubNav items={CHORD_NAV} />
      <PageHeader eyebrow="Chords" title="What chord is this?">
        Click one note per string, or type the frets. You’ll get every sensible name for the shape — because plenty of shapes honestly have more than one.
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <Segmented
              label="Input mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'click', label: 'Click the fretboard' },
                { value: 'type', label: 'Type frets' },
              ]}
            />
            <div className="flex items-end gap-3">
              <Button size="sm" variant="ghost" onClick={() => { setFrets([null, null, null, null, null, null]); setText('xxxxxx') }}>
                <Eraser /> Clear
              </Button>
            </div>
          </div>
          {mode === 'type' ? (
            <div className="mb-5">
              <Field label="Frets, low E first (x = muted)">
                <input
                  value={text}
                  onChange={(e) => submitText(e.target.value)}
                  className="h-11 w-full max-w-sm rounded-lg border border-line-strong bg-surface px-3 font-mono text-lg tracking-widest text-ink outline-none focus:border-ink"
                  aria-invalid={!!error}
                  aria-describedby="fret-help"
                  spellCheck={false}
                  autoComplete="off"
                />
              </Field>
              <p id="fret-help" className={cn('mt-2 text-[13px]', error ? 'text-root' : 'text-muted')}>
                {error ?? 'One character per string (x32010), or spaces when a fret is above 9 (8 10 10 9 8 8).'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => submitText(e)} className="cursor-pointer rounded-md border border-line bg-surface-2/60 px-2 py-1 font-mono text-[12.5px] text-ink-soft hover:text-ink">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Tip id="identify-click">Click a fret to place a note on that string. Click it again to mute the string. Use the “open” column for open strings.</Tip>
          )}
          <Fretboard
            marks={marks}
            range={boardRange}
            focus={playedRange}
            mutedStrings={frets.flatMap((f, i) => (f === null ? [(6 - i) as 1 | 2 | 3 | 4 | 5 | 6] : []))}
            onSelect={mode === 'click' ? onBoard : undefined}
            ariaLabel="Chord identifier fretboard"
            hint={mode === 'click' ? 'Click a fret (or use arrow keys and Enter) to place a note on that string.' : undefined}
          />

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13.5px]">
              <caption className="sr-only">Notes in this shape, string by string</caption>
              <thead className="text-[12.5px] text-muted">
                <tr>
                  <th className="py-1.5 font-semibold">String</th>
                  {STANDARD_TUNING.map((s) => (
                    <th key={s.num} className="py-1.5 text-center font-semibold">
                      {s.num} · {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <th className="py-2 font-medium text-muted">Fret</th>
                  {frets.map((f, i) => (
                    <td key={i} className="py-2 text-center font-mono">{f === null ? '×' : f}</td>
                  ))}
                </tr>
                <tr className="border-t border-line">
                  <th className="py-2 font-medium text-muted">Note</th>
                  {frets.map((f, i) => (
                    <td key={i} className="py-2 text-center font-medium">{f === null ? '—' : (() => { const pc = pcAt((6 - i) as 1, f); const t = chosen?.tones.find((x) => x.pc === pc); return t ? pretty(displayNote(t.spelled, accidentals)) : pcName(pc) })()}</td>
                  ))}
                </tr>
                <tr className="border-t border-line">
                  <th className="py-2 font-medium text-muted">Interval</th>
                  {frets.map((f, i) => (
                    <td key={i} className="py-2 text-center font-mono">
                      {f === null || !chosen ? '—' : prettyInterval(chosen.tones.find((x) => x.pc === pcAt((6 - i) as 1, f))?.interval ?? '?')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <aside aria-live="polite">
          <h2 className="mb-3 text-xl font-medium">Possible chords</h2>
          {notes.length < 2 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-5 text-ink-soft">Add at least two notes to name a chord.</p>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong p-5 text-ink-soft">
              <p>These notes don’t spell a common chord.</p>
              <p className="mt-2 text-[13.5px] text-muted">Check for a wrong fret, or it may be a cluster or a partial voicing that only makes sense in context.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matches.slice(0, 6).map((m, i) => (
                <ResultCard key={m.symbol + m.quality.id} m={m} rank={i} selected={chosen === m} onSelect={() => setPick(i)} />
              ))}
              {matches.length > 1 && (
                <p className="text-[12.5px] text-muted">
                  Several names fit. Which is “right” depends on the bass player, the key and the chords around it. Pick a reading to relabel the neck.
                </p>
              )}
              {chosen && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-2 text-[12.5px] font-semibold text-muted">Your shape</div>
                  <div className="flex items-center gap-4">
                    <ChordDiagram frets={frets} tones={chosen.tones} label={`Shape ${fretsToString(frets)}`} className="max-w-[120px]" />
                    <div className="text-[13.5px] text-ink-soft">
                      <Link className="font-medium text-accent hover:underline" to={`/chords?root=${rootSlug(chosen.rootPc)}&quality=${chosen.quality.id}`}>
                        All {pretty(chosen.rootName + chosen.quality.symbol)} shapes →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      <SectionTitle>How it decides</SectionTitle>
      <LessonPanel
        seeing="Each played note is turned into a pitch, the lowest one is the bass, and every chord formula is checked against those notes."
        matters="Exact matches with the root in the bass rank first, then inversions (slash chords like C/E), then readings missing a note players often drop (usually the 5th)."
        find="Interval labels on the neck show the job each note does in the chosen reading — pick another reading and the labels change."
        tryThis="Enter x02210 (Am), then 3x0003 — six-string shapes with doubled notes still boil down to three or four pitch classes."
      />
    </Page>
  )
}
